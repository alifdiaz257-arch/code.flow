/**
 * ============================================================
 * CodeFlow — GitHub API integration
 * ============================================================
 */
const GitHubApi = (() => {
  const API = 'https://api.github.com';

  function token(){ return Utils.load('github_token', null); }

  function headers(){
    return {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  }

  async function listRepos(){
    const res = await fetch(`${API}/user/repos?sort=updated&per_page=50`, { headers: headers() });
    if (!res.ok) throw new Error('Gagal memuat repositori');
    return res.json();
  }

  async function createRepo(name, description = '', isPrivate = false){
    const res = await fetch(`${API}/user/repos`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal membuat repositori');
    return data;
  }

  function toBase64Unicode(str){
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function pushFile(owner, repo, path, content, message = 'Update via CodeFlow'){
    // Cek apakah file sudah ada, untuk mendapatkan sha (diperlukan saat update)
    let sha;
    try{
      const existing = await fetch(`${API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, { headers: headers() });
      if (existing.ok){
        const info = await existing.json();
        sha = info.sha;
      }
    }catch(e){ /* file belum ada, lanjut buat baru */ }

    const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        message,
        content: toBase64Unicode(content),
        sha,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal push berkas');
    return data;
  }

  return { listRepos, createRepo, pushFile };
})();
