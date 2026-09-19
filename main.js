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

  /* --- (A) "¿No sabes qué pedir?" — tómbola que sortea un plato ---
  function initTombola() {
    const btn = $("[data-tombola]");
    const out = $("[data-tombola-out]");
    if (!btn || !out || !data.menu) return;
    const todos = data.menu.flatMap(a => a.items.filter(i => i.price));
    btn.addEventListener("click", () => {
      let ticks = 0;
      const spin = setInterval(() => {
        const p = todos[Math.floor(Math.random() * todos.length)];
        out.textContent = p.name;
        if (++ticks > 18) {
          clearInterval(spin);
          out.classList.add("is-final");
        }
      }, 80);
    });
  }
  safe(initTombola, "initTombola");
  */

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
