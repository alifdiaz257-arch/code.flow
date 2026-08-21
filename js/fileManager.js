/**
 * ============================================================
 * CodeFlow — File Manager (localStorage-backed)
 * ============================================================
 */
const FileManager = (() => {
  const KEY = 'files';

  function getAll(){
    return Utils.load(KEY, []);
  }

  function saveAll(files){
    Utils.store(KEY, files);
  }

  function getById(id){
    return getAll().find(f => f.id === id) || null;
  }

  function create(name = 'untitled.js', content = ''){
    const files = getAll();
    const file = {
      id: Utils.uid('file'),
      name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    files.unshift(file);
    saveAll(files);
    return file;
  }

  function update(id, patch){
    const files = getAll();
    const idx = files.findIndex(f => f.id === id);
    if (idx === -1) return null;
    files[idx] = { ...files[idx], ...patch, updatedAt: Date.now() };
    saveAll(files);
    return files[idx];
  }

  function remove(id){
    const files = getAll().filter(f => f.id !== id);
    saveAll(files);
  }

  function rename(id, newName){
    return update(id, { name: newName });
  }

  function downloadFile(file){
    const blob = new Blob([file.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  async function exportAllAsZipLike(){
    // Tanpa dependency zip eksternal: export sebagai satu file JSON
    // yang berisi seluruh berkas (mudah diimpor ulang), plus unduhan
    // per-file berurutan untuk kenyamanan.
    const files = getAll();
    if (files.length === 0){
      Utils.toast('warning', 'Tidak ada berkas untuk diexport.', 'Export');
      return;
    }
    const bundle = { exportedAt: Date.now(), files };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'codeflow-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function clearAll(){
    saveAll([]);
  }

  return { getAll, getById, create, update, remove, rename, downloadFile, exportAllAsZipLike, clearAll };
})();
