// ============================================================
// MindPredict AI — frontend logic
// ============================================================

const API_BASE_URL = "https://mind-predict-ai-git-main-mind-predict-ai.vercel.app";
const PREDICT_ENDPOINT = `${API_BASE_URL}/predict`;

/* ---------------- Navbar: scroll shadow + mobile menu ---------------- */
const nav = document.getElementById("nav");
const navBurger = document.getElementById("navBurger");
const navLinks = document.getElementById("navLinks");

window.addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

navBurger?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  navBurger.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navBurger.setAttribute("aria-expanded", "false");
  });
});

/* ---------------- Reveal on scroll ---------------- */
const revealTargets = document.querySelectorAll(".how__step, .about__copy, .about__stack");
revealTargets.forEach((el) => el.classList.add("reveal-on-scroll"));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach((el) => revealObserver.observe(el));

/* ---------------- Form elements ---------------- */
const form = document.getElementById("predictForm");
const predictBtn = document.getElementById("predictBtn");
const formNote = document.getElementById("formNote");

const resultCard = document.getElementById("resultCard");
const errorCard = document.getElementById("errorCard");
const scoreNumber = document.getElementById("scoreNumber");
const gaugeCircle = document.getElementById("gaugeCircle");

const resultAgainBtn = document.getElementById("resultAgain");
const resultAgainBtn2 = document.getElementById("resultAgain2");
const errorRetryBtn = document.getElementById("errorRetry");
const assessLayout = document.querySelector(".assess-layout");

// Fields that must be numbers, with their valid ranges.
const NUMERIC_FIELDS = {
  Age: { min: 10, max: 100 },
  Study_Hours: { min: 0, max: 24 },
  Avg_Daily_Usage_Hours: { min: 0, max: 24 },
  Daily_Unlocks: { min: 0, max: Infinity },
  Physical_Activity_Hours: { min: 0, max: 24 },
  Sleep_Hours_Per_Night: { min: 0, max: 24 },
};

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 92; // matches r=92 in the SVG

/* ---------------- Validation ---------------- */
function clearFieldErrors() {
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
  form.querySelectorAll(".field__error").forEach((el) => (el.textContent = ""));
  formNote.textContent = "";
}

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const fieldWrap = input?.closest(".field");
  const errorEl = form.querySelector(`[data-error-for="${inputId}"]`);
  fieldWrap?.classList.add("has-error");
  if (errorEl) errorEl.textContent = message;
}

function validateForm(data) {
  clearFieldErrors();
  let isValid = true;
  const idByName = {
    Age: "age",
    Gender: "gender",
    Country: "country",
    Academic_Level: "academicLevel",
    Study_Hours: "studyHours",
    Most_Used_Platform: "platform",
    Purpose_Of_Use: "purpose",
    Avg_Daily_Usage_Hours: "dailyUsage",
    Daily_Unlocks: "dailyUnlocks",
    Physical_Activity_Hours: "physicalActivity",
    Sleep_Hours_Per_Night: "sleepHours",
    Stress_Level: "stressLevel",
  };

  for (const [name, inputId] of Object.entries(idByName)) {
    const rawValue = data[name];

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      setFieldError(inputId, "This field is required.");
      isValid = false;
      continue;
    }

    if (name in NUMERIC_FIELDS) {
      const num = Number(rawValue);
      const { min, max } = NUMERIC_FIELDS[name];
      if (Number.isNaN(num)) {
        setFieldError(inputId, "Enter a valid number.");
        isValid = false;
      } else if (num < min || num > max) {
        const maxLabel = max === Infinity ? `${min}+` : `${min}–${max}`;
        setFieldError(inputId, `Must be between ${maxLabel}.`);
        isValid = false;
      }
    } else if (typeof rawValue === "string" && rawValue.trim().length === 0) {
      setFieldError(inputId, "This field is required.");
      isValid = false;
    }
  }

  if (!isValid) {
    formNote.textContent = "Please fix the highlighted fields before continuing.";
  }

  return isValid;
}

/* ---------------- Collect + normalize payload ---------------- */
function collectPayload() {
  const formData = new FormData(form);
  const payload = {};

  formData.forEach((value, key) => {
    payload[key] = value;
  });

  // Cast numeric fields to numbers with the exact backend field names.
  for (const name of Object.keys(NUMERIC_FIELDS)) {
    if (payload[name] !== undefined && payload[name] !== "") {
      payload[name] = Number(payload[name]);
    }
  }

  return payload;
}

/* ---------------- UI state helpers ---------------- */
function setLoading(isLoading) {
  predictBtn.disabled = isLoading;
  predictBtn.classList.toggle("is-loading", isLoading);
}

function showResult(score) {
  errorCard.hidden = true;
  form.hidden = false;
  resultCard.hidden = false;
  assessLayout?.classList.add("assess-layout--split");

  const clamped = Math.max(0, Math.min(100, Number(score)));
  const offset = GAUGE_CIRCUMFERENCE - (clamped / 100) * GAUGE_CIRCUMFERENCE;

  // Animate the number count-up.
  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = clamped * eased;
    scoreNumber.textContent = current.toFixed(current % 1 === 0 ? 0 : 1);
    if (progress < 1) requestAnimationFrame(tick);
    else scoreNumber.textContent = formatScore(score);
  }
  requestAnimationFrame(tick);

  // Trigger the gauge stroke animation on the next frame so the transition fires.
  requestAnimationFrame(() => {
    gaugeCircle.style.strokeDashoffset = String(offset);
  });

  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

function formatScore(score) {
  const num = Number(score);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function showError() {
  resultCard.hidden = true;
  form.hidden = false;
  errorCard.hidden = false;
  assessLayout?.classList.add("assess-layout--split");
  errorCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetToForm() {
  errorCard.hidden = true;
  resultCard.hidden = true;
  form.hidden = false;
  assessLayout?.classList.remove("assess-layout--split");
  gaugeCircle.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------- Submit handler ---------------- */
form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = collectPayload();

  if (!validateForm(payload)) {
    return;
  }

  setLoading(true);
  formNote.textContent = "";

  try {
    const response = await fetch(PREDICT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const result = await response.json();

    if (result && typeof result.predicted_mental_health_score !== "undefined") {
      showResult(result.predicted_mental_health_score);
    } else {
      throw new Error("Unexpected response shape from the API.");
    }
  } catch (err) {
    // Network errors, API errors, and unexpected shapes all land here.
    // Raw error details are logged for developers only, never shown to the user.
    console.error("Prediction request failed:", err);
    showError();
  } finally {
    setLoading(false);
  }
});

resultAgainBtn?.addEventListener("click", resetToForm);
resultAgainBtn2?.addEventListener("click", resetToForm);
errorRetryBtn?.addEventListener("click", resetToForm);
