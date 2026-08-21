/**
 * ============================================================
 * CodeFlow — Konfigurasi
 * ============================================================
 * Isi nilai-nilai di bawah ini sebelum deploy.
 * JANGAN PERNAH menaruh Client Secret / Cloudflare Secret Key
 * di file ini — file ini berjalan di browser pengguna dan
 * semua isinya bisa dibaca siapa saja. Secret hanya boleh
 * hidup di Cloudflare Worker (lihat cloudflare/worker.js).
 * ============================================================
 */
const CONFIG = {
  // Dari GitHub OAuth App (Settings → Developer settings → OAuth Apps)
  GITHUB_CLIENT_ID: "Ov23liuWHwba08Mw5QjH",

  // URL tempat GitHub akan mengarahkan pengguna kembali setelah login.
  // Harus SAMA PERSIS dengan "Authorization callback URL" di GitHub OAuth App.
  GITHUB_REDIRECT_URI: window.location.origin + window.location.pathname,

  // Dari dashboard Cloudflare → Turnstile → Site Key (kunci publik, aman di frontend)
  CLOUDFLARE_TURNSTILE_SITE_KEY: "0x4AAAAAAEWjPTyUhhf08lGQ",

  // URL worker Cloudflare kamu setelah deploy (lihat cloudflare/worker.js)
  // Contoh: "https://codeflow-worker.username.workers.dev"
  WORKER_BASE_URL: "https://your-worker-subdomain.workers.dev",

  // Prefix localStorage supaya tidak bentrok dengan aplikasi lain
  STORAGE_PREFIX: "codeflow_",
};
