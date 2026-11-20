/* The station flight. Web Animations only (transforms, opacity; blur only on the card's small rows), so the
   compositor carries it and tools/clip.mjs can step it frame by frame. No requestAnimationFrame, no canvas, no timers:
   every beat is one animation with a delay, all created in the click. */
(function () {
  "use strict";
  // ---------- station-focus / station-return: every number in one place (milliseconds) ----------
  var F = {
    ease: "cubic-bezier(.5,0,.15,1)", // the camera: a short take-off, the sweep, then the reference maps' long soft landing
    easeBack: "cubic-bezier(.4,0,.2,1)",
    easeRise: "cubic-bezier(.33,1,.68,1)", // ease-out cubic: the place rising to meet you
    easeIn: "cubic-bezier(.5,0,.75,0)",
    cam: 1200, // the flight
    labelsOut: 160, // map labels and furniture clear out of the way
    riseAt: 640, rise: 560, lift: 16, grow: 1.16, // the station lifts off the sheet; a survey ring draws round its foot
    cardAt: 980, card: 440, // the card arrives as the camera lands
    rowAt: 1080, rowStep: 70, row: 480, // its rows come into focus one after another
    barAt: 1480, bar: 520, // the match bar grows its new part
    out: { card: 180, sheet: 260, sink: 220, camAt: 60, cam: 1000, labelsAt: 620, labels: 280 },
  };
  var maps = [];

  function setup(map) {
    var plane = map.querySelector(".plane");
    var layer = document.querySelector('.flayer[data-map="' + map.id + '"]');
    var isSheet = layer.classList.contains("sheet");
    var fx = +map.dataset.fx, fy = +map.dataset.fy, pitch = +map.dataset.pitch, scale = +map.dataset.scale, keep = +map.dataset.keep;
    var bbs = [].slice.call(map.querySelectorAll(".bb"));
    var quiet = [].slice.call(map.querySelectorAll(".st .lb, .st .ld, .peak .lb, .sign, .seg2"));
    var ring = map.querySelector(".fring"), shadow = map.querySelector(".fshadow"), back = map.querySelector(".map-back");
    var leader = layer.querySelector(".fleader");
    var state = null;

    /** A click during the opening acts on the final state: finish whatever is still drawing. */
    function settleOpening() {
      map.getAnimations({ subtree: true }).forEach(function (a) {
        var t = a.effect && a.effect.getComputedTiming();
        if (t && t.iterations !== Infinity && a.playState !== "finished") {
          try { a.finish(); } catch (e) { /* ignore */ }
        }
      });
    }
    function maker(list) {
      return function (el, frames, o) {
        if (!el) return;
        o.fill = "both";
        if (!o.easing) o.easing = F.ease;
        list.push(el.animate(frames, o));
      };
    }

    function focus(st) {
      if (state) return;
      settleOpening();
      var x = +st.dataset.x, y = +st.dataset.y, r = +st.dataset.r;
      var card = layer.querySelector('.fcard[data-for="' + st.dataset.station + '"]');
      var A = [], an = maker(A);
      // the camera: pitch about the station, bring it to the focus point, come closer
      var T0 = "translate3d(0px,0px,0px) rotateX(0deg) scale3d(1,1,1)";
      var T1 = "translate3d(" + (fx - x) + "px," + (fy - y) + "px,0px) rotateX(" + pitch + "deg) scale3d(" + scale + "," + scale + "," + scale + ")";
      // billboards: the exact opposite pitch, so coins, flag and walker stay upright at every frame
      var q = keep / scale;
      var B0 = "rotateX(0deg) scale3d(1,1,1)", B1 = "rotateX(-" + pitch + "deg) scale3d(" + q + "," + q + "," + q + ")";
      plane.style.transformOrigin = x + "px " + y + "px";
      an(plane, [{ transform: T0 }, { transform: T1 }], { duration: F.cam });
      bbs.forEach(function (b) { an(b, [{ transform: B0 }, { transform: B1 }], { duration: F.cam }); });
      quiet.forEach(function (q) { an(q, [{ opacity: 1 }, { opacity: 0 }], { duration: F.labelsOut, easing: "linear" }); });
      // the place answers: it lifts off the sheet, its shadow stays down, a ring draws round its foot
      var coin = st.querySelector(".coin");
      var C1 = "translateY(-" + F.lift + "px) scale(" + F.grow + ")";
      an(coin, [{ transform: "translateY(0px) scale(1)" }, { transform: C1 }], { delay: F.riseAt, duration: F.rise, easing: F.easeRise });
      ring.setAttribute("cx", x); ring.setAttribute("cy", y + r); ring.setAttribute("r", r * 0.9 + 9);
      shadow.setAttribute("cx", x); shadow.setAttribute("cy", y + r + 1); shadow.setAttribute("rx", r * 0.8); shadow.setAttribute("ry", r * 0.3);
      an(ring, [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { delay: F.riseAt, duration: F.rise, easing: F.easeRise });
      an(shadow, [{ opacity: 0 }, { opacity: 0.2 }], { delay: F.riseAt, duration: F.rise, easing: F.easeRise });
      // the card arrives after the landing; on the phone it is a bottom sheet
      card.classList.add("on");
      if (isSheet) an(card, [{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }], { delay: F.cardAt, duration: F.card + 60 });
      else an(card, [{ opacity: 0, transform: "translateX(-26px)" }, { opacity: 1, transform: "translateX(0px)" }], { delay: F.cardAt, duration: F.card });
      [].slice.call(card.querySelectorAll(".fi")).forEach(function (row, i) {
        an(row, [{ opacity: 0, transform: "translateY(9px)", filter: "blur(4px)" }, { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }], { delay: F.rowAt + i * F.rowStep, duration: F.row, easing: "cubic-bezier(.2,.7,.2,1)" });
      });
      an(card.querySelector(".mbar .th"), [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { delay: F.barAt, duration: F.bar });
      an(card.querySelector(".stamp"), [{ opacity: 0, transform: "rotate(-9deg) scale(1.45)" }, { opacity: 1, transform: "rotate(-9deg) scale(1)" }], { delay: F.barAt + 60, duration: 240, easing: "cubic-bezier(.3,0,.2,1)" });
      if (leader) {
        var cos = Math.cos((pitch * Math.PI) / 180);
        var cy = fy + r * scale * cos - (r + F.lift) * keep;
        var x0 = 22 + 348 + 7, x1 = fx - r * keep * F.grow - 9;
        leader.style.left = x0 + "px"; leader.style.top = cy + "px"; leader.style.width = x1 - x0 + "px";
        an(leader, [{ opacity: 1, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }], { delay: F.cardAt + 80, duration: 340 });
      }
      an(back, [{ opacity: 0 }, { opacity: 1 }], { delay: F.cardAt, duration: 240, easing: "linear" });
      map.classList.add("is-focus");
      state = { st: st, card: card, coin: coin, A: A, T0: T0, T1: T1, B0: B0, B1: B1, C1: C1 };
      return state;
    }

    function unfocus() {
      if (!state || state.leaving) return;
      var s = state, old = s.A, A = [], an = maker(A), o = F.out;
      s.leaving = true;
      // the card leaves first, the station sits back down, then the camera returns to exactly the overview
      if (isSheet) an(s.card, [{ transform: "translateY(0%)" }, { transform: "translateY(100%)" }], { duration: o.sheet, easing: F.easeIn });
      else an(s.card, [{ opacity: 1, transform: "translateX(0px)" }, { opacity: 0, transform: "translateX(-14px)" }], { duration: o.card, easing: "ease-in" });
      an(leader, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "linear" });
      an(back, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "linear" });
      an(s.coin, [{ transform: s.C1 }, { transform: "translateY(0px) scale(1)" }], { duration: o.sink, easing: F.easeRise });
      an(ring, [{ strokeDashoffset: 0, opacity: 1 }, { strokeDashoffset: 0, opacity: 0 }], { duration: o.sink, easing: "linear" });
      an(shadow, [{ opacity: 0.2 }, { opacity: 0 }], { duration: o.sink, easing: "linear" });
      an(plane, [{ transform: s.T1 }, { transform: s.T0 }], { delay: o.camAt, duration: o.cam, easing: F.easeBack });
      bbs.forEach(function (b) { an(b, [{ transform: s.B1 }, { transform: s.B0 }], { delay: o.camAt, duration: o.cam, easing: F.easeBack }); });
      quiet.forEach(function (q) { an(q, [{ opacity: 0 }, { opacity: 1 }], { delay: o.labelsAt, duration: o.labels, easing: "linear" }); });
      old.forEach(function (a) { a.cancel(); });
      s.A = A;
      Promise.all(A.map(function (a) { return a.finished; })).then(function () {
        A.forEach(function (a) { a.cancel(); });
        s.card.classList.remove("on");
        map.classList.remove("is-focus");
        plane.style.transformOrigin = "";
        state = null;
      }, function () { /* cancelled */ });
    }

    map.addEventListener("click", function (e) {
      if (state) { unfocus(); return; }
      var st = e.target.closest("[data-station]");
      if (st) focus(st);
    });
    map.addEventListener("keydown", function (e) {
      var st = e.target.closest && e.target.closest("[data-station]");
      if (st && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); st.click(); }
    });
    layer.addEventListener("click", function (e) { if (e.target.closest(".fc-x")) unfocus(); });
    return {
      map: map,
      unfocus: unfocus,
      /** open a station with no motion (used for stills and for recording the return) */
      show: function (id) {
        var st = map.querySelector('[data-station="' + id + '"]');
        var s = st && focus(st);
        if (s) s.A.forEach(function (a) { a.finish(); });
      },
    };
  }

  document.querySelectorAll(".map").forEach(function (m) { maps.push(setup(m)); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") maps.forEach(function (m) { m.unfocus(); }); });
  // a click anywhere outside the map and its card also returns to the overview
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".map") && !e.target.closest(".flayer")) maps.forEach(function (m) { m.unfocus(); });
  });
  window.dalilakMaps = maps; // [desktop, phone]: .show(id) opens a station with no motion, .unfocus() returns
  var hash = /focus=(\w+)/.exec(location.hash);
  if (hash) maps.forEach(function (m) { m.show(hash[1]); });
})();
