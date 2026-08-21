/**
 * ============================================================
 * CodeFlow — Auth handlers (GitHub real OAuth, Google demo, Guest)
 * ============================================================
 * GitHub: alur Authorization Code standar. Browser diarahkan ke
 * github.com/login/oauth/authorize, lalu GitHub mengarahkan balik
 * dengan ?code=... Kode itu ditukar dengan access token melalui
 * Cloudflare Worker (/api/github/exchange) karena penukaran kode
 * WAJIB menyertakan Client Secret — dan secret tidak boleh berada
 * di browser. Ini yang membuat implementasi ini nyata, bukan demo.
 * ============================================================
 */
const Auth = (() => {
  const SESSION_KEY = 'session';

  function getSession(){
    return Utils.load(SESSION_KEY, null);
  }

  function isLoggedIn(){
    return !!getSession();
  }

  function isGuest(){
    const s = getSession();
    return !!s && s.provider === 'guest';
  }

  function setSession(session){
    Utils.store(SESSION_KEY, session);
  }

  function logout(){
    Utils.remove(SESSION_KEY);
    Utils.remove('github_token');
    Utils.remove('github_profile');
  }

  // ---------------- GitHub (real OAuth) ----------------
  function startGithubLogin(){
    if (!CONFIG.GITHUB_CLIENT_ID || CONFIG.GITHUB_CLIENT_ID.startsWith('YOUR_')){
      Utils.toast('error', 'GITHUB_CLIENT_ID belum diisi di js/config.js.', 'Konfigurasi Kurang');
      return;
    }
    const state = Utils.uid('state');
    sessionStorage.setItem('oauth_state', state);
    const params = new URLSearchParams({
      client_id: CONFIG.GITHUB_CLIENT_ID,
      redirect_uri: CONFIG.GITHUB_REDIRECT_URI,
      scope: 'repo read:user',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async function handleGithubCallback(){
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code) return false;

    // Bersihkan query string agar tidak diproses ulang
    window.history.replaceState({}, document.title, window.location.pathname);

    const expectedState = sessionStorage.getItem('oauth_state');
    if (state && expectedState && state !== expectedState){
      Utils.toast('error', 'State OAuth tidak cocok. Silakan coba login lagi.', 'Keamanan');
      return false;
    }

    try{
      const res = await fetch(`${CONFIG.WORKER_BASE_URL}/api/github/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: CONFIG.GITHUB_REDIRECT_URI }),
      });
      const data = await res.json();
      if (!data.access_token) throw new Error(data.message || 'Token tidak diterima');

      Utils.store('github_token', data.access_token);

      const profileRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const profile = await profileRes.json();
      Utils.store('github_profile', profile);

      setSession({
        provider: 'github',
        name: profile.name || profile.login,
        avatar: profile.avatar_url,
        login: profile.login,
      });

      Utils.toast('success', `Selamat datang, ${profile.login}!`, 'Login Berhasil');
      return true;
    }catch(err){
      console.error(err);
      Utils.toast('error', 'Gagal menukar kode OAuth. Pastikan Worker sudah dikonfigurasi dan di-deploy.', 'Login GitHub Gagal');
      return false;
    }
  }

  // ---------------- Google (demo) ----------------
  function loginGoogleDemo(){
    const demoProfile = {
      name: 'Pengguna Demo',
      email: 'demo.user@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Demo&backgroundColor=2563eb',
    };
    setSession({ provider: 'google-demo', name: demoProfile.name, avatar: demoProfile.avatar });
    Utils.toast('info', 'Anda masuk dengan akun Google demo (bukan OAuth asli).', 'Mode Demo');
  }

  // ---------------- Guest ----------------
  function loginGuest(){
    setSession({
      provider: 'guest',
      name: 'Guest',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Guest&backgroundColor=64748b',
    });
    Utils.toast('info', 'Anda masuk sebagai Guest. Beberapa fitur terbatas.', 'Mode Guest');
  }

  return {
    getSession, isLoggedIn, isGuest, setSession, logout,
    startGithubLogin, handleGithubCallback, loginGoogleDemo, loginGuest,
  };
})();
