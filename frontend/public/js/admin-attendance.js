/**
 * Logika Halaman Pemantauan Absensi Admin
 * - Filter Tanggal, Karyawan, dan Status (Semua / Hadir / Terlambat / Izin / Sakit)
 * - Tabel: Tanggal, Kode, Nama, Jam Masuk, Jam Pulang, Status Badge, Aksi Lihat TTD
 * - Modal Pratinjau Gambar Tanda Tangan (.png)
 * - Modal Input Status Izin / Sakit oleh Admin
 */
document.addEventListener('DOMContentLoaded', async () => {
  const {
    request,
    requireAdminAuth,
    getAdmin,
    clearSession,
    formatTanggalPendek,
    formatTanggalLengkap,
    escapeHtml,
    renderStatusBadge,
    showToast
  } = window.AbsensiAPI;

  if (!requireAdminAuth()) return;

  let allEmployees = [];
  let attendanceRows = [];
  let serverToday = '';

  // Elemen Profil & Logout
  const adminNameEl = document.getElementById('admin-display-name');
  const btnLogout = document.getElementById('btn-admin-logout');

  // Elemen Summary KPI
  const kpiTotalEl = document.getElementById('kpi-total');
  const kpiHadirEl = document.getElementById('kpi-hadir');
  const kpiTerlambatEl = document.getElementById('kpi-terlambat');
  const kpiLeaveEl = document.getElementById('kpi-leave');
  const serverInfoEl = document.getElementById('server-date-badge');

  // Elemen Filter
  const filterDateInput = document.getElementById('filter-date');
  const btnQuickToday = document.getElementById('btn-quick-today');
  const btnQuickAllDates = document.getElementById('btn-quick-all-dates');
  const filterEmployeeSelect = document.getElementById('filter-employee');
  const filterStatusSelect = document.getElementById('filter-status');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  // Tabel
  const tableBodyEl = document.getElementById('attendance-table-body');
  const tableSubtitleEl = document.getElementById('table-result-info');

  // Modal Pratinjau Tanda Tangan
  const sigModal = document.getElementById('signature-preview-modal');
  const sigModalNameEl = document.getElementById('sig-modal-employee-name');
  const sigModalMetaEl = document.getElementById('sig-modal-meta');
  const sigModalStatusEl = document.getElementById('sig-modal-status');
  const sigMasukTimeEl = document.getElementById('sig-masuk-time');
  const sigMasukContainer = document.getElementById('sig-masuk-container');
  const sigPulangTimeEl = document.getElementById('sig-pulang-time');
  const sigPulangContainer = document.getElementById('sig-pulang-container');
  const btnCloseSigModal = document.getElementById('btn-close-sig-modal');

  // Modal Input Izin / Sakit
  const btnOpenLeaveModal = document.getElementById('btn-open-leave-modal');
  const leaveModal = document.getElementById('leave-status-modal');
  const leaveForm = document.getElementById('leave-status-form');
  const leaveEmployeeSelect = document.getElementById('leave-employee-id');
  const leaveDateInput = document.getElementById('leave-date');
  const leaveStatusSelect = document.getElementById('leave-status-value');
  const leaveErrorEl = document.getElementById('leave-form-error');
  const btnCloseLeaveModal = document.getElementById('btn-close-leave-modal');
  const btnCancelLeaveModal = document.getElementById('btn-cancel-leave-modal');
  const btnSubmitLeave = document.getElementById('btn-submit-leave');

  const adminProfile = getAdmin();
  if (adminProfile && adminNameEl) {
    adminNameEl.textContent = adminProfile.nama_lengkap || adminProfile.username || 'Administrator';
  }

  btnLogout.addEventListener('click', () => {
    clearSession();
    window.location.href = '/admin/login.html';
  });

  function updateDateQuickButtons() {
    const val = filterDateInput.value;
    if (val && val === serverToday) {
      btnQuickToday.className =
        'rounded-lg bg-[#1D4ED8] px-2.5 py-1 text-xs font-semibold text-white transition';
      btnQuickAllDates.className =
        'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition';
    } else if (!val) {
      btnQuickAllDates.className =
        'rounded-lg bg-[#1D4ED8] px-2.5 py-1 text-xs font-semibold text-white transition';
      btnQuickToday.className =
        'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition';
    } else {
      btnQuickToday.className =
        'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition';
      btnQuickAllDates.className =
        'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition';
    }
  }

  async function loadEmployeesDropdown() {
    try {
      const res = await request('/admin/employees', { auth: true });
      allEmployees = Array.isArray(res.data) ? res.data : [];

      const filterOptionsHtml = [
        '<option value="">Semua Karyawan</option>',
        ...allEmployees.map(
          (emp) =>
            `<option value="${emp.id}">${escapeHtml(emp.employee_code)} — ${escapeHtml(emp.full_name)}</option>`
        )
      ].join('');
      filterEmployeeSelect.innerHTML = filterOptionsHtml;

      const activeEmployees = allEmployees.filter((e) => Number(e.is_active) === 1);
      leaveEmployeeSelect.innerHTML = [
        '<option value="">Pilih karyawan aktif...</option>',
        ...activeEmployees.map(
          (emp) =>
            `<option value="${emp.id}">${escapeHtml(emp.employee_code)} — ${escapeHtml(emp.full_name)}</option>`
        )
      ].join('');
    } catch (error) {
      showToast(error.message || 'Gagal memuat daftar karyawan.', 'error');
    }
  }

  async function loadAttendances() {
    tableBodyEl.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-12 text-center text-sm text-slate-500">
          Memuat data absensi dari server...
        </td>
      </tr>
    `;

    try {
      const params = new URLSearchParams();
      if (filterDateInput.value) params.set('date', filterDateInput.value);
      if (filterEmployeeSelect.value) params.set('employee_id', filterEmployeeSelect.value);
      if (filterStatusSelect.value && filterStatusSelect.value !== 'Semua') {
        params.set('status', filterStatusSelect.value);
      }

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await request(`/admin/attendances${queryStr}`, { auth: true });

      if (res.server_date) {
        serverToday = res.server_date;
        serverInfoEl.textContent = `Tanggal Server WIB: ${formatTanggalPendek(res.server_date)}`;
        if (!leaveDateInput.value) {
          leaveDateInput.value = res.server_date;
        }
      }

      updateDateQuickButtons();

      attendanceRows = Array.isArray(res.data) ? res.data : [];
      const summary = res.summary || {
        total: attendanceRows.length,
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0
      };

      kpiTotalEl.textContent = summary.total;
      kpiHadirEl.textContent = summary.hadir;
      kpiTerlambatEl.textContent = summary.terlambat;
      kpiLeaveEl.textContent = (summary.izin || 0) + (summary.sakit || 0);

      const dateDesc = filterDateInput.value
        ? `tanggal ${formatTanggalPendek(filterDateInput.value)}`
        : 'seluruh tanggal';
      tableSubtitleEl.textContent = `Menampilkan ${attendanceRows.length} catatan kehadiran (${dateDesc})`;

      renderTable();
    } catch (error) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-10 text-center text-sm text-rose-600">
            ${escapeHtml(error.message || 'Gagal memuat data absensi.')}
          </td>
        </tr>
      `;
    }
  }

  function renderTable() {
    if (attendanceRows.length === 0) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-14 text-center">
            <div class="mx-auto max-w-sm">
              <p class="text-sm font-semibold text-[#0F172A]">Tidak ada data absensi ditemukan</p>
              <p class="mt-1 text-xs text-slate-500">
                Belum ada catatan absensi yang cocok dengan filter tanggal, karyawan, atau status yang dipilih.
              </p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBodyEl.innerHTML = attendanceRows
      .map((row, idx) => {
        const isLeave = row.status === 'Izin' || row.status === 'Sakit';
        const hasAnySignature = Boolean(row.signature_masuk || row.signature_pulang);

        const jamMasukHtml = isLeave
          ? '<span class="text-xs text-slate-400">&mdash;</span>'
          : row.jam_masuk
            ? `<span class="font-mono text-xs font-semibold text-[#0F172A]">${escapeHtml(row.jam_masuk)} WIB</span>`
            : '<span class="text-xs text-slate-400">&mdash;</span>';

        const jamPulangHtml = isLeave
          ? '<span class="text-xs text-slate-400">&mdash;</span>'
          : row.jam_pulang
            ? `<span class="font-mono text-xs font-semibold text-[#0F172A]">${escapeHtml(row.jam_pulang)} WIB</span>`
            : '<span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Belum Pulang</span>';

        const actionBtnHtml = hasAnySignature
          ? `<button
               type="button"
               data-row-index="${idx}"
               class="btn-preview-signature inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-100 transition"
             >
               <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
               Lihat TTD
             </button>`
          : `<span class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400">
               Tanpa TTD
             </span>`;

        return `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="whitespace-nowrap px-5 py-3.5">
              <div class="text-sm font-semibold text-[#0F172A]">${escapeHtml(formatTanggalPendek(row.attendance_date))}</div>
              <div class="text-[11px] font-mono text-slate-400">${escapeHtml(row.attendance_date)}</div>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5">
              <span class="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">${escapeHtml(row.employee_code)}</span>
            </td>
            <td class="px-5 py-3.5">
              <div class="text-sm font-semibold text-[#0F172A]">${escapeHtml(row.full_name)}</div>
            </td>
            <td class="whitespace-nowrap px-5 py-3.5">${jamMasukHtml}</td>
            <td class="whitespace-nowrap px-5 py-3.5">${jamPulangHtml}</td>
            <td class="whitespace-nowrap px-5 py-3.5">${renderStatusBadge(row.status)}</td>
            <td class="whitespace-nowrap px-5 py-3.5 text-right">${actionBtnHtml}</td>
          </tr>
        `;
      })
      .join('');
  }

  function openSignatureModal(row) {
    sigModalNameEl.textContent = `${row.full_name} (${row.employee_code})`;
    sigModalMetaEl.textContent = `${formatTanggalLengkap(row.attendance_date)} • ${row.attendance_date}`;
    sigModalStatusEl.innerHTML = renderStatusBadge(row.status);

    // Tanda tangan Masuk
    sigMasukTimeEl.textContent = row.jam_masuk ? `Pukul ${row.jam_masuk} WIB` : 'Tidak tersedia';
    if (row.signature_masuk) {
      sigMasukContainer.innerHTML = `
        <img
          src="${escapeHtml(row.signature_masuk)}"
          alt="Tanda tangan Masuk ${escapeHtml(row.full_name)}"
          class="max-h-40 w-auto mx-auto object-contain rounded-lg"
        />
      `;
    } else {
      sigMasukContainer.innerHTML =
        '<p class="text-xs text-slate-400 py-8 text-center">Tidak ada gambar tanda tangan Masuk</p>';
    }

    // Tanda tangan Pulang
    sigPulangTimeEl.textContent = row.jam_pulang ? `Pukul ${row.jam_pulang} WIB` : 'Belum Absen Pulang';
    if (row.signature_pulang) {
      sigPulangContainer.innerHTML = `
        <img
          src="${escapeHtml(row.signature_pulang)}"
          alt="Tanda tangan Pulang ${escapeHtml(row.full_name)}"
          class="max-h-40 w-auto mx-auto object-contain rounded-lg"
        />
      `;
    } else {
      sigPulangContainer.innerHTML =
        '<p class="text-xs text-slate-400 py-8 text-center">Belum melakukan absen Pulang</p>';
    }

    sigModal.classList.remove('hidden');
  }

  tableBodyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-preview-signature');
    if (!btn) return;
    const idx = Number(btn.dataset.rowIndex);
    const row = attendanceRows[idx];
    if (row) {
      openSignatureModal(row);
    }
  });

  btnCloseSigModal.addEventListener('click', () => sigModal.classList.add('hidden'));
  sigModal.addEventListener('click', (e) => {
    if (e.target === sigModal) sigModal.classList.add('hidden');
  });

  // Event Filter
  filterDateInput.addEventListener('change', () => loadAttendances());
  filterEmployeeSelect.addEventListener('change', () => loadAttendances());
  filterStatusSelect.addEventListener('change', () => loadAttendances());

  btnQuickToday.addEventListener('click', () => {
    if (serverToday) {
      filterDateInput.value = serverToday;
      loadAttendances();
    }
  });

  btnQuickAllDates.addEventListener('click', () => {
    filterDateInput.value = '';
    loadAttendances();
  });

  btnResetFilters.addEventListener('click', () => {
    filterDateInput.value = '';
    filterEmployeeSelect.value = '';
    filterStatusSelect.value = 'Semua';
    loadAttendances();
  });

  // Modal Catat Izin / Sakit
  function closeLeaveModal() {
    leaveModal.classList.add('hidden');
    leaveErrorEl.classList.add('hidden');
    leaveErrorEl.textContent = '';
  }

  btnOpenLeaveModal.addEventListener('click', () => {
    leaveErrorEl.classList.add('hidden');
    if (serverToday && !leaveDateInput.value) {
      leaveDateInput.value = serverToday;
    }
    leaveModal.classList.remove('hidden');
  });

  btnCloseLeaveModal.addEventListener('click', closeLeaveModal);
  btnCancelLeaveModal.addEventListener('click', closeLeaveModal);
  leaveModal.addEventListener('click', (e) => {
    if (e.target === leaveModal) closeLeaveModal();
  });

  leaveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    leaveErrorEl.classList.add('hidden');

    const empId = Number(leaveEmployeeSelect.value);
    const dateVal = leaveDateInput.value;
    const statusVal = leaveStatusSelect.value;

    if (!empId || !dateVal || !statusVal) {
      leaveErrorEl.textContent = 'Karyawan, tanggal, dan status wajib dipilih.';
      leaveErrorEl.classList.remove('hidden');
      return;
    }

    btnSubmitLeave.disabled = true;
    btnSubmitLeave.textContent = 'Menyimpan...';

    try {
      const res = await request('/admin/attendances/leave', {
        method: 'POST',
        auth: true,
        body: {
          employee_id: empId,
          attendance_date: dateVal,
          status: statusVal
        }
      });
      showToast(res.message || 'Status berhasil dicatat.', 'success');
      closeLeaveModal();
      leaveEmployeeSelect.value = '';
      await loadAttendances();
    } catch (error) {
      leaveErrorEl.textContent = error.message || 'Gagal menyimpan catatan Izin/Sakit.';
      leaveErrorEl.classList.remove('hidden');
    } finally {
      btnSubmitLeave.disabled = false;
      btnSubmitLeave.textContent = 'Simpan Catatan';
    }
  });

  // Inisialisasi
  await loadEmployeesDropdown();
  await loadAttendances();
});
