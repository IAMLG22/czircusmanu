/* =============================================================
   IDIOMAS — Spaghettería Circus
   -------------------------------------------------------------
   El HTML está escrito en español y así se queda. Si el visitante
   elige otro idioma, este script carga lib/i18n/<idioma>.js (un
   diccionario "texto en español" -> "traducción") y sustituye los
   textos en el navegador. También traduce lo que pinta el JS más
   tarde (la carta, el "Abierto ahora"...), porque vigila el DOM.

   - Lo que NO esté en el diccionario se queda en español.
   - Los nombres de los platos no se traducen a propósito.
   - Para corregir una traducción: edita lib/i18n/<idioma>.js.
   - Va en el <head> SIN defer para poder ocultar la página un
     instante y que no se vea el salto de español al otro idioma.
   ============================================================= */
(function () {
  "use strict";

  var VERSION = "20261012a";            // cambia al tocar los diccionarios
  var CLAVE = "circus_lang";
  var IDIOMAS = {
    es: "Español",
    en: "English",
    fr: "Français",
    de: "Deutsch",
    it: "Italiano"
  };

  /* Banderas en SVG: los emoji de bandera no se ven en Windows. */
  var BANDERAS = {
    es: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/></svg>',
    en: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6.6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="4"/></svg>',
    fr: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>',
    de: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/></svg>',
    it: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>'
  };

  /* ---------- Qué idioma toca ---------- */
  function idiomaInicial() {
    var guardado = null;
    try { guardado = localStorage.getItem(CLAVE); } catch (e) {}
    if (guardado && IDIOMAS[guardado]) return guardado;
    // Primera visita: probamos con el idioma del navegador.
    var nav = (navigator.language || "es").slice(0, 2).toLowerCase();
    return IDIOMAS[nav] ? nav : "es";
  }

  var idioma = idiomaInicial();
  var dic = null;                       // { strings: {}, patterns: [] }
  var raiz = document.documentElement;

  var api = window.CIRCUS_I18N = {
    lang: idioma,
    register: function (codigo, datos) {
      if (codigo !== idioma) return;
      dic = datos || {};
      dic.strings = dic.strings || {};
      dic.patterns = dic.patterns || [];
    },
    collect: recoger
  };

  /* ---------- Reglas de recorrido ---------- */
  var SALTAR = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, svg: 1, SVG: 1, IFRAME: 1 };
  var EN_LINEA = { STRONG: 1, EM: 1, B: 1, I: 1, A: 1, BR: 1, SPAN: 1, SMALL: 1, ABBR: 1, MARK: 1 };
  var ATRIBUTOS = ["alt", "aria-label", "title", "placeholder"];
  // Elementos cuyo texto propio NO se traduce (nombres de platos y marca).
  var TEXTO_INTACTO = ".carta-plato-nombre, [data-ruleta-plato], .brand-word, .nav-brand-word, .plato-body > h3";
  var LETRA = /[A-Za-zÀ-ÿ]/;

  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }

  function saltar(el) {
    return SALTAR[el.nodeName] || el.hasAttribute("data-no-i18n");
  }

  function tieneDatos(el) {
    if (el.id) return true;
    for (var i = 0; i < el.attributes.length; i++) {
      if (el.attributes[i].name.indexOf("data-") === 0) return true;
    }
    return false;
  }

  /* Un «bloque de texto» es un elemento con texto propio mezclado con
     etiquetas en línea (negritas, enlaces, saltos). Se traduce entero,
     HTML incluido, para no partir las frases. */
  function esBloque(el) {
    if (!el.children.length) return false;
    if (el.matches(TEXTO_INTACTO)) return false;
    var textoPropio = false, n;
    for (n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && LETRA.test(n.nodeValue)) { textoPropio = true; break; }
    }
    if (!textoPropio) return false;
    var hijos = el.getElementsByTagName("*");
    for (var i = 0; i < hijos.length; i++) {
      var h = hijos[i];
      if (!EN_LINEA[h.nodeName]) return false;
      if (tieneDatos(h)) return false;
      if (h.nodeName !== "BR" && !norm(h.textContent)) return false;
    }
    return true;
  }

  /* ---------- Buscar una traducción ---------- */
  function traducir(clave) {
    if (!dic || !clave) return null;
    var t = dic.strings[clave];
    if (typeof t === "string" && t) return t;
    for (var i = 0; i < dic.patterns.length; i++) {
      var m = clave.match(dic.patterns[i][0]);
      if (m) return dic.patterns[i][1](m, function (s) { return traducir(s) || s; });
    }
    return null;
  }

  /* ---------- Recorrido: sirve para traducir y para recoger claves ---------- */
  function visitar(el, hacer) {
    if (el.nodeType !== 1) return;
    hacer.atributos(el);
    if (saltar(el)) return;
    if (esBloque(el)) { hacer.bloque(el); return; }
    var intacto = el.matches(TEXTO_INTACTO);
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { if (!intacto && LETRA.test(n.nodeValue)) hacer.texto(n); }
      else if (n.nodeType === 1) visitar(n, hacer);
    }
  }

  var aplicar = {
    atributos: function (el) {
      for (var i = 0; i < ATRIBUTOS.length; i++) {
        var v = el.getAttribute(ATRIBUTOS[i]);
        if (!v || !LETRA.test(v)) continue;
        var t = traducir(norm(v));
        if (t && t !== v) el.setAttribute(ATRIBUTOS[i], t);
      }
    },
    bloque: function (el) {
      var t = traducir(norm(el.innerHTML));
      if (t) { el.innerHTML = t; return; }
      // Sin traducción del bloque entero: probamos trozo a trozo.
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (LETRA.test(n.nodeValue)) aplicar.texto(n); }
        else if (n.nodeType === 1) visitar(n, aplicar);
      }
    },
    texto: function (nodo) {
      var crudo = nodo.nodeValue;
      var t = traducir(norm(crudo));
      if (!t) return;
      // Conservamos los espacios de alrededor (separan de las etiquetas vecinas).
      var antes = /^\s/.test(crudo) ? " " : "";
      var despues = /\s$/.test(crudo) ? " " : "";
      var nuevo = antes + t + despues;
      if (nuevo !== crudo) nodo.nodeValue = nuevo;
    }
  };

  function traducirCabeza() {
    var t = traducir(norm(document.title));
    if (t) document.title = t;
    var metas = document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]');
    for (var i = 0; i < metas.length; i++) {
      var c = metas[i].getAttribute("content");
      var tc = c && traducir(norm(c));
      if (tc) metas[i].setAttribute("content", tc);
    }
  }

  /* Herramienta de mantenimiento: lista los textos en español de la página
     (ejecutar CIRCUS_I18N.collect() en la consola, con la web en español). */
  function recoger() {
    var vistas = {}, lista = [];
    function apunta(k) { k = norm(k); if (k && LETRA.test(k) && !vistas[k]) { vistas[k] = 1; lista.push(k); } }
    apunta(document.title);
    var metas = document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]');
    for (var i = 0; i < metas.length; i++) apunta(metas[i].getAttribute("content") || "");
    visitar(document.body, {
      atributos: function (el) {
        for (var j = 0; j < ATRIBUTOS.length; j++) { var v = el.getAttribute(ATRIBUTOS[j]); if (v) apunta(v); }
      },
      bloque: function (el) { apunta(el.innerHTML); },
      texto: function (n) { apunta(n.nodeValue); }
    });
    return lista;
  }

  /* ---------- Vigilar lo que el JS pinta después ---------- */
  var ocupado = false, vigia = null;

  function conPausa(fn) {
    ocupado = true;
    try { fn(); } finally {
      if (vigia) vigia.takeRecords();
      ocupado = false;
    }
  }

  function vigilar() {
    if (!window.MutationObserver) return;
    vigia = new MutationObserver(function (cambios) {
      if (ocupado) return;
      conPausa(function () {
        for (var i = 0; i < cambios.length; i++) {
          var c = cambios[i];
          if (c.type === "childList") {
            for (var j = 0; j < c.addedNodes.length; j++) {
              var n = c.addedNodes[j];
              if (n.nodeType === 1) visitar(n, aplicar);
              else if (n.nodeType === 3 && n.parentNode && LETRA.test(n.nodeValue) &&
                       !saltar(n.parentNode) && !n.parentNode.matches(TEXTO_INTACTO) &&
                       !n.parentNode.closest("[data-no-i18n]")) aplicar.texto(n);
            }
          } else if (c.type === "characterData") {
            var p = c.target.parentNode;
            if (p && p.nodeType === 1 && !saltar(p) && !p.matches(TEXTO_INTACTO) &&
                !p.closest("[data-no-i18n]")) aplicar.texto(c.target);
          } else if (c.type === "attributes" && c.target.nodeType === 1) {
            aplicar.atributos(c.target);
          }
        }
      });
    });
    vigia.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATRIBUTOS
    });
  }

  /* ---------- Selector de idioma (bandera + desplegable) ---------- */
  function montarSelector() {
    var nav = document.querySelector(".site-header .nav");
    if (!nav || nav.querySelector(".lang-switch")) return;

    var caja = document.createElement("div");
    caja.className = "lang-switch";
    caja.setAttribute("data-no-i18n", "");

    var opciones = "";
    for (var cod in IDIOMAS) {
      opciones +=
        '<li><button type="button" class="lang-op" data-lang="' + cod + '" lang="' + cod + '"' +
        (cod === idioma ? ' aria-current="true"' : "") + ">" +
        '<span class="lang-flag">' + BANDERAS[cod] + "</span>" +
        "<span>" + IDIOMAS[cod] + "</span></button></li>";
    }
    caja.innerHTML =
      '<button type="button" class="lang-btn" aria-haspopup="true" aria-expanded="false" ' +
      'aria-label="Idioma / Language: ' + IDIOMAS[idioma] + '">' +
      '<span class="lang-flag">' + BANDERAS[idioma] + "</span>" +
      '<svg class="lang-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
      "</button>" +
      '<ul class="lang-menu" hidden>' + opciones + "</ul>";

    // Interiores: junto a «Reservar». Home: al final de la barra.
    var acciones = nav.querySelector(".nav-actions");
    var hamburguesa = nav.querySelector(".nav-toggle");
    if (acciones) acciones.insertBefore(caja, hamburguesa && hamburguesa.parentNode === acciones ? hamburguesa : null);
    else nav.insertBefore(caja, hamburguesa || null);

    var boton = caja.querySelector(".lang-btn");
    var menu = caja.querySelector(".lang-menu");

    function cerrar() { menu.hidden = true; boton.setAttribute("aria-expanded", "false"); }
    function abrir() { menu.hidden = false; boton.setAttribute("aria-expanded", "true"); }

    boton.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) abrir(); else cerrar();
    });
    menu.addEventListener("click", function (e) {
      var op = e.target.closest("[data-lang]");
      if (!op) return;
      var nuevo = op.getAttribute("data-lang");
      try { localStorage.setItem(CLAVE, nuevo); } catch (err) {}
      if (nuevo === idioma) { cerrar(); return; }
      // Recargar es lo más seguro: la página vuelve a pintarse desde el
      // español original y se traduce de una vez al idioma nuevo.
      window.location.reload();
    });
    document.addEventListener("click", function (e) { if (!caja.contains(e.target)) cerrar(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { cerrar(); boton.focus(); }
    });
  }

  /* ---------- Arranque ---------- */
  function mostrar() { raiz.classList.remove("i18n-pendiente"); }

  function alListo(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  alListo(montarSelector);

  if (idioma === "es") return;           // nada que traducir

  raiz.lang = idioma;
  raiz.classList.add("i18n-pendiente");  // ver styles.css: oculta el body
  setTimeout(mostrar, 1500);             // por si el diccionario no llega

  var s = document.createElement("script");
  s.src = "lib/i18n/" + idioma + ".js?v=" + VERSION;
  s.onerror = mostrar;
  s.onload = function () {
    alListo(function () {
      if (dic) {
        conPausa(function () {
          traducirCabeza();
          visitar(document.body, aplicar);
        });
        vigilar();
      }
      mostrar();
    });
  };
  document.head.appendChild(s);
})();
