// ===== CONFIG — PASTE your Apps Script Web App URL (must end with /exec)
const CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzYuDGHrBYUGRItDp_EDiELp4j4PHpFaR5jKpvrWXqP-3mubnp34FQBgDwe9nCI4Gk/exec'
};

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);

function htmlEscape(s) {
  const str = s == null ? '' : String(s);
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showMessage(kind, title, msg, seat) {
  const el = $('result');
  const cls = kind === 'ok' ? 'ok' : kind === 'warn' ? 'warn' : 'err';
  const seatLine = seat ? `<div class="seat">Số ghế: ${htmlEscape(seat)}</div>` : '';
  el.innerHTML = `<div class="${cls}">
    <div><strong>${htmlEscape(title)}</strong></div>
    <div class="muted">${htmlEscape(msg||'')}</div>
    ${seatLine}
  </div>`;
}

// JSONP helper (with timeout)
function jsonp(url, params = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cbName = `jsonp_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    const cleanup = () => {
      try { delete window[cbName]; } catch(_) {}
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    window[cbName] = (data) => { cleanup(); resolve(data); };

    const qs = new URLSearchParams({ ...params, callback: cbName }).toString();
    const fullSrc = `${url}?${qs}`;
    script.src = fullSrc;
    script.async = true;
    script.onerror = () => {
      console.error('JSONP failed to load:', fullSrc);
      cleanup();
      reject(new Error('JSONP network error'));
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (window[cbName]) {
        console.error('JSONP timeout waiting for callback:', fullSrc);
        cleanup();
        reject(new Error('JSONP timeout'));
      }
    }, timeoutMs);
  });
}

// ---------- main ----------
document.addEventListener('DOMContentLoaded', () => {
  const form = $('seat-form');
  const submitBtn = $('submitBtn');

  // same guard as the working script
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(CONFIG.WEB_APP_URL)) {
    showMessage('err', 'Config error', 'Please set CONFIG.WEB_APP_URL to your Apps Script /exec URL.');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = $('name').value.trim();
    const studentID = $('studentID').value.trim();   // <-- string/number as text
    const lop = $('lop').value.trim();

    if (!name || !studentID || !lop) {
      showMessage('warn', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Light normalization (keep exactly like working script’s simplicity)
    const cleanName = name.replace(/\s+/g, ' ');
    const cleanLop  = lop.replace(/\s+/g, ' ');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking…';

    try {
      // mirror the working script’s call pattern, but send studentID
      const res = await jsonp(CONFIG.WEB_APP_URL, { name: cleanName, studentID, lop: cleanLop });

      if (res && res.ok) {
        showMessage('ok', 'Check in thành công!', '', res.seat || '');
      } else if (res && res.error === 'NOT_FOUND') {
        showMessage('warn', 'Check in không thành công', 'Vui lòng kiểm tra lại thông tin.');
      } else if (res && res.error === 'MISSING_PARAMS') {
        showMessage('warn', 'Vui lòng điền đầy đủ thông tin');
      } else {
        showMessage('err', 'Error', 'Something went wrong. See console for details.');
        console.error('Server said:', res);
      }
    } catch (err) {
      showMessage('err', 'Network/Error', String(err.message || err));
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      // match the working script’s final button label for consistency
      submitBtn.textContent = 'Check in';
    }
  });
});
