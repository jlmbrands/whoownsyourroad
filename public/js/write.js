// Write-your-reps page: fills the letter, opens the visitor's email app.

(function () {
  "use strict";

  var SUBJECT = "Surge tolls on private express lanes: please act this session";

  var nameEl = document.getElementById("your-name");
  var cityEl = document.getElementById("your-city");
  var toEl = document.getElementById("to");
  var letterEl = document.getElementById("letter");
  var openBtn = document.getElementById("open-email");
  var copyBtn = document.getElementById("copy-letter");

  var edited = false;

  function letter(name, city) {
    name = name.trim() || "[Your name]";
    city = city.trim() || "[Your city or ZIP]";
    return [
      "Dear Representative and Senator,",
      "",
      "I live in " + city + " and I drive the express lanes in Dallas-Fort Worth. I'm writing because I don't think the current arrangement is fair to the people who pay for these roads twice: once in taxes and again at the toll gantry.",
      "",
      "The express lanes on I-35W, I-820, SH 121/183, I-635 and I-35E are on state highways. Under contracts TxDOT signed in 2009, private concession companies set the toll and keep the revenue until 2061. Those contracts let prices rise past the normal per-mile cap whenever traffic is heavy. Rush-hour tolls on these lanes have been posted at $20 and $24 for a single trip. In 2025 the operator reported revenue per trip up 9 to 13 percent on these roads, against inflation of about 3 percent.",
      "",
      "When the 90th Legislature convenes, I'm asking you to support four things:",
      "",
      "1. A hard ceiling on surge tolls for privately operated managed lanes, written into state law, with no contract exception.",
      "2. Public reporting from each concession company: yearly toll revenue, operating costs, debt payments, payouts to investors, and the share returned to the state, road by road.",
      "3. A published estimate from TxDOT of what it would cost to end each contract early, so Texans can weigh a buyback against 35 more years of private tolling.",
      "4. A recorded vote of the Legislature before TxDOT signs or extends any private toll concession on a state highway.",
      "",
      "I'd appreciate a reply letting me know where you stand on these. Thank you for your time.",
      "",
      "Sincerely,",
      name,
      city
    ].join("\n");
  }

  function fill() {
    if (edited) return;
    letterEl.value = letter(nameEl.value, cityEl.value);
  }

  // Prefill from the petition if they signed on this device.
  try {
    var saved = JSON.parse(localStorage.getItem("woyr_signer") || "null");
    if (saved) {
      if (saved.name) nameEl.value = saved.name;
      if (saved.zip) cityEl.value = saved.zip;
    }
  } catch (err) { /* ignore */ }

  nameEl.addEventListener("input", fill);
  cityEl.addEventListener("input", fill);
  letterEl.addEventListener("input", function () { edited = true; });
  fill();

  function recipients() {
    return toEl.value.split(/[,;\s]+/).filter(function (s) { return /@/.test(s); }).join(",");
  }

  openBtn.addEventListener("click", function () {
    var href = "mailto:" + recipients() +
      "?subject=" + encodeURIComponent(SUBJECT) +
      "&body=" + encodeURIComponent(letterEl.value);
    window.location.href = href;
  });

  copyBtn.addEventListener("click", function () {
    var text = "Subject: " + SUBJECT + "\n\n" + letterEl.value;
    function done() {
      var old = copyBtn.textContent;
      copyBtn.textContent = "Copied";
      setTimeout(function () { copyBtn.textContent = old; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { letterEl.select(); });
    } else {
      letterEl.select();
      try { document.execCommand("copy"); done(); } catch (err) { /* user can copy manually */ }
    }
  });
})();
