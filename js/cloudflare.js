/**
 * ============================================================
 * CodeFlow — Cloudflare Turnstile (REAL, bukan simulasi)
 * ============================================================
 * Widget nyata dimuat dari challenges.cloudflare.com/turnstile/v0/api.js
 * (lihat index.html). Token yang dihasilkan Turnstile diverifikasi
 * ke Cloudflare Worker (cloudflare/worker.js → endpoint /api/verify),
 * yang di server memanggil siteverify Cloudflare menggunakan Secret Key.
 * Secret Key TIDAK PERNAH ada di kode frontend ini.
 * ============================================================
 */
const CloudflareAuth = (() => {
  let widgetId = null;
  let verifiedToken = null;
  let onVerifiedCallback = null;

  const steps = () => document.querySelectorAll('#verifySteps .v-step');
  const fill = () => document.getElementById('verifyProgressFill');

  function setStep(n, state){ // state: 'active' | 'done'
    steps().forEach(s => {
      const step = parseInt(s.dataset.step, 10);
      if (step < n) { s.classList.add('done'); s.classList.remove('active'); }
      else if (step === n){ s.classList.toggle('active', state === 'active'); s.classList.toggle('done', state === 'done'); }
      else { s.classList.remove('active','done'); }
    });
    fill().style.width = `${(n / 5) * 100}%`;
  }

  function resetProgress(){
    steps().forEach(s => s.classList.remove('active','done'));
    fill().style.width = '0%';
  }

  function render(){
    resetProgress();
    verifiedToken = null;
    const container = document.getElementById('turnstileWidget');
    container.innerHTML = '';
    setStep(1, 'active');

    if (typeof turnstile === 'undefined'){
      // api.js belum siap (jaringan lambat) — coba lagi sebentar
      setTimeout(render, 400);
      return;
    }

    widgetId = turnstile.render('#turnstileWidget', {
      sitekey: CONFIG.CLOUDFLARE_TURNSTILE_SITE_KEY,
      theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      callback: (token) => handleToken(token),
      'error-callback': () => {
        Utils.toast('error', 'Verifikasi Turnstile gagal dimuat. Periksa Site Key Anda.', 'Cloudflare');
      },
      'expired-callback': () => {
        verifiedToken = null;
        resetProgress();
        setStep(1, 'active');
      },
    });

    setStep(2, 'active');
  }

  async function handleToken(token){
    setStep(3, 'active');
    await sleep(350);
    setStep(4, 'active');

    try{
      const res = await fetch(`${CONFIG.WORKER_BASE_URL}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (data && data.success){
        setStep(5, 'done');
        verifiedToken = token;
        await sleep(300);
        if (onVerifiedCallback) onVerifiedCallback(token);
      } else {
        throw new Error(data?.message || 'Verifikasi ditolak server');
      }
    }catch(err){
      // Jika worker belum dikonfigurasi/di-deploy, beri tahu dengan jelas
      // alih-alih diam-diam lolos — ini bukan mode demo.
      console.error('Turnstile verify error:', err);
      Utils.toast('error', 'Tidak dapat memverifikasi ke Cloudflare Worker. Pastikan WORKER_BASE_URL sudah dikonfigurasi di js/config.js dan worker sudah di-deploy.', 'Verifikasi Gagal');
      resetProgress();
      setStep(1, 'active');
      if (widgetId !== null && typeof turnstile !== 'undefined') turnstile.reset(widgetId);
    }
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function onVerified(cb){ onVerifiedCallback = cb; }

  function reset(){
    if (widgetId !== null && typeof turnstile !== 'undefined'){
      try{ turnstile.reset(widgetId); }catch(e){}
    }
    resetProgress();
  }

  return { render, onVerified, reset };
})();
