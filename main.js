/* =============================================================
   SPAGHETTERÍA CIRCUS — main.js
   Patrón IIFE (sin módulos ES) para que funcione con doble clic,
   por FTP y en Hostinger sin configuración.
   Cada init va aislado en safe() para que un fallo no rompa el resto.
   ============================================================= */
(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Helpers ---------- */
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  // Placeholder de foto reutilizable (mientras no haya imágenes reales)
  // Para sustituir por foto real: reemplaza este HTML por <img src="assets/img/xxx.webp" ...>
  function phImg(hint) {
    return `<div class="ph-img" role="img" aria-label="${escHTML(hint || "Foto pendiente")}">
      <span><span class="ph-ico" aria-hidden="true">◆</span><br>${escHTML(hint || "FOTO pendiente")}</span>
    </div>`;
  }

  /* =============================================================
     TELÓN de apertura (solo Home) — desactivable tras 1ª visita
     ============================================================= */
  function initTelon() {
    const telon = $("[data-telon]");
    if (!telon) return;

    // Si ya lo vio antes, o reduced-motion, no lo mostramos
    let visto = false;
    try { visto = localStorage.getItem("circus_telon") === "1"; } catch (_) {}
    if (visto || reduced) { telon.classList.add("is-done"); return; }

    // Abrir el telón tras un instante
    document.body.style.overflow = "hidden";
    setTimeout(() => telon.classList.add("is-open"), 900);
    // Retirarlo del flujo y desbloquear scroll
    setTimeout(() => {
      telon.classList.add("is-done");
      document.body.style.overflow = "";
      try { localStorage.setItem("circus_telon", "1"); } catch (_) {}
    }, 2200);

    // Seguridad: si algo falla, se retira igual
    setTimeout(() => {
      telon.classList.add("is-done");
      document.body.style.overflow = "";
    }, 4000);
  }

  /* =============================================================
     NAV móvil (hamburguesa) + sombra al hacer scroll
     ============================================================= */
  function initNav() {
    const header = $(".site-header");
    // OJO: la hamburguesa ya NO abre el desplegable de la cabecera; de eso se
    // encarga initMenuKinetico(). Aqui solo queda la sombra al hacer scroll.

    // En la home la clase .is-scrolled la pone initBrandMorph (cuando el
    // logo termina de aparcar), así que aquí no la tocamos para no pelearnos.
    if (header && !document.body.classList.contains("has-morph")) {
      const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* =============================================================
     LOGO QUE VIAJA CON EL SCROLL (solo home)
     El logo vive dentro de la cabecera fija. Estando arriba del todo lo
     bajamos a la portada y lo agrandamos; al bajar, sube y se encoge hasta
     quedar «aparcado» en la barra. Es una función pura del scroll (no una
     animación con estado), así que al subir vuelve solo a su sitio, sin
     saltos ni desincronizaciones.

     NITIDEZ: no usamos transform: scale(). Escalar texto con scale() estira
     un mapa de bits rasterizado al tamaño pequeño y el logo sale pixelado.
     Aquí interpolamos el font-size (--morph-size), que hace que el navegador
     redibuje las letras vectorialmente a cada tamaño; el transform sólo
     mueve (--morph-y), que no deforma.
     ============================================================= */
  function initBrandMorph() {
    const header = $("[data-header]");
    const brand = $("[data-brand-morph]");
    const hero = $(".hero");
    const hueco = $("[data-logo-space]");
    if (!header || !brand || !hero || !hueco) return;

    document.body.classList.add("has-morph");

    let bajada = 0;   // px que baja el logo cuando estamos arriba del todo
    let tamMin = 0;   // font-size aparcado en la barra (px)
    let tamMax = 0;   // font-size grande en la portada (px)
    let pintando = false;

    function medir() {
      // Volvemos al reposo (aparcado) para medir el tamaño «pequeño» real
      brand.style.removeProperty("--morph-size");
      brand.style.removeProperty("--morph-y");
      hueco.style.height = "0px";
      const caja = brand.getBoundingClientRect();
      if (!caja.width) return;

      tamMin = parseFloat(getComputedStyle(brand).fontSize) || 18;
      const vw = window.innerWidth;
      const anchoObjetivo = Math.min(vw * (vw < 720 ? 0.84 : 0.58), 820);
      // El ancho del logo es proporcional al font-size: regla de tres.
      tamMax = Math.max(tamMin, tamMin * (anchoObjetivo / caja.width));

      // 1) Reservamos en la portada el hueco que ocupará el logo grande…
      hueco.style.height = (caja.height * (tamMax / tamMin)) + "px";
      // 2) …y ya sabemos dónde cae, así que podemos centrarlo en él.
      const h = hueco.getBoundingClientRect();
      const centroHueco = h.top + window.scrollY + h.height / 2;
      const centroAparcado = caja.top + caja.height / 2; // la cabecera es fija
      bajada = Math.max(0, centroHueco - centroAparcado);

      pintar();
    }

    function pintar() {
      const y = Math.max(bajada - window.scrollY, 0);
      const p = bajada > 0 ? 1 - y / bajada : 1;   // 0 = portada · 1 = aparcado
      const suave = p * p * (3 - 2 * p);           // smoothstep
      const tam = tamMax + (tamMin - tamMax) * suave;

      // Redondeamos a píxeles enteros: con tamaños y desplazamientos
      // fraccionarios las letras se recolocan medio píxel en cada fotograma
      // y el logo "vibra" y se ve sucio mientras se hace scroll.
      brand.style.setProperty("--morph-y", Math.round(y) + "px");
      brand.style.setProperty("--morph-size", Math.round(tam) + "px");

      const aparcado = p > 0.99;
      brand.classList.toggle("is-aparcado", aparcado);
      // La cabecera solo se vuelve sólida cuando el logo ya ha aparcado
      header.classList.toggle("is-scrolled", aparcado);
      // …y los botones flotantes de móvil esperan a ese mismo momento para
      // no taparle los CTAs a la portada.
      document.body.classList.toggle("nav-aparcado", aparcado);
    }

    function onScroll() {
      if (pintando) return;
      pintando = true;
      requestAnimationFrame(function () { pintando = false; pintar(); });
    }

    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", medir);
    window.addEventListener("orientationchange", medir);
    // Las fuentes de Google llegan tarde y cambian el ancho del logo
    window.addEventListener("load", medir);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(medir).catch(function () {});
    }
  }

  /* =============================================================
     WIDGET "Abierto ahora / Cerrado" — calculado en vivo
     ============================================================= */
  function toMin(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }

  function estadoAhora() {
    const hours = data.hours || {};
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const franjas = hours[day] || [];
    for (const [ini, fin] of franjas) {
      if (mins >= toMin(ini) && mins < toMin(fin)) {
        return { abierto: true, cierra: fin };
      }
    }
    // Buscar próxima apertura (hoy o siguientes días)
    for (let i = 0; i < 7; i++) {
      const d = (day + i) % 7;
      const fr = hours[d] || [];
      for (const [ini] of fr) {
        if (i === 0 && mins >= toMin(ini)) continue; // ya pasó hoy
        const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
        const cuando = i === 0 ? "hoy" : (i === 1 ? "mañana" : "el " + nombres[d]);
        return { abierto: false, abre: ini, cuando };
      }
    }
    return { abierto: false };
  }

  function initEstado() {
    const els = $$("[data-estado]");
    if (!els.length) return;
    const st = estadoAhora();
    els.forEach(el => {
      el.classList.toggle("is-abierto", st.abierto);
      el.classList.toggle("is-cerrado", !st.abierto);
      const txt = st.abierto
        ? `Abierto ahora · hasta las ${st.cierra}`
        : (st.abre ? `Cerrado · abre ${st.cuando} a las ${st.abre}` : "Cerrado ahora");
      el.innerHTML = `<span class="punto" aria-hidden="true"></span><span>${escHTML(txt)}</span>`;
    });
  }

  /* =============================================================
     MOUNT: platos estrella (Home) desde el manifest
     ============================================================= */
  function mountStars() {
    const target = $("[data-stars]");
    if (!target || target.dataset.mounted || !data.stars) return;
    target.dataset.mounted = "1";
    target.innerHTML = data.stars.map((p, i) => `
      <article class="plato-card reveal reveal-delay-${(i % 3) + 1}">
        <div class="plato-media">
          ${phImg(p.photoHint)}
          ${p.badge ? `<span class="plato-badge">${escHTML(p.badge)}</span>` : ""}
          <span class="plato-precio">${escHTML(p.price)} €</span>
        </div>
        <div class="plato-body">
          <h3>${escHTML(p.name)}</h3>
          <p>${escHTML(p.desc)}</p>
        </div>
      </article>
    `).join("");
    // Re-observamos los nuevos .reveal
    observeReveals(target);
  }

  /* =============================================================
     MOUNT: carta completa (carta.html) desde el manifest
     ============================================================= */
  function mountMenu() {
    const target = $("[data-menu]");
    if (!target || target.dataset.mounted || !data.menu) return;
    target.dataset.mounted = "1";
    const nums = ["I", "II", "III", "IV", "V"];
    target.innerHTML = data.menu.map((acto, ai) => {
      const items = acto.items.map(it => {
        const photo = it.star ? `<div class="menu-photo">${phImg(it.photoHint)}</div>` : "";
        return `
          <div class="menu-item ${it.star ? "has-photo" : ""}">
            ${photo}
            <h3>${escHTML(it.name)} ${it.star ? '<span class="star-mark" aria-hidden="true">★</span>' : ""}</h3>
            <span class="menu-price">${escHTML(it.price)} €</span>
            ${it.desc ? `<p class="menu-desc">${escHTML(it.desc)}</p>` : ""}
          </div>`;
      }).join("");
      return `
        <section class="acto reveal" data-acto>
          <button class="acto-toggle" data-acto-toggle aria-expanded="true">
            <span class="acto-head" style="flex:1">
              <span class="acto-num">${nums[ai] || (ai + 1)}</span>
              <span>
                <span class="h2" style="display:block;color:var(--granate)">${escHTML(acto.act)}</span>
                <span class="acto-sub">${escHTML(acto.subtitle || "")}</span>
              </span>
            </span>
            <span class="chevron" aria-hidden="true">▾</span>
          </button>
          <div class="menu-list" data-acto-panel>${items}</div>
        </section>`;
    }).join("");
    observeReveals(target);
    initAcordeon();
  }

  /* =============================================================
     ACORDEÓN de la carta (colapsable en móvil)
     ============================================================= */
  function initAcordeon() {
    // Acordeón dirigido por CSS: la clase .is-collapsed solo oculta el panel
    // en móvil (media query). En escritorio no tiene efecto visual, así que
    // el estado sobrevive a los cambios de tamaño de ventana.
    $$("[data-acto-toggle]").forEach((btn, i) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      const acto = btn.closest("[data-acto]") || btn.parentElement;
      // Estado inicial: colapsado salvo el primer acto (solo se nota en móvil)
      if (i !== 0) {
        acto.classList.add("is-collapsed");
        btn.setAttribute("aria-expanded", "false");
      }
      btn.addEventListener("click", () => {
        // Solo funciona como acordeón en móvil; en escritorio se ve todo
        if (!matchMedia("(max-width: 719px)").matches) return;
        const collapsed = acto.classList.toggle("is-collapsed");
        btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    });
  }

  /* =============================================================
     INSTAGRAM — doble carrusel horizontal
     Una fila va hacia la izquierda y la otra hacia la derecha. Para que no
     se vea el salto, cada pista tiene que llevar sus fotos DOS veces: la
     animación la desplaza justo media pista y, al reiniciar, la copia está
     donde estaba el original. Duplicamos aquí en vez de en el HTML para no
     repetir el marcado a mano (y para poder añadir o quitar fotos sin
     tocar nada más).
     ============================================================= */
  function initIgCarrusel() {
    const pistas = $$("[data-ig-pista]");
    if (!pistas.length) return;

    pistas.forEach(function (pista) {
      if (pista.dataset.duplicada) return;
      const fotos = Array.from(pista.children);
      if (!fotos.length) return;
      pista.dataset.duplicada = "1";

      fotos.forEach(function (foto) {
        const copia = foto.cloneNode(true);
        // La copia es puro decorado: ni la leen los lectores de pantalla ni
        // se puede tabular hasta ella.
        copia.setAttribute("aria-hidden", "true");
        $$("a, button", copia).forEach(function (el) { el.setAttribute("tabindex", "-1"); });
        pista.appendChild(copia);
      });

      // Sólo arrancamos la animación una vez duplicado
      pista.classList.add("is-listo");
    });
  }

  /* =============================================================
     REVEAL on scroll (IntersectionObserver + red de seguridad)
     ============================================================= */
  let _io = null;
  function observeReveals(scope) {
    const els = $$(".reveal:not(.is-visible)", scope || document);
    if (!els.length) return;
    if (reduced) { els.forEach(el => el.classList.add("is-visible")); return; }
    if (!_io) {
      _io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add("is-visible"); _io.unobserve(e.target); }
        });
      }, { threshold: 0.04, rootMargin: "0px 0px -4% 0px" });
    }
    els.forEach(el => _io.observe(el));
  }
  function initReveals() {
    observeReveals(document);
    // Red de seguridad: a los 6s, revelar lo que siga oculto y esté en pantalla
    setTimeout(() => {
      $$(".reveal:not(.is-visible)").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.2) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* =============================================================
     SMOOTH SCROLL para anclas (#) con offset del header
     ============================================================= */
  function initSmoothScroll() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navH - 12,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* =============================================================
     PARALLAX suave del hero (solo si hay GSAP)
     ============================================================= */
  function initHeroParallax() {
    const media = $(".hero-media");
    if (!media || reduced) return;
    gsap.to(media, {
      yPercent: 12,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
    });
  }

  /* =============================================================
     Rellenar datos de contacto/horarios desde el manifest
     (footer y páginas). Marcados con data-fill.
     ============================================================= */
  function fillData() {
    const c = data.contact || {};
    const map = {
      "phone": c.phone,
      "email": c.email,
      "address": c.address,
      "city": c.city,
      "instagram": "@" + (c.instagram || "")
    };
    $$("[data-fill]").forEach(el => {
      const key = el.getAttribute("data-fill");
      if (map[key]) el.textContent = map[key];
    });
    // Prueba social (placeholder)
    const sp = data.social_proof || {};
    $$("[data-rating]").forEach(el => { el.textContent = sp.rating; });
    $$("[data-reviews]").forEach(el => { el.textContent = sp.reviews; });
  }

  /* =============================================================
     MENU KINETICO (overlay movil)
     Adaptacion del componente de referencia (React + GSAP) a vanilla.
     Cambios respecto al original, a proposito:
       - No se tocan los gsap.defaults() globales: el original los pisaba y
         aqui se llevaria por delante el resto de animaciones del sitio.
       - La curva "0.65, 0.01, 0.05, 0.99" se resuelve a mano porque el
         plugin CustomEase no esta en lib/.
       - Las formas van por hover, que en tactil no existe, asi que al abrir
         se enciende una por defecto para que el fondo no quede muerto.
     ============================================================= */

  // Resolvedor de cubic-bezier: devuelve una funcion de easing para GSAP.
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const fx = (t) => ((ax * t + bx) * t + cx) * t;
    const fy = (t) => ((ay * t + by) * t + cy) * t;
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let lo = 0, hi = 1, t = p;
      for (let i = 0; i < 24; i++) {
        if (fx(t) < p) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return fy(t);
    };
  }

  function initMenuKinetico() {
    const kn = $("[data-kn]");
    const toggle = $("[data-nav-toggle]");
    if (!kn || !toggle) return;

    const overlay = $(".kn-overlay", kn);
    const menu    = $(".kn-menu", kn);
    const paneles = $$(".kn-backdrop", kn);
    const links   = $$(".kn-link", kn);
    const fades   = $$("[data-kn-fade]", kn);
    const icono   = $(".kn-close-ico", kn);
    const items   = $$(".kn-item[data-shape]", kn);
    const cierres = $$("[data-kn-close]", kn);
    const cajaFormas = $(".kn-shapes", kn);

    const G = window.gsap;
    const anima = !!G && !reduced;
    const main = cubicBezier(0.65, 0.01, 0.05, 0.99);
    let abierto = false;
    let tl = null;

    /* ---------- formas ambientales ---------- */
    function formaDe(item) {
      if (!cajaFormas) return null;
      return $(".kn-shape-" + item.getAttribute("data-shape"), cajaFormas);
    }
    function encender(forma) {
      if (!forma) return;
      $$(".kn-shape", cajaFormas).forEach(f => f.classList.remove("active"));
      forma.classList.add("active");
      const trozos = $$(".kn-shape-el", forma);
      if (!anima) { trozos.forEach(t => { t.style.opacity = "1"; }); return; }
      G.fromTo(trozos,
        { scale: 0.5, opacity: 0, rotation: -10 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08,
          ease: "back.out(1.7)", overwrite: "auto" });
    }
    function apagar(forma) {
      if (!forma || !anima) return;
      G.to($$(".kn-shape-el", forma), {
        scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.in",
        overwrite: "auto",
        onComplete: () => forma.classList.remove("active")
      });
    }

    // El hover solo se engancha donde existe de verdad.
    if (matchMedia("(hover: hover)").matches) {
      items.forEach(item => {
        item.addEventListener("mouseenter", () => encender(formaDe(item)));
        item.addEventListener("mouseleave", () => apagar(formaDe(item)));
      });
    }

    /* ---------- abrir / cerrar ---------- */
    function abrir() {
      if (abierto) return;
      abierto = true;
      kn.setAttribute("data-kn", "open");
      document.body.classList.add("kn-abierto");
      toggle.setAttribute("aria-expanded", "true");
      if (items[0]) encender(formaDe(items[0]));

      if (anima) {
        if (tl) tl.kill();
        tl = G.timeline({ defaults: { ease: main, duration: 0.7 } });
        tl.set(menu, { xPercent: 0 })
          .fromTo(icono,   { rotation: 0 },   { rotation: 315 }, 0)
          .fromTo(overlay, { autoAlpha: 0 },  { autoAlpha: 1 }, 0)
          .fromTo(paneles, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, 0)
          .fromTo(links,   { yPercent: 140, rotation: 10 },
                           { yPercent: 0, rotation: 0, stagger: 0.05 }, 0.35);
        if (fades.length) {
          tl.fromTo(fades, { autoAlpha: 0, yPercent: 50 },
            { autoAlpha: 1, yPercent: 0, stagger: 0.04,
              clearProps: "transform,opacity,visibility" }, 0.55);
        }
      }
      // El foco entra en el panel para que con teclado no se quede detras.
      const cerrar1 = $(".kn-close", kn);
      if (cerrar1) cerrar1.focus({ preventScroll: true });
    }

    function cerrar() {
      if (!abierto) return;
      abierto = false;
      document.body.classList.remove("kn-abierto");
      toggle.setAttribute("aria-expanded", "false");

      if (!anima) { kn.setAttribute("data-kn", "closed"); return; }
      if (tl) tl.kill();
      tl = G.timeline({ defaults: { ease: main, duration: 0.7 } });
      tl.to(overlay, { autoAlpha: 0 }, 0)
        .to(menu,    { xPercent: 120 }, 0)
        .to(icono,   { rotation: 0 }, 0)
        .add(() => kn.setAttribute("data-kn", "closed"));
    }

    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", (e) => { e.preventDefault(); abrir(); });
    cierres.forEach(b => b.addEventListener("click", () => {
      cerrar();
      toggle.focus({ preventScroll: true });
    }));
    // Al pulsar un enlace cerramos: si es la pagina actual, si no se queda abierto.
    links.forEach(a => a.addEventListener("click", () => cerrar()));
    $$(".kn-cta a", kn).forEach(a => a.addEventListener("click", () => cerrar()));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && abierto) { cerrar(); toggle.focus({ preventScroll: true }); }
    });
    // Si se pasa a escritorio con el menu abierto, lo recogemos.
    matchMedia("(min-width: 960px)").addEventListener("change", (ev) => {
      if (ev.matches && abierto) cerrar();
    });
  }

  /* =============================================================
     RULETA DE LA SUERTE (carta.html)
     Sortea un plato para quien no sabe qué pedir. El disco (sectores,
     etiquetas y bombillas) se pinta aquí desde RULETA_PLATOS: una sola
     lista, así los sectores y sus etiquetas no pueden descuadrarse.

     GEOMETRÍA: el sector i ocupa [i*paso, (i+1)*paso] grados contados
     desde las 12 en punto —donde está la aguja— y en sentido del reloj.
     Para que gane el sector i hay que dejar su bisectriz a 0º, o sea
     girar el disco 360 - bisectriz grados.

     PARA MANTENERLO: si cambian los platos o los precios en el Excel,
     actualiza también esta lista (la ruleta no lee el Excel a propósito:
     así el dueño elige qué ocho números entran en el sorteo). Con un
     número par de platos los colores quedan alternos; con impar, dos
     vecinos comparten color.
     ============================================================= */
  const RULETA_PLATOS = [
    { nombre: "Carbonara",      tipo: "Spaghetti",             desc: "Bacon y nata",                              precio: "11,80 €" },
    { nombre: "Carpa",          tipo: "Spaghetti gratinado",   desc: "Jamón, bechamel y queso",                   precio: "11,90 €" },
    { nombre: "Bolognesa",      tipo: "Macarrones",            desc: "Tomate, carne y verduras frescas",          precio: "10,90 €" },
    { nombre: "Mágico",         tipo: "Macarrones gratinados", desc: "Champiñón, bechamel y queso",               precio: "11,90 €" },
    { nombre: "Al roquefort",   tipo: "Spaghetti",             desc: "Nata y roquefort",                          precio: "11,80 €" },
    { nombre: "Fantasía",       tipo: "Spaghetti gratinado",   desc: "Nata, champiñones y queso",                 precio: "13,80 €" },
    { nombre: "Vegetariano",    tipo: "Macarrones",            desc: "Verduras frescas y salsa de tomate",        precio: "9,90 €" },
    { nombre: "Ensalada César", tipo: "Entrante",              desc: "Pollo, parmesano, picatostes y salsa César", precio: "8,50 €" }
  ];

  function initRuleta() {
    const caja = $("[data-ruleta]");
    if (!caja) return;

    const disco  = $("[data-ruleta-disco]", caja);
    const luces  = $("[data-ruleta-luces]", caja);
    const btn    = $("[data-ruleta-girar]", caja);
    const estado = $("[data-ruleta-estado]", caja);
    const modal  = $("[data-ruleta-modal]");
    const dialogo = modal && $("[data-ruleta-dialogo]", modal);
    if (!disco || !btn || !modal || !dialogo) return;

    const platos = RULETA_PLATOS;
    const n = platos.length;
    const paso = 360 / n;
    const CX = 200, CY = 200, R = 200;   // viewBox 0 0 400 400
    const VUELTAS = 5;                   // vueltas enteras antes de frenar
    const DURACION = 4400;               // ms; igual que la transición del CSS

    /* Grados (0 = las 12) + radio -> coordenadas del viewBox */
    function punto(grados, radio) {
      const rad = (grados - 90) * Math.PI / 180;
      return [CX + radio * Math.cos(rad), CY + radio * Math.sin(rad)];
    }
    const num = (v) => Math.round(v * 100) / 100;

    /* ---------- Pintar el disco ---------- */
    function pintar() {
      let svg = '<svg viewBox="0 0 400 400" role="img" aria-label="Ruleta con ' + n +
                ' platos de la carta" focusable="false">';

      platos.forEach((_, i) => {
        const [x1, y1] = punto(i * paso, R);
        const [x2, y2] = punto((i + 1) * paso, R);
        const grande = paso > 180 ? 1 : 0;
        svg += '<path class="ruleta-sec ruleta-sec--' + (i % 2 ? "b" : "a") + '" d="' +
               "M" + CX + " " + CY + " L" + num(x1) + " " + num(y1) +
               " A" + R + " " + R + " 0 " + grande + " 1 " + num(x2) + " " + num(y2) + " Z" + '"/>';
      });

      platos.forEach((plato, i) => {
        // Bisectriz del sector: por ahí va la etiqueta, del borde hacia dentro.
        const centro = i * paso + paso / 2;
        let giro = centro - 90;               // el texto del SVG corre hacia +x
        let x = CX + R - 26, ancla = "end";
        const norm = ((giro % 360) + 360) % 360;
        // Media rueda quedaría del revés: se voltea y se lee desde el otro lado.
        if (norm > 90 && norm < 270) { giro += 180; x = CX - R + 26; ancla = "start"; }

        svg += '<g transform="rotate(' + num(giro) + ' ' + CX + ' ' + CY + ')">' +
                 '<text class="ruleta-et ruleta-et--' + (i % 2 ? "b" : "a") + '" x="' + num(x) +
                       '" y="' + CY + '" text-anchor="' + ancla + '">' +
                   '<tspan class="ruleta-et-nombre" x="' + num(x) + '" dy="-3">' + escHTML(plato.nombre) + '</tspan>' +
                   '<tspan class="ruleta-et-tipo" x="' + num(x) + '" dy="15">' + escHTML(plato.tipo) + '</tspan>' +
                 '</text>' +
               '</g>';
      });

      svg += "</svg>";
      disco.innerHTML = svg;

      // Dos bombillas por sector, repartidas por el aro dorado.
      if (luces) {
        const total = n * 2;
        let html = "";
        for (let i = 0; i < total; i++) {
          html += '<span class="luz" style="--giro:' + num(i * (360 / total)) +
                  'deg; --retardo:' + (i % 2 ? ".8s" : "0s") + '"></span>';
        }
        luces.innerHTML = html;
      }

      ajustarEtiquetas();
      caja.classList.add("es-lista");
    }

    /* Una etiqueta larga ("Macarrones gratinados") se comeria el eje: si no
       cabe en el radio util la apretamos con textLength en vez de recortarla.
       Se repasa cuando cargan las tipografias, que cambian los anchos. */
    function ajustarEtiquetas() {
      const MAX = 132;      // del borde del disco al eje, en unidades del viewBox
      $$(".ruleta-et tspan", disco).forEach(el => {
        el.removeAttribute("textLength");
        el.removeAttribute("lengthAdjust");
        let ancho = 0;
        try { ancho = el.getComputedTextLength(); } catch (_) { return; }
        if (ancho > MAX) {
          el.setAttribute("textLength", MAX);
          el.setAttribute("lengthAdjust", "spacingAndGlyphs");
        }
      });
    }

    /* ---------- Modal del resultado ---------- */
    let tempCierre = 0;

    function abrirModal(plato) {
      const pon = (sel, txt) => { const el = $(sel, modal); if (el) el.textContent = txt; };
      pon("[data-ruleta-plato]", plato.nombre);
      pon("[data-ruleta-tipo]", plato.tipo);
      pon("[data-ruleta-desc]", plato.desc);
      pon("[data-ruleta-precio]", plato.precio);
      if (estado) {
        estado.textContent = "Te ha salido " + plato.nombre + ", " + plato.tipo +
                             ": " + plato.desc + ". " + plato.precio + ".";
      }

      clearTimeout(tempCierre);
      modal.hidden = false;
      document.body.classList.add("ruleta-abierta");
      // Leer offsetWidth fuerza el cálculo de estilos: el navegador da por
      // pintado el estado inicial y la transición de entrada sí arranca.
      // (Con requestAnimationFrame se quedaba a medias si la pestaña estaba
      // oculta: no hay frames, así que el modal nunca se hacía visible.)
      void modal.offsetWidth;
      modal.classList.add("es-abierto");
      dialogo.focus();
    }

    function cerrarModal(devolverFoco) {
      modal.classList.remove("es-abierto");
      document.body.classList.remove("ruleta-abierta");
      clearTimeout(tempCierre);
      // Se retira del DOM cuando acaba el fundido (de golpe si no hay).
      if (reduced) modal.hidden = true;
      else tempCierre = setTimeout(() => { modal.hidden = true; }, 340);
      // El foco vuelve siempre al botón: es lo que abrió el modal.
      if (devolverFoco !== false) btn.focus();
    }

    /* ---------- Girar ---------- */
    let acumulado = 0;      // grados girados en total (siempre hacia adelante)
    let girando = false;

    function girar() {
      if (girando) return;
      girando = true;
      caja.classList.add("es-girando");
      btn.disabled = true;
      if (estado) estado.textContent = "Girando la ruleta…";

      const i = Math.floor(Math.random() * n);
      // Un poco de margen sobre la bisectriz: si parase siempre clavado en
      // el centro del sector se le vería el truco.
      const margen = (Math.random() * 2 - 1) * (paso / 2 - 5);
      const destino = 360 - (i * paso + paso / 2) + margen;
      const actual = ((acumulado % 360) + 360) % 360;
      const falta = (((destino - actual) % 360) + 360) % 360;
      acumulado += VUELTAS * 360 + falta;
      disco.style.transform = "rotate(" + num(acumulado) + "deg)";

      let cerrado = false;
      const terminar = () => {
        if (cerrado) return;
        cerrado = true;
        girando = false;
        caja.classList.remove("es-girando");
        btn.disabled = false;
        abrirModal(platos[i]);
      };

      // Con reduced-motion el CSS quita la transición: el disco ya está
      // colocado, así que sólo dejamos un compás antes de cantar el premio.
      if (reduced) { setTimeout(terminar, 260); return; }
      disco.addEventListener("transitionend", terminar, { once: true });
      // Red de seguridad: si el transitionend no llega (pestaña en segundo
      // plano, transición interrumpida…) cantamos el premio a mano.
      setTimeout(terminar, DURACION + 700);
    }

    /* ---------- Cableado ---------- */
    btn.addEventListener("click", girar);

    $$("[data-ruleta-cerrar]", modal).forEach(el =>
      el.addEventListener("click", () => cerrarModal()));

    const otra = $("[data-ruleta-otra]", modal);
    if (otra) otra.addEventListener("click", () => { cerrarModal(); girar(); });

    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); cerrarModal(); return; }
      if (e.key !== "Tab") return;
      // Trampa de foco: el tabulador no se escapa del modal.
      const focos = $$("button, [href]", dialogo).filter(el => !el.disabled);
      if (!focos.length) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || activo === dialogo)) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault(); primero.focus();
      }
    });

    pintar();
    // Las webfonts suelen llegar despues del primer pintado: al estar listas
    // los anchos cambian y hay que repasar las etiquetas apretadas.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(ajustarEtiquetas).catch(() => {});
    }
  }

  /* =============================================================
     BOOT
     ============================================================= */
  function boot() {
    safe(fillData, "fillData");
    safe(mountStars, "mountStars");
    safe(mountMenu, "mountMenu");
    safe(initTelon, "initTelon");
    safe(initBrandMorph, "initBrandMorph");
    safe(initNav, "initNav");
    safe(initMenuKinetico, "initMenuKinetico");
    safe(initEstado, "initEstado");
    safe(initIgCarrusel, "initIgCarrusel");
    safe(initReveals, "initReveals");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initAcordeon, "initAcordeon");
    safe(initRuleta, "initRuleta");

    // Actualizar estado abierto/cerrado cada minuto
    setInterval(() => safe(initEstado, "initEstado"), 60000);

    // Inits que dependen de GSAP (si cargó)
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initHeroParallax, "initHeroParallax");
    }

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* =============================================================
     ===== MÓDULOS EXPERIMENTALES (desactivados) =================
     Descomenta para activarlos. No deben estorbar la conversión.
     ============================================================= */

  /* --- (B) Scroll narrativo 1997→hoy con parallax (La Casa) ---
  function initNarrativa() {
    if (!window.gsap || reduced) return;
    $$("[data-tl-parallax]").forEach(el => {
      gsap.from(el, {
        y: 60, opacity: 0,
        scrollTrigger: { trigger: el, start: "top 85%", end: "top 50%", scrub: true }
      });
    });
  }
  // if (window.gsap && window.ScrollTrigger) safe(initNarrativa, "initNarrativa");
  */

})();
