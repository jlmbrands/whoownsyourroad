// Petition form: client-side checks, then POST to /api/petition.

(function () {
  "use strict";

  var form = document.getElementById("petition-form");
  if (!form) return;

  var statusEl = document.getElementById("form-status");
  var thanks = document.getElementById("thanks");
  var thanksBody = document.getElementById("thanks-body");
  var button = form.querySelector("button[type=submit]");

  var checks = {
    first_name: function (v) { return v ? "" : "Enter your first name."; },
    last_name: function (v) { return v ? "" : "Enter your last name."; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter an email address like name@example.com."; },
    zip: function (v) { return /^\d{5}$/.test(v) ? "" : "Enter a 5-digit ZIP code."; }
  };

  function setError(name, message) {
    var input = form.elements[name];
    if (!input) return;
    var id = name + "-error";
    var existing = document.getElementById(id);
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", id);
      if (!existing) {
        existing = document.createElement("p");
        existing.className = "form-error";
        existing.id = id;
        input.insertAdjacentElement("afterend", existing);
      }
      existing.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      if (existing) existing.remove();
    }
  }

  function validate() {
    var firstBad = null;
    Object.keys(checks).forEach(function (name) {
      var msg = checks[name](form.elements[name].value.trim());
      setError(name, msg);
      if (msg && !firstBad) firstBad = form.elements[name];
    });
    return firstBad;
  }

  var noteToggle = document.getElementById("note-toggle");
  var noteField = document.getElementById("note-field");
  if (noteToggle && noteField) {
    noteToggle.addEventListener("click", function () {
      noteField.hidden = false;
      noteToggle.hidden = true;
      noteToggle.setAttribute("aria-expanded", "true");
      form.elements.comment.focus();
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.textContent = "";

    var firstBad = validate();
    if (firstBad) {
      firstBad.focus();
      return;
    }

    var payload = {
      first_name: form.elements.first_name.value.trim(),
      last_name: form.elements.last_name.value.trim(),
      email: form.elements.email.value.trim(),
      zip: form.elements.zip.value.trim(),
      comment: form.elements.comment.value.trim(),
      wants_updates: form.elements.wants_updates.checked,
      website: form.elements.website.value
    };

    button.disabled = true;
    button.textContent = "Signing…";

    fetch("/api/petition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().then(function (data) { return { status: r.status, data: data }; });
      })
      .then(function (res) {
        var data = res.data || {};
        if (data.ok) {
          var n = data.counts ? Number(data.counts.total) : 0;
          if (n && window.updateSignatureCount) window.updateSignatureCount(n);
          var you = document.querySelector("[data-led-you]");
          if (n && you && window.dotMatrix) {
            you.innerHTML = window.dotMatrix("#" + n.toLocaleString("en-US"));
            document.getElementById("thanks-title").textContent = "You're signer #" + n.toLocaleString("en-US") + ".";
          }
          document.body.classList.add("signed");
          if (data.is_texas === false) {
            thanksBody.textContent = "Your ZIP code is outside Texas, so we'll count you as a supporter rather than a constituent. You can still help by sending this to people who drive these roads.";
          }
          try {
            localStorage.setItem("woyr_signer", JSON.stringify({
              name: payload.first_name + " " + payload.last_name,
              zip: payload.zip
            }));
          } catch (err) { /* private mode */ }
          form.hidden = true;
          thanks.hidden = false;
          thanks.focus();
          return;
        }
        if (data.errors) {
          Object.keys(data.errors).forEach(function (k) { setError(k, data.errors[k]); });
          var bad = form.querySelector("[aria-invalid=true]");
          if (bad) bad.focus();
          return;
        }
        statusEl.textContent = data.error || "The petition couldn't be signed. Try again.";
      })
      .catch(function () {
        statusEl.textContent = "Couldn't reach the server. Check your connection and try again.";
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = "Sign the petition";
      });
  });
})();
