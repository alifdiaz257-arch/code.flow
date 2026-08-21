/**
 * ============================================================
 * CodeFlow — Main Application
 * ============================================================
 */
const App = (() => {

  let pendingView = null; // view yang ingin dibuka setelah login berhasil

  // ---------------- Theme ----------------
  function initTheme(){
    const saved = Utils.load('theme', 'light');
    setTheme(saved);
  }

  function setTheme(mode){
    document.documentElement.dataset.theme = mode;
    Utils.store('theme', mode);
    const sun = document.getElementById('iconSun');
    const moon = document.getElementById('iconMoon');
    sun.style.display = mode === 'dark' ? 'none' : 'block';
    moon.style.display = mode === 'dark' ? 'block' : 'none';
    Editor.setTheme(mode === 'dark');
  }

  function toggleTheme(){
    const current = document.documentElement.dataset.theme;
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // ---------------- View Routing ----------------
  function goToView(name){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${name}`)?.classList.add('active');
    document.querySelectorAll('.nav-item, .side-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === name);
    });
    if (name === 'dashboard') refreshDashboard();
    if (name === 'files') refreshFilesView();
    if (name === 'editor') Editor.refreshFileSelect();
    if (name === 'github') refreshGithubView();
    if (name === 'settings') refreshSettingsView();
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNavClick(el){
    const view = el.dataset.view;
    const guarded = el.dataset.guarded === '1';
    if (guarded && !Auth.isLoggedIn()){
      pendingView = view;
      openLogin();
      return;
    }
    if (guarded && Auth.isGuest() && ['github','settings'].includes(view) === false){
      // Guest boleh akses semua view utama; batas guest diterapkan per-aksi (lihat guardAction)
    }
    goToView(view);
  }

  // ---------------- Guest-mode action guard ----------------
  function guardAction(actionAllowedForGuest = true){
    if (Auth.isGuest() && !actionAllowedForGuest){
      openGuestLimit();
      return false;
    }
    return true;
  }

  function openGuestLimit(){
    document.getElementById('guestLimitOverlay').classList.add('show');
  }
  function closeGuestLimit(){
    document.getElementById('guestLimitOverlay').classList.remove('show');
  }

  // ---------------- Login flow ----------------
  function openLogin(){
    const overlay = document.getElementById('loginOverlay');
    document.getElementById('turnstileStage').style.display = 'block';
    document.getElementById('loginOptionsStage').style.display = 'none';
    overlay.classList.add('show');
    CloudflareAuth.render();
    CloudflareAuth.onVerified(() => {
      document.getElementById('turnstileStage').style.display = 'none';
      document.getElementById('loginOptionsStage').style.display = 'block';
    });
  }

  function closeLogin(){
    document.getElementById('loginOverlay').classList.remove('show');
    CloudflareAuth.reset();
  }

  function onLoginSuccess(){
    closeLogin();
    updateAuthUI();
    const target = pendingView || 'dashboard';
    pendingView = null;
    goToView(target);
  }

  function updateAuthUI(){
    const session = Auth.getSession();
    const userBox = document.getElementById('userBox');
    const loginTrigger = document.getElementById('loginTrigger');
    if (session){
      userBox.style.display = 'flex';
      loginTrigger.style.display = 'none';
      document.getElementById('userAvatar').src = session.avatar || '';
      document.getElementById('userName').textContent = session.name || 'Pengguna';
    } else {
      userBox.style.display = 'none';
      loginTrigger.style.display = 'inline-flex';
    }
  }

  function logout(){
    Popup.confirmDialog('Anda akan keluar dari akun ini. Lanjutkan?', {
      title: 'Keluar Akun',
      onConfirm: () => {
        Auth.logout();
        updateAuthUI();
        goToView('welcome');
        Utils.toast('info', 'Anda telah keluar.', 'Sampai jumpa');
      }
    });
  }

  // ---------------- Dashboard ----------------
  function refreshDashboard(){
    const files = FileManager.getAll();
    const session = Auth.getSession();
    document.getElementById('statFiles').textContent = files.length;
    document.getElementById('statUser').textContent = session ? session.name : '—';
    document.getElementById('statStatus').textContent = session ? labelForProvider(session.provider) : 'Belum masuk';

    const repos = Utils.load('gh_repo_count', 0);
    document.getElementById('statRepos').textContent = repos;

    const recent = document.getElementById('recentFiles');
    if (files.length === 0){
      recent.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">Belum ada berkas. Buka Editor untuk mulai menulis kode.</p>';
    } else {
      recent.innerHTML = files.slice(0, 6).map(f => `
        <div class="recent-row"><span>${Utils.escapeHtml(f.name)}</span><span style="color:var(--text-faint)">${Utils.formatDate(f.updatedAt)}</span></div>
      `).join('');
    }
  }

  function labelForProvider(p){
    return { github: 'GitHub', 'google-demo': 'Google (Demo)', guest: 'Guest' }[p] || p;
  }

  // ---------------- Files view ----------------
  function refreshFilesView(){
    const table = document.getElementById('fileTable');
    const files = FileManager.getAll();
    if (files.length === 0){
      table.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">Belum ada berkas tersimpan.</p>';
      return;
    }
    table.innerHTML = files.map(f => `
      <div class="file-row" data-id="${f.id}">
        <span class="fname">${Utils.escapeHtml(f.name)}</span>
        <span class="fmeta">${Utils.formatDate(f.updatedAt)}</span>
        <div class="factions">
          <button class="btn-ghost tiny" data-action="open">Buka</button>
          <button class="btn-ghost tiny" data-action="rename">Ganti Nama</button>
          <button class="btn-ghost tiny" data-action="download">Unduh</button>
          <button class="btn-ghost tiny danger" data-action="delete">Hapus</button>
        </div>
      </div>
    `).join('');

    table.querySelectorAll('.file-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-action="open"]').addEventListener('click', () => {
        Editor.loadFile(id);
        goToView('editor');
      });
      row.querySelector('[data-action="rename"]').addEventListener('click', () => promptRename(id));
      row.querySelector('[data-action="download"]').addEventListener('click', () => {
        FileManager.downloadFile(FileManager.getById(id));
        Utils.toast('success', 'Berkas diunduh.', 'Unduh');
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        Popup.confirmDialog(`Hapus berkas "${FileManager.getById(id).name}" secara permanen?`, {
          title: 'Hapus Berkas',
          onConfirm: () => {
            FileManager.remove(id);
            refreshFilesView();
            refreshDashboard();
            Editor.refreshFileSelect();
            Utils.toast('success', 'Berkas telah dihapus.', 'Terhapus');
          }
        });
      });
    });
  }

  function promptNewFile(){
    const name = window.prompt('Nama berkas baru (contoh: app.js):', 'untitled.js');
    if (!name) return;
    const file = FileManager.create(name.trim(), '');
    Utils.toast('success', `Berkas "${file.name}" dibuat.`, 'Berkas Baru');
    Editor.refreshFileSelect();
    Editor.loadFile(file.id);
    refreshDashboard();
  }

  function promptRename(id){
    const file = FileManager.getById(id);
    const name = window.prompt('Nama baru:', file.name);
    if (!name) return;
    FileManager.rename(id, name.trim());
    refreshFilesView();
    Editor.refreshFileSelect();
    Utils.toast('success', 'Nama berkas diperbarui.', 'Berhasil');
  }

  // ---------------- GitHub view ----------------
  async function refreshGithubView(){
    const session = Auth.getSession();
    const connected = session && session.provider === 'github';
    document.getElementById('ghNotConnected').style.display = connected ? 'none' : 'block';
    document.getElementById('ghConnected').style.display = connected ? 'block' : 'none';
    if (!connected) return;

    document.getElementById('ghAvatar').src = session.avatar;
    document.getElementById('ghLogin').textContent = `@${session.login}`;

    const list = document.getElementById('ghRepoList');
    list.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">Memuat repositori…</p>';
    try{
      const repos = await GitHubApi.listRepos();
      Utils.store('gh_repo_count', repos.length);
      if (repos.length === 0){
        list.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">Belum ada repositori.</p>';
        return;
      }
      list.innerHTML = repos.map(r => `
        <div class="repo-row" data-full="${r.full_name}">
          <div><div class="rname">${Utils.escapeHtml(r.name)}</div><div class="rmeta">${r.private ? 'Privat' : 'Publik'} · diperbarui ${Utils.formatDate(new Date(r.updated_at).getTime())}</div></div>
          <div class="btn-row">
            <button class="btn-ghost tiny" data-action="push">Push Berkas Aktif</button>
            <a class="btn-ghost tiny" href="${r.html_url}" target="_blank" rel="noopener">Buka</a>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('[data-action="push"]').forEach(btn => {
        btn.addEventListener('click', () => pushCurrentFileTo(btn.closest('.repo-row').dataset.full));
      });
    }catch(err){
      list.innerHTML = `<p style="color:var(--error);font-size:13px;">${Utils.escapeHtml(err.message)}</p>`;
    }
  }

  async function pushCurrentFileTo(fullName){
    const file = Editor.getCurrentFile();
    if (!file){
      Utils.toast('warning', 'Tidak ada berkas aktif di Editor untuk di-push.', 'Push Gagal');
      return;
    }
    const [owner, repo] = fullName.split('/');
    try{
      await GitHubApi.pushFile(owner, repo, file.name, Editor.getCM().getValue(), `Update ${file.name} via CodeFlow`);
      Utils.toast('success', `${file.name} berhasil di-push ke ${fullName}.`, 'Push Berhasil');
    }catch(err){
      Utils.toast('error', err.message, 'Push Gagal');
    }
  }

  function promptNewRepo(){
    const name = window.prompt('Nama repositori baru:');
    if (!name) return;
    GitHubApi.createRepo(name.trim())
      .then(() => { Utils.toast('success', `Repositori "${name}" dibuat.`, 'Berhasil'); refreshGithubView(); })
      .catch(err => Utils.toast('error', err.message, 'Gagal Membuat Repo'));
  }

  // ---------------- Settings view ----------------
  function refreshSettingsView(){
    const session = Auth.getSession();
    document.getElementById('setAccName').textContent = session ? session.name : '—';
    document.getElementById('setAccMethod').textContent = session ? labelForProvider(session.provider) : '—';

    const fontSize = Utils.load('setting_fontSize', 14);
    const tabSize = Utils.load('setting_tabSize', 2);
    const wordWrap = Utils.load('setting_wordWrap', false);

    document.getElementById('setFontSize').value = fontSize;
    document.getElementById('setFontSizeVal').textContent = fontSize + 'px';
    document.getElementById('setTabSize').value = tabSize;
    document.getElementById('setWordWrap').checked = wordWrap;

    document.getElementById('setStorageInfo').textContent = Utils.storageUsage();
  }

  function initSettingsHandlers(){
    document.getElementById('setFontSize').addEventListener('input', (e) => {
      const val = e.target.value;
      document.getElementById('setFontSizeVal').textContent = val + 'px';
      Utils.store('setting_fontSize', Number(val));
      Editor.applyFontSize(val);
    });
    document.getElementById('setTabSize').addEventListener('change', (e) => {
      Utils.store('setting_tabSize', Number(e.target.value));
      Editor.applyTabSize(Number(e.target.value));
    });
    document.getElementById('setWordWrap').addEventListener('change', (e) => {
      Utils.store('setting_wordWrap', e.target.checked);
      Editor.applyWordWrap(e.target.checked);
    });
    document.querySelectorAll('[data-test-toast]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.testToast;
        const msgs = {
          success: 'Ini contoh notifikasi sukses.',
          error: 'Ini contoh notifikasi error.',
          info: 'Ini contoh notifikasi info.',
          warning: 'Ini contoh notifikasi peringatan.',
        };
        Utils.toast(type, msgs[type]);
      });
    });
    document.getElementById('setClearDataBtn').addEventListener('click', () => {
      Popup.confirmDialog('Seluruh berkas, sesi, dan pengaturan akan dihapus permanen dari perangkat ini. Lanjutkan?', {
        title: 'Hapus Seluruh Data',
        onConfirm: () => {
          Utils.clearAllAppData();
          Utils.toast('success', 'Seluruh data telah dihapus.', 'Selesai');
          setTimeout(() => window.location.reload(), 900);
        }
      });
    });
  }

  // ---------------- Wiring ----------------
  function bindGlobalEvents(){
    // Navigation (topbar + sidebar)
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => handleNavClick(el));
    });

    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('themeToggleSidebar').addEventListener('click', toggleTheme);

    document.getElementById('loginTrigger').addEventListener('click', () => { pendingView = null; openLogin(); });
    document.getElementById('heroLoginBtn').addEventListener('click', () => { pendingView = 'dashboard'; openLogin(); });
    document.getElementById('loginCloseBtn').addEventListener('click', closeLogin);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('loginGithubBtn').addEventListener('click', () => {
      closeLogin();
      Auth.startGithubLogin();
    });
    document.getElementById('loginGoogleBtn').addEventListener('click', () => {
      Auth.loginGoogleDemo();
      onLoginSuccess();
    });
    document.getElementById('loginGuestBtn').addEventListener('click', () => {
      Auth.loginGuest();
      onLoginSuccess();
    });

    document.getElementById('guestCloseBtn').addEventListener('click', closeGuestLimit);
    document.getElementById('guestOkBtn').addEventListener('click', closeGuestLimit);
    document.getElementById('guestLimitOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'guestLimitOverlay') closeGuestLimit();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){
        closeLogin();
        closeGuestLimit();
      }
    });

    // Files view toolbar
    document.getElementById('fmNewBtn').addEventListener('click', promptNewFile);
    document.getElementById('fmExportAllBtn').addEventListener('click', () => FileManager.exportAllAsZipLike());
    document.getElementById('fmClearAllBtn').addEventListener('click', () => {
      Popup.confirmDialog('Seluruh berkas akan dihapus permanen. Lanjutkan?', {
        title: 'Hapus Semua Berkas',
        onConfirm: () => {
          FileManager.clearAll();
          refreshFilesView();
          refreshDashboard();
          Editor.refreshFileSelect();
          Utils.toast('success', 'Semua berkas telah dihapus.', 'Selesai');
        }
      });
    });

    // GitHub view
    document.getElementById('ghConnectBtn').addEventListener('click', () => { pendingView = 'github'; openLogin(); });
    document.getElementById('ghDisconnectBtn').addEventListener('click', () => {
      Popup.confirmDialog('Putuskan koneksi akun GitHub dari CodeFlow?', {
        title: 'Putuskan Koneksi',
        onConfirm: () => { Auth.logout(); updateAuthUI(); goToView('welcome'); }
      });
    });
    document.getElementById('ghNewRepoBtn').addEventListener('click', () => {
      if (!guardAction(false)) return;
      promptNewRepo();
    });

    initSettingsHandlers();
  }

  // ---------------- Init ----------------
  async function init(){
    initTheme();
    Editor.init();
    bindGlobalEvents();

    const cameFromGithub = await Auth.handleGithubCallback();
    updateAuthUI();
    refreshDashboard();

    if (cameFromGithub){
      goToView('github');
    } else {
      goToView('welcome');
    }
  }

  return { init, promptNewFile, refreshDashboard, goToView };
})();

document.addEventListener('DOMContentLoaded', App.init);
