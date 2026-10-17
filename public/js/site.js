// Shared behavior: signature counter and the one-time toll ticker on the home page.

(function () {
  "use strict";

  function formatCount(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  window.updateSignatureCount = function (total) {
    var el = document.getElementById("sig-count");
    if (el) el.textContent = formatCount(total);
  };

  var countEl = document.getElementById("sig-count");
  if (countEl) {
    fetch("/api/petition/count")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) window.updateSignatureCount(data.total); })
      .catch(function () { /* leave the default */ });
  }

  // Home page: the peak toll counts up from the normal per-mile cap once on load.
  var peak = document.getElementById("peak");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (peak && !reduce) {
    var to = Number(peak.getAttribute("data-to")) || 0;
    var from = 1.06;
    var duration = 1800;
    var start = null;
    peak.textContent = "$" + from.toFixed(2);

    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      peak.textContent = "$" + (from + (to - from) * eased).toFixed(2);
      if (t < 1) window.requestAnimationFrame(step);
    }

    window.setTimeout(function () { window.requestAnimationFrame(step); }, 500);
  }
})();
