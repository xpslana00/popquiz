/* ============================================
   POPQUIZ - AUTH LOGIKA (Supabase)
   ============================================ */

const SUPABASE_URL = 'https://dixgybinoalfarcdlgpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGd5Ymlub2FsZmFyY2RsZ3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTM5NDEsImV4cCI6MjA5OTE4OTk0MX0.NU_9HCG3aFS3TRi0V9qpWZSvGIpKUMMob7kL4WvdIwk';

// Použijeme 'sb' místo 'supabase' aby nekolidovalo s window.supabase
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signInWithGoogle() {
  console.log('Startuji Google login...');
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) {
    console.error('Google login error:', error);
    alert('Přihlášení selhalo: ' + error.message);
  }
}

async function signOut() {
  console.log('Odhlašuji se...');
  const { error } = await sb.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
  } else {
    console.log('Odhlášen');
    location.reload();
  }
}

async function getCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function getUserProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
  return data;
}

async function updateProfile(userId, updates) {
  const { data, error } = await sb
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('Profile update error:', error);
    return null;
  }
  return data;
}

sb.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event);
  if (event === 'SIGNED_IN') {
    console.log('Uzivatel prihlasen:', session.user.email);
    const profile = await getUserProfile(session.user.id);
    updateAuthUI(session.user, profile);
  } else if (event === 'SIGNED_OUT') {
    console.log('Uzivatel odhlasen');
    updateAuthUI(null, null);
  }
});

function updateAuthUI(user, profile) {
  const userInfo = document.querySelector('#auth-user-info');
  const loginBtn = document.querySelector('#btn-google-login');
  const avatarEl = document.querySelector('#auth-avatar');
  const nameEl = document.querySelector('#auth-name');
  const emailEl = document.querySelector('#auth-email');

  if (user) {
    const displayName = profile?.username || user.user_metadata?.full_name || user.email;
    const avatar = profile?.avatar_emoji || 'U';
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

(async () => {
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

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.querySelector('#btn-google-login');
  const logoutBtn = document.querySelector('#btn-logout');

  if (loginBtn) {
    loginBtn.addEventListener('click', signInWithGoogle);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', signOut);
  }
});

window.sb = sb;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.updateProfile = updateProfile;

console.log('Auth.js loaded');
`
