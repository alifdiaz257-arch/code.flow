/**
 * ============================================================
 * CodeFlow — Utilities
 * ============================================================
 */
const Utils = (() => {

  function key(name){ return CONFIG.STORAGE_PREFIX + name; }

  function store(name, value){
    try{
      localStorage.setItem(key(name), JSON.stringify(value));
      return true;
    }catch(e){
      console.error("Storage error:", e);
      return false;
    }
  }

  function load(name, fallback = null){
    try{
      const raw = localStorage.getItem(key(name));
      return raw === null ? fallback : JSON.parse(raw);
    }catch(e){
      console.error("Load error:", e);
      return fallback;
    }
  }

  function remove(name){
    localStorage.removeItem(key(name));
  }

  function clearAllAppData(){
    Object.keys(localStorage)
      .filter(k => k.startsWith(CONFIG.STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  function uid(prefix = "id"){
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatDate(ts){
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function bytesToSize(bytes){
    if (bytes === 0) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + " KB";
    return (kb / 1024).toFixed(2) + " MB";
  }

  function storageUsage(){
    let total = 0;
    Object.keys(localStorage)
      .filter(k => k.startsWith(CONFIG.STORAGE_PREFIX))
      .forEach(k => { total += (localStorage.getItem(k) || "").length; });
    return bytesToSize(total);
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  function debounce(fn, wait = 300){
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function extToMode(filename){
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = {
      js:'javascript', jsx:'javascript', ts:'javascript', json:'javascript',
      html:'htmlmixed', htm:'htmlmixed',
      css:'css',
      py:'python',
      md:'null', txt:'null'
    };
    return map[ext] || 'null';
  }

  // ---------------- Toast queue system (one at a time) ----------------
  const toastQueue = [];
  let toastActive = false;

  const ICONS = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#16a34a"/><path d="M7.5 12.5l3 3 6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#dc2626"/><path d="M9 9l6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2563eb"/><path d="M12 11v5.5M12 8v.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ea580c"/><path d="M12 7.5v5.5M12 16.2v.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  const TITLES = { success:'Berhasil', error:'Terjadi Kesalahan', info:'Informasi', warning:'Peringatan' };

  function toast(type, message, title){
    toastQueue.push({ type, message, title: title || TITLES[type] || '' });
    processToastQueue();
  }

  function processToastQueue(){
    if (toastActive || toastQueue.length === 0) return;
    toastActive = true;
    const { type, message, title } = toastQueue.shift();
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-top">${ICONS[type] || ICONS.info}<span class="toast-title">${escapeHtml(title)}</span></div>
      <div class="toast-msg">${escapeHtml(message)}</div>
      <div class="toast-bar"><div class="toast-bar-fill"></div></div>
    `;
    container.appendChild(el);

    const dismiss = () => {
      el.classList.add('leaving');
      setTimeout(() => {
        el.remove();
        toastActive = false;
        processToastQueue();
      }, 300);
    };
    setTimeout(dismiss, 3000);
  }

  return {
    store, load, remove, clearAllAppData, uid, formatDate, bytesToSize,
    storageUsage, escapeHtml, debounce, extToMode, toast
  };
})();
