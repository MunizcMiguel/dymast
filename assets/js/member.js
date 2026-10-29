(function () {
  "use strict";
  var MEMBERS = window.DYMAST_MEMBERS || [];
  var DB = window.DYMAST_PUBLICATIONS || { publications: [] };
  var esc = window.DymastPubs.esc;
  var id = new URLSearchParams(location.search).get("id");
  var m = MEMBERS.find(function (x) { return x.id === id; });
  var hero = document.getElementById("hero"), body = document.getElementById("body");

  if (!m) {
    hero.innerHTML = '<div class="crumbs"><a href="equipo.html">Equipo</a></div><h1 style="color:#fff">Perfil no encontrado</h1><p><a class="btn" href="equipo.html">Ver el equipo</a></p>';
    return;
  }
  document.title = m.name + " · DyMaSt · Universidad de Oviedo";
  var md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute("content", m.name + ", " + m.role + " en el grupo DyMaSt (Universidad de Oviedo). " + (m.topics && m.topics.length ? "Líneas: " + m.topics.slice(0, 4).join(", ") + ". " : "") + "Trayectoria y publicaciones en Scopus.");
  var ld = { "@context": "https://schema.org", "@type": "Person", name: m.name, jobTitle: m.role,
    affiliation: { "@type": "ResearchOrganization", name: "DyMaSt · Dynamics, Materials and Structures", parentOrganization: { "@type": "CollegeOrUniversity", name: "Universidad de Oviedo" } },
    sameAs: [m.orcid && "https://orcid.org/" + m.orcid, m.portal && "https://portalinvestigacion.uniovi.es/investigadores/" + m.portal + "/detalle"].filter(Boolean) };
  if (m.email) ld.email = m.email;
  var s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
  var names = {}; MEMBERS.forEach(function (x) { if (x.id !== m.id) names[x.id] = x.short || x.name; });

  var pubs = DB.publications.filter(function (p) { return p.members.indexOf(m.id) > -1; });
  var cites = pubs.reduce(function (s, p) { return s + (p.cited || 0); }, 0);
  var sorted = pubs.map(function (p) { return p.cited || 0; }).sort(function (a, b) { return b - a; });
  var h = 0; while (h < sorted.length && sorted[h] >= h + 1) h++;
  var articles = pubs.filter(function (p) { return p.type === "Article" || p.type === "Review"; }).length;
  var isCol = m.group === "col";

  var ids = [];
  if (m.portal) ids.push(["Portal Uniovi", "https://portalinvestigacion.uniovi.es/investigadores/" + m.portal + "/detalle"]);
  (m.scopus || []).slice(0, 1).forEach(function (s) { ids.push(["Scopus", "https://www.scopus.com/authid/detail.uri?authorId=" + s]); });
  if (m.orcid) ids.push(["ORCID", "https://orcid.org/" + m.orcid]);
  if (m.scholar) ids.push(["Google Scholar", "https://scholar.google.com/citations?user=" + m.scholar]);
  if (m.wos) ids.push(["Web of Science", "https://www.webofscience.com/wos/author/record/" + m.wos]);
  if (m.linkedin) ids.push(["LinkedIn", m.linkedin]);

  hero.innerHTML =
    '<nav class="crumbs" aria-label="Ruta"><a href="index.html">Inicio</a> / <a href="equipo.html">Equipo</a> / ' + esc(m.short || m.name) + "</nav>" +
    '<div class="profile-head"><div class="ph">' + window.dymastAvatar(m, isCol ? "alt" : "") + "</div><div>" +
    "<h1>" + esc(m.name) + '</h1><div class="role">' + esc(m.role) + (m.position ? " · " + esc(m.position) : "") + "</div>" +
    '<p class="aff">' + [m.area, m.institute, "Universidad de Oviedo"].filter(Boolean).map(esc).join(" · ") + "</p>" +
    '<div class="ids">' + (m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a>" : "") +
    ids.map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + " ↗</a>"; }).join("") + "</div>" +
    (m.email ? '<div class="profile-actions"><a class="btn" href="mailto:' + esc(m.email) + "?subject=" + encodeURIComponent("Contacto desde la web de DyMaSt") + '">Contactar</a>' +
      (m.group === "pdi" ? '<a class="btn ghost" href="mailto:' + esc(m.email) + "?subject=" + encodeURIComponent("Propuesta de TFG/TFM/tesis en DyMaSt") + '">Proponer TFG, TFM o tesis</a>' : "") + "</div>" : "") +
    "</div></div>" +
    (pubs.length ? '<div class="metrics">' +
      "<div><b>" + pubs.length + "</b><span>" + (isCol ? "publicaciones con DyMaSt" : "publicaciones en Scopus") + "</span></div>" +
      "<div><b>" + articles + "</b><span>artículos en revista</span></div>" +
      "<div><b>" + cites.toLocaleString("es-ES") + "</b><span>citas (Scopus)</span></div>" +
      "<div><b>" + h + "</b><span>índice h de estas publicaciones</span></div></div>" : "");

  var phd = m.phd ? '<div class="box"><h3>Tesis doctoral</h3><p style="margin:0;font-size:.92rem"><b style="font-weight:500">' + esc(m.phd.title) + "</b><br><span class='muted'>" + esc(m.phd.univ) + ", " + m.phd.year + (m.phd.advisors ? " · Dir.: " + esc(m.phd.advisors) : "") + "</span></p></div>" : "";
  var topics = m.topics && m.topics.length ? '<div class="box"><h3>Líneas de investigación</h3><div class="topics">' + m.topics.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div></div>" : "";
  var chart = pubs.length ? '<div class="box"><h3>Publicaciones por año</h3><div id="ychart"></div></div>' : "";
  var theses = m.theses && m.theses.length ? '<div class="box"><h3>Tesis dirigidas (selección)</h3><ul class="theses-light">' + m.theses.map(function (t) { return "<li><b>" + esc(t[0]) + "</b><span>" + esc(t[1]) + " · " + t[2] + "</span></li>"; }).join("") + "</ul></div>" : "";

  body.innerHTML =
    "<div><h2>Trayectoria e investigación</h2>" + m.bio.map(function (p) { return '<p class="lead" style="font-size:1.05rem">' + esc(p) + "</p>"; }).join("") +
    '<h2 style="margin-top:48px">Publicaciones</h2>' +
    (pubs.length
      ? '<p class="muted" style="font-size:.9rem">Base de datos extraída de Scopus' + (DB.retrieved ? " (actualizada el " + new Date(DB.retrieved).toLocaleDateString("es-ES") + ")" : "") + (isCol ? ". Se muestran solo las publicaciones en coautoría con miembros de DyMaSt." : ".") + "</p><div id=\"pubs\"></div>"
      : '<div class="empty">Todavía no hay publicaciones indexadas en Scopus asociadas a este perfil.</div>') +
    (pubs.length && !isCol ? '<p><a class="btn ghost" style="margin-top:20px" href="publicaciones.html?m=' + m.id + '">Ver en el listado del grupo</a></p>' : "") +
    '<a class="back-link" href="equipo.html">← Volver al equipo</a>' +
    "</div>" + (topics + phd + chart + theses ? "<aside>" + topics + phd + chart + theses + "</aside>" : "");
  if (!(topics + phd + chart + theses)) body.classList.add("single");

  if (pubs.length) {
    window.DymastPubs.mount(document.getElementById("pubs"), pubs, { names: names });
    window.DymastPubs.yearChart(document.getElementById("ychart"), pubs);
  }
})();
