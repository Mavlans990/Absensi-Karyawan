/**
 * Logika Halaman Manajemen Data Master Karyawan (CRUD)
 * - Tabel Karyawan (Kode, Nama, Status Aktif, Aksi Edit & Hapus)
 * - Modal Form Tambah & Edit Karyawan
 * - Dialog Konfirmasi Hapus Karyawan
 */
document.addEventListener('DOMContentLoaded', async () => {
  const {
    request,
    requireAdminAuth,
    getAdmin,
    clearSession,
    escapeHtml,
    showToast
  } = window.AbsensiAPI;

  if (!requireAdminAuth()) return;

  let employees = [];
  let editingEmployeeId = null;
  let deletingEmployee = null;

  // Profil & Logout
  const adminNameEl = document.getElementById('admin-display-name');
  const btnLogout = document.getElementById('btn-admin-logout');

  // KPI & Filter
  const statTotalEl = document.getElementById('emp-stat-total');
  const statActiveEl = document.getElementById('emp-stat-active');
  const statInactiveEl = document.getElementById('emp-stat-inactive');
  const searchInput = document.getElementById('emp-search-input');
  const btnAddEmployee = document.getElementById('btn-add-employee');
  const tableBodyEl = document.getElementById('employees-table-body');

  // Modal Tambah / Edit
  const formModal = document.getElementById('employee-form-modal');
  const formModalTitle = document.getElementById('employee-modal-title');
  const employeeForm = document.getElementById('employee-crud-form');
  const codeInput = document.getElementById('emp-code-input');
  const nameInput = document.getElementById('emp-name-input');
  const statusSelect = document.getElementById('emp-status-select');
  const formErrorEl = document.getElementById('emp-form-error');
  const btnCloseFormModal = document.getElementById('btn-close-emp-modal');
  const btnCancelFormModal = document.getElementById('btn-cancel-emp-modal');
  const btnSaveEmployee = document.getElementById('btn-save-employee');

  // Modal Konfirmasi Hapus
  const deleteModal = document.getElementById('delete-confirm-modal');
  const deleteTargetNameEl = document.getElementById('delete-target-name');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  const adminProfile = getAdmin();
  if (adminProfile && adminNameEl) {
    adminNameEl.textContent = adminProfile.nama_lengkap || adminProfile.username || 'Administrator';
  }

  btnLogout.addEventListener('click', () => {
    clearSession();
    window.location.href = '/admin/login.html';
  });

  async function loadEmployees() {
    try {
      const q = searchInput.value.trim();
      const queryStr = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await request(`/admin/employees${queryStr}`, { auth: true });
      employees = Array.isArray(res.data) ? res.data : [];

      const activeCount = employees.filter((e) => Number(e.is_active) === 1).length;
      statTotalEl.textContent = employees.length;
      statActiveEl.textContent = activeCount;
      statInactiveEl.textContent = employees.length - activeCount;

      renderTable();
    } catch (error) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-10 text-center text-sm text-rose-600">
            ${escapeHtml(error.message || 'Gagal memuat daftar karyawan.')}
          </td>
        </tr>
      `;
    }
  }

  function renderTable() {
    if (employees.length === 0) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-12 text-center text-sm text-slate-500">
            Belum ada data karyawan yang sesuai. Klik <strong>+ Tambah Karyawan</strong> untuk menambahkan data baru.
          </td>
        </tr>
      `;
      return;
    }

    tableBodyEl.innerHTML = employees
      .map((emp) => {
        const isActive = Number(emp.is_active) === 1;
        const statusBadge = isActive
          ? `<span class="badge-hadir"><span class="h-1.5 w-1.5 rounded-full bg-[#059669]"></span>Aktif</span>`
          : `<span class="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>Nonaktif</span>`;

        return `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="whitespace-nowrap px-6 py-4">
              <span class="rounded-md bg-[#EFF6FF] border border-blue-200 px-2.5 py-1 font-mono text-xs font-bold text-[#1D4ED8]">${escapeHtml(emp.employee_code)}</span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-semibold text-[#0F172A]">${escapeHtml(emp.full_name)}</div>
            </td>
            <td class="whitespace-nowrap px-6 py-4">${statusBadge}</td>
            <td class="whitespace-nowrap px-6 py-4 text-right">
              <div class="inline-flex items-center gap-2">
                <button
                  type="button"
                  data-action="edit"
                  data-id="${emp.id}"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  data-action="delete"
                  data-id="${emp.id}"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function suggestNextCode() {
    let maxNum = 0;
    for (const emp of employees) {
      const m = String(emp.employee_code).match(/^KRY-(\d+)$/i);
      if (m) {
        const n = Number(m[1]);
        if (n > maxNum) maxNum = n;
      }
    }
    return `KRY-${String(maxNum + 1).padStart(3, '0')}`;
  }

  function openAddModal() {
    editingEmployeeId = null;
    formModalTitle.textContent = 'Tambah Karyawan Baru';
    codeInput.value = suggestNextCode();
    nameInput.value = '';
    statusSelect.value = '1';
    formErrorEl.classList.add('hidden');
    formErrorEl.textContent = '';
    formModal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 30);
  }

  function openEditModal(emp) {
    editingEmployeeId = emp.id;
    formModalTitle.textContent = 'Edit Data Karyawan';
    codeInput.value = emp.employee_code;
    nameInput.value = emp.full_name;
    statusSelect.value = Number(emp.is_active) === 1 ? '1' : '0';
    formErrorEl.classList.add('hidden');
    formErrorEl.textContent = '';
    formModal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 30);
  }

  function closeFormModal() {
    formModal.classList.add('hidden');
    editingEmployeeId = null;
  }

  function openDeleteConfirmModal(emp) {
    deletingEmployee = emp;
    deleteTargetNameEl.textContent = `${emp.employee_code} — ${emp.full_name}`;
    deleteModal.classList.remove('hidden');
  }

  function closeDeleteConfirmModal() {
    deleteModal.classList.add('hidden');
    deletingEmployee = null;
  }

  btnAddEmployee.addEventListener('click', openAddModal);
  btnCloseFormModal.addEventListener('click', closeFormModal);
  btnCancelFormModal.addEventListener('click', closeFormModal);
  formModal.addEventListener('click', (e) => {
    if (e.target === formModal) closeFormModal();
  });

  btnCancelDelete.addEventListener('click', closeDeleteConfirmModal);
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteConfirmModal();
  });

  tableBodyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const emp = employees.find((item) => item.id === id);
    if (!emp) return;

    if (btn.dataset.action === 'edit') {
      openEditModal(emp);
    } else if (btn.dataset.action === 'delete') {
      openDeleteConfirmModal(emp);
    }
  });

  employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formErrorEl.classList.add('hidden');

    const employee_code = codeInput.value.trim().toUpperCase();
    const full_name = nameInput.value.trim();
    const is_active = Number(statusSelect.value);

    if (!employee_code || !full_name) {
      formErrorEl.textContent = 'Kode karyawan dan nama lengkap wajib diisi.';
      formErrorEl.classList.remove('hidden');
      return;
    }

    btnSaveEmployee.disabled = true;
    btnSaveEmployee.textContent = 'Menyimpan...';

    try {
      if (editingEmployeeId) {
        const res = await request(`/admin/employees/${editingEmployeeId}`, {
          method: 'PUT',
          auth: true,
          body: { employee_code, full_name, is_active }
        });
        showToast(res.message || 'Data karyawan berhasil diperbarui.', 'success');
      } else {
        const res = await request('/admin/employees', {
          method: 'POST',
          auth: true,
          body: { employee_code, full_name, is_active }
        });
        showToast(res.message || 'Karyawan baru berhasil ditambahkan.', 'success');
      }

      closeFormModal();
      await loadEmployees();
    } catch (error) {
      formErrorEl.textContent = error.message || 'Gagal menyimpan data karyawan.';
      formErrorEl.classList.remove('hidden');
    } finally {
      btnSaveEmployee.disabled = false;
      btnSaveEmployee.textContent = 'Simpan Karyawan';
    }
  });

  btnConfirmDelete.addEventListener('click', async () => {
    if (!deletingEmployee) return;
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = 'Menghapus...';

    try {
      const res = await request(`/admin/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
        auth: true
      });
      showToast(res.message || 'Data karyawan berhasil dihapus.', 'success');
      closeDeleteConfirmModal();
      await loadEmployees();
    } catch (error) {
      showToast(error.message || 'Gagal menghapus data karyawan.', 'error');
    } finally {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Ya, Hapus Karyawan';
    }
  });

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadEmployees(), 200);
  });

  await loadEmployees();
});
