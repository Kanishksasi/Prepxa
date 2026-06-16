// Prepxa — 3D hero background (dependency-free, original work).
// A rotating crystalline icosahedron inside an orbiting starfield, with amber
// and indigo rings. Pure Canvas 2D + hand-rolled 3D projection — no WebGL, no
// ES modules, no CDN — so it renders identically from file://, offline, or any
// host, and degrades gracefully. Mouse adds parallax; scroll recedes the world.

(function () {
  "use strict";

  var canvas = document.getElementById("scene");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, cx = 0, cy = 0, unit = 0;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cx = W / 2; cy = H / 2;
      unit = Math.min(W, H) * 0.16;            // world-units → pixels
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---- icosahedron geometry (12 verts, edges derived from 20 faces) -------
    var g = (1 + Math.sqrt(5)) / 2;
    var R = 2.2;
    var verts = [
      [-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0],
      [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g],
      [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1]
    ].map(function (v) {
      var l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l * R, v[1] / l * R, v[2] / l * R];
    });
    var faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    var edges = (function () {
      var seen = {}, out = [];
      faces.forEach(function (f) {
        [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
          var k = Math.min(e[0], e[1]) + "_" + Math.max(e[0], e[1]);
          if (!seen[k]) { seen[k] = 1; out.push([e[0], e[1]]); }
        });
      });
      return out;
    })();

    // ---- starfield (3D shell, keeps centre clear so the core reads) ---------
    var COUNT = reduce ? 700 : 2800;
    var stars = [];
    for (var i = 0; i < COUNT; i++) {
      var r = 5 + Math.random() * 16;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      stars.push([
        r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th) * 0.62,
        r * Math.cos(ph)
      ]);
    }

    // ---- rings (circle of points in a tilted plane) -------------------------
    function makeRing(radius, tiltX, tiltY) {
      var pts = [], N = 96;
      for (var k = 0; k < N; k++) {
        var a = (k / N) * Math.PI * 2;
        var p = [Math.cos(a) * radius, 0, Math.sin(a) * radius];
        p = rot(p, tiltX, tiltY);
        pts.push(p);
      }
      return pts;
    }

    // ---- math ---------------------------------------------------------------
    function rot(p, ax, ay) {
      var cy_ = Math.cos(ay), sy = Math.sin(ay);
      var x = p[0] * cy_ - p[2] * sy;
      var z = p[0] * sy + p[2] * cy_;
      var cx_ = Math.cos(ax), sx = Math.sin(ax);
      var y = p[1] * cx_ - z * sx;
      var z2 = p[1] * sx + z * cx_;
      return [x, y, z2];
    }
    var camZ = 9, FOCAL = 9;
    function project(p) {
      var z = p[2] + camZ;
      if (z < 0.6) return null;            // behind the camera
      var s = FOCAL / z;
      return [cx + p[0] * s * unit, cy + p[1] * s * unit, s];
    }

    var ring1 = makeRing(3.4, Math.PI / 2.3, 0);
    var ring2 = makeRing(4.1, Math.PI / 1.7, 0.5);

    // ---- interaction --------------------------------------------------------
    var mx = 0, my = 0, tmx = 0, tmy = 0, scrollT = 0;
    if (!reduce) {
      window.addEventListener("pointermove", function (e) {
        tmx = (e.clientX / W) * 2 - 1;
        tmy = (e.clientY / H) * 2 - 1;
      }, { passive: true });
    }
    window.addEventListener("scroll", function () {
      var max = document.body.scrollHeight - window.innerHeight;
      scrollT = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    }, { passive: true });

    // ---- render loop --------------------------------------------------------
    var start = Date.now(), raf;
    function frame() {
      raf = requestAnimationFrame(frame);
      var t = (Date.now() - start) / 1000;

      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;
      camZ += ((9 + scrollT * 20) - camZ) * 0.06;

      var ay = t * 0.12 + scrollT * Math.PI * 1.4 + mx * 0.5;
      var ax = Math.sin(t * 0.1) * 0.15 + scrollT * 0.5 - my * 0.35;

      ctx.clearRect(0, 0, W, H);

      // stars
      for (var i = 0; i < stars.length; i++) {
        var sp = project(rot(stars[i], ax * 0.4, ay * 0.25 + t * 0.01));
        if (!sp) continue;
        var a = Math.max(0, Math.min(0.9, (sp[2] - 0.3) * 0.9));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#818cf8";
        var sz = sp[2] * 1.3;
        ctx.fillRect(sp[0], sp[1], sz, sz);
      }
      ctx.globalAlpha = 1;

      // rings
      drawRing(ring1, ax, ay + t * 0.18, "rgba(245,158,11,0.35)", 1.1);
      drawRing(ring2, ax, ay - t * 0.12, "rgba(129,140,248,0.30)", 1);

      // icosahedron core
      var pv = verts.map(function (v) { return project(rot(v, ax, ay)); });
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(129,140,248,0.55)";
      ctx.beginPath();
      for (var e = 0; e < edges.length; e++) {
        var p1 = pv[edges[e][0]], p2 = pv[edges[e][1]];
        if (!p1 || !p2) continue;
        ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      }
      ctx.stroke();

      // glowing inner core
      var breathe = 1 + Math.sin(t * 0.8) * 0.06;
      var c = project([0, 0, 0]);
      if (c) {
        var rad = 1.15 * c[2] * unit * breathe;
        var grd = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rad);
        grd.addColorStop(0, "rgba(99,91,255,0.85)");
        grd.addColorStop(0.5, "rgba(79,70,229,0.35)");
        grd.addColorStop(1, "rgba(79,70,229,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(c[0], c[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawRing(pts, ax, ay, color, lw) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = color;
      ctx.beginPath();
      var started = false;
      for (var k = 0; k <= pts.length; k++) {
        var pp = project(rot(pts[k % pts.length], ax, ay));
        if (!pp) { started = false; continue; }
        if (!started) { ctx.moveTo(pp[0], pp[1]); started = true; }
        else ctx.lineTo(pp[0], pp[1]);
      }
      ctx.stroke();
    }

    frame();

    // pause when the tab is hidden to save battery
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else frame();
    });
  }

  // ---- reveal-on-scroll for content sections (all pages) -------------------
  var els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }
})();