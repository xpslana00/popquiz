/* ============================================
   POPQUIZ - AUTH LOGIKA (Supabase)
   ============================================ */

const SUPABASE_URL = 'https://dixgybinoalfarcdlgpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGd5Ymlub2FsZmFyY2RsZ3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTM5NDEsImV4cCI6MjA5OTE4OTk0MX0.NU_9HCG3aFS3TRi0V9qpWZSvGIpKUMMob7kL4WvdIwk';

// Použijeme 'sb' místo 'supabase' aby nekolidovalo s window.supabase
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signInWithGoogle() {
  console.log('🔐 Startuji Google login...');
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) {
    console.error('❌ Google login error:', error);
    alert('Přihlášení selhalo: ' + error.message);
  }
}

async function signOut() {
  console.log('👋 Odhlašuji se...');
  const { error } = await sb.auth.signOut();
  if (error) {
    console.error('❌ Sign out error:', error);
  } else {
    console.log('✅ Odhlášen');
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
    console.error('❌ Profile fetch error:', error);
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
    console.error('❌ Profile update error:', error);
    return null;
  }
  return data;
}

sb.auth.onAuthStateChange(async (event, session) => {
  console.log('🔔 Auth event:', event);
  if (event === 'SIGNED_IN') {
    console.log('✅ Uživatel přihlášen:', session.user.email);
    const profile = await getUserProfile(session.user.id);
    updateAuthUI(session.user, profile);
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 Uživatel odhlášen');
    updateAuthUI(null, null);
  }
});

function updateAuthUI(user, profile) {
  const authInfoEl = document.querySelector('#auth-info');
  const loginBtnEl = document.querySelector('#btn-google-login');
  const logoutBtnEl = document.querySelector('#btn-logout');
  if (user) {
    if (authInfoEl) {
      const displayName = profile?.username || user.email;
      const avatar = profile?.avatar_emoji || '👤';
      authInfoEl.innerHTML = avatar + ' <b>' + displayName + '</b>';
      authInfoEl.style.display = 'block';
    }
    if (loginBtnEl) loginBtnEl.style.display = 'none';
    if (logoutBtnEl) logoutBtnEl.style.display = 'inline-block';
  } else {
    if (authInfoEl) authInfoEl.style.display = 'none';
    if (loginBtnEl) loginBtnEl.style.display = 'inline-block';
    if (logoutBtnEl) logoutBtnEl.style.display = 'none';
  }
}

(async () => {
  try {
    const user = await getCurrentUser();
    if (user) {
      const profile = await getUserProfile(user.id);
      updateAuthUI(user, profile);
      console.log('✅ Uživatel je přihlášen:', user.email);
    } else {
      console.log('ℹ️ Uživatel není přihlášen');
    }
  } catch (err) {
    console.error('❌ Auth startup error:', err);
  }
})();

window.sb = sb;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.updateProfile = updateProfile;

console.log('✅ Auth.js loaded');
