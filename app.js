/* ===================================================================
   POPQUIZ – HERNÍ LOGIKA
   =================================================================== */

/* ============== ULOŽIŠTĚ ============== */
const STORAGE = {
  seen: "popquiz.seenIds",
  settings: "popquiz.settings",
  stats: "popquiz.stats"
};

const defaultSettings = {
  sound: true,
  timer: true,
  count: 30,
  timerSec: 15
};

/* ============== STAV APLIKACE ============== */
const state = {
  mode: null,           // "solo" | "moderator" | "teams"
  questions: [],
  index: 0,
  score: 0,
  streak: 0,
  total: 30,
  teams: [],            // [{name, color, score}]
  timer: null,
  timeLeft: 0,
  settings: loadSettings()
};

const TEAM_COLORS = ["#7c5cff", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#06b6d4"];
const TEAM_NAMES_DEFAULT = ["Fialoví", "Zelení", "Oranžoví", "Modří", "Růžoví", "Tyrkysoví"];

/* ============== POMOCNÉ FUNKCE ============== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(STORAGE.settings) || "{}") };
  } catch {
    return { ...defaultSettings };
  }
}
function saveSettings() {
  localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
}

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE.seen) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSeen(set) {
  localStorage.setItem(STORAGE.seen, JSON.stringify([...set]));
}

function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $(`#${id}`).classList.add("active");
}

/* ============== ZVUKY (Web Audio API – bez souborů) ============== */
const audio = (() => {
  let ctx = null;
  const init = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  };
  function beep(freq = 600, duration = 0.12, type = "sine", vol = 0.15) {
    if (!state.settings.sound) return;
    init();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.stop(ctx.currentTime + duration);
  }
  return {
    correct: () => {
      beep(880, 0.1, "sine");
      setTimeout(() => beep(1320, 0.15, "sine"), 100);
    },
    wrong:  () => beep(220, 0.18, "sawtooth"),
    tick:   () => beep(1200, 0.04, "square", 0.05),
    timeUp: () => {
      beep(440, 0.2, "square");
      setTimeout(() => beep(330, 0.3, "square"), 150);
    },
    click:  () => beep(700, 0.04, "square", 0.06)
  };
})();

/* ============== NAČTENÍ + RANDOMIZER ============== */
async function loadAllQuestions() {
  const r = await fetch("./data/questions.json");
  return await r.json();
}

function pickRunQuestions(all, count) {
  const seen = loadSeen();
  let unseen = all.filter(q => !seen.has(q.id));

  // Pokud nezbývá dost neviděných, resetuj pool
  if (unseen.length < count) {
    seen.clear();
    saveSeen(seen);
    unseen = [...all];
  }

  const picked = shuffle(unseen).slice(0, count);
  picked.forEach(q => seen.add(q.id));
  saveSeen(seen);
  return picked;
}

/* ============== START HRY ============== */
async function startGame(mode) {
  state.mode = mode;
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.total = state.settings.count;

  if (mode === "teams") {
    showScreen("screen-teams-setup");
    initTeamsEditor();
    return;
  }

  const all = await loadAllQuestions();
  state.questions = pickRunQuestions(all, state.total);
  state.total = state.questions.length;
  showScreen("screen-game");
  renderQuestion();
}

async function startTeamsGame() {
  if (state.teams.length < 2) {
    alert("Potřebuješ aspoň 2 týmy");
    return;
  }
  state.teams.forEach(t => t.score = 0);
  const all = await loadAllQuestions();
  state.questions = pickRunQuestions(all, state.settings.count);
  state.total = state.questions.length;
  showScreen("screen-game");
  renderQuestion();
}

/* ============== TÝMY – SETUP ============== */
function initTeamsEditor() {
  if (state.teams.length === 0) {
    state.teams = [
      { name: TEAM_NAMES_DEFAULT[0], color: TEAM_COLORS[0], score: 0 },
      { name: TEAM_NAMES_DEFAULT[1], color: TEAM_COLORS[1], score: 0 }
    ];
  }
  renderTeamsEditor();
}

function renderTeamsEditor() {
  const wrap = $("#teams-editor");
  wrap.innerHTML = "";
  state.teams.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "team-row";
    row.innerHTML = `
      <span class="team-color" style="background:${t.color}"></span>
      <input type="text" value="${t.name}" data-i="${i}" />
      <button data-rm="${i}">×</button>
    `;
    row.querySelector("input").oninput = (e) => {
      state.teams[i].name = e.target.value;
    };
    row.querySelector("button").onclick = () => {
      if (state.teams.length > 2) {
        state.teams.splice(i, 1);
        renderTeamsEditor();
      }
    };
    wrap.appendChild(row);
  });
}

/* ============== RENDER OTÁZKY ============== */
function renderQuestion() {
  stopTimer();
  const q = state.questions[state.index];

  $("#category-chip").textContent = q.category;
  $("#difficulty-chip").textContent =
    ({ easy: "● Lehká", medium: "●● Střední", hard: "●●● Těžká" })[q.difficulty] || "";
  $("#question-text").textContent = q.question;
  $("#progress-text").textContent = `${state.index + 1} / ${state.total}`;
  $("#progress-fill").style.width = `${(state.index / state.total) * 100}%`;
  $("#score-badge").textContent = state.mode === "solo" ? state.score : "—";

  $("#answers").classList.add("hidden");
  $("#solo-feedback").classList.add("hidden");
  $("#moderator-panel").classList.add("hidden");
  $("#teams-scoring").classList.add("hidden");
  $("#teams-scoreboard").classList.add("hidden");
  $("#timer-badge").classList.add("hidden");

  if (state.mode === "solo") {
    renderSolo(q);
  } else {
    renderModerator(q);
  }
}

/* ===== SÓLO ===== */
function renderSolo(q) {
  $("#answers").classList.remove("hidden");

  const wrap = $("#answers");
  wrap.innerHTML = "";
  q.answers.forEach((ans, i) => {
    const b = document.createElement("button");
    b.className = "answer-btn";
    b.textContent = ans;
    b.onclick = () => handleSoloAnswer(b, i, q);
    wrap.appendChild(b);
  });

  if (state.settings.timer) startTimer(q);
}

function startTimer(q) {
  state.timeLeft = state.settings.timerSec;
  const badge = $("#timer-badge");
  badge.classList.remove("hidden", "warn");
  $("#timer-text").textContent = state.timeLeft;

  state.timer = setInterval(() => {
    state.timeLeft--;
    $("#timer-text").textContent = state.timeLeft;

    if (state.timeLeft <= 5) {
      badge.classList.add("warn");
      audio.tick();
    }
    if (state.timeLeft <= 0) {
      stopTimer();
      audio.timeUp();
      handleSoloAnswer(null, -1, q);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function handleSoloAnswer(btn, picked, q) {
  stopTimer();
  const correct = q.correctIndex;
  const buttons = $$(".answer-btn");

  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add("correct");
    if (i === picked && picked !== correct) b.classList.add("wrong");
  });

  const fb = $("#solo-feedback");
  fb.classList.remove("hidden", "ok", "err");

  if (picked === correct) {
    state.streak++;
    const timeBonus = Math.max(0, state.timeLeft * 5);
    const streakBonus = state.streak >= 3 ? 50 : 0;
    const gain = 100 + timeBonus + streakBonus;
    state.score += gain;
    audio.correct();
    fb.classList.add("ok");
    fb.innerHTML = `<h3>Správně! 🎉</h3>
      <p>+${gain} bodů${streakBonus ? ` (série ×${state.streak} 🔥)` : ""}</p>`;
  } else {
    state.streak = 0;
    audio.wrong();
    fb.classList.add("err");
    fb.innerHTML = picked === -1
      ? `<h3>Čas vypršel! ⏰</h3><p>Správně bylo: <b>${q.answers[correct]}</b></p>`
      : `<h3>Špatně 😬</h3><p>Správně bylo: <b>${q.answers[correct]}</b></p>`;
  }

  setTimeout(nextQuestion, 1800);
}

/* ===== MODERÁTOR + TÝMY ===== */
function renderModerator(q) {
  $("#moderator-panel").classList.remove("hidden");

  const ca = $("#correct-answer-text");
  ca.textContent = q.answers[q.correctIndex];
  ca.classList.remove("revealed");
  ca.classList.add("blurred");

  $("#btn-reveal").textContent = "Odhalit";
  $("#btn-reveal").onclick = () => {
    ca.classList.toggle("revealed");
    audio.click();
    $("#btn-reveal").textContent = ca.classList.contains("revealed") ? "Skrýt" : "Odhalit";
  };

  // Nápovědy
  const list = $("#hints-list");
  list.innerHTML = "";
  q.hints.forEach((hint, i) => {
    const item = document.createElement("div");
    item.className = "hint-item";
    item.innerHTML = `
      <div style="flex:1">
        <button>💡 Nápověda ${i + 1}</button>
        <div class="hint-text">${hint}</div>
      </div>`;
    item.querySelector("button").onclick = () => {
      item.classList.add("used");
      audio.click();
    };
    list.appendChild(item);
  });

  // Týmové bodování
  if (state.mode === "teams") {
    $("#teams-scoring").classList.remove("hidden");
    $("#teams-scoreboard").classList.remove("hidden");
    renderTeamsScoring(q);
    renderScoreboard();
  }

  $("#btn-skip").onclick = () => { audio.click(); nextQuestion(); };
  $("#btn-next-mod").onclick = () => { audio.click(); nextQuestion(); };
}

function renderTeamsScoring(q) {
  const points = ({ easy: 10, medium: 20, hard: 30 })[q.difficulty] || 10;
  const wrap = $("#teams-buttons");
  wrap.innerHTML = "";
  state.teams.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "team-score-btn";
    b.innerHTML = `
      <span class="team-color" style="background:${t.color}"></span>
      <span style="flex:1;text-align:left">${t.name}</span>
      <span>+${points}</span>`;
    b.onclick = () => {
      if (b.classList.contains("awarded")) return;
      state.teams[i].score += points;
      b.classList.add("awarded");
      audio.correct();
      renderScoreboard();
    };
    wrap.appendChild(b);
  });
}

function renderScoreboard() {
  const board = $("#teams-scoreboard");
  const max = Math.max(...state.teams.map(t => t.score));
  board.innerHTML = state.teams.map(t => `
    <div class="team-pill ${t.score === max && max > 0 ? "leader" : ""}">
      <span class="team-color" style="background:${t.color}"></span>
      ${t.name}: <b>${t.score}</b>
    </div>`).join("");
}

/* ============== KONEC HRY ============== */
function nextQuestion() {
  state.index++;
  if (state.index >= state.total) return finishGame();
  renderQuestion();
}

function finishGame() {
  stopTimer();
  $("#result-body").innerHTML = "";

  if (state.mode === "teams") {
    const sorted = [...state.teams].sort((a, b) => b.score - a.score);
    $("#result-title").textContent = `Vítěz: ${sorted[0].name} 🏆`;
    $("#result-body").innerHTML = `
      <div class="teams-editor">
        ${sorted.map((t, i) => `
          <div class="team-row">
            <span style="font-weight:600">#${i + 1}</span>
            <span class="team-color" style="background:${t.color}"></span>
            <span style="flex:1">${t.name}</span>
            <b>${t.score}</b>
          </div>`).join("")}
      </div>`;
  } else if (state.mode === "solo") {
    $("#result-title").textContent = "Hotovo! 🎉";
    $("#result-body").innerHTML = `
      <p class="big-score">${state.score} bodů</p>
      <p class="subtitle">${
        state.score >= 2500 ? "Hvězdná hra! 🌟" :
        state.score >= 1500 ? "Skvěle 👏" :
        state.score >=  500 ? "Slušné, dá se víc." :
                              "Příště to bude lepší 💪"
      }</p>`;
    updateStats(state.score);
  } else {
    $("#result-title").textContent = "Hotovo 🎤";
    $("#result-body").innerHTML = `<p class="subtitle">Konec moderování</p>`;
  }

  showScreen("screen-result");
}

function updateStats(score) {
  const s = JSON.parse(localStorage.getItem(STORAGE.stats) || "{}");
  s.bestScore = Math.max(s.bestScore || 0, score);
  s.gamesPlayed = (s.gamesPlayed || 0) + 1;
  localStorage.setItem(STORAGE.stats, JSON.stringify(s));
}

function renderHomeStats() {
  const s = JSON.parse(localStorage.getItem(STORAGE.stats) || "{}");
  const seenCount = loadSeen().size;
  $("#footer-stats").innerHTML = s.gamesPlayed
    ? `Odehráno: <b>${s.gamesPlayed}</b> · Nejlepší skóre: <b>${s.bestScore}</b> · Viděno otázek: <b>${seenCount}</b>`
    : `Zatím jsi nehrál. Pusť se do toho! 🚀`;
}

/* ============== NAVIGACE A NASTAVENÍ ============== */
$$(".mode-card").forEach(c => c.onclick = () => {
  audio.click();
  startGame(c.dataset.mode);
});

$$("[data-go]").forEach(b => b.onclick = () => {
  audio.click();
  showScreen(b.dataset.go);
  renderHomeStats();
});

$("#btn-restart").onclick = () => startGame(state.mode);
$("#btn-add-team").onclick = () => {
  if (state.teams.length >= 6) return;
  const i = state.teams.length;
  state.teams.push({ name: TEAM_NAMES_DEFAULT[i], color: TEAM_COLORS[i], score: 0 });
  renderTeamsEditor();
};
$("#btn-start-teams").onclick = startTeamsGame;

$("#settings-toggle").onclick = () => $("#settings-panel").classList.toggle("hidden");
$("#opt-sound").checked = state.settings.sound;
$("#opt-timer").checked = state.settings.timer;
$("#opt-count").value = String(state.settings.count);

$("#opt-sound").onchange = (e) => { state.settings.sound = e.target.checked; saveSettings(); };
$("#opt-timer").onchange = (e) => { state.settings.timer = e.target.checked; saveSettings(); };
$("#opt-count").onchange = (e) => {
  state.settings.count = parseInt(e.target.value, 10);
  saveSettings();
};

$("#btn-reset-pool").onclick = () => {
  localStorage.removeItem(STORAGE.seen);
  renderHomeStats();
  alert("Paměť otázek vymazána – znovu uvidíš celou banku.");
};

renderHomeStats();

/* ============== REGISTRACE SERVICE WORKERU ============== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Service Worker zaregistrován ✅"))
      .catch((err) => console.warn("SW chyba:", err));
  });
}