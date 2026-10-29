"""
Descarga las publicaciones de los miembros de DyMaSt desde la API de Scopus
(Elsevier Scopus Search API) y genera la base de datos de la web:

    data/publications.json   -> base de datos (fuente de verdad)
    data/publications.js     -> la misma base envuelta para cargarla sin servidor

Uso:
    python tools/scopus_fetch.py                 # clave en ../.scopus_key o env SCOPUS_API_KEY
    python tools/scopus_fetch.py --insttoken XX  # si vuestra licencia usa insttoken

Los Scopus Author ID de cada persona se leen de data/members.js
(campo "scopus"), que a su vez se tomaron del Portal de Investigación de Uniovi.
"""
import argparse, json, os, re, sys, time, datetime
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent          # carpeta web/
DATA = ROOT / "data"
API = "https://api.elsevier.com/content/search/scopus"


def load_key():
    if os.environ.get("SCOPUS_API_KEY"):
        return os.environ["SCOPUS_API_KEY"].strip()
    for p in (ROOT.parent / ".scopus_key", ROOT / ".scopus_key"):
        if p.exists():
            txt = p.read_text(encoding="utf-8")
            # admite "clave" sola o líneas tipo ELSEVIER_API_KEY='clave'
            m = re.search(r"(?:ELSEVIER|SCOPUS)_API_KEY\s*=\s*['\"]?([A-Za-z0-9]+)", txt)
            return m.group(1) if m else txt.strip().splitlines()[0].strip()
    sys.exit("No se encontró la clave: crea .scopus_key o define SCOPUS_API_KEY")


def load_members():
    txt = (DATA / "members.js").read_text(encoding="utf-8")
    body = txt[txt.index("=") + 1:].strip().rstrip(";")
    return json.loads(body)


def fetch_query(query, key, insttoken=None):
    headers = {"X-ELS-APIKey": key, "Accept": "application/json"}
    if insttoken:
        headers["X-ELS-Insttoken"] = insttoken
    out, start = [], 0
    while True:
        params = {"query": query, "start": start, "count": 25,
                  "sort": "-coverDate", "field": ",".join([
                      "eid", "dc:title", "prism:publicationName", "prism:coverDate",
                      "prism:volume", "prism:issueIdentifier", "prism:pageRange",
                      "article-number", "prism:doi", "citedby-count", "subtypeDescription",
                      "author", "dc:creator", "openaccessFlag"])}
        if not insttoken:
            params["view"] = "STANDARD"
        r = requests.get(API, headers=headers, params=params, timeout=60)
        if r.status_code == 400 and "author" in r.text.lower() and "field" in params:
            # la vista STANDARD no devuelve la lista completa de autores
            params["field"] = params["field"].replace(",author", "")
            r = requests.get(API, headers=headers, params=params, timeout=60)
        r.raise_for_status()
        res = r.json()["search-results"]
        entries = [e for e in res.get("entry", []) if "error" not in e]
        out += entries
        total = int(res.get("opensearch:totalResults", 0))
        start += 25
        if start >= total or not entries:
            return out, total
        time.sleep(0.25)


def norm(e):
    authors = [a.get("authname") for a in e.get("author", []) if a.get("authname")]
    return {
        "eid": e.get("eid"),
        "title": e.get("dc:title"),
        "source": e.get("prism:publicationName"),
        "year": int(e["prism:coverDate"][:4]) if e.get("prism:coverDate") else None,
        "date": e.get("prism:coverDate"),
        "volume": e.get("prism:volume"),
        "issue": e.get("prism:issueIdentifier"),
        "pages": e.get("prism:pageRange") or e.get("article-number"),
        "doi": e.get("prism:doi"),
        "cited": int(e.get("citedby-count") or 0),
        "type": e.get("subtypeDescription"),
        "oa": e.get("openaccessFlag") in (True, "true"),
        "authors": ", ".join(authors) if authors else e.get("dc:creator"),
        "members": [],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--insttoken")
    a = ap.parse_args()
    key = load_key()
    members = load_members()
    au = lambda ids: " OR ".join(f"AU-ID({i})" for i in ids)
    # Un perfil puede estar fragmentado en Scopus: se unen todos sus AU-ID y su ORCID.
    # Para colaboradores externos solo se recogen las publicaciones conjuntas con el grupo.
    core_ids = [i for m in members if m.get("group") != "col" for i in (m.get("scopus") or [])]
    pubs, totals = {}, {}
    for m in members:
        parts = [au(m["scopus"])] if m.get("scopus") else []
        if m.get("orcid"):
            parts.append(f"ORCID({m['orcid']})")
        if not parts:
            continue
        query = "(" + " OR ".join(parts) + ")"
        if m.get("group") == "col":
            query += f" AND ({au(core_ids)})"
        entries, total = fetch_query(query, key, a.insttoken)
        totals[m["id"]] = total
        print(f"{m['id']:<14} {total:>4} documentos")
        for e in entries:
            p = pubs.setdefault(e["eid"], norm(e))
            if m["id"] not in p["members"]:
                p["members"].append(m["id"])
    db = {
        "source": "Scopus Search API (Elsevier)",
        "retrieved": datetime.date.today().isoformat(),
        "authorTotals": totals,
        "publications": sorted(pubs.values(), key=lambda p: (p["date"] or ""), reverse=True),
    }
    DATA.mkdir(exist_ok=True)
    (DATA / "publications.json").write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    (DATA / "publications.js").write_text(
        "window.DYMAST_PUBLICATIONS = " + json.dumps(db, ensure_ascii=False) + ";\n", encoding="utf-8")
    # Cifras resumidas para la portada (evita cargar toda la base en index.html)
    core = {m["id"] for m in members if m.get("group") != "col"}
    cp = [p for p in pubs.values() if core & set(p["members"])]
    stats = {"pubs": len(cp), "cites": sum(p["cited"] for p in cp), "retrieved": db["retrieved"]}
    (DATA / "stats.js").write_text("window.DYMAST_STATS = " + json.dumps(stats) + ";\n", encoding="utf-8")
    print(f"\n{len(pubs)} publicaciones únicas guardadas en data/publications.json")


if __name__ == "__main__":
    main()
