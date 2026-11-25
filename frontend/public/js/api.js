/**
 * Klien REST API & Utilitas Sesi untuk Aplikasi Absensi Karyawan
 * Seluruh pemanggilan API menggunakan path relatif (/api & /uploads) yang diproksikan
 * oleh frontend server (port 3000) ke Backend REST API (port 4000).
 */
(function () {
  const TOKEN_KEY = 'absensi_admin_jwt_token';
  const ADMIN_INFO_KEY = 'absensi_admin_profile';

  const BULAN_PENDEK = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const BULAN_PANJANG = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const HARI_INDO = [
    'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
  ];

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function getAdmin() {
    try {
      const raw = localStorage.getItem(ADMIN_INFO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(token, admin) {
    localStorage.setItem(TOKEN_KEY, token);
    if (admin) {
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
  }

  async function request(endpoint, { method = 'GET', body = null, auth = false, redirectOn401 = true } = {}) {
    const headers = {
      Accept: 'application/json'
    };

    if (body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(`/api${endpoint}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (_) {
      payload = {};
    }

    if (response.status === 401 && auth && redirectOn401) {
      clearSession();
      window.location.href = '/admin/login.html';
      const err = new Error(payload.message || 'Sesi telah berakhir. Silakan login kembali.');
      err.status = 401;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(payload.message || `Permintaan gagal (HTTP ${response.status}).`);
      err.status = response.status;
      err.payload = payload;
      throw err;
    }

    return payload;
  }

  function requireAdminAuth() {
    const token = getToken();
    if (!token) {
      window.location.replace('/admin/login.html');
      return false;
    }
    return true;
  }

  function formatTanggalPendek(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${BULAN_PENDEK[m - 1]} ${y}`;
  }

  function formatTanggalLengkap(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    const hari = HARI_INDO[utcDate.getUTCDay()];
    return `${hari}, ${d} ${BULAN_PANJANG[m - 1]} ${y}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderStatusBadge(status) {
    const normalized = String(status || '').trim();
    if (normalized === 'Hadir') {
      return `<span class="badge-hadir"><span class="h-1.5 w-1.5 rounded-full bg-[#059669]"></span>Hadir</span>`;
    }
    if (normalized === 'Terlambat') {
      return `<span class="badge-terlambat"><span class="h-1.5 w-1.5 rounded-full bg-[#D97706]"></span>Terlambat</span>`;
    }
    if (normalized === 'Izin') {
      return `<span class="badge-izin"><span class="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]"></span>Izin</span>`;
    }
    if (normalized === 'Sakit') {
      return `<span class="badge-sakit"><span class="h-1.5 w-1.5 rounded-full bg-rose-600"></span>Sakit</span>`;
    }
    return `<span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">${escapeHtml(normalized || '-')}</span>`;
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('stitch-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'stitch-toast-container';
      container.className = 'fixed bottom-5 right-5 z-[100] flex max-w-sm flex-col gap-2.5 px-4 sm:px-0';
      document.body.appendChild(container);
    }

    const styles = {
      success: 'border-emerald-200 bg-[#ECFDF5] text-[#059669]',
      error: 'border-rose-200 bg-rose-50 text-rose-700',
      warning: 'border-amber-200 bg-[#FFFBEB] text-[#D97706]',
      info: 'border-blue-200 bg-[#EFF6FF] text-[#1D4ED8]'
    };

    const toast = document.createElement('div');
    toast.className = `flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200 ${styles[type] || styles.info}`;
    toast.innerHTML = `
      <div class="flex-1 leading-snug">${escapeHtml(message)}</div>
      <button type="button" class="ml-1 opacity-70 hover:opacity-100 font-bold" aria-label="Tutup">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 220);
    }, 4200);
  }

  window.AbsensiAPI = {
    request,
    getToken,
    getAdmin,
    setSession,
    clearSession,
    requireAdminAuth,
    formatTanggalPendek,
    formatTanggalLengkap,
    escapeHtml,
    renderStatusBadge,
    showToast
  };
})();
