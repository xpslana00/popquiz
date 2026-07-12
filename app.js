/* ===================================================================
   POPQUIZ – HERNÍ LOGIKA
   Custom mode + player name + local leaderboard + Ranked mode
   =================================================================== */

/* ============== ESCAPE HTML (bezpečnostní helper) ============== */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============== ULOŽIŠTĚ ============== */
const STORAGE = {
  seen: "popquiz.seenIds",
  settings: "popquiz.settings",
  stats: "popquiz.stats",
  playerName: "popquiz.playerName",
  scoreHistory: "popquiz.scoreHistory"
};

const defaultSettings = {
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
  mode: null,
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
const DATASET_VERSION = "20260712-5";
const BOOSTED_CATEGORIES = new Set(["Harry Potter", "The Big Bang Theory"]);
const BOOSTED_CATEGORY_WEIGHT = 3;
const CZECH_TEXT_REPLACEMENTS = [
  [/\bPatri\b/g, "Patří"],
  [/\bpatri\b/g, "patří"],
  [/\bzakladni\b/g, "základní"],
  [/\bZakladni\b/g, "Základní"],
  [/\bfanousky\b/g, "fanoušky"],
  [/\bferovy\b/g, "férový"],
  [/\btezsi\b/g, "těžší"],
  [/\btezsi\b/g, "těžší"],
  [/\bToto je tezsi\b/g, "Toto je těžší"],
  [/Tema:/g, "Téma:"],
  [/Spravna odpoved zacina na:/g, "Správná odpověď začíná na:"],
  [/\bskola\b/g, "škola"],
  [/\bSkola\b/g, "Škola"],
  [/\bserie\b/g, "série"],
  [/\bserialu\b/g, "seriálu"],
  [/\bktery\b/g, "který"],
  [/\bKtery\b/g, "Který"],
  [/\bktera\b/g, "která"],
  [/\bKtera\b/g, "Která"],
  [/\bktere\b/g, "které"],
  [/\bKtere\b/g, "Které"],
  [/\bkterou\b/g, "kterou"],
  [/\bnavstevuje\b/g, "navštěvuje"],
  [/\bnejlepsi\b/g, "nejlepší"],
  [/\bkamarad\b/g, "kamarád"],
  [/\bkamaradka\b/g, "kamarádka"],
  [/\bvetsi\b/g, "větší"],
  [/\bcasti\b/g, "části"],
  [/\bcast\b/g, "část"],
  [/\breditel\b/g, "ředitel"],
  [/\breditelka\b/g, "ředitelka"],
  [/\bkoleje\b/g, "koleje"],
  [/\bpatri\b/g, "patří"],
  [/\bucitelkou\b/g, "učitelkou"],
  [/\bucitelka\b/g, "učitelka"],
  [/\bucitel\b/g, "učitel"],
  [/\bucitelkou\b/g, "učitelkou"],
  [/\bpromenovani\b/g, "přeměňování"],
  [/\blektvaru\b/g, "lektvarů"],
  [/\bcern[eé]\b/g, "černé"],
  [/\bhlavni\b/g, "hlavní"],
  [/\bzaporak\b/g, "záporák"],
  [/\bneviditelny plast\b/g, "neviditelný plášť"],
  [/\bneviditelny\b/g, "neviditelný"],
  [/\bzakazany\b/g, "zakázaný"],
  [/\bprisera\b/g, "příšera"],
  [/\botevre\b/g, "otevře"],
  [/\bdomaci skritek\b/g, "domácí skřítek"],
  [/\btretim\b/g, "třetím"],
  [/\bzachrani\b/g, "zachrání"],
  [/\bukazujici\b/g, "ukazující"],
  [/\bpredmet\b/g, "předmět"],
  [/\bprvni\b/g, "první"],
  [/\bdruhem\b/g, "druhém"],
  [/\bctvrtem\b/g, "čtvrtém"],
  [/\bpatem\b/g, "pátém"],
  [/\bsestem\b/g, "šestém"],
  [/\bsedmem\b/g, "sedmém"],
  [/\bmadarsky\b/g, "maďarský"],
  [/\bkouzelnicky\b/g, "kouzelnický"],
  [/\bkouzelnicka\b/g, "kouzelnická"],
  [/\bkouzelnicke\b/g, "kouzelnické"],
  [/\btajna\b/g, "tajná"],
  [/\bspolecnost\b/g, "společnost"],
  [/\bfenixuv rad\b/g, "Fénixův řád"],
  [/\bBrumbal\b/g, "Brumbál"],
  [/\bBrumbalova\b/g, "Brumbálova"],
  [/\bNebelvir\b/g, "Nebelvír"],
  [/\bHavraspar\b/g, "Havraspár"],
  [/\bMadarsky\b/g, "Maďarský"],
  [/\bMadarska\b/g, "Maďarská"],
  [/\bKlofak\b/g, "Klofák"],
  [/\bCamral\b/g, "Camrál"],
  [/\bFamfrpal\b/g, "Famfrpál"],
  [/\bZlatonka\b/g, "Zlatonka"],
  [/\bPrasinky\b/g, "Prasinky"],
  [/\bPricna\b/g, "Příčná"],
  [/\bzvire\b/g, "zvíře"],
  [/\bbydli\b/g, "bydlí"],
  [/\bprijmeni\b/g, "příjmení"],
  [/\binzenyr\b/g, "inženýr"],
  [/\bpozd[eě]jsi\b/g, "pozdější"],
  [/\bpartnerka\b/g, "partnerka"],
  [/\bmanzelka\b/g, "manželka"],
  [/\bservirka\b/g, "servírka"],
  [/\bvedeckyne\b/g, "vědkyně"],
  [/\bdoktorat\b/g, "doktorát"],
  [/\boblibene\b/g, "oblíbené"],
  [/\boblibeny\b/g, "oblíbený"],
  [/\bmesto\b/g, "město"],
  [/\bbivaly\b/g, "bývalý"],
  [/\bvesmirna\b/g, "vesmírná"],
  [/\bpovedeny\b/g, "povedený"],
  [/\bctvrtek\b/g, "čtvrtek"],
  [/\bvazny\b/g, "vážný"],
  [/\bvetsina\b/g, "většina"],
  [/\bgeolozka\b/g, "geoložka"],
  [/\bneurobiolozka\b/g, "neurobioložka"],
  [/\bastrofyzik\b/g, "astrofyzik"],
  [/\bkomiksovy\b/g, "komiksový"],
  [/\bvedecky\b/g, "vědecký"],
  [/\bsvatbe\b/g, "svatbě"],
  [/\bmyslence\b/g, "myšlence"],
  [/\bsvatbu\b/g, "svatbu"],
  [/\bdetsky\b/g, "dětský"],
  [/\bgeneralni\b/g, "generální"],
  [/\bzisk[aá]\b/g, "získá"],
  [/\bvede\b/g, "vede"],
  [/\bvedecky idol\b/g, "vědecký idol"],
  [/\brandi?t\b/g, "randit"],
  [/\bprednasek\b/g, "přednášek"],
  [/\bzabavny\b/g, "zábavný"],
  [/\bkamaradkou\b/g, "kamarádkou"],
  [/\bkolegkyne\b/g, "kolegyně"],
  [/\bboji\b/g, "bojí"],
  [/\bmeste\b/g, "městě"],
  [/\bnejvetsi\b/g, "největší"],
  [/\bzdr[ao]tni\b/g, "zdravotní"],
  [/\bdrobnosti\b/g, "drobnosti"],
  [/\bnemoci\b/g, "nemoci"],
  [/\bpratele\b/g, "přátele"],
  [/\bteoreticky\b/g, "teoretický"],
  [/\bspolecna\b/g, "společná"],
  [/\bvecere\b/g, "večeře"]
];

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
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
    s.setAttribute('style', 'display: none !important;');
  });
  const screen = document.querySelector('#' + id);
  if (screen) {
    screen.classList.add('active');
    screen.setAttribute('style', 'display: block !important;');
    window.scrollTo(0, 0);
  }
}

/* ============== PLAYER + LOCAL LEADERBOARD ============== */
function getPlayerName() {
  return localStorage.getItem(STORAGE.playerName) || "";
}

function setPlayerName(name) {
  localStorage.setItem(STORAGE.playerName, name);
}

function getSavedPlayerName() {
  const stored = getPlayerName();
  if (stored) return stored;
  if (typeof isSignedIn === 'function' && isSignedIn()) return getDisplayName();
  return "Host";
}

function shouldRequirePlayerName(mode) {
  return mode === 'ranked';
}

// Previously the code expected a helper to require a player name for guests.
// We no longer force entering a nickname — allow signed users to play Ranked
// and allow guests to start without an extra prompt.
function requirePlayerNameForGuest() {
  return true;
}

function ensurePlayerName() {
  const current = getPlayerName();
  if (!current || current.trim() === "") {
    const fallback = (typeof isSignedIn === 'function' && isSignedIn()) ? getDisplayName() : 'Host';
    setPlayerName(fallback);
  }
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
  const name = getSavedPlayerName();
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

function formatLeaderboardName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + ' ' + lastInitial + '.';
  }

  const trimmed = name.trim();
  if (trimmed.length > 16) {
    return trimmed.slice(0, 13) + '…';
  }

  return trimmed;
}

async function renderLeaderboard() {
  const list = $("#leaderboard-list");
  if (!list) return;

  showScreen("screen-leaderboard");

  const subtitle = document.querySelector("#screen-leaderboard .subtitle");
  if (subtitle) subtitle.textContent = "Globální žebříček všech hráčů (Ranked)";

  list.innerHTML = '<div class="empty-state">Načítám globální žebříček...</div>';

  const isLoggedIn = typeof isSignedIn === 'function' && isSignedIn();

  if (typeof getGlobalLeaderboard !== 'function') {
    list.innerHTML = '<div class="empty-state">Zebricek zatim neni k dispozici (auth se nenacetl).</div>';
    return;
  }

  try {
    const rows = await getGlobalLeaderboard(100);

    if (!rows || rows.length === 0) {
      const summary = document.querySelector("#leaderboard-summary");
      if (summary) summary.innerHTML = "";
      list.innerHTML = '<div class="empty-state">Zatím tu nikdo nemá Ranked skóre.<br>' + (isLoggedIn ? 'Buď první! Zahraj si Ranked hru.' : 'Přihlas se a buď první v žebříčku!') + '</div>';
      return;
    }

    const currentUserId = (typeof currentAuthUser !== 'undefined' && currentAuthUser) ? currentAuthUser.id : null;
    const topRow = rows[0];
    const topProfile = topRow.profiles || {};
    const topName = formatLeaderboardName(topProfile.username || (topProfile.email ? topProfile.email.split('@')[0] : 'Anonym'));
    const summary = document.querySelector("#leaderboard-summary");

    if (summary) {
      summary.innerHTML = '<div class="leaderboard-summary-card">' +
        '<span class="leaderboard-summary-label">Nejvyšší score</span>' +
        '<strong>' + escapeHtml(String(topRow.score || 0)) + ' bodů</strong>' +
        '<span class="leaderboard-summary-meta">' + escapeHtml(topName) + ' · ' + formatDateTime(topRow.created_at) + '</span>' +
      '</div>';
    }

    list.innerHTML = rows.map((r, i) => {
      const profile = r.profiles || {};
      const rawName = profile.username || (profile.email ? profile.email.split('@')[0] : 'Anonym');
      const name = formatLeaderboardName(rawName);
      const avatar = profile.avatar_emoji || '🎮';
      const isMe = currentUserId && r.user_id === currentUserId;
      const highlight = isMe ? ' leaderboard-me' : '';
      const gamesCount = r.games_count || 1;
      const gamesLabel = gamesCount === 1 ? 'odehraná hra' : gamesCount < 5 ? 'odehrané hry' : 'odehraných her';

      return '<div class="leaderboard-item' + highlight + '">' +
        '<div class="leaderboard-rank">#' + (i + 1) + '</div>' +
        '<div>' +
          '<div class="leaderboard-name">' + avatar + ' ' + escapeHtml(name) + (isMe ? ' <span style="color:#ffd700">(Ty)</span>' : '') + '</div>' +
          '<div class="leaderboard-meta">' + formatDateTime(r.created_at) + ' · ' + (r.total_questions || 20) + ' otazek · 🏆 Ranked · ' + gamesCount + ' ' + gamesLabel + '</div>' +
        '</div>' +
        '<div class="leaderboard-score">' + r.score + '</div>' +
      '</div>';
    }).join("");
  } catch (err) {
    console.error('Leaderboard error:', err);
    const summary = document.querySelector("#leaderboard-summary");
    if (summary) summary.innerHTML = "";
    list.innerHTML = '<div class="empty-state">Chyba při načítání žebříčku. Zkus obnovit stránku.</div>';
  }
}

function getLocalGameHistory() {
  return loadScoreHistory().slice().sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
}

function buildProfileStats(history, label) {
  const totalGames = history.length;
  const totalScore = history.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  const bestScore = history.reduce((best, item) => Math.max(best, Number(item.score) || 0), 0);
  const averageScore = totalGames ? Math.round(totalScore / totalGames) : 0;
  const lastGame = history[0] || null;

  return {
    totalGames,
    totalScore,
    bestScore,
    averageScore,
    lastGame,
    label
  };
}

async function renderProfile() {
  const statsWrap = document.querySelector('#profile-stats');
  const historyWrap = document.querySelector('#profile-history');
  const nameEl = document.querySelector('#profile-name');
  const subtitleEl = document.querySelector('#profile-subtitle');
  const avatarEl = document.querySelector('#profile-avatar');
  const noteEl = document.querySelector('#profile-history-note');

  if (!statsWrap || !historyWrap || !nameEl || !subtitleEl || !avatarEl) return;

  showScreen('screen-profile');

  const signedIn = typeof isSignedIn === 'function' && isSignedIn();
  const displayName = signedIn ? getDisplayName() : (getSavedPlayerName() || 'Host');
  const displayAvatar = signedIn ? getDisplayAvatar() : '👤';

  nameEl.textContent = displayName;
  subtitleEl.textContent = signedIn ? 'Tvoje cloudové a lokální herní statistiky' : 'Lokální herní statistiky na tomto zařízení';
  avatarEl.textContent = displayAvatar;
  if (noteEl) noteEl.textContent = signedIn ? 'Ranked historie z cloudu' : 'Historie uložená lokálně';

  const localHistory = getLocalGameHistory();
  const localStats = buildProfileStats(localHistory, 'Lokálně');

  let rankedHistory = [];
  if (signedIn && typeof getMyRankedHistory === 'function') {
    rankedHistory = await getMyRankedHistory(20);
  }
  const rankedStats = buildProfileStats(rankedHistory || [], 'Ranked');

  const bestScore = Math.max(localStats.bestScore, rankedStats.bestScore);
  const latestEntry = rankedStats.lastGame || localStats.lastGame || null;

  const cards = [
    { label: 'Odehrané hry', value: String(localStats.totalGames) },
    { label: 'Nejvyšší score', value: String(bestScore) },
    { label: 'Celkové score', value: String(localStats.totalScore) },
    { label: 'Průměr na hru', value: String(localStats.averageScore) },
    { label: 'Ranked hry', value: signedIn ? String(rankedStats.totalGames) : '0' }
  ];

  statsWrap.innerHTML = cards.map((card) => {
    return '<div class="profile-stat-card">' +
      '<span>' + escapeHtml(card.label) + '</span>' +
      '<strong>' + escapeHtml(card.value) + '</strong>' +
    '</div>';
  }).join('');

  const historySource = signedIn && rankedHistory.length ? rankedHistory : localHistory;
  if (!historySource.length) {
    historyWrap.innerHTML = '<div class="empty-state">Zatím tu není žádná uložená hra.</div>';
    return;
  }

  historyWrap.innerHTML = historySource.slice(0, 5).map((item) => {
    const modeLabel = getModeLabel(item.mode || 'solo');
    return '<div class="profile-history-item">' +
      '<div>' +
        '<strong>' + escapeHtml(modeLabel) + '</strong>' +
        '<span>' + escapeHtml(formatDateTime(item.date || item.created_at || '')) + '</span>' +
      '</div>' +
      '<b>' + escapeHtml(String(item.score || 0)) + ' bodů</b>' +
    '</div>';
  }).join('');

  if (latestEntry && signedIn) {
    subtitleEl.textContent += ' · Poslední hra: ' + formatDateTime(latestEntry.date || latestEntry.created_at || '');
  }
}

/* ============== ZVUKY ============== */
const audio = (() => ({
  correct: () => {},
  wrong: () => {},
  tick: () => {},
  timeUp: () => {},
  click: () => {},
  fanfare: () => {}
}))();

/* ============== NAČTENÍ OTÁZEK + RANDOMIZER ============== */
async function loadAllQuestions() {
  const [r, hpModule, bbtModule] = await Promise.all([
    fetch('/data/questions.json?v=' + DATASET_VERSION),
    import('/data/questions_harry_potter.js?v=' + DATASET_VERSION),
    import('/data/questions_big_bang_theory.js?v=' + DATASET_VERSION)
  ]);

  const baseQuestions = await r.json();

  return [
    ...baseQuestions,
    ...normalizeQuestionSet(hpModule.harryPotterQuestions),
    ...normalizeQuestionSet(bbtModule.bigBangTheoryQuestions)
  ];
}

function normalizeCzechText(value) {
  let result = String(value);

  CZECH_TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  return result;
}

function normalizeQuestionSet(questions) {
  return questions.map((question) => ({
    ...question,
    question: normalizeCzechText(question.question),
    answers: question.answers.map(normalizeCzechText),
    hints: question.hints.map(normalizeCzechText)
  }));
}

function buildCategoryCycle(byCategory, prioritizeBoostedCategories) {
  const categories = shuffle(Object.keys(byCategory));

  if (!prioritizeBoostedCategories) {
    return categories;
  }

  const weighted = [];

  categories.forEach(cat => {
    const weight = BOOSTED_CATEGORIES.has(cat) ? BOOSTED_CATEGORY_WEIGHT : 1;

    for (let i = 0; i < weight; i++) {
      weighted.push(cat);
    }
  });

  return shuffle(weighted);
}

function pickRunQuestions(all, count, filter = {}) {
  const ignoreSeen = !!filter.ignoreSeen;
  const seen = ignoreSeen ? new Set() : loadSeen();

  let pool = [...all];
  const hasExplicitCategoryFilter = !!(filter.categories && filter.categories.length > 0);

  if (hasExplicitCategoryFilter) {
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

    if (!ignoreSeen) {
      saveSeen(seen);
    }

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
  const categories = buildCategoryCycle(byCategory, !hasExplicitCategoryFilter);
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

  if (!ignoreSeen) {
    final.forEach(q => seen.add(q.id));
    saveSeen(seen);
  }

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
    if (typeof signInWithGoogle === 'function') {
      signInWithGoogle();
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

  state.questions = pickRunQuestions(all, RANKED_CONFIG.count, { ignoreSeen: true });
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

    row.innerHTML = '<span class="team-color" style="background:' + t.color + '"></span>' +
      '<input type="text" value="' + escapeHtml(t.name) + '" data-i="' + i + '" />' +
      '<button data-rm="' + i + '">×</button>';

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
  $("#progress-text").textContent = (state.index + 1) + ' / ' + state.total;
  $("#progress-fill").style.width = ((state.index / state.total) * 100) + '%';

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

    let difficultyBadge = "";
    if (state.mode === "ranked") {
      const multiplier = RANKED_CONFIG.difficultyMultiplier[q.difficulty] || 1;
      gain = Math.round(gain * multiplier);
      if (multiplier > 1) {
        difficultyBadge = ' <span style="color:#ffd700">×' + multiplier + '</span>';
      }
    }

    state.score += gain;
    audio.correct();

    fb.classList.add("ok");
    fb.innerHTML = '<h3>Správně! 🎉</h3><p>+' + gain + ' bodů' + difficultyBadge + (streakBonus ? ' (série ×' + state.streak + ' 🔥)' : '') + '</p>';
  } else {
    state.streak = 0;
    audio.wrong();

    fb.classList.add("err");
    fb.innerHTML = picked === -1
      ? '<h3>Čas vypršel! ⏰</h3><p>Správně bylo: <b>' + escapeHtml(q.answers[correct]) + '</b></p>'
      : '<h3>Špatně 😬</h3><p>Správně bylo: <b>' + escapeHtml(q.answers[correct]) + '</b></p>';
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

    item.innerHTML = '<div style="flex:1"><button>💡 Nápověda ' + (i + 1) + '</button><div class="hint-text">' + escapeHtml(hint) + '</div></div>';

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

    b.innerHTML = '<span class="team-color" style="background:' + t.color + '"></span>' +
      '<span style="flex:1;text-align:left">' + escapeHtml(t.name) + '</span>' +
      '<span>+' + points + '</span>';

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

  board.innerHTML = state.teams.map(t => 
    '<div class="team-pill ' + (t.score === max && max > 0 ? "leader" : "") + '">' +
      '<span class="team-color" style="background:' + t.color + '"></span>' +
      escapeHtml(t.name) + ': <b>' + t.score + '</b>' +
    '</div>'
  ).join("");
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
    : customConfig.timerSec + ' s';

  const gametype = ({ solo: "Sólo", moderator: "Moderátor", teams: "Týmy" })[customConfig.gameType];

  $("#custom-summary").innerHTML = 
    '<b>Kategorie:</b> ' + cats + '<br>' +
    '<b>Obtížnost:</b> ' + diffs + '<br>' +
    '<b>Otázek:</b> ' + customConfig.count + '<br>' +
    '<b>Časovač:</b> ' + timer + '<br>' +
    '<b>Režim:</b> ' + gametype;
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

    $("#result-title").textContent = 'Vítěz: ' + sorted[0].name + ' 🏆';
    $("#result-body").innerHTML = '<div class="teams-editor">' +
      sorted.map((t, i) => 
        '<div class="team-row">' +
          '<span style="font-weight:600">#' + (i + 1) + '</span>' +
          '<span class="team-color" style="background:' + t.color + '"></span>' +
          '<span style="flex:1">' + escapeHtml(t.name) + '</span>' +
          '<b>' + t.score + '</b>' +
        '</div>'
      ).join("") +
    '</div>';
  } else if (state.mode === "ranked") {
    audio.fanfare();
    const player = getPlayerName() || "Hráč";
    const rank = getRankedRank(state.score);

    $("#result-title").textContent = "🏆 Ranked hotovo!";
    $("#result-body").innerHTML = '<p class="big-score">' + state.score + ' bodů</p>' +
      '<p class="subtitle">' + escapeHtml(player) + '</p>' +
      '<div class="ranked-result-card">' +
        (rank ? '<p><b>Tvůj rank:</b> #' + rank.position + ' z ' + rank.total + ' her</p>' : '') +
        '<p class="subtitle">' + (
          state.score >= 3000 ? "🌟 Legendární výkon!" :
          state.score >= 2000 ? "🔥 Skvělá hra!" :
          state.score >= 1000 ? "👏 Slušný výkon" :
          "💪 Příště lépe!"
        ) + '</p>' +
      '</div>';

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
    $("#result-body").innerHTML = '<p class="big-score">' + state.score + ' bodů</p>' +
      '<p class="subtitle">' + (
        state.score >= 2500 ? "Hvězdná hra! 🌟" :
        state.score >= 1500 ? "Skvěle 👏" :
        state.score >= 500 ? "Slušné, dá se víc." :
        "Příště to bude lepší 💪"
      ) + '</p>';

    updateStats(state.score);
  } else {
    $("#result-title").textContent = "Hotovo 🎤";
    $("#result-body").innerHTML = '<p class="subtitle">Konec moderování</p>';
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
  const footerStats = $("#footer-stats");
  if (!footerStats) return;

  const signedIn = typeof isSignedIn === 'function' && isSignedIn();
  // Do not display player name; keep stats generic
  footerStats.innerHTML = s.gamesPlayed
    ? 'Odehráno: <b>' + s.gamesPlayed + '</b> · Nejlepší skóre: <b>' + (s.bestScore || 0) + '</b> · Viděno otázek: <b>' + seenCount + '</b>'
    : 'Zatím jsi nehrál. Vyber režim nahoře a pusť se rovnou do hry.';

  // change-player button removed from markup; nothing to do here
}

/* ============== NAVIGACE A NASTAVENÍ ============== */
$$(".mode-card").forEach(c => c.onclick = () => {
  audio.click();
  const mode = c.dataset.mode;
  if (mode === 'leaderboard') {
    renderLeaderboard();
    return;
  }
  startGame(mode);
});

$$("[data-go]").forEach(b => b.onclick = () => {
  audio.click();
  showScreen(b.dataset.go);
  renderHomeStats();
});

const profileBtn = document.querySelector('#auth-profile-btn');
if (profileBtn) {
  profileBtn.onclick = () => {
    audio.click();
    renderProfile();
  };
}

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

$("#opt-timer").checked = state.settings.timer;
$("#opt-count").value = String(state.settings.count);

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

// Removed change player UI - button intentionally removed from markup

const clearBtn = document.querySelector('#btn-clear-leaderboard');
if (clearBtn) {
  clearBtn.style.display = 'none';
}

$("#btn-start-custom").onclick = startCustomGame;

/* ============== RANKED SMART BUTTON ============== */
function updateRankedButton() {
  const btn = document.querySelector('#btn-start-ranked');
  if (!btn) return;

  const signed = typeof isSignedIn === 'function' && isSignedIn();

  if (signed) {
    btn.innerHTML = '🚀 Zahájit Ranked hru';
    btn.classList.remove('need-signin');
    btn.onclick = startRankedGame;
  } else {
    btn.innerHTML = '🔐 Přihlas se přes Google pro Ranked';
    btn.classList.add('need-signin');
    btn.onclick = () => {
      if (typeof signInWithGoogle === 'function') {
        signInWithGoogle();
      }
    };
  }
}

// Delegated click handler to ensure ranked start works even if handlers
// were attached before auth state changed or button was re-rendered.
document.addEventListener('click', function (e) {
  const el = e.target.closest && e.target.closest('#btn-start-ranked');
  if (!el) return;
  audio.click();
  const signed = typeof isSignedIn === 'function' && isSignedIn();
  if (signed) {
    if (typeof startRankedGame === 'function') startRankedGame();
  } else {
    if (typeof signInWithGoogle === 'function') signInWithGoogle();
  }
});

const welcomeEnterBtn = document.querySelector('#btn-welcome-enter');
if (welcomeEnterBtn) {
  welcomeEnterBtn.onclick = () => {
    window.location.href = './app/';
  };
}

updateRankedButton();

if (typeof sb !== 'undefined' && sb.auth) {
  sb.auth.onAuthStateChange(() => {
    setTimeout(updateRankedButton, 300);
  });
}

const isAppRoute = window.location.pathname.includes('/app') || new URLSearchParams(window.location.search).get('view') === 'app';
if (isAppRoute) {
  document.body.classList.add('app-shell');
  if (typeof hideWelcomeScreen === 'function') {
    hideWelcomeScreen();
  } else {
    showScreen('screen-home');
  }
} else {
  showWelcomeScreen();
}

/* ============== REGISTRACE SERVICE WORKERU ============== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
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
