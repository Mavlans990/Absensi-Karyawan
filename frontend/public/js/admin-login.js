/**
 * Logika Halaman Login Admin (JWT Authentication)
 */
document.addEventListener('DOMContentLoaded', async () => {
  const { request, getToken, setSession, clearSession, showToast } = window.AbsensiAPI;

  const loginForm = document.getElementById('admin-login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePwdBtn = document.getElementById('btn-toggle-password');
  const errorBox = document.getElementById('login-error-alert');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('btn-login-submit');
  const submitLabel = document.getElementById('btn-login-label');

  // Jika token sudah tersimpan & masih valid, arahkan langsung ke Dashboard Absensi
  const existingToken = getToken();
  if (existingToken) {
    try {
      await request('/admin/me', { auth: true, redirectOn401: false });
      window.location.replace('/admin/index.html');
      return;
    } catch (_) {
      clearSession();
    }
  }

  togglePwdBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePwdBtn.setAttribute('aria-label', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  function showLoginError(msg) {
    if (!msg) {
      errorBox.classList.add('hidden');
      errorText.textContent = '';
      return;
    }
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoginError('');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showLoginError('Username dan kata sandi wajib diisi.');
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = 'Memverifikasi...';

    try {
      const result = await request('/admin/login', {
        method: 'POST',
        body: { username, password }
      });

      setSession(result.token, result.admin);
      showToast('Login berhasil! Mengalihkan ke dashboard...', 'success');
      window.location.replace('/admin/index.html');
    } catch (error) {
      showLoginError(error.message || 'Gagal masuk. Periksa username dan kata sandi Anda.');
      submitBtn.disabled = false;
      submitLabel.textContent = 'Masuk ke Dashboard';
    }
  });
});
