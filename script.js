/* ============================================================
   CONFIG — the only line that changes after deploying the
   Google Apps Script. Paste your Web App URL between the quotes.
   ============================================================ */
const ENQUIRY_ENDPOINT = "https://script.google.com/macros/s/AKfycbwdl7lyjLKd4JOqTqBF2HJoVsfYk4JilZfSJYa9Z0UZ0WA5yCtjWlm7TOzd28RUQPcF/exec";
const FALLBACK_EMAIL = "penny.tsai@elitez.asia";

/* Footer year */
document.getElementById("year").textContent = new Date().getFullYear();

/* Nav shadow on scroll */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.style.boxShadow = window.scrollY > 8 ? "0 6px 20px rgba(58,36,29,.10)" : "none";
});

/* ============================================================
   Conditional Job Redesign+ components block
   ============================================================ */
function wireConditional(triggerId, subId) {
  const trigger = document.getElementById(triggerId);
  const sub = document.getElementById(subId);
  if (!trigger || !sub) return;
  trigger.addEventListener("change", () => {
    sub.classList.toggle("show", trigger.checked);
    if (!trigger.checked) {
      sub.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = false));
    }
  });
}
wireConditional("svcJR", "jrSub");
wireConditional("svcEOR", "eorSub");
const jrSub = document.getElementById("jrSub");
const eorSub = document.getElementById("eorSub");

/* ============================================================
   Share buttons
   ============================================================ */
const shareText = "Penny Tsai — Recruitment Specialist at Elitez. Hiring, staffing, EOR & Job Redesign+ for Singapore businesses.";
document.querySelectorAll(".share-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const url = window.location.href;
    const type = btn.dataset.share;
    if (type === "whatsapp") {
      window.open("https://wa.me/?text=" + encodeURIComponent(shareText + " " + url), "_blank");
    } else if (type === "linkedin") {
      window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url), "_blank");
    } else if (type === "email") {
      window.location.href =
        "mailto:?subject=" + encodeURIComponent("You might find this useful — Penny Tsai, Elitez") +
        "&body=" + encodeURIComponent(shareText + "\n\n" + url);
    } else if (type === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        const old = btn.innerHTML;
        btn.innerHTML = "✓ Copied!";
        setTimeout(() => (btn.innerHTML = old), 1800);
      } catch (e) {
        window.prompt("Copy this link:", url);
      }
    }
  });
});

/* ============================================================
   Form handling
   ============================================================ */
const form = document.getElementById("enquiry-form");
const statusEl = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");

function showStatus(type, msg) {
  statusEl.className = "form-status show " + type;
  statusEl.innerHTML = msg;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.className = "form-status";

  // --- Validation ---
  const required = ["company", "name", "position", "contact", "email"];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.focus();
      showStatus("error", "Please fill in all required fields.");
      return;
    }
  }
  const email = document.getElementById("email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById("email").focus();
    showStatus("error", "Please enter a valid email address.");
    return;
  }
  const services = [...form.querySelectorAll('input[name="services"]:checked')].map((c) => c.value);
  if (services.length === 0) {
    showStatus("error", "Please select at least one thing you're interested in.");
    return;
  }
  const jrComponents = [...form.querySelectorAll('input[name="jr_components"]:checked')].map((c) => c.value);
  const eorCountries = [...form.querySelectorAll('input[name="eor_countries"]:checked')].map((c) => c.value);

  const slots = [...form.querySelectorAll('input[name="slots"]:checked')].map((c) => c.value);
  if (slots.length === 0) {
    showStatus("error", "Please tap at least one time slot that works for you.");
    return;
  }
  const meetEl = form.querySelector('input[name="meet"]:checked');
  if (!meetEl) {
    showStatus("error", "Please choose how you'd like to meet.");
    return;
  }
  const meet = meetEl.value;

  // Fold scheduling answers into the message so they reach the Sheet + email.
  const userNote = document.getElementById("message").value.trim();
  const composedMessage =
    "Preferred time slots: " + slots.join(", ") + "\n" +
    "Prefers to meet: " + meet +
    (userNote ? "\n\nNote: " + userNote : "");

  // --- Gather data ---
  const payload = {
    company: document.getElementById("company").value.trim(),
    name: document.getElementById("name").value.trim(),
    position: document.getElementById("position").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    email: email,
    services: services.join(", "),
    eor_countries: eorCountries.join(", "),
    jr_components: jrComponents.join(", "),
    message: composedMessage,
    source: "Personal outreach page",
    submitted_at: new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }),
  };

  // --- No endpoint configured yet: graceful email fallback ---
  if (!ENQUIRY_ENDPOINT) {
    const subject = encodeURIComponent("Enquiry for Penny — " + payload.company);
    const body = encodeURIComponent(
      `Company: ${payload.company}\nName: ${payload.name}\nPosition: ${payload.position}\n` +
      `Contact: ${payload.contact}\nEmail: ${payload.email}\nInterested in: ${payload.services}\n` +
      (payload.eor_countries ? `EOR countries: ${payload.eor_countries}\n` : "") +
      (payload.jr_components ? `JR+ components: ${payload.jr_components}\n` : "") +
      `\nMessage: ${payload.message}`
    );
    showStatus(
      "success",
      `Thanks, ${payload.name.split(" ")[0]}! To finish sending, please ` +
      `<a href="mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}">click here to email me</a>. ` +
      `(Instant online submission is being set up.)`
    );
    return;
  }

  // --- Submit to Google Apps Script ---
  submitBtn.classList.add("is-loading");
  submitBtn.textContent = "Sending…";
  try {
    const body = new URLSearchParams(payload).toString();
    await fetch(ENQUIRY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    form.reset();
    jrSub.classList.remove("show");
    eorSub.classList.remove("show");
    showStatus(
      "success",
      `🎉 Thank you, ${payload.name.split(" ")[0]}! Your enquiry has been sent. ` +
      `I'll personally get back to you within 1 business day.`
    );
  } catch (err) {
    showStatus(
      "error",
      `Sorry, something went wrong. Please email me directly at ` +
      `<a href="mailto:${FALLBACK_EMAIL}">${FALLBACK_EMAIL}</a>.`
    );
  } finally {
    submitBtn.classList.remove("is-loading");
    submitBtn.textContent = "Send my enquiry";
  }
});
