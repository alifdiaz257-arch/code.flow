/**
 * ============================================================
 * CodeFlow — Code Editor (CodeMirror)
 * ============================================================
 */
const Editor = (() => {
  let cm = null;
  let currentFileId = null;

  function init(){
    cm = CodeMirror.fromTextArea(document.getElementById('codeArea'), {
      lineNumbers: true,
      mode: 'javascript',
      theme: document.documentElement.dataset.theme === 'dark' ? 'material-darker' : 'default',
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      extraKeys: {
        'Ctrl-S': () => { saveCurrent(); return false; },
        'Cmd-S': () => { saveCurrent(); return false; },
        'Ctrl-Enter': () => { runCurrent(); return false; },
        'Cmd-Enter': () => { runCurrent(); return false; },
        'Ctrl-Z': () => cm.undo(),
        'Ctrl-Y': () => cm.redo(),
        'Shift-Ctrl-Z': () => cm.redo(),
        Tab: (instance) => {
          if (instance.somethingSelected()) instance.indentSelection('add');
          else instance.replaceSelection(' '.repeat(instance.getOption('indentUnit')), 'end');
        },
      },
    });

    document.getElementById('undoBtn').addEventListener('click', () => cm.undo());
    document.getElementById('redoBtn').addEventListener('click', () => cm.redo());
    document.getElementById('saveBtn').addEventListener('click', saveCurrent);
    document.getElementById('runBtn').addEventListener('click', runCurrent);
    document.getElementById('formatBtn').addEventListener('click', formatCurrent);
    document.getElementById('exportBtn').addEventListener('click', exportCurrent);
    document.getElementById('clearConsoleBtn').addEventListener('click', () => {
      document.getElementById('consoleOutput').textContent = '';
    });
    document.getElementById('newFileBtn').addEventListener('click', () => App.promptNewFile());
    document.getElementById('editorFileSelect').addEventListener('change', (e) => {
      loadFile(e.target.value);
    });
  }

  function refreshFileSelect(){
    const select = document.getElementById('editorFileSelect');
    const files = FileManager.getAll();
    select.innerHTML = files.map(f => `<option value="${f.id}">${Utils.escapeHtml(f.name)}</option>`).join('');
    if (files.length === 0){
      select.innerHTML = '<option value="">Belum ada berkas</option>';
      cm.setValue('// Buat berkas baru untuk mulai menulis kode\n');
      currentFileId = null;
      return;
    }
    if (currentFileId && files.some(f => f.id === currentFileId)){
      select.value = currentFileId;
    } else {
      loadFile(files[0].id);
    }
  }

  function loadFile(id){
    const file = FileManager.getById(id);
    if (!file) return;
    currentFileId = id;
    document.getElementById('editorFileSelect').value = id;
    cm.setValue(file.content || '');
    cm.setOption('mode', Utils.extToMode(file.name));
  }

  function saveCurrent(){
    if (!currentFileId){
      Utils.toast('warning', 'Tidak ada berkas aktif. Buat berkas baru terlebih dahulu.', 'Simpan');
      return;
    }
    FileManager.update(currentFileId, { content: cm.getValue() });
    Utils.toast('success', 'Berkas berhasil disimpan.', 'Tersimpan');
    App.refreshDashboard();
  }

  function runCurrent(){
    const out = document.getElementById('consoleOutput');
    const code = cm.getValue();
    const file = FileManager.getById(currentFileId);
    const isJs = !file || Utils.extToMode(file.name) === 'javascript';

    if (!isJs){
      out.textContent += `\n[i] Pratinjau langsung hanya tersedia untuk JavaScript. Berkas ini bertipe lain.`;
      return;
    }

    const logs = [];
    const sandboxConsole = {
      log: (...args) => logs.push(args.map(stringifyArg).join(' ')),
      error: (...args) => logs.push('[error] ' + args.map(stringifyArg).join(' ')),
      warn: (...args) => logs.push('[warn] ' + args.map(stringifyArg).join(' ')),
    };

    try{
      // eslint-disable-next-line no-new-func
      const fn = new Function('console', code);
      fn(sandboxConsole);
      out.textContent += `\n▶ Dijalankan pada ${new Date().toLocaleTimeString('id-ID')}\n` + (logs.join('\n') || '(tidak ada output console.log)');
    }catch(err){
      out.textContent += `\n▶ Error: ${err.message}`;
    }
    out.scrollTop = out.scrollHeight;
  }

  function stringifyArg(a){
    if (typeof a === 'object') { try{ return JSON.stringify(a); }catch(e){ return String(a); } }
    return String(a);
  }

  function formatCurrent(){
    // Format sederhana: rapikan indentasi baris berdasarkan tanda kurung
    const lines = cm.getValue().split('\n');
    let indent = 0;
    const unit = cm.getOption('indentUnit');
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (/^[}\])]/.test(trimmed)) indent = Math.max(0, indent - 1);
      const result = ' '.repeat(indent * unit) + trimmed;
      if (/[{(\[]\s*$/.test(trimmed)) indent += 1;
      return result;
    });
    cm.setValue(formatted.join('\n'));
    Utils.toast('info', 'Kode telah dirapikan.', 'Format');
  }

  function exportCurrent(){
    const file = FileManager.getById(currentFileId);
    if (!file){ Utils.toast('warning', 'Tidak ada berkas aktif.', 'Export'); return; }
    FileManager.update(currentFileId, { content: cm.getValue() });
    FileManager.downloadFile(FileManager.getById(currentFileId));
    Utils.toast('success', `${file.name} berhasil diunduh.`, 'Export');
  }

  function setTheme(dark){
    if (cm) cm.setOption('theme', dark ? 'material-darker' : 'default');
  }

  function applyFontSize(px){
    document.querySelectorAll('.CodeMirror').forEach(el => el.style.fontSize = px + 'px');
    if (cm) cm.refresh();
  }

  function applyTabSize(n){
    if (cm){ cm.setOption('tabSize', n); cm.setOption('indentUnit', n); }
  }

  function applyWordWrap(on){
    if (cm) cm.setOption('lineWrapping', on);
  }

  function getCurrentFile(){ return FileManager.getById(currentFileId); }
  function getCM(){ return cm; }

  return {
    init, refreshFileSelect, loadFile, saveCurrent, runCurrent,
    setTheme, applyFontSize, applyTabSize, applyWordWrap, getCurrentFile, getCM,
  };
})();
