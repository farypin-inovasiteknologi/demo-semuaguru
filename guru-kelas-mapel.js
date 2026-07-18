
function loadJadwal() {
  apiCall('readData', ['Jadwal']).then(d => {
    appState.jadwalData = d;
    populateJadwalFilters(d);
    renderTabelJadwal();
    hideLoader();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function populateJadwalFilters(data) {
  const kelasSet = new Set();
  const mapelSet = new Set();

  // Mengambil daftar Kelas dan Mapel dari relasi kamar, BUKAN dari jadwal yang sudah ada
  (appState.relasi || []).forEach(r => {
    if (r.Tipe_Mode === 'Guru Kelas') {
      if (r.Induk) kelasSet.add(r.Induk);
      if (r.Anak) mapelSet.add(r.Anak);
    } else if (r.Tipe_Mode === 'Guru Mapel') {
      if (r.Anak) kelasSet.add(r.Anak);
      if (r.Induk) mapelSet.add(r.Induk);
    }
  });

  const selKelas = document.getElementById('filter-jadwal-kelas');
  const selMapel = document.getElementById('filter-jadwal-mapel');

  if (selKelas) {
    selKelas.innerHTML = '<option value="">Semua Kelas</option>' +
      Array.from(kelasSet).sort().map(k => `<option value="${k}">${k}</option>`).join('');
  }
  if (selMapel) {
    selMapel.innerHTML = '<option value="">Semua Mapel</option>' +
      Array.from(mapelSet).sort().map(m => `<option value="${m}">${m}</option>`).join('');
  }
}

function renderTabelJadwal() {
  const tb = document.getElementById('tbody-Jadwal');
  if (!tb) return;

  let filtered = (appState.jadwalData || []).filter(j => j.Tahun_Ajaran === appState.activeTA);

  const filterBulan = document.getElementById('filter-jadwal-tanggal') ? document.getElementById('filter-jadwal-tanggal').value : '';
  const filterKelas = document.getElementById('filter-jadwal-kelas') ? document.getElementById('filter-jadwal-kelas').value : '';
  const filterMapel = document.getElementById('filter-jadwal-mapel') ? document.getElementById('filter-jadwal-mapel').value : '';
  const perPageStr = document.getElementById('jadwal-per-page') ? document.getElementById('jadwal-per-page').value : '10';
  const perPage = parseInt(perPageStr, 10) || 10;

  if (filterBulan) {
    const [fYear, fMonth] = filterBulan.split('-');
    filtered = filtered.filter(j => {
      let t = j.Tanggal || '';
      if (t.startsWith(filterBulan)) return true; // YYYY-MM-DD
      if (t.includes('/')) {
        const parts = t.split('/');
        if (parts.length === 3) {
          let m = parts[1].padStart(2, '0');
          let y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          if (`${y}-${m}` === filterBulan) return true;
        }
      }
      return false;
    });
  }
  if (filterKelas) filtered = filtered.filter(j => j.Kelas === filterKelas);
  if (filterMapel) filtered = filtered.filter(j => j.Mapel === filterMapel);

  // Sorting descending by ID or Tanggal (assuming newest first)
  filtered = filtered.reverse().slice(0, perPage);

  tb.innerHTML = filtered.length ? '' : '<tr><td colspan="7" class="text-center">Belum ada jadwal</td></tr>';
  filtered.forEach(j => {
    tb.innerHTML += `<tr>
          <td class="text-center"><button class="btn btn-primary btn-sm fw-bold" onclick="bukaJadwal('${j.ID}')"><i class="fa-solid fa-door-open"></i> BUKA</button></td>
          <td>${j.Tanggal}</td><td>${j.Hari}</td><td>${j.Jam}</td><td>${j.Kelas}</td><td>${j.Mapel}</td>
          <td>
            <button class="btn btn-sm btn-info text-white" onclick="lihatJadwal('${j.ID}')"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-sm btn-warning text-dark" onclick="editJadwal('${j.ID}')"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="hapusRecord('Jadwal','${j.ID}', loadJadwal)"><i class="fa-solid fa-trash"></i></button>
          </td></tr>`;
  });
}

async function exportDaftarAgenda() {
  let filtered = (appState.jadwalData || []).filter(j => j.Tahun_Ajaran === appState.activeTA);

  const filterBulan = document.getElementById('filter-jadwal-tanggal') ? document.getElementById('filter-jadwal-tanggal').value : '';
  const filterKelas = document.getElementById('filter-jadwal-kelas') ? document.getElementById('filter-jadwal-kelas').value : '';
  const filterMapel = document.getElementById('filter-jadwal-mapel') ? document.getElementById('filter-jadwal-mapel').value : '';

  if (filterBulan) {
    const [fYear, fMonth] = filterBulan.split('-');
    filtered = filtered.filter(j => {
      let t = j.Tanggal || '';
      if (t.startsWith(filterBulan)) return true;
      if (t.includes('/')) {
        const parts = t.split('/');
        if (parts.length === 3) {
          let m = parts[1].padStart(2, '0');
          let y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          if (m === fMonth && y === fYear) return true;
        }
      }
      return false;
    });
  }
  if (filterKelas) filtered = filtered.filter(j => j.Kelas === filterKelas);
  if (filterMapel) filtered = filtered.filter(j => j.Mapel === filterMapel);

  filtered.sort((a, b) => {
    let tA = a.Tanggal || '';
    let tB = b.Tanggal || '';
    return tA > tB ? 1 : -1;
  });

  if (!filtered.length) return Swal.fire('Info', 'Tidak ada data agenda/jadwal untuk diexport.', 'info');

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Agenda Mengajar');
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'DAFTAR AGENDA MENGAJAR (JURNAL)';
    worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `TAHUN AJARAN: ${appState.activeTA}`;
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.columns = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 15 }, { width: 25 }
    ];

    worksheet.getRow(4).values = ['NO', 'TANGGAL', 'HARI', 'JAM KE', 'KELAS', 'MATA PELAJARAN'];
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    });

    filtered.forEach((d, idx) => {
      const row = worksheet.addRow([
        idx + 1, d.Tanggal, d.Hari, d.Jam, d.Kelas, d.Mapel
      ]);
      row.eachCell((cell) => {
        cell.font = normalFont; cell.border = borderStyle;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Daftar_Agenda_Mengajar_${appState.activeTA.replace('/', '-')}.xlsx`;
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e); hideLoader(); Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

let activeUploadId = null;
let activeUploadType = null;

function triggerUploadArsip(id, type) {
  activeUploadId = id;
  activeUploadType = type;
  const fileInput = document.getElementById('arsip-file-input');
  if (fileInput) {
    fileInput.value = ''; // Reset
    fileInput.click();
  }
}

document.getElementById('arsip-file-input')?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    Swal.fire('Terlalu Besar', 'Ukuran file maksimal 3MB', 'error');
    return;
  }

  showLoader();
  const reader = new FileReader();
  reader.onload = function (evt) {
    const result = evt.target.result;
    const base64Data = result.split(',')[1];

    apiCall('uploadFileToDrive', [base64Data, file.name, file.type, activeUploadId, activeUploadType]).then(res => {
      hideLoader();
      if (res.success) {
        Swal.fire('Sukses', 'Arsip berhasil diunggah!', 'success');
        apiCall('readData', ['Jadwal']).then(d => {
          appState.jadwalData = d;
          if (document.getElementById('modalBukaJadwal').classList.contains('show')) {
            bukaJadwal(activeUploadId);
          }
        });
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
  };
  reader.readAsDataURL(file);
});

function lihatJadwal(id) {
  const j = appState.jadwalData.find(x => x.ID === id);
  if (!j) return;
  const html = `
      <div class="container-fluid text-start" style="font-size:0.95rem;">
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Tanggal</div><div class="col-7">${j.Tanggal}</div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Hari</div><div class="col-7">${j.Hari}</div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Jam Ke</div><div class="col-7"><span class="badge bg-info text-dark">${j.Jam}</span></div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Kelas</div><div class="col-7"><span class="badge bg-primary">${j.Kelas}</span></div></div>
        <div class="row py-2"><div class="col-5 fw-bold text-muted">Mapel</div><div class="col-7">${j.Mapel}</div></div>
      </div>
    `;
  Swal.fire({ title: '<i class="fa-solid fa-calendar-day text-primary"></i> Detail Jadwal', html: html, width: '500px', showConfirmButton: false, showCloseButton: true });
}

function editJadwal(id) {
  const j = appState.jadwalData.find(x => x.ID === id);
  if (!j) return;
  document.getElementById('jadwal-id').value = j.ID;
  document.getElementById('jadwal-tgl').value = j.Tanggal;
  document.getElementById('jadwal-hari').value = j.Hari;
  document.getElementById('jadwal-jam').value = j.Jam;
  document.getElementById('jadwal-kelas').value = j.Kelas;
  updateDependentDropdown('kelas', 'jadwal-kelas', 'jadwal-mapel');
  setTimeout(() => { document.getElementById('jadwal-mapel').value = j.Mapel; }, 500);
  openModal('modalJadwal');
}
function bukaModalTambahJadwal() {
  document.querySelector('#modalJadwal form').reset();
  document.getElementById('jadwal-id').value = '';
  openModal('modalJadwal');
}

function bukaJadwal(id) {
  const j = appState.jadwalData.find(x => x.ID === id);
  if (!j) return;

  // Set Header Info
  document.getElementById('buka-info-hari').innerText = j.Hari;
  document.getElementById('buka-info-tanggal').innerText = j.Tanggal;
  document.getElementById('buka-info-jam').innerText = j.Jam;
  document.getElementById('buka-info-kelas').innerText = j.Kelas;
  document.getElementById('buka-info-mapel').innerText = j.Mapel;

  const modalEl = document.getElementById('modalBukaJadwal');
  if (!modalEl.classList.contains('show')) {
    openModal('modalBukaJadwal');
  }

  // Arsip UI
  renderFileArsipActions(id, 'RPP', j.File_RPP, 'buka-arsip-rpp');
  renderFileArsipActions(id, 'Materi', j.File_Materi, 'buka-arsip-materi');
  renderFileArsipActions(id, 'LKPD', j.File_LKPD, 'buka-arsip-lkpd');
  renderFileArsipActions(id, 'Lainnya', j.File_Lainnya, 'buka-arsip-lainnya');

  // Trigger Loads
  loadFormRencanaAjar(j);
  loadAbsensiMatrix();
  loadNilaiMatrix();
  loadFormJurnal();
}

let currentJadwalId = null;

function loadFormRencanaAjar(j) {
  currentJadwalId = j.ID;
  document.getElementById('buka-rencana-materi-utama').value = j.Materi_Utama || '';
  document.getElementById('buka-rencana-sub-materi').value = j.Sub_Materi || '';
  document.getElementById('buka-rencana-materi-diajarkan').value = j.Materi_Diajarkan || '';
  document.getElementById('buka-rencana-model').value = j.Model_Belajar || '';
  document.getElementById('buka-rencana-metode').value = j.Metode_Belajar || '';
  document.getElementById('buka-rencana-gaya').value = j.Gaya_Belajar || '';
  document.getElementById('buka-rencana-media').value = j.Media_Belajar || '';

  syncRencanaToJurnal();
}

function syncRencanaToJurnal() {
  const utama = document.getElementById('buka-rencana-materi-utama').value;
  const sub = document.getElementById('buka-rencana-sub-materi').value;
  const diajarkan = document.getElementById('buka-rencana-materi-diajarkan').value;

  let result = [];
  if (utama) result.push(utama);
  if (sub) result.push(sub);
  if (diajarkan) result.push(diajarkan);

  const target = document.getElementById('buka-jur-materi');
  const targetUH = document.getElementById('buka-uh-materi');
  const combined = result.join(' - ');

  if (target) {
    target.value = combined;
  }
  if (targetUH) {
    targetUH.value = combined;
  }
}

function simpanRencanaAjar(silent = false) {
  if (!currentJadwalId) return;
  const materiDiajarkan = document.getElementById('buka-rencana-materi-diajarkan').value;
  if (!materiDiajarkan && !silent) {
    Swal.fire('Peringatan', 'Materi yang diajarkan wajib diisi.', 'warning');
    return;
  }

  const j = appState.jadwalData.find(x => x.ID === currentJadwalId);
  if (j) {
    j.Materi_Utama = document.getElementById('buka-rencana-materi-utama').value;
    j.Sub_Materi = document.getElementById('buka-rencana-sub-materi').value;
    j.Materi_Diajarkan = materiDiajarkan;
    j.Model_Belajar = document.getElementById('buka-rencana-model').value;
    j.Metode_Belajar = document.getElementById('buka-rencana-metode').value;
    j.Gaya_Belajar = document.getElementById('buka-rencana-gaya').value;
    j.Media_Belajar = document.getElementById('buka-rencana-media').value;

    // Sync ke Materi Harian (UH) juga
    j.Materi_Harian = document.getElementById('buka-jur-materi').value;

    apiCall('insertData', ['Jadwal', j]).then(res => {
      if (res.success) {
        if (!silent) Swal.fire({ title: 'Rencana Ajar Tersimpan!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      }
    });

    // Auto-save Jurnal juga
    if (typeof simpanJurnalDariModal === 'function') {
      simpanJurnalDariModal(true);
    }
  }
}



function renderFileArsipActions(jadwalId, type, url, elementId) {
  const el = document.getElementById(elementId);
  if (url) {
    el.innerHTML = `
        <a href="${url}" target="_blank" class="btn btn-sm btn-success"><i class="fa-solid fa-file-pdf"></i> Lihat File</a>
        <button class="btn btn-sm btn-danger ms-1" onclick="hapusFileUrl('${jadwalId}', '${type}')"><i class="fa-solid fa-times"></i></button>
      `;
  } else {
    el.innerHTML = `<button class="btn btn-sm btn-outline-primary" onclick="triggerUploadArsip('${jadwalId}', '${type}')"><i class="fa-solid fa-upload"></i> Upload</button>`;
  }
}

function hapusFileUrl(jadwalId, type) {
  if (!confirm('Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.\n\nApakah Anda yakin ingin menghapus file ini?')) return;
  apiCall('hapusFileArsip', [jadwalId, type]).then((res) => {
    if (res.success) {
      showToast('File berhasil dihapus dari sistem.');
      apiCall('readData', ['Jadwal']).then(d => {
        appState.jadwalData = d;
        bukaJadwal(jadwalId);
      }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
    } else {
      Swal.fire('Error', res.message, 'error');
    }
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

// ==========================================
// PROGRAM GURU
// ==========================================
let programGuruData = [];
let arsipPGData = {};

async function loadProgramGuru() {
  try {
    const data = await apiCall('readData', ['Program_Guru']);
    programGuruData = data.filter(d => d.Tahun_Ajaran === appState.activeTA);
  } catch (e) { console.error("Gagal load Program Guru:", e); programGuruData = []; }

  try {
    const arsip = await apiCall('readData', ['Arsip_PG']);
    const myArsip = arsip.filter(d => d.Tahun_Ajaran === appState.activeTA);
    if (myArsip.length > 0) arsipPGData = myArsip[0];
  } catch (e) { console.error("Gagal load Arsip PG:", e); arsipPGData = {}; }

  renderArsipPGUI();
  populatePGFilters();
  renderTabelProgramGuru();
}

function renderArsipPGUI() {
  const items = [
    { id: 'silabus', field: 'Silabus' },
    { id: 'prota', field: 'Prota' },
    { id: 'promes', field: 'Promes' }
  ];

  items.forEach(item => {
    const btnLihat = document.getElementById(`btn-lihat-pg-${item.id}`);
    const btnHapus = document.getElementById(`btn-hapus-pg-${item.id}`);
    const statusText = document.getElementById(`status-pg-${item.id}`);

    if (arsipPGData[item.field] && arsipPGData[item.field].length > 100) {
      statusText.innerHTML = '<i class="fa-solid fa-check"></i> File sudah diunggah';
      statusText.classList.replace('bg-secondary', 'bg-success');
      if (btnLihat) btnLihat.style.display = 'inline-block';
      if (btnHapus) btnHapus.style.display = 'inline-block';
    } else {
      statusText.innerHTML = '<i class="fa-solid fa-xmark"></i> Belum ada file';
      statusText.classList.replace('bg-success', 'bg-secondary');
      if (btnLihat) btnLihat.style.display = 'none';
      if (btnHapus) btnHapus.style.display = 'none';
    }
  });
}

async function uploadArsipPG(jenisFile, inputElem) {
  if (!inputElem.files || inputElem.files.length === 0) return;
  const file = inputElem.files[0];

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire('Peringatan', 'Ukuran file maksimal 5MB.', 'warning');
    inputElem.value = '';
    return;
  }

  showLoader('Mengunggah ' + jenisFile + '...');
  try {
    const base64Data = await getBase64(file);
    let record = Object.keys(arsipPGData).length > 0 ? { ...arsipPGData } : { ID: generateId(), Tahun_Ajaran: appState.activeTA };

    record[jenisFile] = base64Data;

    await apiCall('insertData', ['Arsip_PG', record]);
    hideLoader();
    showToast(`${jenisFile} berhasil diunggah.`);
    loadProgramGuru();
  } catch (err) {
    hideLoader();
    Swal.fire('Error', err.message || 'Gagal mengunggah file', 'error');
  }
  inputElem.value = '';
}

function lihatArsipPG(jenisFile) {
  if (!arsipPGData[jenisFile]) {
    Swal.fire('Info', 'File tidak ditemukan.', 'info');
    return;
  }
  const base64Data = arsipPGData[jenisFile];
  try {
    if (base64Data.indexOf('data:application/pdf') === 0) {
      const win = window.open();
      win.document.write(`<iframe src="${base64Data}" width="100%" height="100%" style="border:none; margin:0; padding:0;"></iframe>`);
    } else {
      const a = document.createElement('a');
      a.href = base64Data;
      a.download = `${jenisFile}_${appState.activeTA.replace('/', '-')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    Swal.fire('Error', 'Browser memblokir popup.', 'error');
  }
}

async function hapusArsipPG(jenisFile) {
  if (!arsipPGData[jenisFile]) return;

  const res = await Swal.fire({
    title: 'Hapus File?',
    html: `<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Apakah Anda yakin ingin menghapus file ${jenisFile.replace('_', ' ')}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus'
  });

  if (res.isConfirmed) {
    showLoader('Menghapus...');
    try {
      let record = { ...arsipPGData };
      record[jenisFile] = null;
      await apiCall('insertData', ['Arsip_PG', record]);
      hideLoader();
      Swal.fire('Berhasil', 'File berhasil dihapus.', 'success');
      loadProgramGuru();
    } catch (e) {
      hideLoader();
      Swal.fire('Error', e.message || 'Gagal menghapus file', 'error');
    }
  }
}

function populatePGFilters() {
  const mapelSet = new Set();
  const kelasSet = new Set();
  (appState.relasi || []).forEach(r => {
    if (r.Tipe_Mode === 'Guru Kelas') {
      if (r.Induk) kelasSet.add(r.Induk);
      if (r.Anak) mapelSet.add(r.Anak);
    } else if (r.Tipe_Mode === 'Guru Mapel') {
      if (r.Anak) kelasSet.add(r.Anak);
      if (r.Induk) mapelSet.add(r.Induk);
    }
  });

  const selKelas = document.getElementById('filter-pg-kelas');
  const selMapel = document.getElementById('filter-pg-mapel');
  if (selKelas) selKelas.innerHTML = '<option value="">Semua Kelas</option>' + Array.from(kelasSet).sort().map(k => `<option value="${k}">${k}</option>`).join('');
  if (selMapel) selMapel.innerHTML = '<option value="">Semua Mapel</option>' + Array.from(mapelSet).sort().map(m => `<option value="${m}">${m}</option>`).join('');
}

function renderTabelProgramGuru() {
  const tb = document.getElementById('tbody-program-guru');
  if (!tb) return;

  const cMapel = document.getElementById('filter-pg-mapel')?.value || '';
  const cKelas = document.getElementById('filter-pg-kelas')?.value || '';
  const cJenis = document.getElementById('filter-pg-jenis')?.value || '';

  let data = programGuruData
    .filter(d => !cMapel || d.Mapel === cMapel)
    .filter(d => !cKelas || d.Kelas === cKelas)
    .filter(d => !cJenis || d.Jenis_Program === cJenis)
    .sort((a, b) => b.ID > a.ID ? 1 : -1);

  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Belum ada Program Guru.</td></tr>';
    return;
  }

  tb.innerHTML = data.map((d, idx) => {
    return `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${d.Jenis_Program}</strong></td>
      <td>${d.Mapel}</td>
      <td>${d.Kelas}</td>
      <td class="text-start">${d.Materi}</td>
      <td>${d.Alokasi_Waktu}</td>
      <td>${d.Bulan_Pelaksanaan}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusRecord('Program_Guru','${d.ID}', loadProgramGuru)"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function bukaModalProgramGuru() {
  refreshDropdowns();
  document.getElementById('pg-id').value = '';
  document.getElementById('pg-jenis').value = 'Tahunan';
  document.getElementById('pg-mapel').value = '';
  document.getElementById('pg-kelas').value = '';
  document.getElementById('pg-materi').value = '';
  document.getElementById('pg-waktu').value = '';
  document.getElementById('pg-bulan').value = '';
  openModal('modalProgramGuru');
}

async function simpanProgramGuru() {
  const id = document.getElementById('pg-id').value || generateId();
  const jenis = document.getElementById('pg-jenis').value;
  const mapel = document.getElementById('pg-mapel').value;
  const kelas = document.getElementById('pg-kelas').value;
  const materi = document.getElementById('pg-materi').value;
  const waktu = document.getElementById('pg-waktu').value;
  const bulan = document.getElementById('pg-bulan').value;

  if (!materi || !mapel || !kelas || !bulan) {
    return Swal.fire('Error', 'Harap isi Mapel, Kelas, Materi, dan Bulan Pelaksanaan', 'error');
  }

  showLoader();
  const record = {
    ID: id,
    Tahun_Ajaran: appState.activeTA,
    Jenis_Program: jenis,
    Mapel: mapel,
    Kelas: kelas,
    Materi: materi,
    Alokasi_Waktu: waktu,
    Bulan_Pelaksanaan: bulan
  };

  try {
    await apiCall('insertData', ['Program_Guru', record]);
    showToast('Program Guru ditambahkan');
    hideLoader();
    closeAndCleanModal('modalProgramGuru');
    loadProgramGuru();
  } catch (e) {
    hideLoader(); Swal.fire('Error', e.message, 'error');
  }
}

async function exportProgramGuru() {
  const cMapel = document.getElementById('filter-pg-mapel')?.value || '';
  const cKelas = document.getElementById('filter-pg-kelas')?.value || '';
  const cJenis = document.getElementById('filter-pg-jenis')?.value || '';

  let data = programGuruData
    .filter(d => !cMapel || d.Mapel === cMapel)
    .filter(d => !cKelas || d.Kelas === cKelas)
    .filter(d => !cJenis || d.Jenis_Program === cJenis)
    .sort((a, b) => b.ID > a.ID ? 1 : -1);

  if (!data.length) return Swal.fire('Info', 'Tidak ada data program guru untuk diexport.', 'info');

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Program Guru');
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = 'DAFTAR PROGRAM GURU';
    worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `TAHUN AJARAN: ${appState.activeTA}`;
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.columns = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 35 }, { width: 15 }, { width: 20 }
    ];

    worksheet.getRow(4).values = ['NO', 'JENIS PROGRAM', 'MATA PELAJARAN', 'KELAS', 'MATERI POKOK', 'ALOKASI WAKTU', 'BULAN PELAKSANAAN'];
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    });

    data.forEach((d, idx) => {
      const row = worksheet.addRow([
        idx + 1, d.Jenis_Program, d.Mapel, d.Kelas, d.Materi, d.Alokasi_Waktu, d.Bulan_Pelaksanaan
      ]);
      row.eachCell((cell) => {
        cell.font = normalFont; cell.border = borderStyle;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Daftar_Program_Guru_${appState.activeTA.replace('/', '-')}.xlsx`;
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e); hideLoader(); Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

// ==========================================
// REMEDIAL & PENGAYAAN
// ==========================================
let remedialData = [];

async function loadRemedial() {
  try {
    const data = await apiCall('readData', ['Remedial']);
    remedialData = data.filter(d => d.Tahun_Ajaran === appState.activeTA);
  } catch (e) { console.error("Gagal load Remedial:", e); remedialData = []; }

  populateRemedialFilters();
  renderTabelRemedial();
}

function populateRemedialFilters() {
  const mapelSet = new Set();
  (appState.relasi || []).forEach(r => {
    if (r.Tipe_Mode === 'Guru Kelas' && r.Anak) mapelSet.add(r.Anak);
    if (r.Tipe_Mode === 'Guru Mapel' && r.Induk) mapelSet.add(r.Induk);
  });
  const selMapel = document.getElementById('filter-rem-mapel');
  if (selMapel) selMapel.innerHTML = '<option value="">Semua Mapel</option>' + Array.from(mapelSet).sort().map(m => `<option value="${m}">${m}</option>`).join('');
}

function renderTabelRemedial() {
  const tb = document.getElementById('tbody-remedial');
  if (!tb) return;

  const cBulan = document.getElementById('filter-rem-bulan')?.value || '';
  const cMapel = document.getElementById('filter-rem-mapel')?.value || '';
  const cKelas = document.getElementById('filter-rem-kelas')?.value || '';

  let data = remedialData
    .filter(d => !cMapel || d.Mapel === cMapel)
    .filter(d => !cKelas || d.Kelas === cKelas)
    .filter(d => {
      if (!cBulan) return true;
      return d.Tanggal && d.Tanggal.startsWith(cBulan);
    })
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">Belum ada data Remedial/Pengayaan.</td></tr>';
    return;
  }

  tb.innerHTML = data.map((d, idx) => {
    let statClass = 'bg-secondary';
    if (d.Status === 'Tuntas') statClass = 'bg-success';
    if (d.Status === 'Belum Tuntas') statClass = 'bg-danger';

    let jenisClass = d.Jenis_Kegiatan === 'Remedial' ? 'text-danger' : 'text-primary';

    return `
    <tr>
      <td>${idx + 1}</td>
      <td>${d.Tanggal}</td>
      <td><strong>${d.Kelas}</strong><br><small class="text-muted">${d.Mapel}</small></td>
      <td class="text-start">${d.Materi}</td>
      <td class="fw-bold ${jenisClass}">${d.Jenis_Kegiatan}</td>
      <td class="text-start">${d.Nama_Siswa}</td>
      <td>${d.Nilai_Awal || '-'}</td>
      <td>${d.Nilai_Akhir || '-'}</td>
      <td><span class="badge ${statClass}">${d.Status}</span></td>
      <td>
        <div class="d-flex justify-content-center gap-1">
            <button class="btn btn-sm btn-info text-white" onclick="lihatRemedial('${d.ID}')" title="Lihat"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-sm btn-warning" onclick="editRemedial('${d.ID}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-sm btn-success" onclick="printRemedial('${d.ID}')" title="Unduh Excel"><i class="fa-solid fa-file-excel"></i></button>
            <button class="btn btn-sm btn-danger" onclick="hapusRecord('Remedial','${d.ID}', loadRemedial)" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

let tempRemedialSiswa = [];

function bukaModalRemedial() {
  refreshDropdowns();
  document.getElementById('rem-id').value = '';
  document.getElementById('rem-tanggal').value = '';
  document.getElementById('rem-mapel').value = '';
  document.getElementById('rem-kelas').value = '';
  document.getElementById('rem-materi').value = '';
  document.getElementById('rem-jenis').value = 'Remedial';
  document.getElementById('rem-cari-siswa').value = '';
  document.getElementById('rem-hasil-cari-siswa').style.display = 'none';

  tempRemedialSiswa = [];
  renderTempRemedialSiswa();
  openModal('modalRemedial');
}

function cariSiswaRemedial() {
  const input = document.getElementById('rem-cari-siswa').value.toLowerCase();
  const kelas = document.getElementById('rem-kelas').value;
  const hasilContainer = document.getElementById('rem-hasil-cari-siswa');

  if (!kelas) {
    hasilContainer.innerHTML = '<li class="list-group-item text-danger small">Pilih Kelas terlebih dahulu</li>';
    hasilContainer.style.display = 'block';
    return;
  }

  if (input.length < 2) {
    hasilContainer.style.display = 'none';
    return;
  }

  const siswaMatches = (appState.siswa || [])
    .filter(s => s.Kelas === kelas && s.Nama.toLowerCase().includes(input))
    .slice(0, 3); // Max 3 list

  if (siswaMatches.length === 0) {
    hasilContainer.innerHTML = '<li class="list-group-item text-muted small">Tidak ditemukan</li>';
    hasilContainer.style.display = 'block';
    return;
  }

  hasilContainer.innerHTML = siswaMatches.map(s =>
    `<li class="list-group-item list-group-item-action py-2" style="cursor:pointer;" onclick="pilihSiswaRemedial('${s.NIS}', '${s.Nama.replace(/'/g, "\\'")}')">
            <strong>${s.Nama}</strong> <small class="text-muted">(${s.NIS})</small>
        </li>`
  ).join('');
  hasilContainer.style.display = 'block';
}

function pilihSiswaRemedial(nis, nama) {
  if (tempRemedialSiswa.find(s => s.NIS === nis)) {
    Swal.fire('Info', 'Siswa sudah ada di daftar', 'info');
    return;
  }

  tempRemedialSiswa.push({
    NIS: nis,
    Nama: nama,
    Nilai_Awal: '',
    Nilai_Akhir: '',
    Status: 'Tuntas'
  });

  document.getElementById('rem-cari-siswa').value = '';
  document.getElementById('rem-hasil-cari-siswa').style.display = 'none';
  renderTempRemedialSiswa();
}

function hapusTempRemedialSiswa(idx) {
  tempRemedialSiswa.splice(idx, 1);
  renderTempRemedialSiswa();
}

function renderTempRemedialSiswa() {
  const tb = document.getElementById('tbody-rem-siswa-temp');
  if (!tb) return;

  if (tempRemedialSiswa.length === 0) {
    tb.innerHTML = '<tr><td colspan="6" class="text-muted py-3">Pilih siswa melalui kotak pencarian di atas.</td></tr>';
    return;
  }

  tb.innerHTML = tempRemedialSiswa.map((d, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td class="text-start">${d.Nama}</td>
            <td><input type="number" class="form-control form-control-sm" value="${d.Nilai_Awal}" onchange="tempRemedialSiswa[${idx}].Nilai_Awal = this.value"></td>
            <td><input type="number" class="form-control form-control-sm" value="${d.Nilai_Akhir}" onchange="tempRemedialSiswa[${idx}].Nilai_Akhir = this.value"></td>
            <td>
                <select class="form-select form-select-sm" onchange="tempRemedialSiswa[${idx}].Status = this.value">
                    <option value="Tuntas" ${d.Status === 'Tuntas' ? 'selected' : ''}>Tuntas</option>
                    <option value="Belum Tuntas" ${d.Status === 'Belum Tuntas' ? 'selected' : ''}>Belum Tuntas</option>
                </select>
            </td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusTempRemedialSiswa(${idx})"><i class="fa-solid fa-times"></i></button></td>
        </tr>
    `).join('');
}

async function simpanRemedial() {
  const isEdit = document.getElementById('rem-id').value !== '';
  const id = document.getElementById('rem-id').value;
  const tanggal = document.getElementById('rem-tanggal').value;
  const mapel = document.getElementById('rem-mapel').value;
  const kelas = document.getElementById('rem-kelas').value;
  const materi = document.getElementById('rem-materi').value;
  const jenis = document.getElementById('rem-jenis').value;

  if (!tanggal || !mapel || !kelas || !materi) {
    return Swal.fire('Error', 'Harap isi Tanggal, Mapel, Kelas, dan Materi Pokok / KD', 'error');
  }

  if (tempRemedialSiswa.length === 0) {
    return Swal.fire('Error', 'Harap masukkan minimal 1 siswa', 'error');
  }

  showLoader('Menyimpan Data...');
  try {
    if (isEdit) {
      const d = tempRemedialSiswa[0];
      const record = {
        ID: id,
        Tahun_Ajaran: appState.activeTA,
        Tanggal: tanggal,
        Mapel: mapel,
        Kelas: kelas,
        Materi: materi,
        Jenis_Kegiatan: jenis,
        Nama_Siswa: d.Nama,
        Nilai_Awal: d.Nilai_Awal,
        Nilai_Akhir: d.Nilai_Akhir,
        Status: d.Status
      };
      await apiCall('insertData', ['Remedial', record]);
    } else {
      for (const d of tempRemedialSiswa) {
        const record = {
          ID: generateId(),
          Tahun_Ajaran: appState.activeTA,
          Tanggal: tanggal,
          Mapel: mapel,
          Kelas: kelas,
          Materi: materi,
          Jenis_Kegiatan: jenis,
          Nama_Siswa: d.Nama,
          Nilai_Awal: d.Nilai_Awal,
          Nilai_Akhir: d.Nilai_Akhir,
          Status: d.Status
        };
        await apiCall('insertData', ['Remedial', record]);
      }
    }
    showToast('Data berhasil disimpan');
    hideLoader();
    closeAndCleanModal('modalRemedial');
    loadRemedial();
  } catch (e) {
    hideLoader();
    Swal.fire('Error', e.message, 'error');
  }
}

function editRemedial(id) {
  const data = remedialData.find(d => d.ID === id);
  if (!data) return;
  refreshDropdowns();
  document.getElementById('rem-id').value = data.ID;
  document.getElementById('rem-tanggal').value = data.Tanggal;
  document.getElementById('rem-mapel').value = data.Mapel;
  document.getElementById('rem-kelas').value = data.Kelas;
  document.getElementById('rem-materi').value = data.Materi;
  document.getElementById('rem-jenis').value = data.Jenis_Kegiatan;

  document.getElementById('rem-cari-siswa').value = '';
  document.getElementById('rem-hasil-cari-siswa').style.display = 'none';

  tempRemedialSiswa = [{
    NIS: 'N/A',
    Nama: data.Nama_Siswa,
    Nilai_Awal: data.Nilai_Awal,
    Nilai_Akhir: data.Nilai_Akhir,
    Status: data.Status
  }];
  renderTempRemedialSiswa();

  openModal('modalRemedial');
}

function lihatRemedial(id) {
  const data = remedialData.find(d => d.ID === id);
  if (!data) return;
  Swal.fire({
    title: 'Detail Remedial & Pengayaan',
    html: `
            <table class="table table-sm text-start table-bordered mt-3">
                <tr><th width="35%" class="bg-light">Tanggal</th><td>${data.Tanggal}</td></tr>
                <tr><th class="bg-light">Kelas</th><td>${data.Kelas}</td></tr>
                <tr><th class="bg-light">Mapel</th><td>${data.Mapel}</td></tr>
                <tr><th class="bg-light">Materi</th><td>${data.Materi}</td></tr>
                <tr><th class="bg-light">Jenis</th><td>${data.Jenis_Kegiatan}</td></tr>
                <tr><th class="bg-light">Nama Siswa</th><td class="fw-bold">${data.Nama_Siswa}</td></tr>
                <tr><th class="bg-light">Nilai Awal</th><td>${data.Nilai_Awal || '-'}</td></tr>
                <tr><th class="bg-light">Nilai Akhir</th><td>${data.Nilai_Akhir || '-'}</td></tr>
                <tr><th class="bg-light">Status</th><td>${data.Status}</td></tr>
            </table>
        `,
    icon: 'info'
  });
}

async function printRemedial(id) {
  const data = remedialData.find(d => d.ID === id);
  if (!data) return;

  // Ambil data batch yang sama berdasarkan Tanggal, Kelas, Mapel, Materi, dan Jenis
  const batchData = remedialData.filter(d =>
    d.Tanggal === data.Tanggal &&
    d.Kelas === data.Kelas &&
    d.Mapel === data.Mapel &&
    d.Materi === data.Materi &&
    d.Jenis_Kegiatan === data.Jenis_Kegiatan
  );

  const instansi = document.getElementById('peng-instansi')?.value || 'Pemerintah Daerah';
  const sekolah = document.getElementById('peng-sekolah')?.value || 'Nama Sekolah';
  const namaGuru = document.getElementById('peng-nama-guru')?.value || '( ......................................... )';
  const nipGuru = document.getElementById('peng-nip')?.value || '-';

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Remedial');
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    worksheet.columns = [
      { width: 5 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 25 }
    ];

    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = instansi.toUpperCase();
    worksheet.getCell('A1').font = headerFont;
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = sekolah.toUpperCase();
    worksheet.getCell('A2').font = headerFont;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = "BERITA ACARA PELAKSANAAN " + data.Jenis_Kegiatan.toUpperCase();
    worksheet.getCell('A3').font = { name: 'Arial', size: 12, bold: true };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A4:F4');
    worksheet.getCell('A4').value = "Tahun Ajaran " + appState.activeTA;
    worksheet.getCell('A4').font = normalFont;
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    worksheet.getCell('B6').value = "Guru / Pengajar"; worksheet.getCell('C6').value = ":"; worksheet.mergeCells('D6:F6'); worksheet.getCell('D6').value = namaGuru;
    worksheet.getCell('B7').value = "Waktu / Tanggal"; worksheet.getCell('C7').value = ":"; worksheet.mergeCells('D7:F7'); worksheet.getCell('D7').value = data.Tanggal;
    worksheet.getCell('B8').value = "Mata Pelajaran"; worksheet.getCell('C8').value = ":"; worksheet.mergeCells('D8:F8'); worksheet.getCell('D8').value = data.Mapel;
    worksheet.getCell('B9').value = "Kelas"; worksheet.getCell('C9').value = ":"; worksheet.mergeCells('D9:F9'); worksheet.getCell('D9').value = data.Kelas;
    worksheet.getCell('B10').value = "Materi Pokok / KD"; worksheet.getCell('C10').value = ":"; worksheet.mergeCells('D10:F10'); worksheet.getCell('D10').value = data.Materi;

    const headerRow = worksheet.getRow(12);
    headerRow.values = ['NO', 'NAMA SISWA', 'NILAI AWAL', 'NILAI AKHIR', 'STATUS', 'CATATAN'];
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    });

    let lastRowIdx = 12;
    batchData.forEach((s, idx) => {
      const row = worksheet.addRow([
        idx + 1, s.Nama_Siswa, s.Nilai_Awal || '-', s.Nilai_Akhir || '-', s.Status, ""
      ]);
      row.eachCell((cell) => {
        cell.font = normalFont; cell.border = borderStyle;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      lastRowIdx++;
    });

    const signRowStart = lastRowIdx + 2;
    worksheet.mergeCells(`D${signRowStart}:F${signRowStart}`);
    worksheet.getCell(`D${signRowStart}`).value = "Guru Mata Pelajaran,";
    worksheet.getCell(`D${signRowStart}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`D${signRowStart + 4}:F${signRowStart + 4}`);
    worksheet.getCell(`D${signRowStart + 4}`).value = namaGuru;
    worksheet.getCell(`D${signRowStart + 4}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`D${signRowStart + 5}:F${signRowStart + 5}`);
    worksheet.getCell(`D${signRowStart + 5}`).value = "NIP. " + nipGuru;
    worksheet.getCell(`D${signRowStart + 5}`).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Remedial_${data.Kelas}_${data.Mapel}_${data.Tanggal}.xlsx`;
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e); hideLoader(); Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

async function exportRemedial() {
  const cBulan = document.getElementById('filter-rem-bulan')?.value || '';
  const cMapel = document.getElementById('filter-rem-mapel')?.value || '';
  const cKelas = document.getElementById('filter-rem-kelas')?.value || '';

  let data = remedialData
    .filter(d => !cMapel || d.Mapel === cMapel)
    .filter(d => !cKelas || d.Kelas === cKelas)
    .filter(d => {
      if (!cBulan) return true;
      return d.Tanggal && d.Tanggal.startsWith(cBulan);
    })
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) return Swal.fire('Info', 'Tidak ada data remedial untuk diexport.', 'info');

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Remedial');
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = 'DAFTAR PELAKSANAAN REMEDIAL & PENGAYAAN';
    worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:J2');
    worksheet.getCell('A2').value = `TAHUN AJARAN: ${appState.activeTA}`;
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.columns = [
      { width: 5 }, { width: 15 }, { width: 10 }, { width: 20 }, { width: 30 },
      { width: 15 }, { width: 25 }, { width: 12 }, { width: 12 }, { width: 15 }
    ];

    worksheet.getRow(4).values = ['NO', 'TANGGAL', 'KELAS', 'MATA PELAJARAN', 'MATERI POKOK / KD', 'JENIS KEGIATAN', 'NAMA SISWA', 'NILAI AWAL', 'NILAI AKHIR', 'STATUS'];
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    });

    data.forEach((d, idx) => {
      const row = worksheet.addRow([
        idx + 1, d.Tanggal, d.Kelas, d.Mapel, d.Materi, d.Jenis_Kegiatan, d.Nama_Siswa, d.Nilai_Awal, d.Nilai_Akhir, d.Status
      ]);
      row.eachCell((cell) => {
        cell.font = normalFont; cell.border = borderStyle;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      });
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Daftar_Remedial_Pengayaan_${appState.activeTA.replace('/', '-')}.xlsx`;
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e); hideLoader(); Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

