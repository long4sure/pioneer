/* ============================================================
   js/core/confirm.js
   Branded async confirmation dialog.
   Usage:
     const yes = await appConfirm('Title', 'Message', 'Delete', true);
     if (!yes) return;  // user clicked Cancel
   ============================================================ */

function appConfirm(title = 'Confirm', message = 'Are you sure?', okLabel = 'Confirm', danger = true) {
    return new Promise(resolve => {
        const overlay  = document.getElementById('cdlg-overlay');
        const titleEl  = document.getElementById('cdlg-title');
        const msgEl    = document.getElementById('cdlg-msg');
        const okBtn    = document.getElementById('cdlg-ok');
        const cxlBtn   = document.getElementById('cdlg-cancel');
        const iconWrap = document.getElementById('cdlg-icon-wrap');

        // Fallback to native if DOM not ready
        if (!overlay) { resolve(window.confirm(`${title}\n\n${message}`)); return; }

        titleEl.textContent = title;
        msgEl.textContent   = message;
        okBtn.textContent   = okLabel;
        okBtn.className     = danger ? 'btn btn-danger' : 'btn btn-primary';
        iconWrap.className  = danger ? 'cdlg-icon-wrap' : 'cdlg-icon-wrap info';

        overlay.classList.add('open');
        cxlBtn.focus();

        const done = (val) => {
            overlay.classList.remove('open');
            okBtn.onclick    = null;
            cxlBtn.onclick   = null;
            overlay.onclick  = null;
            document.removeEventListener('keydown', keyHandler);
            resolve(val);
        };

        const keyHandler = (e) => {
            if (e.key === 'Enter')  done(true);
            if (e.key === 'Escape') done(false);
        };

        okBtn.onclick   = () => done(true);
        cxlBtn.onclick  = () => done(false);
        overlay.onclick = (e) => { if (e.target === overlay) done(false); };
        document.addEventListener('keydown', keyHandler, { once: false });
    });
}
