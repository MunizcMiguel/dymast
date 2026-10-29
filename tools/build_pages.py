"""
Genera las páginas independientes de la web a partir de las secciones de
tools/sections.html (una página por entrada del menú, sin scroll largo).

    python tools/build_pages.py

Cada sección de sections.html va precedida de un comentario <!-- NOMBRE -->.
"""
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / "tools" / "sections.html").read_text(encoding="utf-8")

def section(name):
    m = re.search(r"<!-- " + re.escape(name) + r" -->\s*(<section.*?</section>)", SRC, re.S)
    if not m:
        raise SystemExit("Sección no encontrada: " + name)
    return m.group(1)

NAV = [("servicios.html", "Servicios"), ("equipamiento.html", "Equipamiento"), ("casos.html", "Casos"),
       ("investigacion.html", "Investigación"), ("equipo.html", "Equipo"), ("unete.html", "Únete"),
       ("publicaciones.html", "Publicaciones")]

ANCHORS = {"#inicio": "index.html", "#servicios": "servicios.html", "#casos": "casos.html",
           "#equipamiento": "equipamiento.html", "#proyectos": "investigacion.html#proyectos",
           "#investigacion": "investigacion.html", "#equipo": "equipo.html", "#talento": "unete.html",
           "#red": "investigacion.html#red", "#contacto": "contacto.html"}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">')


def nav(current):
    links = "".join('      <a href="%s"%s>%s</a>\n' % (h, ' aria-current="page"' if h == current else "", l) for h, l in NAV)
    cta = ' aria-current="page"' if current == "contacto.html" else ""
    return links + '      <a class="btn" href="contacto.html"%s>Contactar</a>\n' % cta


def relink(html):
    # "Consultar" con tema -> contacto.html?tema=...
    html = re.sub(r'href="#contacto" data-subject="([^"]+)"',
                  lambda m: 'href="contacto.html?tema=%s"' % quote(m.group(1)), html)
    for a, b in ANCHORS.items():
        html = html.replace('href="%s"' % a, 'href="%s"' % b)
    return html


def first_h2_to_h1(html):
    return re.sub(r"<h2([^>]*)>(.*?)</h2>", r'<h1 class="page-title"\1>\2</h1>', html, count=1, flags=re.S)


FOOTER = """<footer class="site-footer">
  <div class="wrap foot-grid">
    <div>
      <div class="foot-logos">
        <img src="assets/img/dymast-4.png?v=2" alt="DyMaSt" width="220" height="40">
        <img class="uo" src="assets/img/uniovi.png" alt="Universidad de Oviedo" width="120" height="44">
      </div>
      <p>Escuela Politécnica de Ingeniería de Gijón · Campus de Gijón<br><a href="mailto:aenlle@uniovi.es">aenlle@uniovi.es</a> · <a href="tel:+34985182057">985 18 20 57</a></p>
    </div>
    <nav aria-label="Pie">
      <h3>Enlaces</h3>
      <a href="servicios.html">Servicios</a><a href="equipamiento.html">Equipamiento</a><a href="casos.html">Casos</a><a href="investigacion.html">Investigación</a><a href="equipo.html">Equipo</a><a href="publicaciones.html">Publicaciones</a><a href="unete.html">Únete</a><a href="contacto.html">Contacto</a>
    </nav>
    <div>
      <h3>Fuentes</h3>
      <a href="https://portalinvestigacion.uniovi.es/grupos/14043/detalle" target="_blank" rel="noopener">Portal de la Investigación · Uniovi</a>
      <p class="foot-note" data-scopus-date>Publicaciones y citas: Scopus.</p>
    </div>
  </div>
</footer>"""


def page(fname, title, desc, body, extra_head="", float_cta=True, scripts=("data/members.js", "data/stats.js", "assets/js/main.js")):
    return """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add('js')</script>
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta property="og:type" content="website">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:image" content="assets/img/research/dique-figueras.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.png">
%(fonts)s
<link rel="stylesheet" href="assets/css/style.css?v=3">
%(extra)s</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="DyMaSt, inicio">
      <img src="assets/img/dymast-2.png?v=2" alt="DyMaSt" width="188" height="34">
      <small>Universidad de Oviedo · Gijón</small>
    </a>
    <button class="menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav"><span></span></button>
    <nav class="nav" id="nav" aria-label="Principal">
%(nav)s    </nav>
  </div>
</header>

<main id="main">
%(body)s
</main>
%(float)s
%(footer)s

%(scripts)s
</body>
</html>
""" % {"title": title, "desc": desc, "fonts": FONTS, "extra": extra_head, "nav": nav(fname), "body": relink(body),
       "float": '<a class="float-cta" href="contacto.html">Contactar</a>\n' if float_cta else "",
       "footer": FOOTER, "scripts": "\n".join('<script src="%s?v=3"></script>' % s for s in scripts)}


CTA = """<section class="page-cta">
  <div class="wrap">
    <div class="cta-band">
      <div><h2>%s</h2><p>%s</p></div>
      <a class="btn" href="%s">%s</a>
    </div>
  </div>
</section>"""

EXPLORE = """<section id="explora">
  <div class="wrap">
    <div class="section-head reveal">
      <div class="eyebrow">Explora DyMaSt</div>
      <h2>Ensayamos, calculamos y monitorizamos estructuras reales</h2>
    </div>
    <div class="grid g3 explore">
      <a class="card explore-card reveal" href="servicios.html"><span class="tag">Servicios</span><h3>Qué podemos hacer por tu empresa</h3><p class="muted">Ensayos mecánicos y de fatiga, cálculo estructural, análisis modal y monitorización, ingeniería offshore y formación a medida.</p><span class="more">Ver servicios →</span></a>
      <a class="card explore-card reveal" href="equipamiento.html"><span class="tag">Equipamiento</span><h3>De una probeta a un edificio</h3><p class="muted">Máquinas MTS hasta 1000 kN, resonancia RUMUL hasta 200 Hz, 58 acelerómetros, vibrometría láser y mesa vibrante.</p><span class="more">Ver equipamiento →</span></a>
      <a class="card explore-card reveal" href="casos.html"><span class="tag">Casos</span><h3>Del laboratorio al problema real</h3><p class="muted">Aerogeneradores, diques flotantes, la torre de la Universidad Laboral, rodamientos de grandes dimensiones y más.</p><span class="more">Ver casos →</span></a>
      <a class="card explore-card reveal" href="investigacion.html"><span class="tag">Investigación</span><h3>Seis líneas y proyectos competitivos</h3><p class="muted">Análisis modal, fatiga, estructuras marinas, viscoelasticidad, vidrio estructural y hormigón; proyectos nacionales, europeos y público-privados.</p><span class="more">Ver investigación →</span></a>
      <a class="card explore-card reveal" href="equipo.html"><span class="tag">Equipo</span><h3>Quiénes hacen DyMaSt</h3><p class="muted">Profesorado e investigadores del área de Mecánica de Medios Continuos y Teoría de Estructuras, con sus trayectorias y publicaciones.</p><span class="more">Conocer al equipo →</span></a>
      <a class="card explore-card reveal" href="unete.html"><span class="tag">Únete</span><h3>TFG, TFM y tesis doctoral</h3><p class="muted">Investiga en problemas de ingeniería reales con equipamiento propio y en proyectos con empresas y universidades.</p><span class="more">Investiga con nosotros →</span></a>
    </div>
  </div>
</section>"""

LD = re.search(r'<script type="application/ld\+json">.*?</script>', SRC, re.S).group(0)

PAGES = [
    ("index.html", "DyMaSt · Ensayos, análisis modal, fatiga y estructuras marinas · Universidad de Oviedo",
     "Grupo de investigación DyMaSt (Universidad de Oviedo, Gijón): ensayos de fatiga hasta 1000 kN, análisis modal y monitorización, cálculo a fatiga, vidrio estructural, viscoelasticidad y simulación offshore para empresas.",
     lambda: section("HERO") + "\n\n" + section("CLIENTES") + "\n\n" + EXPLORE + "\n\n" +
     CTA % ("¿Tienes un reto de ingeniería?", "Cuéntanos tu necesidad y estudiaremos cómo podemos ayudarte.", "contacto.html", "Contactar"),
     LD + '\n<link rel="preload" as="image" href="assets/img/research/dique-figueras.webp" type="image/webp">\n'),
    ("servicios.html", "Servicios para empresas · DyMaSt · Universidad de Oviedo",
     "Ensayos mecánicos y de fatiga, cálculo estructural, análisis modal y monitorización, validación de modelos, ingeniería offshore y formación a medida.",
     lambda: first_h2_to_h1(section("SERVICIOS")) + "\n\n" +
     CTA % ("¿Quieres ver ejemplos?", "Consulta algunos trabajos realizados por el grupo.", "casos.html", "Ver casos"), ""),
    ("equipamiento.html", "Equipamiento de fatiga y vibraciones · DyMaSt · Universidad de Oviedo",
     "Máquinas MTS hasta 1000 kN, resonancia RUMUL, equipos axial-torsionales, acelerómetros, vibrometría láser, mesa vibrante y software.",
     lambda: first_h2_to_h1(section("EQUIPAMIENTO")), ""),
    ("casos.html", "Casos reales · DyMaSt · Universidad de Oviedo",
     "Trabajos de transferencia e investigación aplicada del grupo DyMaSt: aerogeneradores, diques flotantes, torre de la Universidad Laboral y más.",
     lambda: first_h2_to_h1(section("CASOS")), ""),
    ("investigacion.html", "Investigación y proyectos · DyMaSt · Universidad de Oviedo",
     "Líneas de investigación, proyectos de I+D+i y redes científicas del grupo DyMaSt.",
     lambda: first_h2_to_h1(section("LÍNEAS DE INVESTIGACIÓN")) + "\n\n" + section("PROYECTOS") + "\n\n" + section("RED"), ""),
    ("equipo.html", "Equipo · DyMaSt · Universidad de Oviedo",
     "Miembros del grupo de investigación DyMaSt: profesorado, personal investigador y colaboradores.",
     lambda: first_h2_to_h1(section("QUIÉNES SOMOS + EQUIPO")), ""),
    ("unete.html", "Únete · TFG, TFM y tesis doctoral · DyMaSt · Universidad de Oviedo",
     "Haz tu TFG, TFM o tesis doctoral en DyMaSt: problemas de ingeniería reales, equipamiento propio y colaboración internacional.",
     lambda: first_h2_to_h1(section("TALENTO")), ""),
    ("contacto.html", "Contacto · DyMaSt · Universidad de Oviedo",
     "Contacta con el grupo DyMaSt (Universidad de Oviedo, Campus de Gijón) para ensayos, cálculo, monitorización, proyectos de I+D o formación.",
     lambda: first_h2_to_h1(section("CONTACTO")), ""),
]

for fname, title, desc, body, extra in PAGES:
    html = page(fname, title, desc, body(), extra, float_cta=fname != "contacto.html")
    (ROOT / fname).write_text(html, encoding="utf-8")
    print("ok", fname)
