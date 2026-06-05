/* ============================================================
   BLISK — hero. The orbit video auto-plays on its own loop; the
   page scroll stays 100% native (no scroll-jacking), so scrolling
   is smooth on any hardware. This file only ensures autoplay and
   signals the boot overlay when the hero is ready.
   ============================================================ */
(function () {
  "use strict";
  const v = document.getElementById("heroVideo");
  let done = false;
  function ready() {
    if (done) return;
    done = true;
    document.dispatchEvent(new Event("blisk:ready"));
  }
  if (!v) { ready(); return; }

  v.muted = true;
  v.playsInline = true;
  const p = v.play && v.play();
  if (p && p.catch) p.catch(function () {});

  if (v.readyState >= 2) ready();
  v.addEventListener("loadeddata", ready, { once: true });
  v.addEventListener("canplay", ready, { once: true });
  v.addEventListener("error", ready, { once: true });
  setTimeout(ready, 3000); // never block the reveal
})();
