/**
 * ============================================================
 * CodeFlow — Custom Popup (menggantikan alert/confirm bawaan)
 * Jenis: question, warning, error, success
 * ============================================================
 */
const Popup = (() => {
  const overlay = () => document.getElementById('customPopupOverlay');
  const iconEl = () => document.getElementById('popupIcon');
  const titleEl = () => document.getElementById('popupTitle');
  const msgEl = () => document.getElementById('popupMessage');
  const actionsEl = () => document.getElementById('popupActions');

  const ICON_SVG = {
    question: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#2563eb" stroke-width="1.8"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.6 2.25c-.7.36-1.1.9-1.1 1.55v.5" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="#2563eb"/></svg>',
    warning:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3l9.5 17H2.5L12 3Z" stroke="#ea580c" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.2M12 17v.01" stroke="#ea580c" stroke-width="1.8" stroke-linecap="round"/></svg>',
    error:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="1.8"/><path d="M9 9l6 6M15 9l-6 6" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/></svg>',
    success:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#16a34a" stroke-width="1.8"/><path d="M7.5 12.5l3 3 6-6" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const ICON_BG = { question:'rgba(37,99,235,.12)', warning:'rgba(234,88,12,.12)', error:'rgba(220,38,38,.12)', success:'rgba(22,163,74,.12)' };

  let escHandler = null;

  function close(){
    overlay().classList.remove('show');
    if (escHandler){ document.removeEventListener('keydown', escHandler); escHandler = null; }
  }

  /**
   * show({ type, title, message, buttons:[{label, primary, onClick}] })
   */
  function show({ type = 'question', title = '', message = '', buttons = [] }){
    iconEl().innerHTML = ICON_SVG[type] || ICON_SVG.question;
    iconEl().style.background = ICON_BG[type] || ICON_BG.question;
    titleEl().textContent = title;
    msgEl().textContent = message;

    actionsEl().innerHTML = '';
    if (buttons.length === 0){
      buttons = [{ label: 'OK', primary: true, onClick: close }];
    }
    buttons.forEach(btn => {
      const b = document.createElement('button');
      b.className = btn.primary ? 'btn-primary small' : 'btn-ghost small';
      b.textContent = btn.label;
      b.addEventListener('click', () => {
        close();
        if (btn.onClick) btn.onClick();
      });
      actionsEl().appendChild(b);
    });

    overlay().classList.add('show');

    escHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escHandler);
  }

  // Convenience wrappers
  function confirmDialog(message, { title = 'Konfirmasi', onConfirm, onCancel, danger = false } = {}){
    show({
      type: 'question',
      title,
      message,
      buttons: [
        { label: 'Batal', primary: false, onClick: onCancel },
        { label: 'Ya, Lanjutkan', primary: true, onClick: onConfirm },
      ]
    });
  }

  function alertDialog(message, { title = 'Informasi', type = 'success' } = {}){
    show({ type, title, message, buttons: [{ label: 'Mengerti', primary: true }] });
  }

  // Close on overlay click
  document.addEventListener('DOMContentLoaded', () => {
    overlay().addEventListener('click', (e) => { if (e.target === overlay()) close(); });
  });

  return { show, close, confirmDialog, alertDialog };
})();
