/* ============================================================
   BLISK detailing — interactions
   Vanilla JS. Guards for reduced-motion and missing GSAP.
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ----------------------------------------------------------
     BOOT: branded shimmer, then lights-on reveal
  ---------------------------------------------------------- */
  (function boot() {
    const el = document.getElementById("boot");
    const root = document.documentElement;
    if (!el) { root.classList.remove("booting"); return; }
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      root.classList.remove("booting");
      root.classList.add("revealed");
      el.classList.add("boot--out");
      setTimeout(() => { el.style.display = "none"; }, 950);
    };
    let stageReady = false, minElapsed = false;
    const tryFinish = () => { if (stageReady && minElapsed) finish(); };
    document.addEventListener("blisk:ready", () => { stageReady = true; tryFinish(); }, { once: true });
    setTimeout(() => { minElapsed = true; tryFinish(); }, reduce ? 150 : 850);
    setTimeout(finish, reduce ? 600 : 4500); // hard cap, never hang
  })();

  /* ----------------------------------------------------------
     NAV: scrolled state (IntersectionObserver, no scroll listener)
     + mobile toggle
  ---------------------------------------------------------- */
  (function nav() {
    const nav = $("#nav");
    const toggle = $("#navToggle");
    const menu = $("#navMenu");

    // sentinel at very top to flip nav style without a scroll listener
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;";
    document.body.prepend(sentinel);
    new IntersectionObserver(
      ([e]) => nav.classList.toggle("scrolled", !e.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);

    const close = () => { menu.classList.remove("open"); toggle.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", close));
  })();

  /* ----------------------------------------------------------
     CINEMATIC reveals: focus-pull blocks + light-sweep headings + stagger
  ---------------------------------------------------------- */
  (function cinematic() {
    // auto-tag headings and key blocks (no need to touch markup)
    $$(".section-title").forEach((t) => t.classList.add("reveal-title"));
    $$(".section-sub, .stat, .review, .calc-block, .contact-list, .socials, .contact-form, .brands-label")
      .forEach((e) => e.classList.add("reveal"));
    // cascade children within grids
    $$(".stats-grid, .reviews-grid, .calc-controls, .svc-grid, .why-grid, .faq-list").forEach((g) => {
      Array.from(g.children).forEach((c, i) => c.style.setProperty("--rd", (i * 0.08).toFixed(2) + "s"));
    });

    // light-sweep seams between major sections
    ["#result", "#calc", "#works", ".reviews", "#contact"].forEach((sel) => {
      const sec = document.querySelector(sel);
      if (sec && sec.parentNode) {
        const seam = document.createElement("div");
        seam.className = "seam";
        seam.setAttribute("aria-hidden", "true");
        sec.parentNode.insertBefore(seam, sec);
      }
    });

    const all = $$(".reveal, .reveal-title, .seam");
    if (reduce || !("IntersectionObserver" in window)) { all.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    all.forEach((e) => io.observe(e));

    // failsafe: if the observer never delivers (e.g. loaded in a background tab), reveal everything
    let ioAlive = false;
    const probe = new IntersectionObserver((entries, o) => { ioAlive = true; o.disconnect(); });
    probe.observe(document.body);
    setTimeout(() => { if (!ioAlive) all.forEach((e) => e.classList.add("in")); }, 1800);
  })();

  /* ----------------------------------------------------------
     STAT counters
  ---------------------------------------------------------- */
  (function stats() {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const fmtN = (n) => Math.round(n).toLocaleString("uk-UA");
      el.textContent = fmtN(target); // robust final value, animation is enhancement
      if (reduce) return;
      const dur = 1400; const t0 = performance.now();
      const step = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? fmtN(target * eased) : fmtN(target);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  })();

  /* ----------------------------------------------------------
     MARQUEE: duplicate track for seamless loop
  ---------------------------------------------------------- */
  (function marquee() {
    const track = $("#brandMarquee .marquee-track");
    if (!track) return;
    track.innerHTML += track.innerHTML;
  })();

  /* ----------------------------------------------------------
     BEFORE / AFTER — inspection lamp (reveal "after" under the light)
  ---------------------------------------------------------- */
  (function comparison() {
    const cmp = $("#cmp");
    if (!cmp) return;
    const handle = $("#cmpHandle"), hint = $("#cmpHint");
    let dragging = false;
    const apply = (p) => {
      cmp.style.setProperty("--pos", p + "%");
      if (handle) handle.setAttribute("aria-valuenow", Math.round(p));
      if (hint) hint.classList.add("is-hidden");
    };
    const fromX = (clientX) => {
      const r = cmp.getBoundingClientRect();
      apply(clamp(((clientX - r.left) / r.width) * 100, 3, 97));
    };
    cmp.addEventListener("pointerdown", (e) => {
      dragging = true;
      try { cmp.setPointerCapture(e.pointerId); } catch (_) {}
      fromX(e.clientX);
    });
    cmp.addEventListener("pointermove", (e) => {
      if (dragging || e.pointerType === "mouse") fromX(e.clientX);
    });
    addEventListener("pointerup", () => { dragging = false; });
    if (handle) handle.addEventListener("keydown", (e) => {
      const cur = parseFloat(cmp.style.getPropertyValue("--pos")) || 50;
      if (e.key === "ArrowLeft") { e.preventDefault(); apply(clamp(cur - 4, 3, 97)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); apply(clamp(cur + 4, 3, 97)); }
    });
  })();

  /* ----------------------------------------------------------
     CURSOR accent glow (transform only, fine pointers)
  ---------------------------------------------------------- */
  (function cursorGlow() {
    if (reduce || matchMedia("(pointer: coarse)").matches) return;
    const el = document.getElementById("cursorGlow");
    if (!el) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = null;
    addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY; el.classList.add("on");
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    function loop() {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) ? requestAnimationFrame(loop) : null;
    }
  })();

  /* ----------------------------------------------------------
     CONFIGURATOR
  ---------------------------------------------------------- */
  (function configurator() {
    const root = $("#calc");
    if (!root) return;

    const state = {
      klass: { mult: 1, val: "Седан" },
      pack: { min: 900, max: 1600, days: 1, val: "Express блиск" },
      addons: new Map(),
    };

    const fmt = (n) => Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ");
    const elMin = $("#calcMin"), elMax = $("#calcMax"), elTime = $("#calcTime"), list = $("#summaryList");

    // animated number swap
    function animateTo(el, to) {
      const from = parseFloat((el.textContent || "0").replace(/\s/g, "")) || 0;
      el.textContent = fmt(to); // always show the correct final value (robust if rAF is throttled)
      if (reduce || from === to) return;
      const dur = 450, t0 = performance.now();
      const step = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? fmt(from + (to - from) * e) : fmt(to);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function recompute() {
      let addSum = 0, addDays = 0;
      state.addons.forEach((v) => { addSum += v.add; addDays += v.days; });
      const min = state.pack.min * state.klass.mult + addSum;
      const max = state.pack.max * state.klass.mult + addSum;
      const days = state.pack.days + addDays;
      animateTo(elMin, min); animateTo(elMax, max);
      elTime.textContent = days;

      // summary list
      list.innerHTML = "";
      const rows = [
        { i: "ph-car", t: state.klass.val },
        { i: "ph-package", t: state.pack.val },
        ...Array.from(state.addons.values()).map((a) => ({ i: "ph-plus-circle", t: a.val })),
      ];
      rows.forEach((r) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class="ph ${r.i}"></i> ${r.t}`;
        list.appendChild(li);
      });
    }

    // single-select groups
    $$('[data-group="klass"] .opt').forEach((b) => b.addEventListener("click", () => {
      $$('[data-group="klass"] .opt').forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.klass = { mult: parseFloat(b.dataset.mult), val: b.dataset.val };
      recompute();
    }));
    $$('[data-group="pack"] .opt').forEach((b) => b.addEventListener("click", () => {
      $$('[data-group="pack"] .opt').forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.pack = { min: +b.dataset.min, max: +b.dataset.max, days: +b.dataset.days, val: b.dataset.val };
      recompute();
    }));
    // multi-select add-ons
    $$('[data-group="addon"] .chip').forEach((b) => b.addEventListener("click", () => {
      const on = b.classList.toggle("is-active");
      if (on) state.addons.set(b.dataset.val, { add: +b.dataset.add, days: +b.dataset.days, val: b.dataset.val });
      else state.addons.delete(b.dataset.val);
      recompute();
    }));

    // price tiers (anchors) -> select the matching package in the builder, then reveal it
    function pickTier(card) {
      const btn = $('[data-group="pack"] .opt[data-val="' + card.dataset.pack + '"]');
      if (btn) btn.click();
      $$(".tier").forEach((t) => t.classList.remove("is-picked"));
      card.classList.add("is-picked");
      const grid = $(".calc-grid");
      if (grid) grid.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
    $$(".tier").forEach((card) => {
      card.addEventListener("click", () => pickTier(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickTier(card); }
      });
    });

    // book button prefills the form package
    $("#calcBook").addEventListener("click", () => {
      const sel = $("#fPack");
      if (sel && Array.from(sel.options).some((o) => o.value === state.pack.val || o.text === state.pack.val)) sel.value = state.pack.val;
    });

    recompute();
  })();

  /* ----------------------------------------------------------
     GALLERY drag-to-scroll with momentum
  ---------------------------------------------------------- */
  (function gallery() {
    const g = $("#gallery");
    if (!g) return;
    let down = false, startX = 0, startScroll = 0, vx = 0, lastX = 0, raf;
    const onDown = (e) => {
      down = true; g.classList.add("dragging");
      startX = e.clientX; lastX = e.clientX; startScroll = g.scrollLeft; vx = 0;
      if (raf) cancelAnimationFrame(raf);
      g.setPointerCapture && g.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      g.scrollLeft = startScroll - dx;
      vx = e.clientX - lastX; lastX = e.clientX;
    };
    const onUp = () => {
      if (!down) return;
      down = false; g.classList.remove("dragging");
      if (reduce) return;
      const decay = () => { g.scrollLeft -= vx; vx *= 0.93; if (Math.abs(vx) > 0.4) raf = requestAnimationFrame(decay); };
      decay();
    };
    g.addEventListener("pointerdown", onDown);
    g.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // arrow navigation + edge disable
    const prev = $("#galPrev"), next = $("#galNext");
    const step = () => { const c = g.querySelector(".work"); return c ? c.getBoundingClientRect().width + 22 : g.clientWidth * 0.8; };
    const updateArrows = () => {
      const max = g.scrollWidth - g.clientWidth - 2;
      if (prev) prev.disabled = g.scrollLeft <= 2;
      if (next) next.disabled = g.scrollLeft >= max;
    };
    if (prev) prev.addEventListener("click", () => g.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    if (next) next.addEventListener("click", () => g.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    g.addEventListener("scroll", updateArrows, { passive: true });
    updateArrows();
  })();

  /* ----------------------------------------------------------
     MAGNETIC buttons (transform only, outside React/state)
  ---------------------------------------------------------- */
  (function magnetic() {
    if (reduce || window.matchMedia("(pointer: coarse)").matches) return;
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) / r.width;
        const my = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${mx * 10}px, ${my * 8}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  })();

  /* ----------------------------------------------------------
     FORM
  ---------------------------------------------------------- */
  (function form() {
    const f = $("#bookForm");
    if (!f) return;
    const status = $("#formStatus");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#fName").value.trim();
      const phone = $("#fPhone").value.trim();
      if (name.length < 2 || phone.length < 5) {
        status.textContent = "Будь ласка, вкажіть імʼя та телефон.";
        status.className = "form-status err";
        return;
      }
      status.textContent = "Дякуємо! Передзвонимо протягом 15 хвилин.";
      status.className = "form-status ok";
      f.reset();
    });
  })();

  /* ----------------------------------------------------------
     BOOKING: multi-step online booking modal
  ---------------------------------------------------------- */
  (function booking() {
    const modal = $("#booking");
    if (!modal) return;
    const panel = $(".booking-panel", modal);
    const stepsNav = $$("#bookingSteps li");
    const steps = $$(".bstep", modal);
    const backBtn = $("#bBack");
    const nextBtn = $("#bNext");
    const errEl = $("#bookingErr");
    const total = steps.length;
    let cur = 1;

    const state = { pack: "Express блиск", price: "900 - 1 600 грн", carClass: "Седан", car: "", date: null, time: null, name: "", phone: "" };
    const SLOTS = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
    const MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
    const MONTHS_NOM = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];

    let lastFocus = null;
    function open(prefillPack) {
      lastFocus = document.activeElement;
      if (prefillPack) selectPack(prefillPack);
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      go(1);
      setTimeout(() => nextBtn.focus(), 60);
    }
    function close() {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $$("[data-bclose]", modal).forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (!modal.hidden && e.key === "Escape") close(); });

    $$("[data-book]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault();
      let pp = null;
      if (b.id === "calcBook") {
        const ap = document.querySelector('[data-group="pack"] .opt.is-active');
        if (ap) pp = ap.dataset.val;
      }
      open(pp);
    }));

    function go(n) {
      cur = Math.min(Math.max(n, 1), total);
      steps.forEach((s) => s.classList.toggle("is-on", +s.dataset.step === cur));
      stepsNav.forEach((li, i) => {
        li.classList.toggle("is-on", i + 1 === cur);
        li.classList.toggle("is-done", i + 1 < cur);
      });
      backBtn.style.visibility = cur === 1 ? "hidden" : "visible";
      nextBtn.innerHTML = cur >= total ? "Готово" : (cur === total - 1 ? "Підтвердити" : 'Далі <i class="ph ph-arrow-right"></i>');
      if (errEl) errEl.textContent = "";
      if (cur === total) buildTicket();
      panel.scrollTop = 0;
    }

    function validate() {
      if (cur === 1) return !!state.pack;
      if (cur === 2) return !!state.carClass;
      if (cur === 3) { if (!state.date) return "Оберіть дату."; if (!state.time) return "Оберіть час."; return true; }
      if (cur === 4) {
        state.name = $("#bName").value.trim();
        state.car = $("#bCar").value.trim();
        state.phone = $("#bPhone").value.trim();
        if (state.name.length < 2) return "Вкажіть, як до вас звертатися.";
        if (state.phone.replace(/\D/g, "").length < 7) return "Вкажіть коректний телефон.";
        return true;
      }
      return true;
    }

    nextBtn.addEventListener("click", () => {
      if (cur >= total) { close(); return; }
      const v = validate();
      if (v !== true) { if (errEl) errEl.textContent = typeof v === "string" ? v : "Заповніть крок."; return; }
      go(cur + 1);
    });
    backBtn.addEventListener("click", () => go(cur - 1));

    function selectPack(val) {
      const btn = $$('[data-bgroup="pack"] .bpack').find((b) => b.dataset.val === val);
      if (!btn) return;
      $$('[data-bgroup="pack"] .bpack').forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.pack = btn.dataset.val;
      state.price = btn.dataset.price;
    }
    $$('[data-bgroup="pack"] .bpack').forEach((b) => b.addEventListener("click", () => { selectPack(b.dataset.val); setTimeout(() => go(2), 220); }));

    $$('[data-bgroup="class"] .bopt').forEach((b) => b.addEventListener("click", () => {
      $$('[data-bgroup="class"] .bopt').forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.carClass = b.dataset.val;
    }));

    const monthEl = $("#bcalMonth"), gridEl = $("#bcalGrid"), slotsEl = $("#bSlots");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let viewY = today.getFullYear(), viewM = today.getMonth();

    function renderCal() {
      monthEl.textContent = MONTHS_NOM[viewM] + " " + viewY;
      gridEl.innerHTML = "";
      const startDow = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
      const days = new Date(viewY, viewM + 1, 0).getDate();
      for (let i = 0; i < startDow; i++) {
        const e = document.createElement("div"); e.className = "bday is-empty"; gridEl.appendChild(e);
      }
      for (let d = 1; d <= days; d++) {
        const date = new Date(viewY, viewM, d); date.setHours(0, 0, 0, 0);
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "bday"; btn.textContent = d;
        if (date < today || date.getDay() === 0) btn.disabled = true;
        if (state.date && date.getTime() === state.date.getTime()) btn.classList.add("is-active");
        btn.addEventListener("click", () => {
          state.date = date; state.time = null;
          $$(".bday", gridEl).forEach((x) => x.classList.remove("is-active"));
          btn.classList.add("is-active");
          renderSlots(date);
          if (errEl) errEl.textContent = "";
        });
        gridEl.appendChild(btn);
      }
    }
    function renderSlots(date) {
      slotsEl.innerHTML = "";
      SLOTS.forEach((t, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "bslot"; b.textContent = t;
        if ((date.getDate() + i) % 3 === 0) b.disabled = true; // deterministic mock availability
        if (state.time === t) b.classList.add("is-active");
        b.addEventListener("click", () => {
          state.time = t;
          $$(".bslot", slotsEl).forEach((x) => x.classList.remove("is-active"));
          b.classList.add("is-active");
          if (errEl) errEl.textContent = "";
          setTimeout(() => go(4), 240);
        });
        slotsEl.appendChild(b);
      });
    }
    $("#bcalPrev").addEventListener("click", () => { if (--viewM < 0) { viewM = 11; viewY--; } renderCal(); });
    $("#bcalNext").addEventListener("click", () => { if (++viewM > 11) { viewM = 0; viewY++; } renderCal(); });
    renderCal();

    function buildTicket() {
      const num = "BL-2026-" + String(state.date ? state.date.getDate() : 1).padStart(2, "0") + (SLOTS.indexOf(state.time) + 1);
      const dateStr = state.date ? state.date.getDate() + " " + MONTHS[state.date.getMonth()] : "";
      $("#bTicket").innerHTML =
        '<div class="bticket-row"><span>Номер</span><strong class="bticket-no">' + num + "</strong></div>" +
        '<div class="bticket-row"><span>Пакет</span><strong>' + state.pack + "</strong></div>" +
        '<div class="bticket-row"><span>Орієнтовно</span><strong>' + state.price + "</strong></div>" +
        '<div class="bticket-row"><span>Авто</span><strong>' + state.carClass + (state.car ? ", " + state.car : "") + "</strong></div>" +
        '<div class="bticket-row"><span>Дата і час</span><strong>' + dateStr + ", " + (state.time || "") + "</strong></div>" +
        '<div class="bticket-row"><span>Контакт</span><strong>' + state.name + ", " + state.phone + "</strong></div>";
    }

    // expose for verification
    window.__BOOK = { open, close, go, state, get step() { return cur; } };
  })();

  /* ----------------------------------------------------------
     CONCIERGE chat (frontend, scripted; ready for real AI/Telegram later)
  ---------------------------------------------------------- */
  (function concierge() {
    const root = $("#cbot");
    if (!root) return;
    const launch = $("#cbotLaunch"), panel = $("#cbotPanel"), log = $("#cbotLog");
    const quick = $("#cbotQuick"), form = $("#cbotForm"), input = $("#cbotText");
    let started = false, awaitingPhone = false;

    const fmt = (n) => Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ");
    const CLASSES = [
      { label: "Седан", mult: 1 }, { label: "Кросовер/SUV", mult: 1.25 },
      { label: "Спорткар", mult: 1.15 }, { label: "Преміум", mult: 1.45 },
    ];
    const PACKS = [
      { label: "Express блиск", min: 900, max: 1600, days: 1 },
      { label: "Глибока корекція", min: 4500, max: 9000, days: 2 },
      { label: "Кераміка PRO", min: 11000, max: 24000, days: 4 },
      { label: "PPF Бронепакет", min: 38000, max: 78000, days: 6 },
    ];

    /* ---- rendering ---- */
    const AVA = '<i class="ph-fill ph-drop-half"></i>';
    function addMsg(text, who) {
      const prev = log.lastElementChild;
      const row = document.createElement("div");
      row.className = "cbot-row cbot-row--" + who;
      if (who === "bot") {
        const av = document.createElement("span");
        av.className = "cbot-mini-ava"; av.innerHTML = AVA;
        if (prev && prev.classList && prev.classList.contains("cbot-row--bot")) av.classList.add("is-hidden");
        row.appendChild(av);
      }
      const m = document.createElement("div");
      m.className = "cbot-msg cbot-msg--" + who;
      m.textContent = text;
      row.appendChild(m);
      log.appendChild(row); log.scrollTop = log.scrollHeight;
      return m;
    }
    function addBot(text, opts) {
      opts = opts || {};
      const m = addMsg(text, "bot");
      if (opts.options && opts.options.length) {
        const box = document.createElement("div");
        box.className = "cbot-opts";
        opts.options.forEach((o) => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "cbot-opt"; b.textContent = o.label;
          b.addEventListener("click", () => { addMsg(o.label, "user"); o.on && o.on(); });
          box.appendChild(b);
        });
        m.appendChild(box);
      }
      log.scrollTop = log.scrollHeight;
    }
    function botSay(text, opts) {
      const prev = log.lastElementChild;
      const row = document.createElement("div");
      row.className = "cbot-row cbot-row--bot";
      const av = document.createElement("span");
      av.className = "cbot-mini-ava"; av.innerHTML = AVA;
      if (prev && prev.classList && prev.classList.contains("cbot-row--bot")) av.classList.add("is-hidden");
      const t = document.createElement("div");
      t.className = "cbot-typing"; t.innerHTML = "<i></i><i></i><i></i>";
      row.appendChild(av); row.appendChild(t);
      log.appendChild(row); log.scrollTop = log.scrollHeight;
      setStatus("typing", "друкує…");
      const delay = reduce ? 0 : 420 + Math.min(text.length * 6, 650);
      setTimeout(() => { row.remove(); restoreStatus(); addBot(text, opts); }, delay);
    }
    function setQuick(chips) {
      quick.innerHTML = "";
      chips.forEach((q) => {
        const c = document.createElement("button");
        c.type = "button"; c.className = "cbot-chip"; c.textContent = q.label;
        c.addEventListener("click", () => { addMsg(q.label, "user"); q.on(); });
        quick.appendChild(c);
      });
    }
    function menuChips() {
      setQuick([
        { label: "Підібрати догляд", on: startRecommend },
        { label: "Розрахувати ціну", on: () => startEstimate() },
        { label: "Записатись", on: startBooking },
        { label: "Питання", on: showFaq },
      ]);
    }

    /* ---- recommender quiz ---- */
    function startRecommend() {
      awaitingPhone = false;
      botSay("Що для вас зараз найважливіше?", {
        options: [
          { label: "Захистити лак надовго", on: () => recommend("ceramic") },
          { label: "Прибрати риски, затертості", on: () => recommend("correction") },
          { label: "Захист від сколів", on: () => recommend("ppf") },
          { label: "Освіжити салон", on: () => recommend("interior") },
          { label: "Швидко освіжити кузов", on: () => recommend("wash") },
        ],
      });
    }
    const RECO = {
      ceramic: { text: "Раджу керамічне покриття 9H. Від 11 000 грн, тримається до 5 років: гідрофоб і захист лаку.", pack: PACKS[2] },
      correction: { text: "Раджу глибоку корекцію лаку. Від 4 500 грн, прибирає риски й голограми, повертає дзеркало.", pack: PACKS[1] },
      ppf: { text: "Раджу захисну плівку PPF. Від 38 000 грн, антигравійний захист від сколів.", pack: PACKS[3] },
      interior: { text: "Раджу хімчистку салону. Від 2 500 грн, глибоке очищення й озонування.", pack: null },
      wash: { text: "Раджу Express догляд. Від 900 грн, двофазна мийка й деконтамінація.", pack: PACKS[0] },
    };
    function recommend(key) {
      const r = RECO[key], opts = [];
      if (r.pack) opts.push({ label: "Розрахувати точніше", on: () => startEstimate(r.pack) });
      opts.push({ label: "Записатись", on: () => openBook(r.pack) });
      botSay(r.text, { options: opts });
    }

    /* ---- in-chat price estimate ---- */
    function startEstimate(prefillPack) {
      awaitingPhone = false;
      botSay("Який клас авто?", { options: CLASSES.map((c) => ({ label: c.label, on: () => pickClass(c, prefillPack) })) });
    }
    function pickClass(c, prefillPack) {
      if (prefillPack) { computeEstimate(c, prefillPack); return; }
      botSay("Який пакет цікавить?", { options: PACKS.map((p) => ({ label: p.label, on: () => computeEstimate(c, p) })) });
    }
    function computeEstimate(c, p) {
      const min = p.min * c.mult, max = p.max * c.mult;
      botSay("Орієнтовно " + fmt(min) + " - " + fmt(max) + " грн, " + p.days + " дн. Точну ціну назвемо після огляду авто.", {
        options: [
          { label: "Записатись на «" + p.label + "»", on: () => openBook(p) },
          { label: "Порахувати ще раз", on: () => startEstimate() },
        ],
      });
    }

    /* ---- booking / lead ---- */
    function startBooking() {
      awaitingPhone = false;
      botSay("Як зручніше?", {
        options: [
          { label: "Повний онлайн-запис", on: () => openBook(null) },
          { label: "Залишити телефон тут", on: askPhone },
        ],
      });
    }
    function askPhone() {
      awaitingPhone = true;
      botSay("Напишіть номер телефону, і ми передзвонимо протягом 15 хвилин.");
      input.placeholder = "+380 __ ___ __ __";
      setTimeout(() => input.focus(), 60);
    }
    function openBook(pack) { close(); if (window.__BOOK) window.__BOOK.open(pack ? pack.label : null); }

    /* ---- FAQ menu ---- */
    function showFaq() {
      botSay("Що цікавить?", {
        options: [
          { label: "Скільки тримається кераміка?", on: () => answer("warranty") },
          { label: "Скільки часу займає?", on: () => answer("time") },
          { label: "Що таке PPF?", on: () => answer("ppf") },
          { label: "Де ви та коли працюєте?", on: () => answer("address") },
          { label: "Як оплатити?", on: () => answer("payment") },
        ],
      });
    }

    const ANSWERS = {
      ceramic: "Керамічне покриття 9H тримається до 5 років: гідрофоб, захист від ультрафіолету та реагентів, глибина кольору як у салоні.",
      ppf: "PPF це антигравійна поліуретанова плівка з ефектом самовідновлення подряпин. Захищає кузов від сколів і реагентів.",
      correction: "Корекція лаку це багатоетапне полірування: прибираємо риски, голограми й затертості, повертаємо рівне дзеркало.",
      interior: "Хімчистка салону: глибоке очищення шкіри, тканини й пластику, озонування проти запахів.",
      price: "Орієнтовно: мийка від 900 грн, корекція від 4 500, кераміка від 11 000, PPF від 38 000. Точніше порахуємо разом.",
      address: "Ми в Києві, вул. Боксова, 12. Працюємо щодня з 09:00 до 20:00.",
      time: "Від кількох годин за мийку до 4-6 днів за повну корекцію з керамікою чи PPF. Точний час назвемо після огляду.",
      warranty: "На керамічне покриття гарантія до 5 років, на кожну роботу видаємо гарантійний талон.",
      payment: "Приймаємо готівку та картку. Передоплата не потрібна, оплата після огляду й узгодження.",
      telegram: "Звісно, напишіть нам у Telegram, відповімо швидко.",
    };
    const ACTIONS = {
      price: { label: "Розрахувати точніше", on: () => startEstimate() },
      ceramic: { label: "Записатись на кераміку", on: () => openBook(PACKS[2]) },
      ppf: { label: "Записатись на PPF", on: () => openBook(PACKS[3]) },
      correction: { label: "Записатись", on: () => openBook(PACKS[1]) },
      interior: { label: "Записатись", on: () => openBook(null) },
      warranty: { label: "Записатись", on: () => openBook(null) },
      telegram: { label: "Відкрити Telegram", on: () => window.open("https://t.me/", "_blank", "noopener") },
    };
    function answer(key) {
      const act = ACTIONS[key];
      botSay(ANSWERS[key] || ANSWERS.price, act ? { options: [act] } : undefined);
    }

    function intentFromText(t) {
      t = " " + t.toLowerCase() + " ";
      if (/(підібр|порадь|що краще|не знаю|допомож)/.test(t)) return "recommend";
      if (/(цін|вартіст|скільки кошт|почім|розрах)/.test(t)) return "price";
      if (/(запис|записат|коли можна|вільн|слот)/.test(t)) return "book";
      if (/(керамік|9h|рідке скло)/.test(t)) return "ceramic";
      if (/(плівк|ppf|ппф|броне|антиграв)/.test(t)) return "ppf";
      if (/(корекц|полір|риск|голограм|затерт)/.test(t)) return "correction";
      if (/(салон|хімчист|шкір|запах|озон)/.test(t)) return "interior";
      if (/(адрес|де ви|знаходит|як доїхати|локац|годин|працює|графік)/.test(t)) return "address";
      if (/(скільки часу|як довго|термін|днів)/.test(t)) return "time";
      if (/(гаранті|тримаєт|надовго)/.test(t)) return "warranty";
      if (/(оплат|картк|готівк|розстрочк)/.test(t)) return "payment";
      if (/(telegram|телеграм|вайбер|viber)/.test(t)) return "telegram";
      return "fallback";
    }
    function handleText(t) {
      const intent = intentFromText(t);
      if (intent === "recommend") return startRecommend();
      if (intent === "book") return startBooking();
      if (intent === "price") return startEstimate();
      if (ANSWERS[intent]) return answer(intent);
      botSay("Передам це майстру, відповімо детально. А поки можу підібрати догляд, порахувати ціну або записати вас.", {
        options: [{ label: "Підібрати догляд", on: startRecommend }, { label: "Записатись", on: startBooking }],
      });
    }

    /* ---- open / close / input ---- */
    /* ---- live status ---- */
    const statusEl = root.querySelector(".cbot-who em");
    let baseMode = "online", baseText = "Онлайн зараз";
    function setStatus(mode, text) {
      if (!statusEl) return;
      statusEl.className = "cbot-status " + mode;
      statusEl.innerHTML = '<span class="cbot-dot"></span>' + text;
    }
    function restoreStatus() { setStatus(baseMode, baseText); }
    function applyOnline() {
      const h = new Date().getHours();
      if (h >= 9 && h < 20) { baseMode = "online"; baseText = "Онлайн зараз"; }
      else { baseMode = "away"; baseText = "Відповімо вранці"; }
      restoreStatus();
    }

    function openChat() {
      panel.hidden = false; root.classList.add("is-open");
      launch.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      hideTeaser(); applyOnline();
      if (!started) {
        started = true;
        menuChips();
        botSay("Вітаю! Я консьєрж BLISK. Допоможу підібрати догляд, порахувати вартість і записати авто. З чого почнемо?");
      }
      setTimeout(() => input.focus(), 80);
    }
    function close() {
      panel.hidden = true; root.classList.remove("is-open");
      launch.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    launch.addEventListener("click", () => { panel.hidden ? openChat() : close(); });
    const closeBtn = $("#cbotClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      addMsg(t, "user"); input.value = "";
      if (awaitingPhone) {
        if (t.replace(/\D/g, "").length < 7) { botSay("Здається, номер неповний. Напишіть, будь ласка, телефон у форматі +380..."); return; }
        awaitingPhone = false; input.placeholder = "Напишіть запитання";
        botSay("Дякуємо! Передзвонимо протягом 15 хвилин. Можу ще чимось допомогти?", {
          options: [{ label: "Підібрати догляд", on: startRecommend }, { label: "Розрахувати ціну", on: () => startEstimate() }],
        });
        return;
      }
      handleText(t);
    });

    /* ---- proactive teaser ---- */
    let teaserEl = null;
    function showTeaser() {
      if (started || teaserEl || !panel.hidden) return;
      teaserEl = document.createElement("button");
      teaserEl.type = "button"; teaserEl.className = "cbot-teaser";
      teaserEl.textContent = "Привіт! Допомогти підібрати догляд?";
      teaserEl.addEventListener("click", openChat);
      root.appendChild(teaserEl);
    }
    function hideTeaser() { if (teaserEl) { teaserEl.remove(); teaserEl = null; } }
    if (!reduce) setTimeout(showTeaser, 7000);

    window.__CBOT = { open: openChat, close, handleText, intentFromText, startRecommend, startEstimate };
  })();

  /* ----------------------------------------------------------
     FAQ: single-open accordion
  ---------------------------------------------------------- */
  (function faq() {
    const items = $$(".faq-item");
    if (!items.length) return;
    items.forEach((d) => d.addEventListener("toggle", () => {
      if (d.open) items.forEach((o) => { if (o !== d) o.open = false; });
    }));
  })();

  /* ----------------------------------------------------------
     CARD spotlight: champagne glow follows the cursor
  ---------------------------------------------------------- */
  (function spotlight() {
    if (reduce || window.matchMedia("(pointer: coarse)").matches) return;
    $$(".why-card, .review").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
    });
  })();

})();
