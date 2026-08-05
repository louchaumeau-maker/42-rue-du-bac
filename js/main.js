/* ============================================================
   42, rue du Bac. Interactions — refonte 2026-07.
   Vanilla JS, aucune dépendance. IntersectionObserver partout
   où c'est possible ; un seul listener scroll passif + rAF pour
   la transition d'entrée du bloc vidéo (transform/opacity only).
   ============================================================ */

(() => {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav : fond plein après le premier écran ---------- */

  const nav = $("#nav");
  const onScrollNav = () => nav.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- Révélations sobres ---------- */

  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add("is-in");
      revealIO.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  /* ---------- CTA collant : visible après le hero, caché au contact ---------- */

  const stickyCta = $("#stickyCta");
  let heroGone = false, contactSeen = false, openerOn = false;
  /* `inert` plutôt qu'`aria-hidden` : la barre contient un lien focusable,
     l'annoncer masquée tout en la laissant tabulable était un mensonge. */
  const syncCta = () => {
    const on = heroGone && !contactSeen && !openerOn;
    stickyCta.classList.toggle("is-on", on);
    stickyCta.toggleAttribute("inert", !on);
  };
  new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting; syncCta(); })
    .observe($("#hero"));
  new IntersectionObserver(([e]) => { contactSeen = e.isIntersecting; syncCta(); }, { threshold: 0.15 })
    .observe($("#contact"));

  /* ---------- [2] Bloc vidéo d'ouverture ---------- */

  const opener = $("#ouverture");
  const frame = $("#openerFrame");
  const video = $("#openerVideo");
  const capEl = $("#openerCaption");
  const capEyebrow = $("#capEyebrow");
  const capName = $("#capName");
  const bar = $("#openerBar").firstElementChild;

  // Transition d'entrée : la vidéo, légèrement en retrait, prend tout
  // l'écran à mesure qu'elle y entre (transform + radius, compositor).
  let ticking = false;
  const driveOpener = () => {
    ticking = false;
    const vh = window.innerHeight;
    const r = opener.getBoundingClientRect();
    // 0 quand le haut de la section touche le bas du viewport, 1 quand il atteint le haut
    const p = clamp((vh - r.top) / vh, 0, 1);
    const e = p * p * (3 - 2 * p); // smoothstep
    frame.style.setProperty("--op-sc", (0.94 + 0.06 * e).toFixed(4));
    frame.style.setProperty("--op-r", `${Math.round(22 * (1 - e))}px`);
    // Préchargement de la vidéo au premier geste de scroll seulement :
    // un visiteur qui rebondit sur le hero ne télécharge pas le film.
    if (window.scrollY > 0 && r.top < vh * 1.6 && video.preload === "none") { video.preload = "auto"; video.load(); }
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(driveOpener); }
  }, { passive: true });
  driveOpener();

  // Lecture/pause selon la visibilité (recette iOS : muted + playsinline + catch).
  // Pendant l'immersion vidéo, le CTA collant s'efface.
  new IntersectionObserver(([e]) => {
    openerOn = e.intersectionRatio >= 0.5;
    if (openerOn) video.play().catch(() => {});
    else video.pause();
    syncCta();
  }, { threshold: [0, 0.5] }).observe($(".opener__sticky"));

  // Légendes synchronisées sur la table de montage d'Ouverture42 (30,1 s) :
  // descente 0→14,4 s, cour, séjour, pièce vue, 6e, toits. [t, eyebrow, nom]
  const CAPS = [
    [0.0, "Depuis l'orbite", "La Terre"],
    [1.95, "Europe de l'Ouest", "La France"],
    [4.21, "Île-de-France", "Paris"],
    [6.77, "Rive gauche", "Le 7ᵉ arrondissement"],
    [8.72, "Saint-Thomas d'Aquin", "Rue du Bac"],
    [10.53, "", ""],
    [11.2, "L'immeuble", "La cour pavée"],
    [13.46, "5ᵉ étage", "Le séjour"],
    [15.71, "5ᵉ étage", "Fenêtre sur les toits"],
    [17.97, "6ᵉ étage", "Sous les toits"],
    [20.23, "La vue", "Les toits de Paris"],
    [21.95, "", ""]
  ];
  let capIdx = -1;
  video.addEventListener("timeupdate", () => {
    const t = video.currentTime;
    if (video.duration) bar.style.width = `${(t / video.duration) * 100}%`;
    let i = -1;
    for (let k = 0; k < CAPS.length; k++) if (t >= CAPS[k][0]) i = k;
    if (i === capIdx) return;
    capIdx = i;
    const cap = i >= 0 ? CAPS[i] : null;
    if (cap && cap[2]) {
      capEyebrow.textContent = cap[1];
      capName.textContent = cap[2];
      capEl.classList.add("is-on");
    } else {
      capEl.classList.remove("is-on");
    }
  });

  $("#openerSkip").addEventListener("click", () => {
    $("#photos").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });

  /* ---------- [3] Lightbox de la galerie ---------- */

  const lightbox = $("#lightbox");
  const lbImg = $("#lbImg");
  const lbCaption = $("#lbCaption");
  const lbCount = $("#lbCount");
  /* Photos, projections et plans partagent la même visionneuse : à
     l'écran les plans étaient rendus vers 7 px de haut, illisibles. */
  const shots = $$("#galleryGrid .ph, #projGrid .proj, .plan__zoom");
  const bgInert = [$("#nav"), $("#stickyCta"), $("main")];
  let lbIndex = 0;
  let lastFocus = null;

  const shotData = (el) => {
    /* Le plan du 6e empile deux SVG : on ouvre celui qui est affiché. */
    const img = $("img:not(.is-hidden)", el) || $("img", el);
    const isPlan = el.classList.contains("plan__zoom");
    /* Pour un plan, la légende vit dans la figure parente, pas dans le bouton. */
    const fig = isPlan ? el.closest(".plan") : el;
    const strong = isPlan ? $("figcaption strong", fig) : null;
    const cap = isPlan ? $("figcaption > span:not(.plan__toggle)", fig) : $("span, figcaption", el);
    const label = [strong && strong.textContent, cap && cap.textContent]
      .filter(Boolean).join(" · ");
    return {
      full: el.dataset.full || img.src,
      alt: img.alt,
      caption: label || img.alt,
      isPlan,
    };
  };

  const openLb = (i) => {
    lbIndex = (i + shots.length) % shots.length;
    const d = shotData(shots[lbIndex]);
    lbImg.src = d.full;
    lbImg.alt = d.alt;
    lbImg.classList.toggle("is-plan", d.isPlan);
    lbCaption.textContent = d.caption;
    lbCount.textContent = `${lbIndex + 1} / ${shots.length}`;
    if (lightbox.hidden) {
      lastFocus = document.activeElement;
      bgInert.forEach((el) => el && el.setAttribute("inert", ""));
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      $("#lbClose").focus();
    }
  };
  const closeLb = () => {
    lightbox.hidden = true;
    bgInert.forEach((el) => el && el.removeAttribute("inert"));
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };
  shots.forEach((btn, i) => btn.addEventListener("click", () => openLb(i)));
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", () => openLb(lbIndex - 1));
  $("#lbNext").addEventListener("click", () => openLb(lbIndex + 1));
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLb(); });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") openLb(lbIndex - 1);
    if (e.key === "ArrowRight") openLb(lbIndex + 1);
  });

  /* Balayage horizontal : sur mobile, c'est le geste attendu. */
  let swipeX = 0, swipeY = 0;
  lightbox.addEventListener("touchstart", (e) => {
    swipeX = e.changedTouches[0].clientX;
    swipeY = e.changedTouches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - swipeX;
    const dy = e.changedTouches[0].clientY - swipeY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) openLb(lbIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- [5] Plans : bascule avant / après du 6e ---------- */

  const planAvant = $("#planAvant");
  const planApres = $("#planApres");
  const imgAvant = $("#planImgAvant");
  const imgApres = $("#planImgApres");
  const setPlan = (apres) => {
    imgAvant.classList.toggle("is-hidden", apres);
    imgApres.classList.toggle("is-hidden", !apres);
    planAvant.classList.toggle("is-on", !apres);
    planApres.classList.toggle("is-on", apres);
    planAvant.setAttribute("aria-pressed", String(!apres));
    planApres.setAttribute("aria-pressed", String(apres));
  };
  planAvant.addEventListener("click", () => setPlan(false));
  planApres.addEventListener("click", () => setPlan(true));

  /* ---------- [6] Bloc visite : lecture à la demande ---------- */

  const visiteVideo = $("#visiteVideo");
  const visitePlay = $("#visitePlay");
  if (visiteVideo && visitePlay) {
    const frame = visiteVideo.closest(".visite__frame");
    visitePlay.addEventListener("click", () => {
      visiteVideo.play();
      frame.classList.add("is-playing");
    });
    visiteVideo.addEventListener("ended", () => frame.classList.remove("is-playing"));
  }

  /* ---------- [7] Formulaire → table leads (Supabase, insert-only) ---------- */

  const LEADS_URL = "https://ialrthwythkfnjgmtqjo.supabase.co/rest/v1/leads_42bac";
  const LEADS_KEY = "sb_publishable_q-1fcmuWWNntnFgOFQkIbw_TaPXi4vg";

  const form = $("#leadForm");
  const sent = $("#leadSent");
  const submitBtn = $("#leadSubmit");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const nom = String(data.get("nom") || "").trim();
    const email = String(data.get("email") || "").trim();
    const tel = String(data.get("tel") || "").trim();
    if (data.get("societe")) { // pot de miel : on fait semblant
      sent.textContent = "Merci, votre demande est enregistrée.";
      return;
    }
    if (!nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      sent.textContent = "Un nom et un email valides suffisent — réessayez.";
      return;
    }
    submitBtn.disabled = true;
    sent.textContent = "Envoi en cours…";
    try {
      const res = await fetch(LEADS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": LEADS_KEY,
          "Authorization": `Bearer ${LEADS_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          nom, email,
          tel: tel || null,
          source: "site-42-rue-du-bac",
          user_agent: navigator.userAgent.slice(0, 500)
        })
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      sent.textContent = "Merci — vous recevrez le dossier sous 24 h.";
    } catch {
      sent.textContent = "L'envoi a échoué — appelez le +33 6 12 07 68 83, réponse immédiate.";
    } finally {
      submitBtn.disabled = false;
    }
  });

})();
