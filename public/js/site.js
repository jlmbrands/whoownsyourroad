// Shared behavior: readout animation, signature goal, countdown, calculator, sharing.

(function () {
  "use strict";

  var GOAL = 10000;
  var SESSION_OPENS = new Date("2027-01-12T10:00:00-06:00"); // 90th Legislature convenes
  var CONTRACT_END = new Date("2061-09-01T00:00:00-05:00");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function siteUrl(path) {
    return location.origin + (path || "/");
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  // ---- Signature count and goal ----

  var SHOW_COUNT_AT = 100;

  window.updateSignatureCount = function (total) {
    total = Number(total || 0);
    document.querySelectorAll("[data-goal]").forEach(function (g) {
      g.classList.toggle("low", total < SHOW_COUNT_AT);
    });
    document.querySelectorAll("[data-sig-count]").forEach(function (el) {
      el.textContent = fmt(total);
    });
    document.querySelectorAll("[data-goal-fill]").forEach(function (el) {
      el.style.width = Math.min(100, (total / GOAL) * 100) + "%";
    });
    document.querySelectorAll("[data-goal-bar]").forEach(function (el) {
      el.setAttribute("aria-valuenow", total);
    });
  };

  if (document.querySelector("[data-sig-count]")) {
    fetch("/api/petition/count")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) window.updateSignatureCount(d.total); })
      .catch(function () {});
  }

  // ---- Countdown to session ----

  var daysLeft = Math.ceil((SESSION_OPENS - new Date()) / 86400000);
  document.querySelectorAll("[data-days-to-session]").forEach(function (el) {
    if (daysLeft <= 0) {
      el.textContent = "now";
    } else {
      el.textContent = daysLeft === 1 ? "1 day" : fmt(daysLeft) + " days";
    }
  });
  document.querySelectorAll("[data-session-line]").forEach(function (el) {
    if (daysLeft <= 0) el.textContent = "The session is open.";
  });

  // ---- Hero readout: counts up from the per-mile cap to the posted peak ----

  var readout = document.querySelector("[data-readout]");
  if (readout) {
    var to = Number(readout.getAttribute("data-to")) || 24;
    var from = 1.06;
    var panel = readout.querySelector("[data-panel]");
    var hov = readout.querySelector("[data-panel-hov]");
    if (hov) hov.innerHTML = window.dotMatrix("$12.00");
    function show(v) { panel.innerHTML = window.dotMatrix("$" + v.toFixed(2)); }
    if (reduceMotion) {
      show(to);
    } else {
      show(from);
      var start = null, dur = 2200;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        var e = 1 - Math.pow(1 - t, 4);
        show(from + (to - from) * e);
        if (t < 1) requestAnimationFrame(step);
      }
      setTimeout(function () { requestAnimationFrame(step); }, 600);
    }
  }

  // ---- Calculator: your bill until 2061 ----

  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var input = calc.querySelector("input");
    var out = calc.querySelector("[data-calc-total]");
    var years = calc.querySelector("[data-calc-years]");
    var shareBtn = calc.querySelector("[data-calc-share]");
    var yearsLeft = (CONTRACT_END - new Date()) / (365.25 * 86400000);
    var currentTotal = 0;

    function recalc() {
      var monthly = parseFloat(input.value) || 0;
      currentTotal = monthly * 12 * yearsLeft;
      var rounded = currentTotal >= 1000 ? Math.round(currentTotal / 100) * 100 : Math.round(currentTotal);
      out.innerHTML = window.dotMatrix("$" + fmt(rounded), { lit: "#17191b", dim: "rgba(23,25,27,0.08)" });
      out.setAttribute("aria-label", "$" + fmt(rounded));
      years.textContent = yearsLeft.toFixed(0);
      calc.querySelectorAll(".chip").forEach(function (c) {
        c.setAttribute("aria-pressed", c.getAttribute("data-amount") === input.value ? "true" : "false");
      });
      shareBtn.disabled = monthly <= 0;
    }

    input.addEventListener("input", recalc);
    calc.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () {
        input.value = c.getAttribute("data-amount");
        recalc();
        input.focus();
      });
    });

    shareBtn.addEventListener("click", function () {
      var rounded = currentTotal >= 1000 ? Math.round(currentTotal / 100) * 100 : Math.round(currentTotal);
      var text = "If nothing changes, I'll pay about $" + fmt(rounded) +
        " in express lane tolls by 2061. The lanes are on state highways. The companies that set the price keep it. Who owns your road?";
      window.shareText(text, siteUrl("/#bill"), shareBtn);
    });

    recalc();
  }

  // ---- Sharing ----

  var DEFAULT_TEXT = "The express lanes on I-35W, 820, 183 and LBJ are state highways. Private investors set the price and keep the tolls until 2061. Rush-hour tolls have hit $24. Who owns your road?";

  function copy(text, el) {
    function done() {
      if (!el) return;
      var old = el.innerHTML;
      el.innerHTML = "Copied";
      el.classList.add("copied");
      setTimeout(function () { el.innerHTML = old; el.classList.remove("copied"); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy this:", text); });
    } else {
      window.prompt("Copy this:", text);
    }
  }

  // Native share sheet when available (phones), otherwise copy.
  window.shareText = function (text, url, el) {
    if (navigator.share) {
      navigator.share({ text: text, url: url }).catch(function () {});
    } else {
      copy(text + " " + url, el);
    }
  };

  document.querySelectorAll("[data-share]").forEach(function (btn) {
    var kind = btn.getAttribute("data-share");
    var text = btn.getAttribute("data-text") || DEFAULT_TEXT;
    var url = siteUrl(btn.getAttribute("data-path") || "/");
    var enc = encodeURIComponent;

    if (kind === "native" && !navigator.share) {
      btn.hidden = true;
      return;
    }

    btn.addEventListener("click", function (e) {
      switch (kind) {
        case "x":
          window.open("https://twitter.com/intent/tweet?text=" + enc(text) + "&url=" + enc(url), "_blank", "noopener");
          break;
        case "facebook":
          window.open("https://www.facebook.com/sharer/sharer.php?u=" + enc(url) + "&quote=" + enc(text), "_blank", "noopener");
          break;
        case "threads":
          window.open("https://www.threads.net/intent/post?text=" + enc(text + " " + url), "_blank", "noopener");
          break;
        case "sms":
          location.href = "sms:?&body=" + enc(text + " " + url);
          break;
        case "email":
          location.href = "mailto:?subject=" + enc("Who owns your road?") + "&body=" + enc(text + "\n\n" + url);
          break;
        case "copy":
          copy(text + " " + url, btn);
          break;
        case "native":
          navigator.share({ text: text, url: url }).catch(function () {});
          break;
      }
      e.preventDefault();
    });
  });

  // ---- Progress line ----

  var progress = document.querySelector(".progress");
  if (progress) {
    var ticking = false;
    function paint() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  // ---- Reveal headlines as each sign comes into view (reader-paced) ----

  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Action pill: hide while the sign-up form is on screen ----

  var pill = document.querySelector(".pill");
  var signSection = document.getElementById("sign");
  if (pill && signSection && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      pill.classList.toggle("hide", entries[0].isIntersecting);
    }, { threshold: 0.25 }).observe(signSection);
  }
})();
