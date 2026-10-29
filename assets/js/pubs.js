/* Lista de publicaciones filtrable, leída de la base de datos Scopus (data/publications.js) */
window.DymastPubs = (function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var TYPE_ES = { "Article": "Artículo", "Conference Paper": "Congreso", "Review": "Revisión", "Book Chapter": "Capítulo", "Book": "Libro", "Editorial": "Editorial", "Erratum": "Fe de erratas", "Letter": "Carta", "Note": "Nota", "Data Paper": "Datos", "Short Survey": "Revisión breve" };
  var typeEs = function (t) { return TYPE_ES[t] || t || "Otro"; };

  function cite(p) {
    var s = esc(p.source || "");
    if (p.volume) s += ", " + esc(p.volume);
    if (p.issue) s += "(" + esc(p.issue) + ")";
    if (p.pages) s += ", " + esc(p.pages);
    return s;
  }

  function item(p, names) {
    var url = p.doi ? "https://doi.org/" + encodeURIComponent(p.doi).replace(/%2F/g, "/") :
      "https://www.scopus.com/record/display.uri?eid=" + encodeURIComponent(p.eid) + "&origin=resultslist";
    var who = names ? p.members.filter(function (id) { return names[id]; }).map(function (id) { return '<a href="miembro.html?id=' + id + '">' + esc(names[id]) + "</a>"; }).join(", ") : "";
    var press = p.year && p.year > new Date().getFullYear();
    return '<li class="pub"><div class="yr">' + (p.year || "—") + '</div><div>' +
      '<a class="t" href="' + url + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" +
      '<div class="src">' + cite(p) + "</div>" +
      '<div class="au">' + (p.authors ? "Primer autor: " + esc(p.authors) + " et al." : "") + (who ? " · DyMaSt: " + who : "") + "</div>" +
      '<div class="tags"><span class="badge">' + typeEs(p.type) + "</span>" + (press ? '<span class="badge press">En prensa</span>' : "") + (p.oa ? '<span class="badge pp">Acceso abierto</span>' : "") + "</div>" +
      '</div><div class="cites">' + (p.cited || 0) + "<small>citas</small></div></li>";
  }

  function mount(el, list, opts) {
    opts = opts || {};
    var PAGE = 25, shown = PAGE;
    var years = Array.from(new Set(list.map(function (p) { return p.year; }).filter(Boolean))).sort(function (a, b) { return b - a; });
    var types = Array.from(new Set(list.map(function (p) { return p.type; }).filter(Boolean)));
    el.innerHTML =
      '<div class="pub-tools" role="search">' +
      '<label class="sr-only" for="pq">Buscar</label><input id="pq" type="search" placeholder="Buscar por título, revista o primer autor…">' +
      (opts.memberSelect ? '<label class="sr-only" for="pm">Investigador</label><select id="pm"><option value="">Todo el grupo</option>' + opts.memberSelect.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + "</option>"; }).join("") + "</select>" : "") +
      '<label class="sr-only" for="py">Año</label><select id="py"><option value="">Todos los años</option>' + years.map(function (y) { return "<option>" + y + "</option>"; }).join("") + "</select>" +
      '<label class="sr-only" for="pt">Tipo</label><select id="pt"><option value="">Todos los tipos</option>' + types.map(function (t) { return '<option value="' + esc(t) + '">' + typeEs(t) + "</option>"; }).join("") + "</select>" +
      '<label class="chk"><input id="po" type="checkbox"> Solo acceso abierto</label>' +
      '<label class="sr-only" for="ps">Orden</label><select id="ps"><option value="date">Más recientes</option><option value="cited">Más citadas</option></select>' +
      '</div><p class="pub-count" aria-live="polite"></p><ul class="pubs" aria-label="Publicaciones"></ul>' +
      '<button class="btn ghost more-btn" type="button" hidden>Mostrar más</button>';
    var q = el.querySelector("#pq"), y = el.querySelector("#py"), t = el.querySelector("#pt"), s = el.querySelector("#ps"), m = el.querySelector("#pm"), o = el.querySelector("#po");
    var ul = el.querySelector(".pubs"), count = el.querySelector(".pub-count"), more = el.querySelector(".more-btn");
    if (m && opts.initialMember) m.value = opts.initialMember;

    function render() {
      var term = q.value.trim().toLowerCase();
      var f = list.filter(function (p) {
        return (!y.value || String(p.year) === y.value) && (!t.value || p.type === t.value) &&
          (!m || !m.value || p.members.indexOf(m.value) > -1) && (!o.checked || p.oa) &&
          (!term || [p.title, p.source, p.authors].join(" ").toLowerCase().indexOf(term) > -1);
      });
      f.sort(s.value === "cited" ? function (a, b) { return (b.cited || 0) - (a.cited || 0); } : function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
      count.textContent = f.length + (f.length === 1 ? " publicación" : " publicaciones");
      ul.innerHTML = f.length ? f.slice(0, shown).map(function (p) { return item(p, opts.names); }).join("") :
        '<li class="empty">No hay publicaciones que coincidan con el filtro.</li>';
      more.hidden = f.length <= shown;
    }
    [q, y, t, s, m, o].forEach(function (c) { if (c) c.addEventListener(c === o ? "change" : "input", function () { shown = PAGE; render(); }); });
    more.addEventListener("click", function () {
      var first = shown; shown += PAGE; render();
      var a = ul.children[first] && ul.children[first].querySelector("a.t"); if (a) a.focus();
    });
    render();
  }

  function yearChart(el, list) {
    var by = {};
    list.forEach(function (p) { if (p.year) by[p.year] = (by[p.year] || 0) + 1; });
    var ys = Object.keys(by).map(Number);
    if (!ys.length) { el.innerHTML = ""; return; }
    var cur = new Date().getFullYear(), a = Math.max(Math.min.apply(null, ys), cur - 14), b = Math.max.apply(null, ys), max = 0, bars = [];
    for (var i = a; i <= b; i++) max = Math.max(max, by[i] || 0);
    for (i = a; i <= b; i++) bars.push('<div style="height:' + ((by[i] || 0) / max * 100) + '%" title="' + i + ": " + (by[i] || 0) + ' publicaciones"></div>');
    el.innerHTML = '<div class="chart" role="img" aria-label="Publicaciones por año entre ' + a + " y " + b + '">' + bars.join("") + '</div><div class="chart-axis"><span>' + a + "</span><span>" + b + "</span></div>";
  }

  return { mount: mount, yearChart: yearChart, esc: esc };
})();
