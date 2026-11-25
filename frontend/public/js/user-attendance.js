/**
 * Logika Halaman Form Absensi Karyawan Publik (Tanpa Login)
 * - Jam digital live Asia/Jakarta (disinkronkan dengan waktu server)
 * - Toggle Masuk / Pulang
 * - Dropdown pencarian karyawan (menampilkan Kode + Nama, opsi yang sudah absen tetap tampil & DISABLED dengan badge "Sudah Absen")
 * - Kanvas tanda tangan responsif (Mouse & Touch) dengan tombol Hapus
 * - Modal Bukti Absensi setelah submit berhasil
 */
document.addEventListener('DOMContentLoaded', () => {
  const {
    request,
    escapeHtml,
    formatTanggalLengkap,
    renderStatusBadge,
    showToast
  } = window.AbsensiAPI;

  // State aplikasi
  let employees = [];
  let selectedType = 'MASUK'; // 'MASUK' | 'PULANG'
  let selectedEmployee = null;
  let serverOffsetMs = 0; // server_timestamp_ms - Date.now()
  let isDropdownOpen = false;
  let searchQuery = '';
  let hasDrawnSignature = false;
  let isDrawing = false;
  let lastPoint = null;

  // Referensi elemen DOM
  const clockTimeEl = document.getElementById('live-clock-time');
  const clockDateEl = document.getElementById('live-clock-date');
  const scheduleIndicatorEl = document.getElementById('live-schedule-indicator');

  const btnTypeMasuk = document.getElementById('btn-type-masuk');
  const btnTypePulang = document.getElementById('btn-type-pulang');
  const ruleBannerEl = document.getElementById('attendance-rule-banner');

  const selectTriggerBtn = document.getElementById('employee-select-trigger');
  const selectTriggerText = document.getElementById('employee-select-label');
  const dropdownPanel = document.getElementById('employee-dropdown-panel');
  const searchInput = document.getElementById('employee-search-input');
  const optionsListEl = document.getElementById('employee-options-list');
  const employeeCountInfoEl = document.getElementById('employee-count-info');

  const canvas = document.getElementById('signature-canvas');
  const canvasPlaceholder = document.getElementById('signature-placeholder');
  const signatureStatusBadge = document.getElementById('signature-status-badge');
  const btnClearCanvas = document.getElementById('btn-clear-signature');

  const formErrorAlert = document.getElementById('form-error-alert');
  const formErrorText = document.getElementById('form-error-text');
  const attendanceForm = document.getElementById('attendance-form');
  const submitBtn = document.getElementById('btn-submit-attendance');
  const submitBtnLabel = document.getElementById('btn-submit-label');

  // Elemen Modal Bukti Absensi
  const receiptModal = document.getElementById('receipt-modal');
  const receiptNameEl = document.getElementById('receipt-employee-name');
  const receiptCodeEl = document.getElementById('receipt-employee-code');
  const receiptTypeEl = document.getElementById('receipt-type');
  const receiptDateEl = document.getElementById('receipt-date');
  const receiptTimeEl = document.getElementById('receipt-time');
  const receiptStatusEl = document.getElementById('receipt-status-badge');
  const receiptSignatureImg = document.getElementById('receipt-signature-img');
  const btnCloseReceipt = document.getElementById('btn-close-receipt');

  // Formatter waktu WIB di sisi klien berdasarkan serverOffsetMs
  const jakartaTimeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const jakartaDateFmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  function getSyncedJakartaNow() {
    const syncedDate = new Date(Date.now() + serverOffsetMs);
    return {
      timeStr: jakartaTimeFmt.format(syncedDate),
      dateStr: jakartaDateFmt.format(syncedDate)
    };
  }

  function updateLiveClock() {
    const { timeStr, dateStr } = getSyncedJakartaNow();
    clockTimeEl.textContent = timeStr;
    clockDateEl.textContent = dateStr;

    if (selectedType === 'MASUK') {
      if (timeStr <= '08:00:00') {
        scheduleIndicatorEl.className =
          'inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-semibold text-emerald-300';
        scheduleIndicatorEl.innerHTML =
          '<span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>Jendela Masuk Tepat Waktu (&le; 08:00 WIB)';
      } else {
        scheduleIndicatorEl.className =
          'inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-400/30 px-3.5 py-1 text-xs font-semibold text-amber-300';
        scheduleIndicatorEl.innerHTML =
          '<span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>Lewat 08:00 WIB &bull; Masuk Otomatis Tercatat Terlambat';
      }
    } else {
      if (timeStr >= '15:00:00') {
        scheduleIndicatorEl.className =
          'inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-semibold text-emerald-300';
        scheduleIndicatorEl.innerHTML =
          '<span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>Absen Pulang Dibuka (&ge; 15:00 WIB)';
      } else {
        scheduleIndicatorEl.className =
          'inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-400/30 px-3.5 py-1 text-xs font-semibold text-amber-300';
        scheduleIndicatorEl.innerHTML =
          '<span class="h-2 w-2 rounded-full bg-amber-400"></span>Absen Pulang Baru Dibuka Pukul 15:00 WIB';
      }
    }
  }

  function showFormError(msg) {
    if (!msg) {
      formErrorAlert.classList.add('hidden');
      formErrorText.textContent = '';
      return;
    }
    formErrorText.textContent = msg;
    formErrorAlert.classList.remove('hidden');
  }

  function isEmployeeAlreadySubmitted(emp, type) {
    if (type === 'MASUK') {
      return Boolean(emp.has_checked_in);
    }
    return Boolean(emp.has_checked_out);
  }

  function updateTypeUI() {
    showFormError('');
    if (selectedType === 'MASUK') {
      btnTypeMasuk.className =
        'flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-[#1D4ED8] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all';
      btnTypePulang.className =
        'flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-transparent px-4 py-3.5 text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-all';

      ruleBannerEl.className =
        'rounded-xl border border-blue-100 bg-[#EFF6FF] px-4 py-3 text-xs leading-relaxed text-slate-700 flex items-start gap-2.5';
      ruleBannerEl.innerHTML = `
        <svg class="h-4 w-4 shrink-0 text-[#1D4ED8] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
        <div>
          <span class="font-bold text-[#0F172A]">Aturan Absen Masuk:</span>
          Absen pada atau sebelum pukul <span class="font-semibold text-[#059669]">08:00 WIB</span> tercatat <span class="font-semibold text-[#059669]">Hadir</span>.
          Pengiriman setelah pukul 08:00 WIB otomatis tercatat <span class="font-semibold text-[#D97706]">Terlambat</span>.
        </div>
      `;
      submitBtnLabel.textContent = 'Kirim Absensi Masuk';
    } else {
      btnTypePulang.className =
        'flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-[#1D4ED8] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all';
      btnTypeMasuk.className =
        'flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-transparent px-4 py-3.5 text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-all';

      const { timeStr } = getSyncedJakartaNow();
      const before15 = timeStr < '15:00:00';
      ruleBannerEl.className = before15
        ? 'rounded-xl border border-amber-200 bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-amber-900 flex items-start gap-2.5'
        : 'rounded-xl border border-emerald-200 bg-[#ECFDF5] px-4 py-3 text-xs leading-relaxed text-emerald-900 flex items-start gap-2.5';

      ruleBannerEl.innerHTML = `
        <svg class="h-4 w-4 shrink-0 ${before15 ? 'text-[#D97706]' : 'text-[#059669]'} mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <span class="font-bold">Aturan Absen Pulang:</span>
          Dibuka mulai pukul <span class="font-bold">15:00 WIB</span> dan karyawan wajib sudah tercatat <span class="font-semibold">Absen Masuk</span> pada hari yang sama.
          ${before15 ? '<span class="block mt-0.5 font-semibold text-[#D97706]">Perhatian: Waktu server saat ini belum mencapai pukul 15:00 WIB.</span>' : ''}
        </div>
      `;
      submitBtnLabel.textContent = 'Kirim Absensi Pulang';
    }

    // Jika karyawan terpilih ternyata sudah absen pada jenis yang baru dipilih, reset pilihan
    if (selectedEmployee) {
      const freshEmp = employees.find((e) => e.id === selectedEmployee.id);
      if (!freshEmp || isEmployeeAlreadySubmitted(freshEmp, selectedType)) {
        selectedEmployee = null;
      } else {
        selectedEmployee = freshEmp;
      }
    }

    renderSelectedEmployeeTrigger();
    renderDropdownOptions();
    updateLiveClock();
  }

  function renderSelectedEmployeeTrigger() {
    if (!selectedEmployee) {
      selectTriggerText.innerHTML =
        '<span class="text-slate-400 font-normal">Cari & pilih kode atau nama karyawan...</span>';
      return;
    }
    selectTriggerText.innerHTML = `
      <span class="inline-flex items-center gap-2.5">
        <span class="rounded-md bg-[#EFF6FF] border border-blue-200 px-2 py-0.5 font-mono text-xs font-bold text-[#1D4ED8]">${escapeHtml(selectedEmployee.employee_code)}</span>
        <span class="font-semibold text-[#0F172A]">${escapeHtml(selectedEmployee.full_name)}</span>
      </span>
    `;
  }

  function renderDropdownOptions() {
    const q = searchQuery.trim().toLowerCase();
    const filtered = employees.filter((emp) => {
      if (!q) return true;
      return (
        emp.employee_code.toLowerCase().includes(q) ||
        emp.full_name.toLowerCase().includes(q)
      );
    });

    const availableCount = employees.filter((e) => !isEmployeeAlreadySubmitted(e, selectedType)).length;
    employeeCountInfoEl.textContent = `${availableCount} dari ${employees.length} karyawan belum absen ${selectedType === 'MASUK' ? 'Masuk' : 'Pulang'} hari ini`;

    if (filtered.length === 0) {
      optionsListEl.innerHTML = `
        <li class="px-4 py-6 text-center text-sm text-slate-500">
          Tidak ditemukan karyawan dengan kata kunci "<span class="font-semibold text-slate-700">${escapeHtml(searchQuery)}</span>".
        </li>
      `;
      return;
    }

    optionsListEl.innerHTML = filtered
      .map((emp) => {
        const disabled = isEmployeeAlreadySubmitted(emp, selectedType);
        const isSelected = selectedEmployee && selectedEmployee.id === emp.id;

        let rightBadge = '';
        if (disabled) {
          const extraNote = emp.is_leave_today && emp.today_status ? ` (${escapeHtml(emp.today_status)})` : '';
          rightBadge = `
            <span class="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 shrink-0">
              Sudah Absen${extraNote}
            </span>
          `;
        } else if (selectedType === 'PULANG' && !emp.has_checked_in) {
          rightBadge = `
            <span class="inline-flex items-center rounded-full border border-amber-200 bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#D97706] shrink-0">
              Belum Masuk
            </span>
          `;
        } else {
          rightBadge = `
            <span class="inline-flex items-center rounded-full border border-emerald-200 bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669] shrink-0">
              Tersedia
            </span>
          `;
        }

        if (disabled) {
          return `
            <li
              role="option"
              aria-disabled="true"
              data-emp-id="${emp.id}"
              data-disabled="true"
              class="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 bg-slate-50 opacity-60 cursor-not-allowed select-none border border-transparent"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 shrink-0">${escapeHtml(emp.employee_code)}</span>
                <span class="truncate text-sm font-medium text-slate-500 line-through decoration-slate-400">${escapeHtml(emp.full_name)}</span>
              </div>
              ${rightBadge}
            </li>
          `;
        }

        return `
          <li
            role="option"
            aria-selected="${isSelected ? 'true' : 'false'}"
            data-emp-id="${emp.id}"
            data-disabled="false"
            class="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-[#EFF6FF] border border-blue-200'
                : 'hover:bg-slate-50 border border-transparent'
            }"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="rounded-md bg-[#EFF6FF] border border-blue-200/80 px-2 py-0.5 font-mono text-xs font-bold text-[#1D4ED8] shrink-0">${escapeHtml(emp.employee_code)}</span>
              <span class="truncate text-sm font-semibold text-[#0F172A]">${escapeHtml(emp.full_name)}</span>
            </div>
            ${rightBadge}
          </li>
        `;
      })
      .join('');
  }

  function openDropdown() {
    isDropdownOpen = true;
    dropdownPanel.classList.remove('hidden');
    selectTriggerBtn.setAttribute('aria-expanded', 'true');
    renderDropdownOptions();
    setTimeout(() => searchInput.focus(), 20);
  }

  function closeDropdown() {
    isDropdownOpen = false;
    dropdownPanel.classList.add('hidden');
    selectTriggerBtn.setAttribute('aria-expanded', 'false');
  }

  async function loadAttendanceOptions() {
    try {
      const result = await request('/employees/attendance-options');
      if (typeof result.server_timestamp_ms === 'number') {
        serverOffsetMs = result.server_timestamp_ms - Date.now();
      }
      employees = Array.isArray(result.data) ? result.data : [];
      updateTypeUI();
    } catch (error) {
      showFormError(error.message || 'Gagal memuat daftar karyawan dari server.');
    }
  }

  // =========================================================================
  // Kanvas Tanda Tangan Digital (High-DPI Mouse & Touch)
  // =========================================================================
  const ctx = canvas.getContext('2d');

  function setupCanvasResolution() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);

    // Simpan gambar sebelumnya jika sudah ada goresan saat resize
    let previousDataUrl = null;
    if (hasDrawnSignature && canvas.width > 0 && canvas.height > 0) {
      previousDataUrl = canvas.toDataURL('image/png');
    }

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Isi latar putih bersih agar hasil PNG jelas saat pratinjau di modal Admin
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.4;

    if (previousDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = previousDataUrl;
    }
  }

  function clearSignatureCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasDrawnSignature = false;
    isDrawing = false;
    lastPoint = null;
    canvasPlaceholder.classList.remove('hidden');
    signatureStatusBadge.className =
      'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500';
    signatureStatusBadge.textContent = 'Belum ditandatangani';
  }

  function markSignatureActive() {
    if (!hasDrawnSignature) {
      hasDrawnSignature = true;
      canvasPlaceholder.classList.add('hidden');
      signatureStatusBadge.className =
        'inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-[#059669]';
      signatureStatusBadge.innerHTML =
        '<span class="h-1.5 w-1.5 rounded-full bg-[#059669]"></span>Tanda tangan siap';
      showFormError('');
    }
  }

  function getCanvasCoordinates(evt) {
    const rect = canvas.getBoundingClientRect();
    let clientX;
    let clientY;
    if (evt.touches && evt.touches.length > 0) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    } else {
      clientX = evt.clientX;
      clientY = evt.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function handlePointerStart(evt) {
    if (evt.cancelable) evt.preventDefault();
    isDrawing = true;
    const pt = getCanvasCoordinates(evt);
    lastPoint = pt;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    markSignatureActive();
  }

  function handlePointerMove(evt) {
    if (!isDrawing) return;
    if (evt.cancelable) evt.preventDefault();
    const pt = getCanvasCoordinates(evt);

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    const midX = (lastPoint.x + pt.x) / 2;
    const midY = (lastPoint.y + pt.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    lastPoint = pt;
    markSignatureActive();
  }

  function handlePointerEnd() {
    if (!isDrawing) return;
    isDrawing = false;
    lastPoint = null;
  }

  canvas.addEventListener('mousedown', handlePointerStart);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerEnd);

  canvas.addEventListener('touchstart', handlePointerStart, { passive: false });
  canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
  window.addEventListener('touchend', handlePointerEnd);

  btnClearCanvas.addEventListener('click', () => {
    clearSignatureCanvas();
  });

  window.addEventListener('resize', () => {
    setupCanvasResolution();
  });

  // =========================================================================
  // Event Listeners UI
  // =========================================================================
  btnTypeMasuk.addEventListener('click', () => {
    if (selectedType !== 'MASUK') {
      selectedType = 'MASUK';
      updateTypeUI();
    }
  });

  btnTypePulang.addEventListener('click', () => {
    if (selectedType !== 'PULANG') {
      selectedType = 'PULANG';
      updateTypeUI();
    }
  });

  selectTriggerBtn.addEventListener('click', () => {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value || '';
    renderDropdownOptions();
  });

  optionsListEl.addEventListener('click', (e) => {
    const item = e.target.closest('li[data-emp-id]');
    if (!item) return;
    if (item.dataset.disabled === 'true') {
      showToast('Karyawan ini sudah melakukan absensi untuk jenis ini pada hari ini.', 'warning');
      return;
    }
    const empId = Number(item.dataset.empId);
    const found = employees.find((emp) => emp.id === empId);
    if (found) {
      selectedEmployee = found;
      searchQuery = '';
      searchInput.value = '';
      renderSelectedEmployeeTrigger();
      closeDropdown();
      showFormError('');
    }
  });

  document.addEventListener('click', (e) => {
    if (
      isDropdownOpen &&
      !dropdownPanel.contains(e.target) &&
      !selectTriggerBtn.contains(e.target)
    ) {
      closeDropdown();
    }
  });

  // Submit Absensi
  attendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFormError('');

    if (!selectedEmployee) {
      const msg = 'Silakan pilih nama karyawan terlebih dahulu.';
      showFormError(msg);
      showToast(msg, 'warning');
      openDropdown();
      return;
    }

    if (!hasDrawnSignature) {
      const msg = 'Tanda tangan digital wajib diisi pada kanvas sebelum mengirim absensi.';
      showFormError(msg);
      showToast(msg, 'warning');
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');

    submitBtn.disabled = true;
    const originalLabel = submitBtnLabel.textContent;
    submitBtnLabel.textContent = 'Memproses Absensi...';

    try {
      const response = await request('/attendances', {
        method: 'POST',
        body: {
          employee_id: selectedEmployee.id,
          attendance_type: selectedType,
          signature_image: signatureDataUrl
        }
      });

      const data = response.data;

      // Isi Modal Bukti Absensi
      receiptNameEl.textContent = data.full_name;
      receiptCodeEl.textContent = data.employee_code || selectedEmployee.employee_code;
      receiptTypeEl.textContent = data.attendance_type === 'PULANG' ? 'Absen Pulang' : 'Absen Masuk';
      receiptDateEl.textContent = `${formatTanggalLengkap(data.attendance_date)} (${data.attendance_date})`;
      receiptTimeEl.textContent = `${data.check_time || data.attendance_time} WIB`;
      receiptStatusEl.innerHTML = renderStatusBadge(data.status);

      if (data.signature_path) {
        receiptSignatureImg.src = data.signature_path;
        receiptSignatureImg.classList.remove('hidden');
      }

      receiptModal.classList.remove('hidden');
      showToast('Absensi berhasil tercatat!', 'success');

      // Reset pilihan & kanvas serta muat ulang status terbaru dari server
      selectedEmployee = null;
      clearSignatureCanvas();
      await loadAttendanceOptions();
    } catch (error) {
      showFormError(error.message || 'Gagal mengirim data absensi.');
      showToast(error.message || 'Gagal mengirim data absensi.', 'error');
      // Refresh opsi karyawan jika terjadi 409 Conflict
      if (error.status === 409) {
        await loadAttendanceOptions();
      }
    } finally {
      submitBtn.disabled = false;
      submitBtnLabel.textContent =
        selectedType === 'PULANG' ? 'Kirim Absensi Pulang' : 'Kirim Absensi Masuk';
    }
  });

  btnCloseReceipt.addEventListener('click', () => {
    receiptModal.classList.add('hidden');
  });

  receiptModal.addEventListener('click', (e) => {
    if (e.target === receiptModal) {
      receiptModal.classList.add('hidden');
    }
  });

  // Inisialisasi awal
  setupCanvasResolution();
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
  loadAttendanceOptions();
});
