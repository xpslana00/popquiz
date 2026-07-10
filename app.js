/* ===================================================================
   POPQUIZ – HERNÍ LOGIKA
   Custom mode + player name + local leaderboard + Ranked mode
   =================================================================== */

/* ============== ULOŽIŠTĚ ============== */
const STORAGE = {
  seen: "popquiz.seenIds",
  settings: "popquiz.settings",
  stats: "popquiz.stats",
  playerName: "popquiz.playerName",
  scoreHistory: "popquiz.scoreHistory"
};

const defaultSettings = {
  sound: true,
  timer: true,
  count: 30,
  timerSec: 15
};

/* ============== RANKED MODE CONFIG ============== */
const RANKED_CONFIG = {
  count: 20,
  timerSec: 15,
  difficultyMultiplier: { easy: 1, medium: 1.5, hard: 2 }
};

/* ============== STAV APLIKACE ============== */
const state = {
  mode: null, // solo | moderator | teams | ranked
  questions: [],
  index: 0,
  score: 0,
  streak: 0,
  total: 30,
  teams: [],
  timer: null,
  timeLeft: 0,
  currentQuestion: null,
  _useCustomFilter: false,
  settings: loadSettings()
};

const TEAM_COLORS = ["#7c5cff", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#06b6d4"];
const TEAM_NAMES_DEFAULT = ["Fialoví", "Zelení", "Oranžoví", "Modří", "Růžoví", "Tyrkysoví"];

/* ============== CUSTOM MODE CONFIG ============== */
const customConfig = {
  categories: [],
  difficulties: [],
  count: 30,
  timerSec: 15,
  gameType: "solo"
};

/* ============== POMOCNÉ FUNKCE ============== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const screen = $(`#${id}`);
  if (screen) screen.classList.add("active");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ============== PLAYER + LOCAL LEADERBOARD ============== */
function getPlayerName() {
  return localStorage.getItem(STORAGE.playerName) || "";
}

function setPlayerName(name) {
  localStorage.setItem(STORAGE.playerName, name);
}

function ensurePlayerName() {
  let name = getPlayerName();

  if (!name) {
    name = prompt("Jak ti říkáme? Jméno se použije pro lokální žebříček.") || "Hráč";
    name = name.trim() || "Hráč";
    setPlayerName(name);
  }

  return name;
}

function changePlayerName() {
  const current = getPlayerName() || "Hráč";
  const next = prompt("Zadej nové jméno hráče:", current);

  if (next !== null) {
    const trimmed = next.trim() || "Hráč";
    setPlayerName(trimmed);
    renderHomeStats();
  }
}

function loadScoreHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.scoreHistory) || "[]");
  } catch {
    return [];
  }
}

function saveScoreHistory(history) {
  localStorage.setItem(STORAGE.scoreHistory, JSON.stringify(history));
}

function addScoreToHistory(score) {
  const name = ensurePlayerName();
  const history = loadScoreHistory();

  history.push({
    name,
    score,
    mode: state.mode,
    total: state.total,
    date: new Date().toISOString()
  });

  saveScoreHistory(history);
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("cs-CZ");
  } catch {
    return iso;
  }
}

function getModeLabel(mode) {
  const labels = {
    "solo": "Sólo",
    "ranked": "🏆 Ranked",
    "moderator": "Moderátor",
    "teams": "Týmy",
    "custom": "Vlastní"
  };
  return labels[mode] || mode;
}

function renderLeaderboard() {
  const list = $("#leaderboard-list");
  if (!list) return;

  const history = loadScoreHistory()
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  if (history.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        Zatím tu není žádné skóre. Odehraj sólo nebo ranked hru a něco se tu objeví.
      </div>
    `;
  } else {
    list.innerHTML = history.map((r, i) => `
      <div class="leaderboard-item">
        <div class="leaderboard-rank">#${i + 1}</div>
        <div>
          <div class="leaderboard-name">${escapeHtml(r.name)}</div>
          <div class="leaderboard-meta">${formatDateTime(r.date)} · ${r.total || "?"} otázek · ${getModeLabel(r.mode)}</div>
        </div>
        <div class="leaderboard-score">${r.score}</div>
      </div>
    `).join("");
  }

  showScreen("screen-leaderboard");
}

/* ============== ZVUKY ============== */
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
    wrong: () => beep(220, 0.18, "sawtooth"),
    tick: () => beep(1200, 0.04, "square", 0.05),
    timeUp: () => {
      beep(440, 0.2, "square");
      setTimeout(() => beep(330, 0.3, "square"), 150);
    },
    click: () => beep(700, 0.04, "square", 0.06),
    fanfare: () => {
      beep(523, 0.15, "sine", 0.15);
      setTimeout(() => beep(659, 0.15, "sine", 0.15), 100);
      setTimeout(() => beep(784, 0.15, "sine", 0.15), 200);
      setTimeout(() => beep(1047, 0.3, "sine", 0.2), 300);
    }
  };
})();

/* ============== NAČTENÍ OTÁZEK + RANDOMIZER ============== */
async function loadAllQuestions() {
  const r = await fetch("./data/questions.json");
  return await r.json();
}

function pickRunQuestions(all, count, filter = {}) {
  const seen = loadSeen();

  let pool = [...all];

  if (filter.categories && filter.categories.length > 0) {
    pool = pool.filter(q => filter.categories.includes(q.category));
  }

  if (filter.difficulties && filter.difficulties.length > 0) {
    pool = pool.filter(q => filter.difficulties.includes(q.difficulty));
  }

  if (pool.length === 0) {
    return [];
  }

  let unseen = pool.filter(q => !seen.has(q.id));

  if (unseen.length < count) {
    pool.forEach(q => seen.delete(q.id));
    saveSeen(seen);
    unseen = [...pool];
  }

  const byCategory = {};

  unseen.forEach(q => {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
  });

  Object.keys(byCategory).forEach(cat => {
    byCategory[cat] = shuffle(byCategory[cat]);
  });

  const picked = [];
  const categories = shuffle(Object.keys(byCategory));
  let safety = 0;

  while (picked.length < count && safety < 10000) {
    for (const cat of categories) {
      if (picked.length >= count) break;

      if (byCategory[cat] && byCategory[cat].length > 0) {
        picked.push(byCategory[cat].shift());
      }
    }

    if (categories.every(cat => !byCategory[cat] || byCategory[cat].length === 0)) {
      break;
    }

    safety++;
  }

  const final = shuffle(picked).slice(0, count);

  final.forEach(q => seen.add(q.id));
  saveSeen(seen);

  return final;
}

/* ============== START HRY ============== */
async function startGame(mode) {
  if (mode === "custom") {
    showScreen("screen-custom-setup");
    initCustomSetup();
    return;
  }

  if (mode === "ranked") {
    showScreen("screen-ranked-info");
    return;
  }

  state.mode = mode;
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.total = state.settings.count;

  if (mode === "solo") {
    ensurePlayerName();
  }

  if (mode === "teams") {
    showScreen("screen-teams-setup");
    initTeamsEditor();
    return;
  }

  const all = await loadAllQuestions();
  state.questions = pickRunQuestions(all, state.total);
  state.total = state.questions.length;

  if (state.questions.length === 0) {
    alert("Nepodařilo se najít žádné otázky.");
    return;
  }

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

  const filter = state._useCustomFilter ? {
    categories: customConfig.categories,
    difficulties: customConfig.difficulties
  } : {};

  const count = state._useCustomFilter ? customConfig.count : state.settings.count;

  state.questions = pickRunQuestions(all, count, filter);
  state.total = state.questions.length;
  state._useCustomFilter = false;

  if (state.questions.length === 0) {
    alert("Žádné otázky neodpovídají filtru. Zkus upravit nastavení.");
    return;
  }

  showScreen("screen-game");
  renderQuestion();
}

/* ============== RANKED MODE ============== */
async function startRankedGame() {
   if (typeof isSignedIn === 'function' && !isSignedIn()) {
    alert('Pro Ranked hru se musis prihlasit pres Google. Klikni na tlacitko "Prihlasit se pres Google" nahore.');
    const banner = document.querySelector('#auth-banner');
    if (banner) {
      banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  audio.click();
  ensurePlayerName();

  state.mode = "ranked";
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.total = RANKED_CONFIG.count;
  state.settings.timerSec = RANKED_CONFIG.timerSec;
  state.settings.timer = true;

  const all = await loadAllQuestions();

  // Ranked = úplně random mix ze všech otázek, žádný filtr, žádné seen tracking
  state.questions = shuffle(all).slice(0, RANKED_CONFIG.count);
  state.total = state.questions.length;

  if (state.questions.length < RANKED_CONFIG.count) {
    alert("Nedostatek otázek pro Ranked hru.");
    return;
  }

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
  if (!wrap) return;

  wrap.innerHTML = "";

  state.teams.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "team-row";

    row.innerHTML = `
      <span class="team-color" style="background:${t.color}"></span>
      <input type="text" value="${escapeHtml(t.name)}" data-i="${i}" />
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

  const originalQ = state.questions[state.index];

  const indices = originalQ.answers.map((_, i) => i);
  const shuffledIndices = shuffle(indices);

  const q = {
    ...originalQ,
    answers: shuffledIndices.map(i => originalQ.answers[i]),
    correctIndex: shuffledIndices.indexOf(originalQ.correctIndex)
  };

  state.currentQuestion = q;

  $("#category-chip").textContent = q.category;
  $("#difficulty-chip").textContent =
    ({ easy: "● Lehká", medium: "●● Střední", hard: "●●● Těžká" })[q.difficulty] || "";

  $("#question-text").textContent = q.question;
  $("#progress-text").textContent = `${state.index + 1} / ${state.total}`;
  $("#progress-fill").style.width = `${(state.index / state.total) * 100}%`;

  const showScore = state.mode === "solo" || state.mode === "ranked";
  $("#score-badge").textContent = showScore ? state.score : "—";

  $("#answers").classList.add("hidden");
  $("#solo-feedback").classList.add("hidden");
  $("#moderator-panel").classList.add("hidden");
  $("#teams-scoring").classList.add("hidden");
  $("#teams-scoreboard").classList.add("hidden");
  $("#timer-badge").classList.add("hidden");

  if (state.mode === "solo" || state.mode === "ranked") {
    renderSolo(q);
  } else {
    renderModerator(q);
  }
}

/* ============== SÓLO / RANKED ============== */
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

  if (state.settings.timer) {
    startTimer(q);
  }
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

    const timeBonus = state.settings.timer ? Math.max(0, state.timeLeft * 5) : 0;
    const streakBonus = state.streak >= 3 ? 50 : 0;
    let gain = 100 + timeBonus + streakBonus;

    // Ranked mode – násobič obtížnosti
    let difficultyBadge = "";
    if (state.mode === "ranked") {
      const multiplier = RANKED_CONFIG.difficultyMultiplier[q.difficulty] || 1;
      gain = Math.round(gain * multiplier);
      if (multiplier > 1) {
        difficultyBadge = ` <span style="color:#ffd700">×${multiplier}</span>`;
      }
    }

    state.score += gain;
    audio.correct();

    fb.classList.add("ok");
    fb.innerHTML = `
      <h3>Správně! 🎉</h3>
      <p>+${gain} bodů${difficultyBadge}${streakBonus ? ` (série ×${state.streak} 🔥)` : ""}</p>
    `;
  } else {
    state.streak = 0;
    audio.wrong();

    fb.classList.add("err");
    fb.innerHTML = picked === -1
      ? `<h3>Čas vypršel! ⏰</h3><p>Správně bylo: <b>${q.answers[correct]}</b></p>`
      : `<h3>Špatně 😬</h3><p>Správně bylo: <b>${q.answers[correct]}</b></p>`;
  }

  const nextDelay = state.mode === "ranked" ? 1500 : 1800;
  setTimeout(nextQuestion, nextDelay);
}

/* ============== MODERÁTOR + TÝMY ============== */
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

  const list = $("#hints-list");
  list.innerHTML = "";

  q.hints.forEach((hint, i) => {
    const item = document.createElement("div");
    item.className = "hint-item";

    item.innerHTML = `
      <div style="flex:1">
        <button>💡 Nápověda ${i + 1}</button>
        <div class="hint-text">${escapeHtml(hint)}</div>
      </div>
    `;

    item.querySelector("button").onclick = () => {
      item.classList.add("used");
      audio.click();
    };

    list.appendChild(item);
  });

  if (state.mode === "teams") {
    $("#teams-scoring").classList.remove("hidden");
    $("#teams-scoreboard").classList.remove("hidden");
    renderTeamsScoring(q);
    renderScoreboard();
  }

  $("#btn-skip").onclick = () => {
    audio.click();
    nextQuestion();
  };

  $("#btn-next-mod").onclick = () => {
    audio.click();
    nextQuestion();
  };
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
      <span style="flex:1;text-align:left">${escapeHtml(t.name)}</span>
      <span>+${points}</span>
    `;

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
      ${escapeHtml(t.name)}: <b>${t.score}</b>
    </div>
  `).join("");
}

/* ============== CUSTOM MODE ============== */
function initCustomSetup() {
  updateCustomSummary();

  $$("#custom-categories .chip").forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle("selected");
      const cat = chip.dataset.cat;

      if (chip.classList.contains("selected")) {
        if (!customConfig.categories.includes(cat)) customConfig.categories.push(cat);
      } else {
        customConfig.categories = customConfig.categories.filter(c => c !== cat);
      }

      audio.click();
      updateCustomSummary();
    };
  });

  $$("#custom-difficulties .chip").forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle("selected");
      const diff = chip.dataset.diff;

      if (chip.classList.contains("selected")) {
        if (!customConfig.difficulties.includes(diff)) customConfig.difficulties.push(diff);
      } else {
        customConfig.difficulties = customConfig.difficulties.filter(d => d !== diff);
      }

      audio.click();
      updateCustomSummary();
    };
  });

  $$("#custom-count .chip").forEach(chip => {
    chip.onclick = () => {
      $$("#custom-count .chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      customConfig.count = parseInt(chip.dataset.count, 10);
      audio.click();
      updateCustomSummary();
    };
  });

  $$("#custom-timer .chip").forEach(chip => {
    chip.onclick = () => {
      $$("#custom-timer .chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      customConfig.timerSec = parseInt(chip.dataset.timer, 10);
      audio.click();
      updateCustomSummary();
    };
  });

  $$("#custom-gametype .chip").forEach(chip => {
    chip.onclick = () => {
      $$("#custom-gametype .chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      customConfig.gameType = chip.dataset.gametype;
      audio.click();
      updateCustomSummary();
    };
  });
}

function updateCustomSummary() {
  const cats = customConfig.categories.length === 0
    ? "Všechny kategorie"
    : customConfig.categories.join(", ");

  const diffs = customConfig.difficulties.length === 0
    ? "Všechny obtížnosti"
    : customConfig.difficulties
      .map(d => ({ easy: "Lehká", medium: "Střední", hard: "Těžká" })[d])
      .join(", ");

  const timer = customConfig.timerSec === 0
    ? "Bez časovače"
    : `${customConfig.timerSec} s`;

  const gametype = ({ solo: "Sólo", moderator: "Moderátor", teams: "Týmy" })[customConfig.gameType];

  $("#custom-summary").innerHTML = `
    <b>Kategorie:</b> ${cats}<br>
    <b>Obtížnost:</b> ${diffs}<br>
    <b>Otázek:</b> ${customConfig.count}<br>
    <b>Časovač:</b> ${timer}<br>
    <b>Režim:</b> ${gametype}
  `;
}

async function startCustomGame() {
  audio.click();

  state.mode = customConfig.gameType;
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.total = customConfig.count;

  state.settings.timerSec = customConfig.timerSec;
  state.settings.timer = customConfig.timerSec > 0;

  if (customConfig.gameType === "solo") {
    ensurePlayerName();
  }

  if (customConfig.gameType === "teams") {
    state._useCustomFilter = true;
    showScreen("screen-teams-setup");
    initTeamsEditor();
    return;
  }

  const all = await loadAllQuestions();

  state.questions = pickRunQuestions(all, customConfig.count, {
    categories: customConfig.categories,
    difficulties: customConfig.difficulties
  });

  state.total = state.questions.length;

  if (state.questions.length === 0) {
    alert("Žádné otázky neodpovídají filtru. Zkus upravit nastavení.");
    return;
  }

  showScreen("screen-game");
  renderQuestion();
}

/* ============== KONEC HRY ============== */
function nextQuestion() {
  state.index++;

  if (state.index >= state.total) {
    return finishGame();
  }

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
            <span style="flex:1">${escapeHtml(t.name)}</span>
            <b>${t.score}</b>
          </div>
        `).join("")}
      </div>
    `;
  } else if (state.mode === "ranked") {
    // Speciální výsledek pro Ranked mode
    audio.fanfare();
    const player = getPlayerName() || "Hráč";
    const rank = getRankedRank(state.score);

    $("#result-title").textContent = "🏆 Ranked hotovo!";
    $("#result-body").innerHTML = `
      <p class="big-score">${state.score} bodů</p>
      <p class="subtitle">${player}</p>
      <div class="ranked-result-card">
        ${rank ? `<p><b>Tvůj rank:</b> #${rank.position} z ${rank.total} her</p>` : ""}
        <p class="subtitle">${
          state.score >= 3000 ? "🌟 Legendární výkon!" :
          state.score >= 2000 ? "🔥 Skvělá hra!" :
          state.score >= 1000 ? "👏 Slušný výkon" :
          "💪 Příště lépe!"
        }</p>
      </div>
    `;

    updateStats(state.score);
     
    if (typeof saveScoreToCloud === 'function' && typeof isSignedIn === 'function' && isSignedIn()) {
      saveScoreToCloud({
        score: state.score,
        mode: 'ranked',
        total_questions: state.total,
        correct_answers: state.correctCount || 0
      }).then(saved => {
        if (saved) {
          console.log('Ranked score saved to cloud');
        }
      });
    }
  } else if (state.mode === "solo") {
    $("#result-title").textContent = "Hotovo! 🎉";
    $("#result-body").innerHTML = `
      <p class="big-score">${state.score} bodů</p>
      <p class="subtitle">${
        state.score >= 2500 ? "Hvězdná hra! 🌟" :
        state.score >= 1500 ? "Skvěle 👏" :
        state.score >= 500 ? "Slušné, dá se víc." :
        "Příště to bude lepší 💪"
      }</p>
    `;

    updateStats(state.score);
  } else {
    $("#result-title").textContent = "Hotovo 🎤";
    $("#result-body").innerHTML = `<p class="subtitle">Konec moderování</p>`;
  }

  showScreen("screen-result");
}

function getRankedRank(currentScore) {
  const history = loadScoreHistory().filter(h => h.mode === "ranked");
  if (history.length === 0) return null;

  const sorted = history.sort((a, b) => b.score - a.score);
  const position = sorted.findIndex(h => h.score <= currentScore) + 1;

  return {
    position: position || sorted.length + 1,
    total: sorted.length + 1
  };
}

function updateStats(score) {
  const s = JSON.parse(localStorage.getItem(STORAGE.stats) || "{}");
  s.bestScore = Math.max(s.bestScore || 0, score);
  s.gamesPlayed = (s.gamesPlayed || 0) + 1;

  localStorage.setItem(STORAGE.stats, JSON.stringify(s));

  addScoreToHistory(score);
}

function renderHomeStats() {
  const s = JSON.parse(localStorage.getItem(STORAGE.stats) || "{}");
  const seenCount = loadSeen().size;
  let player = "bez jména";
  if (typeof isSignedIn === 'function' && isSignedIn() && typeof getDisplayName === 'function') {
    player = getDisplayName();
  } else {
    player = getPlayerName() || "bez jména";
  }

  $("#footer-stats").innerHTML = s.gamesPlayed
    ? `Hráč: <b>${escapeHtml(player)}</b> · Odehráno: <b>${s.gamesPlayed}</b> · Nejlepší skóre: <b>${s.bestScore}</b> · Viděno otázek: <b>${seenCount}</b>`
    : `Hráč: <b>${escapeHtml(player)}</b> · Zatím jsi nehrál. Pusť se do toho! 🚀`;
   
  const changePlayerBtn = document.querySelector('#btn-change-player');
  if (changePlayerBtn) {
    if (typeof isSignedIn === 'function' && isSignedIn()) {
      changePlayerBtn.style.display = 'none';
    } else {
      changePlayerBtn.style.display = '';
    }
  }
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
  state.teams.push({
    name: TEAM_NAMES_DEFAULT[i],
    color: TEAM_COLORS[i],
    score: 0
  });

  renderTeamsEditor();
};

$("#btn-start-teams").onclick = startTeamsGame;

$("#settings-toggle").onclick = () => $("#settings-panel").classList.toggle("hidden");

$("#opt-sound").checked = state.settings.sound;
$("#opt-timer").checked = state.settings.timer;
$("#opt-count").value = String(state.settings.count);

$("#opt-sound").onchange = (e) => {
  state.settings.sound = e.target.checked;
  saveSettings();
};

$("#opt-timer").onchange = (e) => {
  state.settings.timer = e.target.checked;
  saveSettings();
};

$("#opt-count").onchange = (e) => {
  state.settings.count = parseInt(e.target.value, 10);
  saveSettings();
};

$("#btn-reset-pool").onclick = () => {
  localStorage.removeItem(STORAGE.seen);
  renderHomeStats();
  alert("Paměť otázek vymazána – znovu uvidíš celou banku.");
};

$("#btn-leaderboard").onclick = () => {
  audio.click();
  renderLeaderboard();
};

$("#btn-change-player").onclick = () => {
  audio.click();
  changePlayerName();
};

$("#btn-clear-leaderboard").onclick = () => {
  if (confirm("Opravdu chceš vymazat lokální historii skóre na tomto zařízení?")) {
    localStorage.removeItem(STORAGE.scoreHistory);
    renderLeaderboard();
  }
};

$("#btn-start-custom").onclick = startCustomGame;

// Ranked mode start
$("#btn-start-ranked")?.addEventListener("click", startRankedGame);

renderHomeStats();

/* ============== REGISTRACE SERVICE WORKERU ============== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Service Worker zaregistrován ✅"))
      .catch((err) => console.warn("SW chyba:", err));
  });
}


/* ============== SYNC STATS BAR WITH AUTH ============== */
if (typeof sb !== 'undefined' && sb.auth) {
  sb.auth.onAuthStateChange(() => {
    setTimeout(() => {
      if (typeof renderHomeStats === 'function') {
        renderHomeStats();
      }
    }, 200);
  });
}
``
