(function () {
  "use strict";
  var MEMBERS = window.DYMAST_MEMBERS || [];
  var EMAIL = "aenlle@uniovi.es";

  function initials(name) {
    return name.split(/\s+/).filter(function (w) { return /^[A-ZÁÉÍÓÚÑ]/.test(w); })
      .slice(0, 2).map(function (w) { return w[0]; }).join("");
  }
  window.dymastAvatar = function (m, cls) {
    return m.photo
      ? '<img src="' + m.photo + '" alt="Fotografía de ' + m.name + '" width="480" height="480" loading="lazy">'
      : '<div class="avatar' + (cls ? " " + cls : "") + '" aria-hidden="true">' + initials(m.name) + "</div>";
  };
  var fmt = function (n) { return n.toLocaleString("es-ES"); };

  // ---- Mobile nav
  var btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  if (btn && nav) {
    btn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); btn.focus(); }
    });
  }

  // ---- Figures (precomputed by tools/scopus_fetch.py, or computed from the database if loaded)
  var S = window.DYMAST_STATS;
  if (!S && window.DYMAST_PUBLICATIONS) {
    var DB = window.DYMAST_PUBLICATIONS, core = MEMBERS.filter(function (m) { return m.group !== "col"; }).map(function (m) { return m.id; });
    var cp = DB.publications.filter(function (p) { return p.members.some(function (id) { return core.indexOf(id) > -1; }); });
    S = { pubs: cp.length, cites: cp.reduce(function (s, p) { return s + (p.cited || 0); }, 0), retrieved: DB.retrieved };
  }
  var set = function (k, v) { document.querySelectorAll('[data-stat="' + k + '"]').forEach(function (el) { el.textContent = v; }); };
  if (S) {
    set("pubs", fmt(S.pubs));
    set("cites", fmt(S.cites));
    document.querySelectorAll("[data-scopus-date]").forEach(function (el) {
      el.textContent = "Publicaciones y citas: Scopus, datos del " + new Date(S.retrieved).toLocaleDateString("es-ES") + ".";
    });
  }
  set("members", MEMBERS.filter(function (m) { return m.group !== "col"; }).length);

  // ---- Team
  var root = document.getElementById("team-root");
  if (root) {
    var groups = [["pdi", "Profesorado"], ["inv", "Personal investigador"], ["col", "Colaboradores"]];
    root.innerHTML = groups.map(function (g) {
      var list = MEMBERS.filter(function (m) { return m.group === g[0]; });
      return '<div class="team-group"><h3>' + g[1] + '</h3><div class="team">' + list.map(function (m) {
        return '<a class="person" href="miembro.html?id=' + m.id + '">' +
          '<div class="ph' + (m.photo ? "" : " no-photo") + '">' + window.dymastAvatar(m, g[0] === "col" ? "alt" : "") + "</div>" +
          '<div class="info"><b>' + m.name + "</b><span>" + m.role + "</span>" +
          (m.lead ? '<br><span class="lead-tag">Investigador responsable</span>' : "") +
          '<span class="more">Ver perfil →</span></div></a>';
      }).join("") + "</div></div>";
    }).join("");
  }

  // ---- Equipment tabs (WAI-ARIA)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var n = { ArrowRight: tabs[(i + 1) % tabs.length], ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[e.key];
      if (n) { e.preventDefault(); select(n); n.focus(); }
    });
  });

  // ---- Contact (mailto + copy fallback; no data stored)
  var form = document.getElementById("contact-form"), sent = document.getElementById("sent");
  if (form) {
    document.querySelectorAll("[data-subject]").forEach(function (a) {
      a.addEventListener("click", function () { form.asunto.value = a.getAttribute("data-subject"); });
    });
    var subject = "", body = "";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var f = form.elements;
      subject = "[Web DyMaSt] " + f.asunto.value;
      body = f.mensaje.value + "\n\n--\n" + f.nombre.value + (f.empresa.value ? " · " + f.empresa.value : "") + "\n" + f.email.value;
      document.getElementById("sent-text").value = "Para: " + EMAIL + "\nAsunto: " + subject + "\n\n" + body;
      form.hidden = true; sent.hidden = false; sent.focus();
      location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
    var status = document.getElementById("copy-status");
    sent.addEventListener("click", function (e) {
      var k = e.target.getAttribute("data-copy");
      if (!k) return;
      var txt = k === "email" ? EMAIL : document.getElementById("sent-text").value;
      var done = function () { status.textContent = k === "email" ? "Email copiado." : "Mensaje copiado."; };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () { document.getElementById("sent-text").select(); });
      else { document.getElementById("sent-text").select(); document.execCommand("copy"); done(); }
    });
    document.getElementById("sent-back").addEventListener("click", function () { sent.hidden = true; form.hidden = false; form.mensaje.focus(); });
  }

  // ---- Contact topic from ?tema= (links "Consultar" de otras páginas)
  if (form) {
    var tema = new URLSearchParams(location.search).get("tema");
    if (tema) Array.prototype.forEach.call(form.asunto.options, function (o) { if (o.text === tema) form.asunto.value = o.text; });
  }

  // ---- Floating CTA (mobile): aparece al desplazarse
  var float = document.querySelector(".float-cta");
  if (float) {
    var onScroll = function () { float.classList.toggle("show", window.scrollY > 500); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  // ---- Reveal
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -60px 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
})();
