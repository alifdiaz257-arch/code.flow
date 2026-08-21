# CodeFlow — Editor Kode Profesional

Editor kode berbasis browser dengan tema Blue/White + Dark mode, manajer berkas lokal,
integrasi GitHub (OAuth asli), dan login yang dilindungi Cloudflare Turnstile (asli, bukan simulasi).

## Struktur Proyek

```
index.html
css/style.css
js/config.js        ← isi kredensial di sini
js/utils.js
js/popup.js
js/cloudflare.js
js/auth.js
js/github.js
js/editor.js
js/fileManager.js
js/app.js
cloudflare/worker.js     ← deploy terpisah ke Cloudflare Workers
cloudflare/wrangler.toml
_redirects
```

Frontend (index.html + css/ + js/) dideploy ke GitHub Pages, Vercel, atau Netlify.
`cloudflare/worker.js` dideploy **terpisah** ke Cloudflare Workers — ini yang menyimpan
secret dan melakukan verifikasi Turnstile + pertukaran token GitHub OAuth dengan aman.

## Mengapa perlu Worker terpisah?

Verifikasi Turnstile dan pertukaran kode OAuth GitHub **wajib** menggunakan Secret Key /
Client Secret. Secret tidak boleh pernah dikirim ke browser — siapa pun bisa membaca kode
JavaScript frontend. Karena itu langkah ini dipindahkan ke Cloudflare Worker, yang berjalan
di server dan menyimpan secret secara aman.

## 1. Setup Cloudflare Turnstile

1. Buka dashboard Cloudflare → **Turnstile** → **Add Site**.
2. Daftarkan domain tempat frontend akan dideploy.
3. Salin **Site Key** → tempel ke `js/config.js` (`CLOUDFLARE_TURNSTILE_SITE_KEY`).
4. Salin **Secret Key** → simpan untuk langkah Worker di bawah (jangan taruh di frontend).

## 2. Setup GitHub OAuth App

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL**: URL frontend Anda (mis. `https://username.github.io/codeflow`).
3. **Authorization callback URL**: harus sama persis dengan URL frontend Anda
   (karena redirect kembali ke halaman yang sama).
4. Salin **Client ID** → tempel ke `js/config.js` (`GITHUB_CLIENT_ID`) dan ke
   `cloudflare/wrangler.toml` (`GITHUB_CLIENT_ID`).
5. Generate **Client Secret** → simpan untuk langkah Worker di bawah.

## 3. Deploy Cloudflare Worker

Membutuhkan [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/).

```bash
cd cloudflare
npm install -g wrangler      # jika belum ada
wrangler login

# isi GITHUB_CLIENT_ID dan ALLOWED_ORIGIN di wrangler.toml terlebih dahulu

wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put GITHUB_CLIENT_SECRET

wrangler deploy
```

Setelah deploy, Wrangler menampilkan URL Worker Anda, contoh:
`https://codeflow-worker.username.workers.dev`.
Tempel URL ini ke `js/config.js` (`WORKER_BASE_URL`).

## 4. Isi `js/config.js`

```js
const CONFIG = {
  GITHUB_CLIENT_ID: "...",                       // dari langkah 2
  GITHUB_REDIRECT_URI: window.location.origin + window.location.pathname,
  CLOUDFLARE_TURNSTILE_SITE_KEY: "...",           // dari langkah 1
  WORKER_BASE_URL: "https://....workers.dev",     // dari langkah 3
  STORAGE_PREFIX: "codeflow_",
};
```

## 5. Deploy Frontend

**GitHub Pages**: push folder ini ke sebuah repo, aktifkan Pages dari branch `main`.

**Vercel / Netlify**: import repo, tidak perlu build command (situs statis).
`_redirects` sudah disertakan untuk Netlify.

## Catatan Keamanan

- `js/config.js` hanya boleh berisi kunci **publik** (Client ID, Site Key, URL Worker).
- Secret (`TURNSTILE_SECRET_KEY`, `GITHUB_CLIENT_SECRET`) hanya hidup di Cloudflare Worker,
  disetel lewat `wrangler secret put`, tidak pernah muncul di kode frontend atau di Git.
- Login "Google" pada aplikasi ini adalah **mode demo** (sesuai permintaan) — tidak melakukan
  OAuth Google sungguhan. Login GitHub adalah OAuth asli.
- Semua data berkas pengguna disimpan di `localStorage` browser masing-masing pengguna,
  bukan di server.
