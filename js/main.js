/* ============================================================
   42, rue du Bac. Interactions.
   Vanilla JS, aucune dépendance. IntersectionObserver pour tout
   ce qui dépend du scroll (jamais d'écouteur scroll direct).
   ============================================================ */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Écran d'ouverture ---------- */

  const loader = document.getElementById("loader");
  const revealSite = () => {
    document.body.classList.add("is-ready");
    loader.classList.add("is-done");
    loader.addEventListener("transitionend", () => loader.classList.add("is-removed"), { once: true });
  };

  if (reducedMotion || sessionStorage.getItem("rdb-seen")) {
    loader.classList.add("is-removed");
    document.body.classList.add("is-ready");
  } else {
    sessionStorage.setItem("rdb-seen", "1");
    // Le rideau se lève une fois la police et l'image du hero prêtes (1,6 s max).
    const minDelay = new Promise((r) => setTimeout(r, 1200));
    const maxDelay = new Promise((r) => setTimeout(r, 1600));
    const heroImg = document.querySelector(".hero__media img");
    const imgReady = heroImg.complete
      ? Promise.resolve()
      : new Promise((r) => heroImg.addEventListener("load", r, { once: true }));
    Promise.race([Promise.all([minDelay, imgReady]), maxDelay]).then(revealSite);
  }

  /* ---------- Hero : le titre se compose lettre à lettre ---------- */

  const heroTitle = document.querySelector(".hero__title");
  if (heroTitle && !reducedMotion) {
    const text = heroTitle.textContent;
    heroTitle.setAttribute("aria-label", text);
    heroTitle.classList.add("has-ch");
    let ci = 0;
    heroTitle.innerHTML = text
      .split(" ")
      .map((w) => `<span class="word" aria-hidden="true">${[...w].map((c) => `<span class="ch" style="--ci:${ci++}">${c}</span>`).join("")}</span>`)
      .join(" ");
  }

  /* ---------- Boutons magnétiques ---------- */

  if (!reducedMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".btn").forEach((b) => {
      // Rect mémorisé à l'entrée + écriture 1×/frame : zéro reflow par pointermove.
      let rect = null, raf = 0, next = "";
      b.addEventListener("pointerenter", () => { rect = b.getBoundingClientRect(); });
      b.addEventListener("pointermove", (e) => {
        if (!rect) rect = b.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        next = `${(dx * 0.16).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`;
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; b.style.translate = next; });
      });
      b.addEventListener("pointerleave", () => { rect = null; b.style.translate = ""; });
    });
  }

  /* ---------- Navigation : claire sur le hero, solide ensuite ---------- */

  const nav = document.getElementById("nav");
  const stickyCta = document.getElementById("stickyCta");
  let pastHero = false, atContact = false;
  const syncStickyCta = () => {
    if (stickyCta) stickyCta.classList.toggle("is-visible", pastHero && !atContact);
  };

  // Le hero est épinglé (effet rideau) : on observe un repère placé juste
  // après lui pour savoir si le contenu l'a recouvert.
  new IntersectionObserver(
    ([entry]) => {
      const past = entry.boundingClientRect.top <= 72;
      nav.classList.toggle("nav--light", !past);
      nav.classList.toggle("nav--solid", past);
      pastHero = past;
      syncStickyCta();
    },
    { rootMargin: "-72px 0px 0px 0px" }
  ).observe(document.getElementById("navSentinel"));

  // La barre de conversion permanente s'efface une fois le vrai bloc contact atteint
  // (design.md §7.2 : ne se démonte jamais avant le footer, mais devient redondante
  // une fois qu'on est dans le bloc de conversion final).
  const contactSection = document.getElementById("contact");
  if (contactSection) {
    new IntersectionObserver(
      ([entry]) => {
        atContact = entry.isIntersecting;
        syncStickyCta();
      },
      { rootMargin: "-40% 0px -40% 0px" }
    ).observe(contactSection);
  }

  /* ---------- Menu mobile ---------- */

  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");

  const closeMenu = () => {
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Ouvrir le menu");
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    nav.classList.remove("nav--menu-open");
    document.body.style.overflow = "";
  };

  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    if (open) return closeMenu();
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Fermer le menu");
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    nav.classList.add("nav--menu-open");
    document.body.style.overflow = "hidden";
  });

  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------- Révélations au scroll ---------- */

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  // Les vignettes de la galerie se révèlent en cascade (rangée par rangée)
  document.querySelectorAll(".galerie__grid button").forEach((b, i) => {
    b.classList.add("reveal");
    b.style.setProperty("--d", `${(i % 5) * 0.07}s`);
  });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Visite : le panneau d'images suit les chapitres ---------- */

  const mediaImgs = document.querySelectorAll(".visite__media img");
  if (mediaImgs.length) {
    const setChapter = (id) => {
      mediaImgs.forEach((img) => img.classList.toggle("is-active", img.dataset.chapter === id));
    };
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setChapter(entry.target.dataset.chapter);
        });
      },
      // Un chapitre devient actif quand il traverse le tiers central de l'écran.
      { rootMargin: "-38% 0px -38% 0px" }
    );
    document.querySelectorAll(".chapter").forEach((c) => chapterObserver.observe(c));
  }


  /* ---------- La balade continue : séquence scrubée au scroll ---------- */

  const walkEl = document.getElementById("walk");
  if (walkEl && !reducedMotion) {
    const TOTAL = 376;
    const PXF = 26; // pixels de défilement par image
    const walkSticky = document.getElementById("walkSticky");
    const walkCanvas = document.getElementById("walkCanvas");
    const wctx = walkCanvas.getContext("2d");
    const chapterEl = document.getElementById("walkChapter");
    const badgeEl = document.getElementById("walkBadge");
    const notesBox = document.getElementById("walkNotes");
    const loadBox = document.getElementById("walkLoad");
    const loadBar = document.getElementById("walkLoadBar");
    const heroEl = document.getElementById("walkHero");

    // [debut, fin, libellé, aménagement virtuel ?]
    const CHAPTERS = [
      [0, 85, "", false],
      [86, 109, "L'entrée, par la fenêtre du 5ᵉ", false],
      [110, 175, "5ᵉ étage, état actuel", false],
      [176, 241, "5ᵉ étage, aménagement virtuel", true],
      [242, 293, "Le 6ᵉ, par la trémie", true],
      [294, 327, "6ᵉ étage, aujourd'hui", false],
      [328, 375, "La vue", false],
    ];
    // [debut, fin, x %, y %, titre, sous-titre]
    const POINTS = [
      [116, 128, 34, 44, "Séjour", "traversant, poutres anciennes"],
      [150, 160, 52, 38, "Cuisine", "séparée, équipée"],
      [165, 175, 44, 46, "Chambre", "5ᵉ étage, côté calme"],
      [190, 205, 30, 46, "Séjour réinventé", "canapé velours, bibliothèque"],
      [212, 221, 62, 34, "Cuisine ouverte", "îlot central, projection"],
      [228, 238, 48, 48, "Chambre principale", "lit, tête de lit tissu"],
      [258, 273, 20, 72, "Arrivée de la trémie", "projection, étude structure"],
      [260, 274, 60, 38, "Salon sous les toits", "projection, bibliothèque"],
      [280, 290, 50, 50, "Chambre d'amis", "sous la pente, 9,42 m²"],
      [305, 314, 50, 40, "Le 6ᵉ aujourd'hui", "à rafraîchir"],
      [334, 370, 50, 38, "La vue", "musée d'Orsay, toits de Paris"],
    ];

    walkEl.style.height = `calc(${TOTAL * PXF}px + 100vh)`;

    const noteEls = POINTS.map(([f0, f1, x, y, t, s]) => {
      const el = document.createElement("div");
      el.className = "walk__note";
      el.style.left = x + "%";
      el.style.top = y + "%";
      el.innerHTML = `<i></i><div><strong>${t}</strong><span>${s}</span></div>`;
      notesBox.appendChild(el);
      return { el, f0, f1 };
    });

    // Rail de chapitres : repères de la narration, à droite de la balade.
    const railChaps = CHAPTERS.filter((c) => c[2]);
    const railEl = document.getElementById("walkRail");
    const railSteps = railChaps.map((c, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "walk__rail-step";
      b.innerHTML = `<span class="walk__rail-dot"></span><span class="walk__rail-label">${c[2]}</span>`;
      // Clic = saut fluide vers le début du chapitre.
      b.addEventListener("click", () => {
        const span = walkEl.offsetHeight - window.innerHeight;
        const target = walkEl.offsetTop + (c[0] / (TOTAL - 1)) * span;
        window.scrollTo({ top: target, behavior: "smooth" });
      });
      railEl.appendChild(b);
      return b;
    });

    const wImages = new Array(TOTAL);
    let wLoaded = 0, wStarted = false, wLast = -1, wChapLast = -2;
    const wSrc = (i) => `assets/walk/f${String(i).padStart(4, "0")}.jpg`;

    const wStartLoading = () => {
      if (wStarted) return;
      wStarted = true;
      loadBox.hidden = false;
      let next = 0, inFlight = 0;
      const pump = () => {
        while (inFlight < 8 && next < TOTAL) {
          const i = next++;
          const im = new Image();
          im.decoding = "async";
          im.onload = () => {
            // Décoder tout de suite : le dessin au scroll sera instantané, sans à-coup.
            const done = () => {
              inFlight--; wLoaded++;
              loadBar.style.width = (wLoaded / TOTAL) * 100 + "%";
              if (wLoaded >= TOTAL) loadBox.hidden = true;
              if (i === 0) { wDraw(0); walkSticky.classList.add("is-live"); }
              pump();
            };
            if (im.decode) im.decode().then(done, done);
            else done();
          };
          im.onerror = () => { inFlight--; wLoaded++; pump(); };
          im.src = wSrc(i);
          wImages[i] = im;
          inFlight++;
        }
      };
      pump();
    };

    let cvW = 0, cvH = 0;
    const wDraw = (i) => {
      let im = wImages[i];
      // Repli sur la frame chargée la plus proche pendant le préchargement.
      if (!im || !im.complete || !im.naturalWidth) {
        for (let d = 1; d < 8 && (!im || !im.complete || !im.naturalWidth); d++) {
          im = wImages[i - d] && wImages[i - d].complete ? wImages[i - d] : wImages[i + d];
        }
        if (!im || !im.complete || !im.naturalWidth) return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = walkSticky.clientWidth, ch = walkSticky.clientHeight;
      if (cvW !== cw * dpr || cvH !== ch * dpr) {
        cvW = walkCanvas.width = cw * dpr;
        cvH = walkCanvas.height = ch * dpr;
      }
      const s = Math.max(cvW / im.naturalWidth, cvH / im.naturalHeight);
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      wctx.drawImage(im, (cvW - dw) / 2, (cvH - dh) / 2, dw, dh);
      wLast = i;
    };
    // Redimensionnement / rotation : re-taille le bitmap et redessine la frame courante.
    window.addEventListener("resize", () => { if (wLast >= 0) { cvW = 0; wDraw(wLast); } });

    const wHud = (i) => {
      const idx = CHAPTERS.findIndex(([a, b]) => i >= a && i <= b);
      if (idx !== wChapLast) {
        wChapLast = idx;
        const ch = CHAPTERS[idx];
        // Crossfade du libellé de chapitre.
        chapterEl.classList.add("is-swap");
        setTimeout(() => {
          chapterEl.textContent = ch && ch[2] ? ch[2] : "";
          chapterEl.classList.remove("is-swap");
        }, 180);
        badgeEl.classList.toggle("is-on", !!(ch && ch[3]));
        const activeRail = railChaps.indexOf(ch);
        railSteps.forEach((s, k) => s.classList.toggle("is-active", k === activeRail));
        railEl.classList.toggle("is-hidden", i < 86);
      }
      noteEls.forEach((n) => n.el.classList.toggle("is-on", i >= n.f0 && i <= n.f1));
      if (heroEl) {
        const o = Math.max(0, 1 - i / 44);
        heroEl.style.opacity = o.toFixed(3);
        heroEl.style.transform = `scale(${(1 + (1 - o) * 0.14).toFixed(3)})`;
        heroEl.style.visibility = o <= 0.01 ? "hidden" : "visible";
      }
    };

    // Lissage à inertie : l'index affiché rattrape la cible en douceur (drone).
    let wTarget = 0, wCurrent = 0, wRaf = 0;
    const wTick = () => {
      wRaf = requestAnimationFrame(wTick);
      const r = walkEl.getBoundingClientRect();
      const near = r.bottom > -window.innerHeight * 0.5 && r.top < window.innerHeight * 1.5;
      if (near) {
        const span = r.height - window.innerHeight;
        const p = Math.min(1, Math.max(0, -r.top / span));
        wTarget = p * (TOTAL - 1);
        const diff = wTarget - wCurrent;
        // Lissage plus doux en régime normal (balade plus soyeuse), rattrapage rapide sur grand saut.
        wCurrent += diff * (Math.abs(diff) > 24 ? 0.4 : 0.12);
        if (Math.abs(wTarget - wCurrent) < 0.02) wCurrent = wTarget;
        const i = Math.max(0, Math.min(TOTAL - 1, Math.round(wCurrent)));
        if (i !== wLast) { wHud(i); wDraw(i); }
      }
    };

    // Réseau contraint (économie de données / 2G) : pas de préchargement anticipé des 44 Mo —
    // les frames ne se chargent qu'à l'approche réelle de la balade.
    const conn = navigator.connection;
    const dataSaver = !!(conn && (conn.saveData || /(^|-)2g/.test(conn.effectiveType || "")));
    if (!dataSaver) {
      // La balade ouvre la page : on précharge dès que le navigateur est libre.
      if ("requestIdleCallback" in window) {
        requestIdleCallback(wStartLoading, { timeout: 2000 });
      } else {
        setTimeout(wStartLoading, 1400);
      }
    }
    // La boucle rAF ne tourne que quand la balade est à portée d'écran : zéro coût ailleurs.
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        wStartLoading();
        if (!wRaf) wRaf = requestAnimationFrame(wTick);
      } else if (wRaf) {
        cancelAnimationFrame(wRaf);
        wRaf = 0;
      }
    }, { rootMargin: "150% 0px 150% 0px" }).observe(walkEl);
  }

  /* ---------- Galerie : lightbox ---------- */

  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCaption = document.getElementById("lbCaption");
  const lbCount = document.getElementById("lbCount");
  const thumbs = Array.from(document.querySelectorAll("#galleryGrid button"));
  let lbIndex = 0;
  let lastFocus = null;

  const preload = (i) => {
    const b = thumbs[(i + thumbs.length) % thumbs.length];
    new Image().src = b.dataset.full;
  };

  const showSlide = (i) => {
    lbIndex = (i + thumbs.length) % thumbs.length;
    const btn = thumbs[lbIndex];
    lbImg.src = btn.dataset.full;
    lbImg.alt = btn.querySelector("img").alt;
    lbCaption.textContent = btn.querySelector("span").textContent;
    lbCount.textContent = `${lbIndex + 1} / ${thumbs.length}`;
    preload(lbIndex + 1);
    preload(lbIndex - 1);
  };

  const openLightbox = (i) => {
    lastFocus = document.activeElement;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    showSlide(i);
    document.getElementById("lbClose").focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      lightbox.hidden = true;
      lbImg.src = "";
    }, 350);
    if (lastFocus) lastFocus.focus();
  };

  thumbs.forEach((btn, i) => btn.addEventListener("click", () => openLightbox(i)));
  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbPrev").addEventListener("click", () => showSlide(lbIndex - 1));
  document.getElementById("lbNext").addEventListener("click", () => showSlide(lbIndex + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showSlide(lbIndex - 1);
    if (e.key === "ArrowRight") showSlide(lbIndex + 1);
  });

  // Balayage tactile
  let touchX = null;
  lightbox.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener(
    "touchend",
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 48) showSlide(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    },
    { passive: true }
  );

  /* ---------- Le film : lecture automatique à l'écran ---------- */

  const film = document.getElementById("filmVideo");
  if (film) {
    const filmToggle = document.getElementById("filmToggle");
    let filmUserPaused = false;

    const filmLabel = () => {
      const paused = film.paused;
      filmToggle.textContent = paused ? "Lecture" : "Pause";
      filmToggle.setAttribute("aria-label", paused ? "Lancer le film" : "Mettre le film en pause");
    };

    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !filmUserPaused) film.play().catch(() => {});
        else if (!entry.isIntersecting) film.pause();
      },
      { threshold: 0.35 }
    ).observe(film);

    filmToggle.addEventListener("click", () => {
      if (film.paused) {
        filmUserPaused = false;
        film.play().catch(() => {});
      } else {
        filmUserPaused = true;
        film.pause();
      }
    });
    film.addEventListener("play", filmLabel);
    film.addEventListener("pause", filmLabel);
    filmLabel();
  }

  /* ---------- Comparateur avant / après ---------- */

  const compare = document.getElementById("compare");
  if (compare) {
    const range = compare.querySelector(".compare__range");
    const apply = () => compare.style.setProperty("--pos", `${range.value}%`);
    range.addEventListener("input", apply);
    apply();

    // À l'apparition, le curseur esquisse un aller-retour : l'interaction se devine.
    if (!reducedMotion) {
      new IntersectionObserver(([entry], obs) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now();
        const dur = 1700;
        const nudge = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          const wave = Math.sin(p * Math.PI) * 18;
          range.value = 50 + wave;
          apply();
          if (p < 1 && range.matches(":not(:active)")) requestAnimationFrame(nudge);
        };
        requestAnimationFrame(nudge);
      }, { threshold: 0.5 }).observe(compare);
    }
  }

  /* ---------- Vue aérienne interactive (Leaflet + imagerie Esri) ---------- */

  const aeroMap = document.getElementById("aeroMap");
  if (aeroMap && window.L) {
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const pt = [48.8567802, 2.3269497];
      const map = L.map(aeroMap, {
        zoomControl: true,
        scrollWheelZoom: false, // la molette garde le contrôle de la page
        attributionControl: true,
      });
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Imagerie © Esri, Maxar" }
      ).addTo(map);
      L.circleMarker(pt, {
        radius: 9, color: "#f4f3f0", weight: 2,
        fillColor: "#c9a96a", fillOpacity: 1,
      }).addTo(map).bindTooltip("42, rue du Bac", { direction: "top", offset: [0, -10] });
      if (reducedMotion) {
        map.setView(pt, 18);
      } else {
        // Descente cinématique : de Paris entier jusqu'aux toits de l'immeuble.
        map.setView(pt, 13);
        setTimeout(() => map.flyTo(pt, 18, { duration: 3.4 }), 500);
      }
    }, { threshold: 0.35 }).observe(aeroMap);
  }

  /* ---------- Visite : le regard suit la souris (balade) ---------- */

  const tourEl = document.getElementById("tour");
  if (tourEl && !reducedMotion && window.matchMedia("(hover: hover)").matches) {
    const stage = tourEl.querySelector(".tour__stage");
    let lookRaf = null;
    tourEl.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || lookRaf) return;
      lookRaf = requestAnimationFrame(() => {
        lookRaf = null;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        stage.style.setProperty("--lx", nx.toFixed(3));
        stage.style.setProperty("--ly", ny.toFixed(3));
      });
    });
  }

  /* ---------- Les projets : la maquette suit les chapitres ---------- */

  const projetsPanel = document.getElementById("projetsPanel");
  if (projetsPanel) {
    const projectObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) projetsPanel.dataset.project = entry.target.dataset.project;
        });
      },
      { rootMargin: "-42% 0px -42% 0px" }
    );
    document.querySelectorAll(".pchapter").forEach((c) => projectObserver.observe(c));
  }

  /* ---------- Chiffres clés : décompte à l'apparition ---------- */

  const figures = document.querySelector(".figures");
  if (figures && !reducedMotion) {
    const countObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        countObserver.disconnect();
        figures.querySelectorAll("strong").forEach((el) => {
          const raw = el.textContent;
          const numMatch = raw.replace(/ /g, " ").match(/^([\d,]+)/);
          if (!numMatch) return;
          const target = parseFloat(numMatch[1].replace(",", "."));
          const decimals = (numMatch[1].split(",")[1] || "").length;
          const suffix = raw.slice(numMatch[1].length);
          const t0 = performance.now();
          const dur = 1100;
          const tick = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(decimals).replace(".", ",") + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = raw;
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    countObserver.observe(figures);
  }

  /* ============================================================
     Visite virtuelle : balade pièce par pièce, deux niveaux,
     quatre scénarios. Transitions WAAPI (zoom + blur directionnel).
     ============================================================ */

  const tour = document.getElementById("tour");
  if (tour) {
    const I = "assets/img/";
    const LEVELS = { 0: "Extérieurs et vues", 5: "Niveau 5 · 5ᵉ étage", 6: "Niveau 6 · dernier étage" };

    // Zones cliquables des plans réels [x1, y1, x2, y2, libellé]
    const PLANS = {
      5: {
        img: I + "plan-5e-1235.webp", w: 1235, h: 759,
        rooms: {
          sejour: [150, 100, 525, 420, "Séjour"],
          cuisine: [525, 140, 700, 360, "Cuisine"],
          sde: [700, 150, 835, 285, "Salle d'eau"],
          wc: [695, 285, 760, 360, "WC"],
          bureau: [835, 185, 1035, 360, "Bureau"],
          degagement: [525, 360, 835, 420, "Dégagement"],
          entree: [590, 420, 685, 615, "Entrée"],
          chambre: [685, 420, 1035, 615, "Chambre"],
        },
      },
      6: {
        img: I + "plan-6e-996.webp", w: 996, h: 494,
        rooms: {
          sejour6: [30, 40, 570, 450, "Séjour et cuisine"],
          sdd6: [575, 40, 940, 150, "Salle de douche"],
          chambre6: [575, 155, 965, 450, "Chambre"],
        },
      },
    };

    // Schémas de division du scénario investisseur (non contractuels)
    const DIVISION = {
      5: `<svg viewBox="100 60 985 605" role="img" aria-label="Schéma de division du 5e étage en deux studios">
        <path d="M150,100 H1035 V615 H590 V420 H150 Z" fill="#fff" stroke="#17191b" stroke-width="4"/>
        <line x1="640" y1="100" x2="640" y2="615" stroke="#c9a96a" stroke-width="4" stroke-dasharray="12 9"/>
        <text x="385" y="270" text-anchor="middle" font-size="58" fill="#17191b">A</text>
        <text x="385" y="315" text-anchor="middle" font-size="27" fill="#8c887f">env. 32 m² Carrez</text>
        <text x="845" y="270" text-anchor="middle" font-size="58" fill="#17191b">B</text>
        <text x="845" y="315" text-anchor="middle" font-size="27" fill="#8c887f">env. 32 m² Carrez</text>
        <g stroke="#17191b" stroke-width="2.5" fill="none">
          <rect x="300" y="140" width="70" height="24"/><circle cx="320" cy="152" r="6"/><circle cx="348" cy="152" r="6"/>
          <rect x="470" y="480" width="50" height="50"/><line x1="470" y1="480" x2="520" y2="530"/>
          <rect x="705" y="160" width="50" height="50"/><line x1="705" y1="160" x2="755" y2="210"/>
          <rect x="880" y="470" width="70" height="24"/><circle cx="900" cy="482" r="6"/><circle cx="928" cy="482" r="6"/>
          <rect x="210" y="315" width="110" height="62"/><line x1="210" y1="332" x2="320" y2="332"/>
          <rect x="700" y="470" width="110" height="62"/><line x1="700" y1="487" x2="810" y2="487"/>
        </g>
      </svg>`,
      6: `<svg viewBox="10 15 975 465" role="img" aria-label="Schéma de division du 6e étage en deux studios">
        <rect x="25" y="30" width="945" height="430" fill="#fff" stroke="#17191b" stroke-width="4"/>
        <line x1="500" y1="30" x2="500" y2="460" stroke="#c9a96a" stroke-width="4" stroke-dasharray="12 9"/>
        <text x="260" y="230" text-anchor="middle" font-size="52" fill="#17191b">C</text>
        <text x="260" y="272" text-anchor="middle" font-size="25" fill="#8c887f">env. 18 m² Carrez</text>
        <text x="735" y="230" text-anchor="middle" font-size="52" fill="#17191b">D</text>
        <text x="735" y="272" text-anchor="middle" font-size="25" fill="#8c887f">env. 18 m² Carrez</text>
        <g stroke="#17191b" stroke-width="2.5" fill="none">
          <rect x="380" y="50" width="80" height="22"/><circle cx="402" cy="61" r="5"/><circle cx="432" cy="61" r="5"/>
          <rect x="300" y="360" width="46" height="46"/><line x1="300" y1="360" x2="346" y2="406"/>
          <rect x="600" y="60" width="46" height="46"/><line x1="600" y1="60" x2="646" y2="106"/>
          <rect x="820" y="380" width="80" height="22"/><circle cx="842" cy="391" r="5"/><circle cx="872" cy="391" r="5"/>
          <rect x="110" y="310" width="100" height="56"/><line x1="110" y1="326" x2="210" y2="326"/>
          <rect x="630" y="320" width="100" height="56"/><line x1="630" y1="336" x2="730" y2="336"/>
        </g>
      </svg>`,
    };

    // Plans meublés du scénario rénové (aménagement projeté, non contractuel)
    const FURNISHED = {
      5: `
        <path d="M150,100 H1035 V615 H590 V420 H150 Z" fill="#fff" stroke="#17191b" stroke-width="4"/>
        <g stroke="#17191b" stroke-width="3" fill="none">
          <path d="M695,150 V360"/><path d="M835,150 V360"/><path d="M695,285 H835"/>
          <path d="M525,360 H1035"/><path d="M590,420 H1035"/><path d="M685,420 V615"/>
        </g>
        <line x1="525" y1="145" x2="525" y2="355" stroke="#c9a96a" stroke-width="3" stroke-dasharray="10 8"/>
        <g stroke="#17191b" stroke-width="2" fill="none">
          <rect x="190" y="300" width="150" height="55"/><line x1="190" y1="316" x2="340" y2="316"/>
          <circle cx="300" cy="252" r="24"/><circle cx="385" cy="300" r="20"/>
          <rect x="430" y="168" width="95" height="55"/>
          <rect x="530" y="145" width="165" height="26"/><rect x="555" y="280" width="115" height="40"/>
          <rect x="790" y="470" width="130" height="95"/><line x1="790" y1="495" x2="920" y2="495"/>
          <rect x="870" y="225" width="110" height="34"/>
          <rect x="705" y="160" width="55" height="55"/><line x1="705" y1="160" x2="760" y2="215"/><line x1="760" y1="160" x2="705" y2="215"/>
          <circle cx="800" cy="195" r="13"/>
          <rect x="180" y="115" width="82" height="82"/>
          <line x1="196" y1="115" x2="196" y2="197"/><line x1="212" y1="115" x2="212" y2="197"/>
          <line x1="228" y1="115" x2="228" y2="197"/><line x1="244" y1="115" x2="244" y2="197"/>
        </g>
        <g font-size="24" fill="#8c887f">
          <text x="180" y="230" font-size="15" fill="#c9a96a">trémie à créer</text>
          <text x="300" y="245">Séjour, cuisine ouverte</text>
          <text x="760" y="600">Chambre</text>
          <text x="855" y="300">Bureau</text>
        </g>`,
      6: `
        <rect x="25" y="30" width="945" height="430" fill="#fff" stroke="#17191b" stroke-width="4"/>
        <g stroke="#17191b" stroke-width="3" fill="none">
          <path d="M575,40 V450"/><path d="M575,150 H940"/>
        </g>
        <g stroke="#17191b" stroke-width="2" fill="none">
          <rect x="70" y="270" width="150" height="55"/><line x1="70" y1="286" x2="220" y2="286"/>
          <rect x="35" y="70" width="22" height="280"/>
          <circle cx="240" cy="180" r="26"/>
          <rect x="390" y="45" width="175" height="26"/>
          <rect x="690" y="240" width="115" height="85"/><line x1="690" y1="262" x2="805" y2="262"/>
          <rect x="605" y="55" width="55" height="55"/><line x1="605" y1="55" x2="660" y2="110"/><line x1="660" y1="55" x2="605" y2="110"/>
          <circle cx="710" cy="95" r="13"/>
          <rect x="70" y="58" width="82" height="82"/>
          <line x1="86" y1="58" x2="86" y2="140"/><line x1="102" y1="58" x2="102" y2="140"/>
          <line x1="118" y1="58" x2="118" y2="140"/><line x1="134" y1="58" x2="134" y2="140"/>
        </g>
        <g font-size="24" fill="#8c887f">
          <text x="70" y="172" font-size="15" fill="#c9a96a">trémie à créer</text>
          <text x="180" y="420">Salon-bibliothèque</text>
          <text x="660" y="420">Chambre d'amis</text>
        </g>`,
    };

    const SCENARIOS = {
      actuel: {
        note: "",
        stops: [
          { level: 0, room: null, img: I + "cour-2-1800.webp", title: "La cour pavée", desc: "Passé le porche du 42, la cour plantée dessert le bâtiment A. Gardien, digicode, puis l'ascenseur jusqu'au 5ᵉ étage." },
          { level: 5, room: "entree", img: I + "degagement-1920.webp", title: "Entrée et dégagement", desc: "L'entrée distribue le niveau par un dégagement doublé de rangements toute hauteur." },
          { level: 5, room: "sejour", img: I + "sejour-1-1920.webp", title: "Le séjour", desc: "Poutres anciennes, parquet, double exposition sud-est et nord-ouest : la pièce de vie du 5ᵉ étage, en bon état." },
          { level: 5, room: "sejour", img: I + "sejour-2-1920.webp", title: "Le séjour, côté fenêtres", desc: "Les fenêtres ouvrent sur la rue et filent au-dessus des toits. Lumière traversante toute la journée." },
          { level: 5, room: "sejour", img: I + "sejour-3-1920.webp", title: "Le séjour, vers la cuisine", desc: "Au fond de la pièce, l'enfilade mène à la cuisine séparée." },
          { level: 5, room: "cuisine", img: I + "cuisine-2-1920.webp", title: "La cuisine", desc: "Séparée, aménagée et équipée, attenante au séjour." },
          { level: 5, room: "chambre", img: I + "chambre-1920.webp", title: "La chambre", desc: "Calme, parquet au sol, fenêtre sur les toits." },
          { level: 5, room: "bureau", img: I + "piece-vue-1920.webp", title: "Le bureau", desc: "Une pièce en plus, fenêtre grande ouverte sur les toits du quartier." },
          { level: 5, room: "sde", img: I + "salle-eau-1920.webp", title: "La salle d'eau", desc: "Salle d'eau et WC desservis par le dégagement. Une seconde salle de douche équipe le 6ᵉ." },
          { level: 6, room: "sejour6", img: I + "six-4-1920.webp", title: "Le séjour sous les toits", desc: "25,22 m² Carrez, 27,46 m² au sol : le grand volume du dernier étage, à rafraîchir." },
          { level: 6, room: "sejour6", img: I + "six-2-1920.webp", title: "Le coin cuisine du 6ᵉ", desc: "Le niveau dispose de sa propre cuisine, à repenser librement." },
          { level: 6, room: "chambre6", img: I + "six-chambre-2-1920.webp", title: "La chambre mansardée", desc: "9,42 m² Carrez pour 12,92 m² au sol, sous les pentes du toit." },
          { level: 0, room: null, img: I + "toits-2400.webp", title: "La vue", desc: "Cheminées, zinc et musée d'Orsay : la récompense des derniers étages." },
        ],
      },
      renove: {
        note: "Projection d'aménagement non contractuelle. Trémie et ouvertures soumises à étude de structure.",
        stops: [
          { level: 5, room: "sejour", img: I + "tremie-sejour-1600.webp", title: "Le duplex relié : la trémie", desc: "Une trémie ouvre le plafond du séjour et un escalier suspendu relie les deux niveaux : le 5ᵉ et le 6ᵉ ne font plus qu'un. Projection, sous réserve d'étude de structure.", notes: [{ x: 20, y: 26, t: "Trémie créée dans le plafond" }, { x: 15, y: 55, t: "Escalier suspendu, métal & chêne" }] },
          { level: 5, room: "sejour", img: I + "sejour-stage-1600.webp", title: "Le séjour réinventé", desc: "Velours, chêne et poutres restaurées : la grande pièce de vie traversante du 5ᵉ. La cloison de la cuisine peut s'ouvrir, sous réserve d'étude.", notes: [{ x: 75, y: 35, t: "Bibliothèque toute hauteur" }, { x: 34, y: 12, t: "Poutres restaurées" }] },
          { level: 5, room: "cuisine", img: I + "cuisine-renovee-1600.webp", title: "La cuisine rénovée", desc: "Du chêne chaud et de la pierre claire dans l'emprise existante ; attenante au séjour, elle peut s'ouvrir sur lui.", notes: [{ x: 25, y: 50, t: "Plan et crédence en pierre claire" }, { x: 41, y: 42, t: "Façades chêne, four intégré" }] },
          { level: 5, room: "chambre", img: I + "chambre-stage-1600.webp", title: "La chambre principale", desc: "Rangements intégrés et palette minérale : une chambre de maître côté calme.", notes: [{ x: 50, y: 54, t: "Tête de lit menuisée" }, { x: 14, y: 38, t: "Rangements toute hauteur" }] },
          { level: 5, room: "bureau", img: I + "bureau-renove-1600.webp", title: "Le bureau / 2ᵉ chambre", desc: "La pièce sur les toits devient bureau, chambre d'appoint ou dressing, selon les besoins. Fenêtres et parquet existants conservés.", notes: [{ x: 55, y: 42, t: "Bibliothèques" }, { x: 83, y: 70, t: "Bureau sous la fenêtre" }] },
          { level: 5, room: "sde", img: I + "salle-eau-renovee-1600.webp", title: "La salle d'eau repensée", desc: "Douche à l'italienne, pierre claire et laiton brossé dans l'emprise existante.", notes: [{ x: 36, y: 46, t: "Douche à l'italienne" }, { x: 62, y: 55, t: "Chêne et laiton brossé" }] },
          { level: 5, room: "degagement", img: I + "degagement-renove-1600.webp", title: "Le dégagement", desc: "Des placards toute hauteur et une circulation soignée relient les pièces du niveau.", notes: [{ x: 30, y: 45, t: "Placards toute hauteur" }] },
          { level: 6, room: "sejour6", img: I + "six-sejour-stage-1600.webp", title: "Le salon sous les toits, 6ᵉ", desc: "Sous les toits, un second salon, une bibliothèque ou un atelier : 27,46 m² au sol à vivre autrement.", notes: [{ x: 8, y: 34, t: "Bibliothèque en niches" }, { x: 44, y: 40, t: "Cuisinette existante conservée" }] },
          { level: 6, room: "sejour6", img: I + "six-cuisine-renovee-1600.webp", title: "La cuisine du 6ᵉ", desc: "Compacte sous le rampant, bois chaud et laiton : le niveau garde sa propre cuisine.", notes: [{ x: 55, y: 40, t: "Cuisine sous rampant" }] },
          { level: 6, room: "sejour6", img: I + "six-salon-biblio-1600.webp", title: "Un atelier sous les combles", desc: "Bibliothèques basses sous les rampants et coin lecture : le grand volume du dernier étage devient un lieu à part.", notes: [{ x: 20, y: 58, t: "Bibliothèques sous les rampants" }, { x: 40, y: 64, t: "Coin lecture" }] },
          { level: 6, room: "chambre6", img: I + "six-chambre-stage-1600.webp", title: "La chambre d'amis", desc: "Mansardée et indépendante, la salle de douche du niveau à quelques pas.", notes: [{ x: 52, y: 56, t: "Lit sous la pente" }, { x: 78, y: 32, t: "Fenêtre sur les toits" }] },
          { level: 0, room: null, img: I + "toits-2400.webp", title: "Sous le ciel de Paris", desc: "Deux niveaux réunis autour de la lumière et de la vue." },
        ],
      },
      studios: {
        note: "Schéma d'étude non contractuel : division soumise au règlement de copropriété, aux autorisations d'urbanisme et à un mesurage.",
        stops: [
          { level: 5, room: "sejour", img: I + "studio-a-1600.webp", title: "Studio A · 5ᵉ, ~32 m²", desc: "L'actuel séjour et la cuisine réunis en un studio complet : kitchenette, coin repas, coin nuit. Cuisine existante conservable. Projection non contractuelle." },
          { level: 5, room: "chambre", img: I + "studio-b-1600.webp", title: "Studio B · 5ᵉ, ~32 m²", desc: "Chambre, bureau et salle d'eau actuels réunis en un studio cosy avec kitchenette. Salle d'eau existante. Projection non contractuelle." },
          { level: 6, room: "sejour6", img: I + "studio-c-1600.webp", title: "Studio C · 6ᵉ, ~18 m²", desc: "La partie ouest du volume sous les toits, autour du coin cuisine existant, en studio complet. Projection non contractuelle." },
          { level: 6, room: "chambre6", img: I + "studio-d-1600.webp", title: "Studio D · 6ᵉ, ~18 m²", desc: "La chambre mansardée et la salle de douche existante, transformées en studio compact. Projection non contractuelle." },
        ],
      },
      mixte: {
        note: "Hypothèse d'étude non contractuelle, sous réserve d'un accès indépendant au 6ᵉ et des autorisations de copropriété.",
        stops: [
          { level: 5, room: "sejour", img: I + "sejour-1-1920.webp", title: "L'appartement principal", desc: "Le 5ᵉ étage devient un trois pièces complet : séjour, cuisine, deux chambres et salle d'eau." },
          { level: 5, room: "cuisine", img: I + "cuisine-2-1920.webp", title: "La cuisine du 5ᵉ", desc: "Conservée dans son emprise, attenante au séjour." },
          { level: 5, room: "chambre", img: I + "chambre-1920.webp", title: "L'espace nuit", desc: "Chambre et bureau composent les chambres du niveau principal." },
          { level: 6, room: "sejour6", img: I + "six-4-1920.webp", title: "Le studio du 6ᵉ", desc: "Environ 37 m² Carrez déjà dotés d'une cuisine et d'une salle de douche : un locatif prêt à rafraîchir." },
          { level: 6, room: "chambre6", img: I + "six-chambre-2-1920.webp", title: "L'espace nuit du studio", desc: "La partie mansardée accueille le couchage, côté calme." },
        ],
      },
    };

    const imgsEl = [document.getElementById("tourImgA"), document.getElementById("tourImgB")];
    let front = 0;
    const els = {
      level: document.getElementById("tourLevel"),
      room: document.getElementById("tourRoom"),
      desc: document.getElementById("tourDesc"),
      note: document.getElementById("tourNote"),
      count: document.getElementById("tourCount"),
      plan: document.getElementById("tourPlan"),
      info: tour.querySelector(".tour__info"),
    };
    const scenarioTabs = Array.from(tour.querySelectorAll('.tour__scenarios [role="tab"]'));
    let scenario = "actuel";
    let index = 0;
    let tourLastFocus = null;

    const stops = () => SCENARIOS[scenario].stops;

    const preloadStop = (i) => {
      const list = stops();
      new Image().src = list[((i % list.length) + list.length) % list.length].img;
    };

    let tourDrift = null;

    const swapImage = (src, alt, dir) => {
      const back = 1 - front;
      const incoming = imgsEl[back];
      const outgoing = imgsEl[front];
      incoming.src = src;
      incoming.alt = alt || "";
      const go = () => {
        incoming.classList.add("is-front");
        outgoing.classList.remove("is-front");
        if (tourDrift) { tourDrift.cancel(); tourDrift = null; }
        if (!reducedMotion && incoming.animate) {
          // Opacity + transform uniquement : composité GPU, fluide partout (le blur animé repeignait tout l'écran).
          const entry = incoming.animate(
            [
              { opacity: 0, transform: `scale(1.07) translateX(${dir * 1.5}%)` },
              { opacity: 1, transform: "scale(1) translateX(0)" },
            ],
            { duration: 950, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "both" }
          );
          outgoing.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "ease", fill: "both" });
          // Puis l'image dérive lentement, comme une caméra posée : la visite respire.
          entry.onfinish = () => {
            tourDrift = incoming.animate(
              [
                { transform: "scale(1.005)" },
                { transform: "scale(1.07) translate(-1.1%, 0.8%)" },
              ],
              { duration: 17000, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }
            );
          };
        }
        front = back;
      };
      if (incoming.complete && incoming.naturalWidth) go();
      else {
        incoming.addEventListener("load", go, { once: true });
        // Image indisponible : on avance quand même — les buffers A/B restent synchrones.
        incoming.addEventListener("error", go, { once: true });
      }
    };

    const notesEl = document.getElementById("tourNotes");
    const renderNotes = (s) => {
      if (!notesEl) return;
      notesEl.innerHTML = (s.notes || [])
        .map((n, k) =>
          `<div class="tour__note" style="left:${n.x}%;top:${n.y}%;--nd:${(0.55 + k * 0.22).toFixed(2)}s"><i></i><span>${n.t}</span></div>`)
        .join("");
    };

    const renderPlan = (s) => {
      if (!s.level) { els.plan.hidden = true; return; }
      els.plan.hidden = false;
      const suffix = scenario === "studios" ? ", schéma de division"
                   : scenario === "renove" ? ", aménagement projeté" : "";
      let html = `<p class="tour__plan-label">${LEVELS[s.level]}${suffix}</p>`;
      if (scenario === "studios") {
        els.plan.innerHTML = html + `<div class="plan-map">${DIVISION[s.level]}</div>`;
        return;
      }
      const plan = PLANS[s.level];
      // Scénario rénové : plan meublé dessiné ; sinon plan réel en image.
      const furnished = scenario === "renove" ? FURNISHED[s.level] : "";
      let svg = `<svg viewBox="0 0 ${plan.w} ${plan.h}">` + furnished;
      for (const [id, r] of Object.entries(plan.rooms)) {
        svg += `<rect data-room="${id}" x="${r[0]}" y="${r[1]}" width="${r[2] - r[0]}" height="${r[3] - r[1]}"` +
               `${id === s.room ? ' class="is-here"' : ""}><title>${r[4]}</title></rect>`;
      }
      svg += "</svg>";
      els.plan.innerHTML = html +
        `<div class="plan-map">${furnished ? svg : `<img src="${plan.img}" alt="">` + svg}</div>`;
      els.plan.querySelectorAll("rect[data-room]").forEach((r) => {
        r.addEventListener("click", () => {
          // L'occurrence de la pièce la plus proche de l'étape courante (jamais de recul surprise).
          let t = -1, best = Infinity;
          stops().forEach((x, k) => {
            if (x.room === r.dataset.room) { const d = Math.abs(k - index); if (d < best) { best = d; t = k; } }
          });
          if (t >= 0 && t !== index) goTo(t);
        });
      });
    };

    const render = (dir = 1) => {
      const s = stops()[index];
      els.info.classList.add("is-swapping");
      swapImage(s.img, s.title, dir);
      setTimeout(() => {
        els.level.textContent = LEVELS[s.level] || "";
        els.room.textContent = s.title;
        els.desc.textContent = s.desc;
        els.note.textContent = SCENARIOS[scenario].note;
        els.count.textContent = `${index + 1} / ${stops().length}`;
        renderNotes(s);
        renderPlan(s);
        els.info.classList.remove("is-swapping");
      }, reducedMotion ? 0 : 200);
      preloadStop(index + 1);
      preloadStop(index - 1);
    };

    const goTo = (i, dir) => {
      const n = stops().length;
      const d = dir ?? (i > index ? 1 : -1);
      index = ((i % n) + n) % n;
      render(d);
    };

    const setScenario = (id) => {
      if (!SCENARIOS[id]) id = "actuel";
      scenario = id;
      scenarioTabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.scenario === id)));
      index = 0;
      render(1);
    };

    const openTour = (id) => {
      tourLastFocus = document.activeElement;
      tour.hidden = false;
      requestAnimationFrame(() => tour.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      setScenario(id || "actuel");
      document.getElementById("tourClose").focus();
    };

    const closeTour = () => {
      tour.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => { tour.hidden = true; }, 220);
      if (tourLastFocus) tourLastFocus.focus();
    };

    document.querySelectorAll("[data-tour-open]").forEach((b) =>
      b.addEventListener("click", () => openTour(b.dataset.scenario))
    );
    document.getElementById("tourClose").addEventListener("click", closeTour);
    document.getElementById("tourPrev").addEventListener("click", () => goTo(index - 1, -1));
    document.getElementById("tourNext").addEventListener("click", () => goTo(index + 1, 1));
    scenarioTabs.forEach((t) => t.addEventListener("click", () => setScenario(t.dataset.scenario)));

    document.addEventListener("keydown", (e) => {
      if (tour.hidden) return;
      if (e.key === "Escape") closeTour();
      if (e.key === "ArrowLeft") goTo(index - 1, -1);
      if (e.key === "ArrowRight") goTo(index + 1, 1);
    });

    let tourTouchX = null;
    tour.addEventListener("touchstart", (e) => (tourTouchX = e.touches[0].clientX), { passive: true });
    tour.addEventListener(
      "touchend",
      (e) => {
        if (tourTouchX === null) return;
        const dx = e.changedTouches[0].clientX - tourTouchX;
        if (Math.abs(dx) > 48) goTo(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        tourTouchX = null;
      },
      { passive: true }
    );
  }

  /* ---------- Formulaire de contact : ouvre le client mail, aucun backend ---------- */

  const leadForm = document.getElementById("leadForm");
  if (leadForm) {
    leadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(leadForm);
      const nom = (data.get("nom") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const tel = (data.get("tel") || "").toString().trim();
      // Validation réelle avant d'ouvrir la messagerie : jamais de lead vide ni de faux succès.
      leadForm.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!nom || !emailOk) {
        const bad = leadForm.querySelector(!nom ? '[name="nom"]' : '[name="email"]');
        if (bad) { bad.classList.add("is-invalid"); bad.focus(); }
        return;
      }
      const body = `Nom : ${nom}\nEmail : ${email}\nTéléphone : ${tel || "non renseigné"}\n\nDemande de dossier complet · 42, rue du Bac, Paris 7e.`;
      const mailto = `mailto:lou.chaumeau@gmail.com?subject=${encodeURIComponent("42 rue du Bac : demande de dossier")}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      const sent = document.getElementById("leadSent");
      if (sent) sent.classList.add("is-shown");
    });
  }
})();
