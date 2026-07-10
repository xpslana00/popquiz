const SUPABASE_URL = 'https://dixgybinoalfarcdlgpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGd5Ymlub2FsZmFyY2RsZ3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTM5NDEsImV4cCI6MjA5OTE4OTk0MX0.NU_9HCG3aFS3TRi0V9qpWZSvGIpKUMMob7kL4WvdIwk';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signInWithGoogle() {
  console.log('Startuji Google login');
  const result = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if (result.error) {
    console.error('Google login error:', result.error);
    alert('Prihlaseni selhalo: ' + result.error.message);
  }
}

async function signOut() {
  console.log('Odhlasuji se');
  const result = await sb.auth.signOut();
  if (result.error) {
    console.error('Sign out error:', result.error);
  } else {
    console.log('Odhlasen');
    location.reload();
  }
}

async function getCurrentUser() {
  const result = await sb.auth.getUser();
  return result.data.user;
}

async function getUserProfile(userId) {
  const result = await sb.from('profiles').select('*').eq('id', userId).single();
  if (result.error) {
    console.error('Profile fetch error:', result.error);
    return null;
  }
  return result.data;
}

async function updateProfile(userId, updates) {
  const payload = Object.assign({}, updates, { updated_at: new Date().toISOString() });
  const result = await sb.from('profiles').update(payload).eq('id', userId).select().single();
  if (result.error) {
    console.error('Profile update error:', result.error);
    return null;
  }
  return result.data;
}

function updateAuthUI(user, profile) {  
  currentAuthUser = user;
  currentAuthProfile = profile;
  const userInfo = document.querySelector('#auth-user-info');
  const loginBtn = document.querySelector('#btn-google-login');
  const avatarEl = document.querySelector('#auth-avatar');
  const nameEl = document.querySelector('#auth-name');
  const emailEl = document.querySelector('#auth-email');

  if (user) {
    let displayName = user.email;
    if (profile && profile.username) {
      displayName = profile.username;
    } else if (user.user_metadata && user.user_metadata.full_name) {
      displayName = user.user_metadata.full_name;
    }
    let avatar = 'U';
    if (profile && profile.avatar_emoji) {
      avatar = profile.avatar_emoji;
    }
    const email = user.email || '';

    if (avatarEl) avatarEl.textContent = avatar;
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;

    if (userInfo) userInfo.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
  } else {
    if (userInfo) userInfo.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'flex';
  }
}

sb.auth.onAuthStateChange(async function (event, session) {
  console.log('Auth event:', event);
  if (event === 'SIGNED_IN') {
    console.log('Uzivatel prihlasen:', session.user.email);
    const profile = await getUserProfile(session.user.id);
    updateAuthUI(session.user, profile);
    
    if (typeof hideWelcomeScreen === 'function') {
      hideWelcomeScreen();
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('Uzivatel odhlasen');
    updateAuthUI(null, null);
  }
});

function wireAuthButtons() {
  const loginBtn = document.querySelector('#btn-google-login');
  const logoutBtn = document.querySelector('#btn-logout');

  if (loginBtn) {
    loginBtn.onclick = signInWithGoogle;
  }
  if (logoutBtn) {
    logoutBtn.onclick = signOut;
  }
  console.log('Auth buttons wired');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireAuthButtons);
} else {
  wireAuthButtons();
}

(async function () {
  try {
    const user = await getCurrentUser();
    if (user) {
      const profile = await getUserProfile(user.id);
      updateAuthUI(user, profile);
      console.log('Uzivatel je prihlasen:', user.email);
    } else {
      console.log('Uzivatel neni prihlasen');
    }
  } catch (err) {
    console.error('Auth startup error:', err);
  }
})();

window.sb = sb;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.updateProfile = updateProfile;


/* --------------- STAV UZIVATELE (globalni) --------------- */
let currentAuthUser = null;
let currentAuthProfile = null;

function isSignedIn() {
  return currentAuthUser !== null;
}

function getDisplayName() {
  if (currentAuthProfile && currentAuthProfile.username) {
    return currentAuthProfile.username;
  }
  if (currentAuthUser && currentAuthUser.user_metadata && currentAuthUser.user_metadata.full_name) {
    return currentAuthUser.user_metadata.full_name;
  }
  if (currentAuthUser && currentAuthUser.email) {
    return currentAuthUser.email.split('@')[0];
  }
  return 'Hrac';
}

function getDisplayAvatar() {
  if (currentAuthProfile && currentAuthProfile.avatar_emoji) {
    return currentAuthProfile.avatar_emoji;
  }
  return 'U';
}

async function saveScoreToCloud(scoreData) {
  if (!currentAuthUser) {
    console.log('Score not saved - user not signed in');
    return null;
  }
  const payload = {
    user_id: currentAuthUser.id,
    score: scoreData.score || 0,
    mode: scoreData.mode || 'solo',
    total_questions: scoreData.total_questions || 0,
    correct_answers: scoreData.correct_answers || 0,
    time_taken_seconds: scoreData.time_taken_seconds || null,
    categories: scoreData.categories || null,
    difficulties: scoreData.difficulties || null
  };
  const result = await sb.from('scores').insert(payload).select().single();
  if (result.error) {
    console.error('Save score error:', result.error);
    return null;
  }
  console.log('Score saved to cloud:', result.data);
  return result.data;
}

async function getGlobalLeaderboard(limit) {
  const max = limit || 100;
  const result = await sb
    .from('scores')
    .select('id, score, mode, total_questions, correct_answers, created_at, profiles(username, avatar_emoji, email)')
    .eq('mode', 'ranked')
    .order('score', { ascending: false })
    .limit(max);
  if (result.error) {
    console.error('Leaderboard fetch error:', result.error);
    return [];
  }
  return result.data || [];
}

async function getMyRankedHistory(limit) {
  if (!currentAuthUser) return [];
  const max = limit || 20;
  const result = await sb
    .from('scores')
    .select('*')
    .eq('user_id', currentAuthUser.id)
    .eq('mode', 'ranked')
    .order('created_at', { ascending: false })
    .limit(max);
  if (result.error) {
    console.error('History fetch error:', result.error);
    return [];
  }
  return result.data || [];
}

window.isSignedIn = isSignedIn;
window.getDisplayName = getDisplayName;
window.getDisplayAvatar = getDisplayAvatar;
window.saveScoreToCloud = saveScoreToCloud;
window.getGlobalLeaderboard = getGlobalLeaderboard;
window.getMyRankedHistory = getMyRankedHistory;

/* --------------- WELCOME SCREEN --------------- */
const WELCOME_KEY = 'popquiz.welcomeShown';

function showWelcomeScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const welcome = document.querySelector('#screen-welcome');
  if (welcome) welcome.classList.add('active');
}

function hideWelcomeScreen() {
  const welcome = document.querySelector('#screen-welcome');
  if (welcome) welcome.classList.remove('active');
  const home = document.querySelector('#screen-home');
  if (home) home.classList.add('active');
  localStorage.setItem(WELCOME_KEY, '1');
}

function shouldShowWelcome() {
  if (typeof isSignedIn === 'function' && isSignedIn()) return false;
  return localStorage.getItem(WELCOME_KEY) !== '1';
}

function wireWelcomeButtons() {
  const googleBtn = document.querySelector('#btn-welcome-google');
  const skipBtn = document.querySelector('#btn-welcome-skip');

  if (googleBtn) {
    googleBtn.onclick = () => {
      if (typeof signInWithGoogle === 'function') {
        signInWithGoogle();
      }
    };
  }

  if (skipBtn) {
    skipBtn.onclick = hideWelcomeScreen;
  }
}

function initWelcomeScreen() {
  wireWelcomeButtons();
  if (shouldShowWelcome()) {
    setTimeout(showWelcomeScreen, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWelcomeScreen);
} else {
  initWelcomeScreen();
}

window.showWelcomeScreen = showWelcomeScreen;
window.hideWelcomeScreen = hideWelcomeScreen;
console.log('Auth.js loaded');
