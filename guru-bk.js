// ==========================================================
// FITUR 2: BUKU KASUS SISWA
// ==========================================================
let bukuKasusData = [];
let dataPelanggaran = [];
let suratPeringatanData = [];

async function loadBukuKasus() {
  try {
    const pKasus = apiCall('readData', ['Buku_Kasus']);
    const pPelanggaran = apiCall('readData', ['Pelanggaran']);
    const pSurat = apiCall('readData', ['Surat_Peringatan']);
    const [dKasus, dPelanggaran, dSurat] = await Promise.all([pKasus, pPelanggaran, pSurat]);

    bukuKasusData = dKasus.filter(d => d.Tahun_Ajaran === appState.activeTA);
    dataPelanggaran = dPelanggaran.filter(d => d.Tahun_Ajaran === appState.activeTA);
    suratPeringatanData = dSurat.filter(d => d.Tahun_Ajaran === appState.activeTA);

    renderTabelBukuKasus();
    renderTabelPelanggaran();
    renderTabelSuratPeringatan();
    updateDropdownPelanggaran();
  } catch (e) { console.error(e); }
}

function renderTabelBukuKasus() {
  const tb = document.getElementById('tabel-buku-kasus');
  const emptyEl = document.getElementById('kasus-empty');
  if (!tb) return;

  const cNama = (document.getElementById('filter-kasus-nama')?.value || '').toLowerCase();
  const cKelas = document.getElementById('filter-kasus-kelas')?.value || '';
  const cJenis = document.getElementById('filter-kasus-jenis')?.value || '';
  const cBulan = document.getElementById('filter-kasus-bulan')?.value || '';

  let data = bukuKasusData
    .filter(d => !cNama || (d.Nama_Siswa || '').toLowerCase().includes(cNama) || (d.NIS || '').toLowerCase().includes(cNama))
    .filter(d => !cKelas || d.Kelas === cKelas)
    .filter(d => !cJenis || d.Jenis === cJenis)
    .filter(d => !cBulan || (d.Tanggal || '').startsWith(cBulan))
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) {
    tb.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  const jenisBadge = { Perilaku: 'danger', Akademik: 'primary', Kehadiran: 'warning', Prestasi: 'success', Lainnya: 'secondary' };
  tb.innerHTML = data.map(d => {
    const badgeHtml = d.Nama_Pelanggaran ? `<br><small class="text-danger fw-bold"><i class="fa-solid fa-triangle-exclamation"></i> ${d.Nama_Pelanggaran} (${d.Poin || 0} Poin)</small>` : '';
    return `
    <tr>
      <td>${d.Tanggal}</td>
      <td><strong>${d.Nama_Siswa || d.NIS}</strong><br><small class="text-muted">${d.NIS}</small></td>
      <td>${d.Kelas}</td>
      <td><span class="badge bg-${jenisBadge[d.Jenis] || 'secondary'}">${d.Jenis}</span>${badgeHtml}</td>
      <td style="max-width:200px;white-space:pre-wrap;">${d.Catatan || '-'}</td>
      <td style="max-width:150px;white-space:pre-wrap;">${d.Tindak_Lanjut || '-'}</td>
      <td>
        <span class="badge ${d.Status_Tindak_Lanjut === 'Proses Selesai' ? 'bg-success' : (d.Status_Tindak_Lanjut === 'Sedang Proses' ? 'bg-warning text-dark' : 'bg-danger')}">
          ${d.Status_Tindak_Lanjut || 'Belum Diproses'}
        </span>
      </td>
      <td style="max-width:150px;white-space:pre-wrap;">${d.Keterangan || '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editBukuKasus('${d.ID}')"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusBukuKasus('${d.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function exportBukuKasusExcel() {
  const cNama = (document.getElementById('filter-kasus-nama')?.value || '').toLowerCase();
  const cKelas = document.getElementById('filter-kasus-kelas')?.value || '';
  const cJenis = document.getElementById('filter-kasus-jenis')?.value || '';
  const cBulan = document.getElementById('filter-kasus-bulan')?.value || '';

  let data = bukuKasusData
    .filter(d => !cNama || (d.Nama_Siswa || '').toLowerCase().includes(cNama) || (d.NIS || '').toLowerCase().includes(cNama))
    .filter(d => !cKelas || d.Kelas === cKelas)
    .filter(d => !cJenis || d.Jenis === cJenis)
    .filter(d => !cBulan || (d.Tanggal || '').startsWith(cBulan))
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) {
    Swal.fire('Info', 'Tidak ada data untuk diekspor', 'info');
    return;
  }

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Buku Kasus');

    const titleFont = { name: 'Arial', size: 14, bold: true };
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };
    const leftAlign = { vertical: 'top', horizontal: 'left', wrapText: true };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'LAPORAN BUKU KASUS SISWA';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    worksheet.getCell('A3').value = 'Tahun Ajaran'; worksheet.getCell('B3').value = `: ${appState.activeTA}`;
    worksheet.getCell('A4').value = 'Kelas'; worksheet.getCell('B4').value = `: ${cKelas || 'Semua Kelas'}`;
    worksheet.getCell('A5').value = 'Jenis Kasus'; worksheet.getCell('B5').value = `: ${cJenis || 'Semua Jenis'}`;
    worksheet.getCell('A6').value = 'Bulan'; worksheet.getCell('B6').value = `: ${cBulan || 'Semua Bulan'}`;

    worksheet.getCell('A3').font = headerFont; worksheet.getCell('A4').font = headerFont;
    worksheet.getCell('A5').font = headerFont; worksheet.getCell('A6').font = headerFont;

    worksheet.columns = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 15 }, { width: 50 }, { width: 40 }, { width: 20 }, { width: 40 }
    ];

    const r8 = ['NO', 'TANGGAL', 'NIS', 'NAMA SISWA', 'JENIS KASUS', 'URAIAN / CATATAN', 'TINDAK LANJUT', 'STATUS', 'KETERANGAN'];
    worksheet.getRow(8).values = r8;
    worksheet.getRow(8).eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = borderStyle;
    });

    data.forEach((d, idx) => {
      let rowValues = [
        idx + 1,
        d.Tanggal,
        d.NIS,
        d.Nama_Siswa || '',
        d.Jenis,
        d.Catatan || '',
        d.Tindak_Lanjut || '',
        d.Status_Tindak_Lanjut || 'Belum Diproses',
        d.Keterangan || ''
      ];
      const row = worksheet.addRow(rowValues);
      row.eachCell((cell, colNumber) => {
        cell.font = normalFont;
        cell.border = borderStyle;
        if (colNumber >= 6) {
          cell.alignment = leftAlign;
        } else if (colNumber === 4) {
          cell.alignment = leftAlign;
        } else {
          cell.alignment = centerAlign;
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let fn = `Buku_Kasus_${appState.activeTA}`;
    if (cKelas) fn += `_${cKelas}`;
    if (cJenis) fn += `_${cJenis}`;
    if (cBulan) fn += `_${cBulan}`;
    link.download = fn.replace(/ /g, '_') + '.xlsx';
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e);
    hideLoader();
    Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

// --- PELANGGARAN ---
function renderTabelPelanggaran() {
  const tb = document.getElementById('tabel-pelanggaran');
  if (!tb) return;
  const filter = document.getElementById('filter-pelanggaran-jenis')?.value || '';
  const jenisBadge = { Perilaku: 'danger', Akademik: 'primary', Kehadiran: 'warning', Prestasi: 'success', Lainnya: 'secondary' };
  let filtered = dataPelanggaran.filter(p => !filter || p.Jenis_Kasus === filter);
  if (!filtered.length) {
    tb.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Belum ada data pelanggaran. Klik "Tambah Pelanggaran" untuk menambahkan.</td></tr>';
    return;
  }
  tb.innerHTML = filtered.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="badge bg-${jenisBadge[p.Jenis_Kasus] || 'secondary'}">${p.Jenis_Kasus || '-'}</span></td>
      <td class="text-start">${p.Nama_Pelanggaran}</td>
      <td><span class="fw-bold text-danger">${p.Poin || 0}</span></td>
      <td>
        <button class="btn btn-xs btn-sm btn-outline-primary me-1" onclick="editPelanggaran('${p.ID}')"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-xs btn-sm btn-outline-danger" onclick="hapusPelanggaran('${p.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function updateDropdownPelanggaran() {
  const jenis = document.getElementById('kasus-jenis')?.value;
  const sel = document.getElementById('kasus-pelanggaran');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Tidak ada / Pilih Pelanggaran (Opsional) --</option>';
  if (!jenis || !dataPelanggaran.length) return;
  const filtered = dataPelanggaran.filter(p => p.Jenis_Kasus === jenis);
  if (!filtered.length) {
    sel.innerHTML = '<option value="">-- Belum ada sub kasus untuk kategori ini --</option>';
    return;
  }
  filtered.forEach(p => {
    const opt = document.createElement('option');
    opt.value = `${p.Nama_Pelanggaran}|${p.Poin || 0}`;
    opt.textContent = `${p.Nama_Pelanggaran} (${p.Poin || 0} Poin)`;
    sel.appendChild(opt);
  });
}

async function simpanPelanggaran() {
  const id = document.getElementById('pelanggaran-id').value;
  const jenis = document.getElementById('pelanggaran-jenis').value;
  const nama = document.getElementById('pelanggaran-nama').value.trim();
  const poin = parseInt(document.getElementById('pelanggaran-poin').value) || 0;

  if (!nama) return Swal.fire('Error', 'Nama pelanggaran wajib diisi!', 'error');

  showLoader();
  const record = {
    ID: id || null,
    Tahun_Ajaran: appState.activeTA,
    Jenis_Kasus: jenis,
    Nama_Pelanggaran: nama,
    Poin: poin
  };
  apiCall('insertData', ['Pelanggaran', record]).then(() => {
    hideLoader();
    closeAndCleanModal('modalPelanggaran');
    showToast('Data pelanggaran tersimpan!');
    loadBukuKasus();
  }).catch(err => { hideLoader(); Swal.fire('Error', err.message || 'Gagal menyimpan', 'error'); });
}

function editPelanggaran(id) {
  const p = dataPelanggaran.find(x => x.ID === id);
  if (!p) return;
  document.getElementById('pelanggaran-id').value = p.ID;
  document.getElementById('pelanggaran-jenis').value = p.Jenis_Kasus || 'Perilaku';
  document.getElementById('pelanggaran-nama').value = p.Nama_Pelanggaran;
  document.getElementById('pelanggaran-poin').value = p.Poin || 0;
  openModal('modalPelanggaran');
}

async function hapusPelanggaran(id) {
  const result = await Swal.fire({ title: 'Hapus Pelanggaran?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Data ini akan dihapus permanen.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus!' });
  if (!result.isConfirmed) return;
  showLoader();
  apiCall('deleteData', ['Pelanggaran', id]).then(() => {
    hideLoader();
    showToast('Data pelanggaran dihapus.');
    loadBukuKasus();
  }).catch(err => { hideLoader(); Swal.fire('Error', err.message || 'Gagal menghapus', 'error'); });
}

async function downloadTemplatePelanggaran() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pelanggaran');
    worksheet.columns = [
      { header: 'Kategori Pelanggaran', key: 'kategori', width: 25 },
      { header: 'Nama Pelanggaran', key: 'nama', width: 40 },
      { header: 'Poin', key: 'poin', width: 10 }
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.addRow(['Sangat Berat', 'Tindak Pidana / Kriminal', 100]);
    worksheet.addRow(['Ringan', 'Datang Terlambat', 10]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Template_Import_Pelanggaran.xlsx`;
    link.click();
  } catch (e) {
    console.error(e);
    Swal.fire('Error', 'Gagal membuat file template.', 'error');
  }
}

async function prosesImportPelanggaran() {
  const input = document.getElementById('file-import-pelanggaran');
  const file = input.files[0];
  if (!file) return Swal.fire('Peringatan', 'Pilih file Excel terlebih dahulu.', 'warning');

  showLoader();
  try {
    const data = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    const ws = workbook.worksheets[0];
    const rows = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const jenis = row.getCell(1).value?.toString().trim() || '';
      const nama = row.getCell(2).value?.toString().trim() || '';
      const poin = parseInt(row.getCell(3).value) || 0;
      if (nama) {
        rows.push({ ID: null, Tahun_Ajaran: appState.activeTA, Jenis_Kasus: jenis, Nama_Pelanggaran: nama, Poin: poin });
      }
    });
    if (!rows.length) { hideLoader(); Swal.fire('Info', 'Tidak ada data valid di file Excel.\nFormat: Kolom A=Kategori, B=Nama Pelanggaran, C=Poin', 'info'); input.value = ''; return; }

    // Save all in batch
    await Promise.all(rows.map(r => apiCall('insertData', ['Pelanggaran', r])));
    hideLoader();
    input.value = '';
    closeAndCleanModal('modalImportPelanggaran');
    Swal.fire('Berhasil', `${rows.length} data pelanggaran berhasil diimpor!`, 'success');
    loadBukuKasus();
  } catch (e) {
    console.error(e);
    hideLoader();
    Swal.fire('Error', 'Gagal membaca file Excel. Pastikan format benar.', 'error');
  }
}

// --- END PELANGGARAN ---

async function loadSiswaForKasus() {

  const kelas = document.getElementById('kasus-kelas')?.value;
  const sel = document.getElementById('kasus-nis');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Siswa...</option>';
  if (!kelas) return;
  const siswaAll = await apiCall('readData', ['Siswa']);
  const siswaTaKelas = siswaAll.filter(s => s.Tahun_Ajaran === appState.activeTA && s.Kelas === kelas);
  siswaTaKelas.sort((a, b) => a.Nama > b.Nama ? 1 : -1);
  siswaTaKelas.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.NIS;
    opt.dataset.nama = s.Nama;
    opt.textContent = `${s.Nama} (${s.NIS})`;
    sel.appendChild(opt);
  });
}

async function simpanBukuKasus() {
  const id = document.getElementById('kasus-id').value;
  const tanggal = document.getElementById('kasus-tanggal').value;
  const jenis = document.getElementById('kasus-jenis').value;
  const kelas = document.getElementById('kasus-kelas').value;
  const nisSel = document.getElementById('kasus-nis');
  const nis = nisSel.value;
  const namaSiswa = nisSel.options[nisSel.selectedIndex]?.dataset?.nama || nis;
  const catatan = document.getElementById('kasus-catatan').value;
  const tindak = document.getElementById('kasus-tindak').value;
  const status = document.getElementById('kasus-status').value;
  const keterangan = document.getElementById('kasus-keterangan').value;

  const pelSel = document.getElementById('kasus-pelanggaran');
  const pelValue = pelSel.value;
  let namaPelanggaran = '';
  let poinPelanggaran = 0;
  if (pelValue && pelValue !== '') {
    // pelValue is in format: "Nama Pelanggaran|Poin"
    const parts = pelValue.split('|');
    namaPelanggaran = parts[0];
    poinPelanggaran = parseInt(parts[1] || 0);
  }

  if (!tanggal || !kelas || !nis || !catatan) {
    return Swal.fire('Error', 'Tanggal, Kelas, Siswa, dan Catatan wajib diisi!', 'error');
  }

  showLoader();
  const record = {
    ID: id || null,
    Tahun_Ajaran: appState.activeTA,
    Tanggal: tanggal, Jenis: jenis, Kelas: kelas,
    NIS: nis, Nama_Siswa: namaSiswa,
    Nama_Pelanggaran: namaPelanggaran, Poin: poinPelanggaran,
    Catatan: catatan, Tindak_Lanjut: tindak,
    Status_Tindak_Lanjut: status, Keterangan: keterangan
  };

  apiCall('insertData', ['Buku_Kasus', record]).then(() => {
    hideLoader();
    closeAndCleanModal('modalBukuKasus');
    Swal.fire('Berhasil', 'Catatan kasus tersimpan!', 'success');
    loadBukuKasus();
  }).catch(err => { hideLoader(); Swal.fire('Error', err.message || 'Gagal menyimpan', 'error'); });
}

function editBukuKasus(id) {
  const kasus = bukuKasusData.find(d => d.ID === id);
  if (!kasus) return;
  document.getElementById('kasus-id').value = kasus.ID;
  document.getElementById('kasus-tanggal').value = kasus.Tanggal;
  document.getElementById('kasus-jenis').value = kasus.Jenis;
  document.getElementById('kasus-catatan').value = kasus.Catatan;
  document.getElementById('kasus-tindak').value = kasus.Tindak_Lanjut || '';
  document.getElementById('kasus-status').value = kasus.Status_Tindak_Lanjut || 'Belum Diproses';
  document.getElementById('kasus-keterangan').value = kasus.Keterangan || '';
  document.getElementById('modal-kasus-title').innerHTML = '<i class="fa-solid fa-edit me-2"></i>Edit Catatan Kasus';
  // Set kelas, load siswa
  const kelasEl = document.getElementById('kasus-kelas');
  kelasEl.value = kasus.Kelas;
  loadSiswaForKasus().then(() => {
    document.getElementById('kasus-nis').value = kasus.NIS;
  });
  openModal('modalBukuKasus');
}

function hapusBukuKasus(id) {
  Swal.fire({
    title: 'Hapus Catatan?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Catatan ini akan dihapus permanen.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc3545'
  }).then(result => {
    if (result.isConfirmed) {
      showLoader();
      apiCall('deleteData', ['Buku_Kasus', id]).then(() => {
        hideLoader();
        showToast('Catatan berhasil dihapus.');
        loadBukuKasus();
      }).catch(err => { hideLoader(); Swal.fire('Error', err.message, 'error'); });
    }
  });
}

// ==========================================================
// FITUR GURU BK: RPL & HOME VISIT
// ==========================================================

let rplData = [];
let homeVisitData = [];
let dataArsipBK = [];

async function loadRPL() {
  try {
    const data = await apiCall('readData', ['RPL_BK']);
    rplData = data.filter(d => d.Tahun_Ajaran === appState.activeTA);
    renderTabelRPL();
  } catch (e) { console.error(e); }
}

function renderTabelRPL() {
  const tb = document.getElementById('tbody-RPL');
  if (!tb) return;

  const cTopik = (document.getElementById('filter-rpl-topik')?.value || '').toLowerCase();
  const cKelas = document.getElementById('filter-rpl-kelas')?.value || '';
  const cBulan = document.getElementById('filter-rpl-bulan')?.value || '';

  let data = rplData
    .filter(d => !cTopik || (d.Topik || '').toLowerCase().includes(cTopik) || (d.Kelas_Sasaran || '').toLowerCase().includes(cTopik))
    .filter(d => !cKelas || d.Kelas_Sasaran === cKelas)
    .filter(d => !cBulan || (d.Tanggal || '').startsWith(cBulan))
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada data RPL.</td></tr>';
    return;
  }

  tb.innerHTML = data.map(d => {
    let lampiranHtml = '-';
    if (d.Lampiran_File) {
      lampiranHtml = `<a href="${d.Lampiran_File}" target="_blank" class="badge bg-info text-dark p-2 text-decoration-none"><i class="fa-solid fa-download"></i> Unduh</a>`;
    }
    return `
    <tr>
      <td>${d.Tanggal}</td>
      <td><strong>${d.Kelas_Sasaran}</strong></td>
      <td class="text-start">${d.Topik}<br><small class="text-muted">${d.Tujuan || ''}</small></td>
      <td><span class="badge bg-primary">${d.Jenis_Layanan}</span></td>
      <td>${lampiranHtml}</td>
      <td>
        <button class="btn btn-sm btn-outline-info me-1" onclick="lihatRPL('${d.ID}')"><i class="fa-solid fa-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editRPL('${d.ID}')"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusRPL('${d.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function bukaModalRPL() {
  const formModal = document.getElementById('modalRPL');
  if (!formModal) return;
  document.getElementById('rpl-id').value = '';
  document.getElementById('rpl-tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('rpl-kelas').value = '';
  document.getElementById('rpl-topik').value = '';
  document.getElementById('rpl-jenis').value = 'Bimbingan Klasikal';
  document.getElementById('rpl-tujuan').value = '';
  document.getElementById('rpl-file').value = '';
  document.getElementById('rpl-file-preview').style.display = 'none';
  document.getElementById('rpl-file-base64').value = '';

  openModal('modalRPL');
}

// Convert file to base64 for RPL / Visit
document.getElementById('rpl-file')?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    Swal.fire('Error', 'Ukuran file maksimal 2MB!', 'error');
    e.target.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = function (evt) {
    document.getElementById('rpl-file-base64').value = evt.target.result;
    document.getElementById('rpl-file-preview').style.display = 'block';
    document.getElementById('rpl-file-link').href = evt.target.result;
  };
  reader.readAsDataURL(file);
});

async function simpanRPL() {
  const tanggal = document.getElementById('rpl-tanggal').value;
  const kelas = document.getElementById('rpl-kelas').value;
  const topik = document.getElementById('rpl-topik').value;
  const jenis = document.getElementById('rpl-jenis').value;
  const tujuan = document.getElementById('rpl-tujuan').value;
  const fileBase64 = document.getElementById('rpl-file-base64').value;

  if (!tanggal || !kelas || !topik) {
    return Swal.fire('Error', 'Tanggal, Kelas, dan Topik wajib diisi!', 'error');
  }

  showLoader();
  const record = {
    ID: document.getElementById('rpl-id')?.value || null,
    Tahun_Ajaran: appState.activeTA,
    Tanggal: tanggal,
    Kelas_Sasaran: kelas,
    Topik: topik,
    Jenis_Layanan: jenis,
    Tujuan: tujuan,
    Lampiran_File: fileBase64
  };

  apiCall('insertData', ['RPL_BK', record]).then(() => {
    hideLoader();
    closeAndCleanModal('modalRPL');
    Swal.fire('Berhasil', 'Data RPL tersimpan!', 'success');
    loadRPL();
  }).catch(err => { hideLoader(); Swal.fire('Error', err.message || 'Gagal menyimpan', 'error'); });
}

function hapusRPL(id) {
  Swal.fire({
    title: 'Hapus RPL?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Data RPL ini akan dihapus permanen.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc3545'
  }).then(result => {
    if (result.isConfirmed) {
      showLoader();
      apiCall('deleteData', ['RPL_BK', id]).then(() => {
        hideLoader(); showToast('RPL berhasil dihapus.'); loadRPL();
      }).catch(err => { hideLoader(); Swal.fire('Error', err.message, 'error'); });
    }
  });
}

function lihatRPL(id) {
  const d = rplData.find(x => x.ID === id);
  if (!d) return;
  Swal.fire({
    title: 'Detail RPL / Layanan BK',
    html: `
      <div class="text-start">
        <p><strong>Tanggal:</strong> ${d.Tanggal}</p>
        <p><strong>Kelas Sasaran:</strong> ${d.Kelas_Sasaran}</p>
        <p><strong>Jenis Layanan:</strong> ${d.Jenis_Layanan}</p>
        <p><strong>Topik / Materi:</strong> ${d.Topik}</p>
        <p><strong>Tujuan Layanan:</strong> ${d.Tujuan}</p>
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'Tutup'
  });
}

async function exportRPLExcel() {
  let data = rplData.sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);
  if (!data.length) {
    Swal.fire('Info', 'Tidak ada data RPL untuk diekspor', 'info');
    return;
  }

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RPL dan Layanan');

    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LAPORAN DAFTAR RPL / LAYANAN BK';
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.columns = [
      { key: 'no', width: 5 },
      { key: 'tanggal', width: 15 },
      { key: 'kelas', width: 15 },
      { key: 'jenis', width: 20 },
      { key: 'topik', width: 40 },
      { key: 'tujuan', width: 40 },
    ];

    const headerRow = sheet.addRow(['No', 'Tanggal', 'Kelas Sasaran', 'Jenis Layanan', 'Topik / Materi', 'Tujuan']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    data.forEach((d, idx) => {
      const row = sheet.addRow({
        no: idx + 1,
        tanggal: d.Tanggal,
        kelas: d.Kelas_Sasaran,
        jenis: d.Jenis_Layanan,
        topik: d.Topik,
        tujuan: d.Tujuan
      });
      row.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Data_RPL_Layanan_BK.xlsx`);
    hideLoader();
  } catch (e) {
    hideLoader();
    console.error(e);
    Swal.fire('Error', 'Gagal mengekspor data', 'error');
  }
}

function editRPL(id) {
  const rpl = rplData.find(d => d.ID === id);
  if (!rpl) return;
  document.getElementById('rpl-id').value = rpl.ID;
  document.getElementById('rpl-tanggal').value = rpl.Tanggal;
  document.getElementById('rpl-kelas').value = rpl.Kelas_Sasaran;
  document.getElementById('rpl-topik').value = rpl.Topik;
  document.getElementById('rpl-jenis').value = rpl.Jenis_Layanan;
  document.getElementById('rpl-tujuan').value = rpl.Tujuan || '';
  if (rpl.Lampiran_File) {
    document.getElementById('rpl-file-base64').value = rpl.Lampiran_File;
    document.getElementById('rpl-file-preview').style.display = 'block';
    document.getElementById('rpl-file-link').href = rpl.Lampiran_File;
  } else {
    document.getElementById('rpl-file-preview').style.display = 'none';
    document.getElementById('rpl-file-base64').value = '';
  }
  openModal('modalRPL');
}

// === SURAT PERINGATAN ===

function renderTabelSuratPeringatan() {
  const tb = document.getElementById('tbody-surat-peringatan');
  if (!tb) return;

  let data = suratPeringatanData.sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);
  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada riwayat surat peringatan.</td></tr>';
    return;
  }

  tb.innerHTML = data.map((d, index) => {
    return `
    <tr>
      <td>${index + 1}</td>
      <td>${d.Tanggal}</td>
      <td class="text-start"><strong>${d.Nama_Siswa}</strong><br><small class="text-muted">NIS: ${d.NIS}</small></td>
      <td>${d.Kelas}</td>
      <td><span class="badge bg-danger">${d.Total_Poin} Poin</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editSuratPeringatan('${d.ID}')"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-success me-1" onclick="cetakSuratPeringatan('${d.ID}')"><i class="fa-solid fa-print"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusSuratPeringatan('${d.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function bukaModalSuratPeringatan() {
  document.getElementById('sp-id').value = '';
  document.getElementById('sp-kelas').value = '';
  document.getElementById('sp-nis').innerHTML = '<option value="">Pilih Siswa (pilih kelas dulu)...</option>';
  document.getElementById('sp-tbody-pelanggaran').innerHTML = '<tr><td colspan="4" class="text-muted">Pilih siswa untuk melihat riwayat pelanggaran</td></tr>';
  document.getElementById('sp-total-poin').textContent = '0';
  document.getElementById('sp-tgl-pemanggilan').value = '';
  document.getElementById('sp-waktu-pemanggilan').value = '';
  document.getElementById('sp-tempat-ttd').value = '';
  document.getElementById('sp-tgl-ttd').value = new Date().toISOString().split('T')[0];
  openModal('modalSuratPeringatan');
}

function loadSiswaSuratPeringatan() {
  const kelas = document.getElementById('sp-kelas').value;
  const sel = document.getElementById('sp-nis');
  sel.innerHTML = '<option value="">Pilih Siswa...</option>';
  if (!kelas) return;

  // Get unique students from bukuKasusData in this class
  const kasusKelas = bukuKasusData.filter(k => k.Kelas === kelas);
  const uniqueNis = [...new Set(kasusKelas.map(k => k.NIS))];

  uniqueNis.forEach(nis => {
    const kData = kasusKelas.find(k => k.NIS === nis);
    if (kData) {
      const opt = document.createElement('option');
      opt.value = nis;
      opt.dataset.nama = kData.Nama_Siswa;
      opt.textContent = `${kData.Nama_Siswa} (${nis})`;
      sel.appendChild(opt);
    }
  });
}

function loadDetailPelanggaranSiswa() {
  const nis = document.getElementById('sp-nis').value;
  const tb = document.getElementById('sp-tbody-pelanggaran');
  const tTotal = document.getElementById('sp-total-poin');

  if (!nis) {
    tb.innerHTML = '<tr><td colspan="4" class="text-muted">Pilih siswa untuk melihat riwayat pelanggaran</td></tr>';
    tTotal.textContent = '0';
    return;
  }

  const kasusSiswa = bukuKasusData.filter(k => k.NIS === nis).sort((a, b) => a.Tanggal > b.Tanggal ? 1 : -1);
  let total = 0;

  tb.innerHTML = kasusSiswa.map(k => {
    let poin = parseInt(k.Poin) || 0;
    total += poin;
    return `
    <tr>
      <td>${k.Tanggal}</td>
      <td>${k.Jenis}</td>
      <td class="text-start">${k.Nama_Pelanggaran || k.Catatan}</td>
      <td>${poin}</td>
    </tr>`;
  }).join('');

  tTotal.textContent = total;
}

async function simpanSuratPeringatan() {
  const kelas = document.getElementById('sp-kelas').value;
  const nisSel = document.getElementById('sp-nis');
  const nis = nisSel.value;
  const namaSiswa = nisSel.options[nisSel.selectedIndex]?.dataset?.nama || '';
  const totalPoin = document.getElementById('sp-total-poin').textContent;
  const tglPemanggilan = document.getElementById('sp-tgl-pemanggilan').value;
  const waktuPemanggilan = document.getElementById('sp-waktu-pemanggilan').value;
  const tempatTTD = document.getElementById('sp-tempat-ttd').value;
  const tglTTD = document.getElementById('sp-tgl-ttd').value;

  if (!kelas || !nis || !tglPemanggilan || !waktuPemanggilan || !tempatTTD || !tglTTD) {
    return Swal.fire('Error', 'Semua isian jadwal dan TTD wajib diisi!', 'error');
  }

  showLoader();
  const record = {
    ID: document.getElementById('sp-id').value || null,
    Tahun_Ajaran: appState.activeTA,
    Tanggal: new Date().toISOString().split('T')[0], // Internal created date
    Kelas: kelas,
    NIS: nis,
    Nama_Siswa: namaSiswa,
    Total_Poin: totalPoin,
    Status: 'Tercetak',
    Tgl_Pemanggilan: tglPemanggilan,
    Waktu_Pemanggilan: waktuPemanggilan,
    Tempat_TTD: tempatTTD,
    Tgl_TTD: tglTTD
  };

  apiCall('insertData', ['Surat_Peringatan', record]).then(() => {
    hideLoader();
    closeAndCleanModal('modalSuratPeringatan');
    Swal.fire('Berhasil', 'Surat peringatan tersimpan!', 'success');
    loadBukuKasus(); // Reload data
  }).catch(err => { hideLoader(); Swal.fire('Error', err.message, 'error'); });
}

function hapusSuratPeringatan(id) {
  Swal.fire({
    title: 'Hapus Surat?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Data akan dihapus permanen.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc3545'
  }).then(result => {
    if (result.isConfirmed) {
      showLoader();
      apiCall('deleteData', ['Surat_Peringatan', id]).then(() => {
        hideLoader();
        showToast('Data Surat Peringatan dihapus.');
        loadBukuKasus();
      }).catch(err => { hideLoader(); Swal.fire('Error', err.message || 'Gagal menghapus', 'error'); });
    }
  });
}

function editSuratPeringatan(id) {
  const sp = suratPeringatanData.find(d => d.ID === id);
  if (!sp) return;
  document.getElementById('sp-id').value = sp.ID;
  document.getElementById('sp-kelas').value = sp.Kelas;

  // Reload students first to populate dropdown
  loadSiswaSuratPeringatan();

  setTimeout(() => {
    document.getElementById('sp-nis').value = sp.NIS;
    loadDetailPelanggaranSiswa();

    document.getElementById('sp-tgl-pemanggilan').value = sp.Tgl_Pemanggilan;
    document.getElementById('sp-waktu-pemanggilan').value = sp.Waktu_Pemanggilan;
    document.getElementById('sp-tempat-ttd').value = sp.Tempat_TTD || '';
    document.getElementById('sp-tgl-ttd').value = sp.Tgl_TTD || sp.Tanggal;

    openModal('modalSuratPeringatan');
  }, 300);
}

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '';
  const options = { year: 'numeric', month: 'long', day: '2-digit' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
}

function formatHariTanggalIndo(dateStr) {
  if (!dateStr) return '';
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
}

async function cetakSuratPeringatan(id) {
  const sp = suratPeringatanData.find(d => d.ID === id);
  if (!sp) return Swal.fire('Error', 'Data tidak ditemukan', 'error');

  try {
    showLoader();
    // Ambil data dari pengaturan
    const config = await apiCall('readData', ['Pengaturan']);
    const getConf = (k) => { const r = config.find(c => c.Kunci === k); return r ? r.Nilai : ''; };

    let instansi = getConf('Nama_Instansi');
    let namaOPD = getConf('Nama_OPD');
    let namaSekolah = getConf('Nama_Sekolah') || "NAMA SEKOLAH";
    let alamatSekolah = getConf('Alamat_Lengkap') || "Alamat Sekolah";
    let emailSekolah = getConf('Email_Sekolah');
    let webSekolah = getConf('Website_Sekolah');
    let logoKiri = getConf('Logo_Kiri');
    let logoKanan = getConf('Logo_Kanan');
    let namaKepsek = getConf('Kepala_Sekolah') || "Nama Kepala Sekolah";
    let nipKepsek = getConf('NIP_Kepala_Sekolah') || "NIP Kepala Sekolah";
    let namaGuru = getConf('Nama_Guru') || "Nama Guru BK";

    // Ambil data pelanggaran siswa
    const kasusSiswa = bukuKasusData.filter(k => k.NIS === sp.NIS && k.Tahun_Ajaran === sp.Tahun_Ajaran).sort((a, b) => a.Tanggal > b.Tanggal ? 1 : -1);

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun } = docx;

    const b64toUint8 = (b64Data) => {
      if (!b64Data) return new Uint8Array(0);
      const b64 = b64Data.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      const binary_string = window.atob(b64);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes;
    };

    const p = (text, options = {}) => {
      let runOptions = { text, font: "Arial", size: 24, ...options.run };
      return new Paragraph({
        children: [new TextRun(runOptions)],
        alignment: options.alignment || AlignmentType.JUSTIFIED,
        spacing: { line: 276 },
        pageBreakBefore: options.pageBreakBefore || false
      });
    };

    const emptyP = () => new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: 24 })] });

    const pKop = (text, size, bold = false) => new Paragraph({ children: [new TextRun({ text, font: "Arial", size, bold })], alignment: AlignmentType.CENTER });

    let kopChildren = [];
    if (instansi) kopChildren.push(pKop(instansi, 28));
    if (namaOPD) kopChildren.push(pKop(namaOPD, 28));
    kopChildren.push(pKop(namaSekolah, 34, true));
    kopChildren.push(pKop(alamatSekolah, 18));
    let contactParts = [];
    if (emailSekolah) contactParts.push(`Email: ${emailSekolah}`);
    if (webSekolah) contactParts.push(`Web: ${webSekolah}`);
    if (contactParts.length > 0) kopChildren.push(pKop(contactParts.join(' | '), 18));

    const noBorders = { top: { style: BorderStyle.NONE, size: 0, color: "auto" }, bottom: { style: BorderStyle.NONE, size: 0, color: "auto" }, left: { style: BorderStyle.NONE, size: 0, color: "auto" }, right: { style: BorderStyle.NONE, size: 0, color: "auto" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" } };

    let kopTableCells = [];
    if (logoKiri) {
      kopTableCells.push(new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: b64toUint8(logoKiri), transformation: { width: 80, height: 80 } })] })], borders: noBorders }));
    } else {
      kopTableCells.push(new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [emptyP()], borders: noBorders }));
    }

    kopTableCells.push(new TableCell({
      width: { size: 6000, type: WidthType.DXA },
      children: kopChildren,
      verticalAlign: "center",
      borders: noBorders
    }));

    if (logoKanan) {
      kopTableCells.push(new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: b64toUint8(logoKanan), transformation: { width: 80, height: 80 } })] })], borders: noBorders }));
    } else {
      kopTableCells.push(new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [emptyP()], borders: noBorders }));
    }

    const kopTable = new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [new TableRow({ children: kopTableCells })],
      borders: {
        ...noBorders,
        bottom: { style: BorderStyle.THICK, size: 12, color: "000000" }
      }
    });

    const createHeaderCell = (text) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 24, bold: true })], alignment: AlignmentType.CENTER })]
    });

    const tableRows = [
      new TableRow({
        children: [
          createHeaderCell("No"),
          createHeaderCell("Tanggal"),
          createHeaderCell("Pelanggaran"),
          createHeaderCell("Poin")
        ]
      })
    ];

    kasusSiswa.forEach((k, idx) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (idx + 1).toString(), font: "Arial", size: 24 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatTanggalIndo(k.Tanggal), font: "Arial", size: 24 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.Nama_Pelanggaran || k.Catatan || "-", font: "Arial", size: 24 })] })] }),
            new TableCell({ children: [new Paragraph({ text: (k.Poin || "0").toString(), alignment: AlignmentType.CENTER })] })
          ]
        })
      );
    });

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ columnSpan: 3, children: [new Paragraph({ children: [new TextRun({ text: "TOTAL POIN", font: "Arial", size: 24, bold: true })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sp.Total_Poin.toString(), font: "Arial", size: 24, bold: true })], alignment: AlignmentType.CENTER })] })
        ]
      })
    );

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 567 } } },
        children: [
          kopTable,
          emptyP(),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            borders: noBorders,
            rows: [
              new TableRow({ children: [new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [p("Nomor")] }), new TableCell({ width: { size: 7500, type: WidthType.DXA }, children: [p(`: ....................................................`)] })] }),
              new TableRow({ children: [new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [p("Sifat")] }), new TableCell({ width: { size: 7500, type: WidthType.DXA }, children: [p(": Penting")] })] }),
              new TableRow({ children: [new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [p("Lampiran")] }), new TableCell({ width: { size: 7500, type: WidthType.DXA }, children: [p(": 1 Lembar (Daftar Pelanggaran)")] })] }),
              new TableRow({ children: [new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [p("Hal")] }), new TableCell({ width: { size: 7500, type: WidthType.DXA }, children: [p(": Pemanggilan Orang Tua / Wali Siswa")] })] }),
            ]
          }),
          emptyP(),
          p(`Kepada Yth.`),
          p(`Orang Tua / Wali dari Siswa:`),
          p(`${sp.Nama_Siswa} (NIS: ${sp.NIS})`, { run: { bold: true } }),
          p(`Di Tempat`),
          emptyP(),
          p(`Dengan hormat,`),
          p(`Bersama surat ini, kami dari pihak Bimbingan dan Konseling (BK) ${namaSekolah} bermaksud mengundang Bapak/Ibu Orang Tua Wali dari ${sp.Nama_Siswa}, kelas ${sp.Kelas} untuk hadir ke sekolah guna membicarakan mengenai perkembangan perilaku dan catatan pelanggaran dari putra/putri Bapak/Ibu, pada:`),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            borders: noBorders,
            rows: [
              new TableRow({ children: [new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [p("Hari / Tanggal")] }), new TableCell({ width: { size: 6000, type: WidthType.DXA }, children: [p(`: ${formatHariTanggalIndo(sp.Tgl_Pemanggilan)}`)] })] }),
              new TableRow({ children: [new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [p("Waktu")] }), new TableCell({ width: { size: 6000, type: WidthType.DXA }, children: [p(`: ${sp.Waktu_Pemanggilan}`)] })] }),
              new TableRow({ children: [new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [p("Tempat")] }), new TableCell({ width: { size: 6000, type: WidthType.DXA }, children: [p(`: Ruang BK ${namaSekolah}`)] })] }),
            ]
          }),
          emptyP(),
          p(`Adapun total poin pelanggaran yang telah tercatat hingga saat ini adalah ${sp.Total_Poin} poin. Rincian daftar pelanggaran terlampir bersama surat ini.`),
          p(`Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.`),
          emptyP(),
          emptyP(),

          // Signature area
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "auto" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
              left: { style: BorderStyle.NONE, size: 0, color: "auto" },
              right: { style: BorderStyle.NONE, size: 0, color: "auto" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 4500, type: WidthType.DXA },
                    children: [
                      p("Mengetahui,", { alignment: AlignmentType.CENTER }),
                      p("Kepala Sekolah", { alignment: AlignmentType.CENTER }),
                      emptyP(),
                      emptyP(),
                      emptyP(),
                      p(namaKepsek, { alignment: AlignmentType.CENTER, run: { bold: true, underline: {} } }),
                      p(`NIP. ${nipKepsek}`, { alignment: AlignmentType.CENTER })
                    ]
                  }),
                  new TableCell({
                    width: { size: 4500, type: WidthType.DXA },
                    children: [
                      p(`${sp.Tempat_TTD || 'Tempat'}, ${formatTanggalIndo(sp.Tgl_TTD || sp.Tanggal)}`, { alignment: AlignmentType.CENTER }),
                      p("Guru Bimbingan Konseling", { alignment: AlignmentType.CENTER }),
                      emptyP(),
                      emptyP(),
                      emptyP(),
                      p(namaGuru, { alignment: AlignmentType.CENTER, run: { bold: true, underline: {} } })
                    ]
                  })
                ]
              })
            ]
          }),

          p("", { pageBreakBefore: true }), // Page Break

          // Attachment Page
          p("LAMPIRAN DAFTAR PELANGGARAN SISWA", { alignment: AlignmentType.CENTER, run: { bold: true, size: 28 } }),
          emptyP(),
          p(`Nama: ${sp.Nama_Siswa}`),
          p(`Kelas: ${sp.Kelas}`),
          emptyP(),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            rows: tableRows
          }),
          emptyP(),
          emptyP(),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.NONE, size: 0, color: "auto" }, bottom: { style: BorderStyle.NONE, size: 0, color: "auto" }, left: { style: BorderStyle.NONE, size: 0, color: "auto" }, right: { style: BorderStyle.NONE, size: 0, color: "auto" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" } },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 5000, type: WidthType.DXA }, children: [emptyP()] }),
                  new TableCell({
                    width: { size: 4000, type: WidthType.DXA },
                    children: [
                      p(`${sp.Tempat_TTD || 'Tempat'}, ${formatTanggalIndo(sp.Tgl_TTD || sp.Tanggal)}`, { alignment: AlignmentType.CENTER }),
                      p("Guru Bimbingan Konseling", { alignment: AlignmentType.CENTER }),
                      emptyP(),
                      emptyP(),
                      emptyP(),
                      p(namaGuru, { alignment: AlignmentType.CENTER, run: { bold: true, underline: {} } })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }]
    });

    Packer.toBase64String(doc).then(base64 => {
      const link = document.createElement('a');
      link.href = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + base64;
      link.download = `Surat_Peringatan_${sp.Nama_Siswa}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      hideLoader();
    }).catch(err => {
      hideLoader();
      console.error(err);
      Swal.fire('Error', 'Gagal membuat dokumen Word', 'error');
    });

  } catch (e) {
    hideLoader();
    console.error(e);
    Swal.fire('Error', 'Gagal memproses surat', 'error');
  }
}

async function exportSuratPeringatanExcel() {
  let data = suratPeringatanData.sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);
  if (!data.length) {
    Swal.fire('Info', 'Tidak ada data surat peringatan untuk diekspor', 'info');
    return;
  }

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Surat Peringatan');

    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LAPORAN DAFTAR SURAT PERINGATAN / PEMANGGILAN';
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.columns = [
      { key: 'no', width: 5 },
      { key: 'tanggal', width: 15 },
      { key: 'nama', width: 30 },
      { key: 'nis', width: 15 },
      { key: 'kelas', width: 10 },
      { key: 'poin', width: 15 },
    ];

    const headerRow = sheet.addRow(['No', 'Tanggal Surat', 'Nama Siswa', 'NIS', 'Kelas', 'Total Poin']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    data.forEach((d, idx) => {
      const row = sheet.addRow({
        no: idx + 1,
        tanggal: d.Tanggal,
        nama: d.Nama_Siswa,
        nis: d.NIS,
        kelas: d.Kelas,
        poin: d.Total_Poin
      });
      row.eachCell((cell, colNumber) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNumber !== 3) {
          cell.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Data_Surat_Peringatan.xlsx`);
    hideLoader();
  } catch (e) {
    hideLoader();
    console.error(e);
    Swal.fire('Error', 'Gagal mengekspor data', 'error');
  }
}

// === HOME VISIT ===

async function loadHomeVisit() {
  try {
    const data = await apiCall('readData', ['Home_Visit']);
    homeVisitData = data.filter(d => d.Tahun_Ajaran === appState.activeTA);
    renderTabelHomeVisit();
  } catch (e) { console.error(e); }
}

function renderTabelHomeVisit() {
  const tb = document.getElementById('tbody-HomeVisit');
  if (!tb) return;

  const cNama = (document.getElementById('filter-visit-nama')?.value || '').toLowerCase();
  const cBulan = document.getElementById('filter-visit-bulan')?.value || '';

  let data = homeVisitData
    .filter(d => !cNama || (d.Nama_Siswa || '').toLowerCase().includes(cNama) || (d.NIS || '').toLowerCase().includes(cNama))
    .filter(d => !cBulan || (d.Tanggal || '').startsWith(cBulan))
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada catatan Kunjungan Rumah.</td></tr>';
    return;
  }
  tb.innerHTML = data.map(d => {
    let fotoHtml = '-';
    if (d.Foto_Bukti) {
      fotoHtml = `<img src="${d.Foto_Bukti}" style="width: 70px; height: 70px; object-fit: cover; cursor: pointer; border-radius: 8px;" onclick="Swal.fire({imageUrl: '${d.Foto_Bukti}', imageWidth: 400})">`;
    }
    return `
    <tr>
      <td>${d.Tanggal}</td>
      <td class="text-start"><strong>${d.Nama_Siswa}</strong><br><small class="text-muted">Kelas: ${d.Kelas} | NIS: ${d.NIS}</small></td>
      <td class="text-start"><strong>${d.Nama_Ortu || '-'}</strong><br><small class="text-muted"><i class="fa-solid fa-phone"></i> ${d.No_HP_Ortu || '-'}</small></td>
      <td class="text-start"><small>${d.Alamat_Ortu || '-'}</small></td>
      <td class="text-start">${d.Tujuan || '-'}</td>
      <td class="text-start">${d.Hasil_Kunjungan || '-'}</td>
      <td>${fotoHtml}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editHomeVisit('${d.ID}')"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusHomeVisit('${d.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function bukaModalHomeVisit() {
  const formModal = document.getElementById('modalHomeVisit');
  if (!formModal) return;
  document.getElementById('visit-id').value = '';
  document.getElementById('visit-tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('visit-kelas').value = '';
  document.getElementById('visit-nis').innerHTML = '<option value="">Pilih Siswa (pilih kelas dulu)...</option>';
  document.getElementById('visit-ortu').value = '';
  document.getElementById('visit-nohp').value = '';
  document.getElementById('visit-alamat').value = '';
  document.getElementById('visit-tujuan').value = '';
  document.getElementById('visit-hasil').value = '';
  hapusFotoVisit();

  openModal('modalHomeVisit');
}

async function loadSiswaForVisit() {
  const kelas = document.getElementById('visit-kelas')?.value;
  const sel = document.getElementById('visit-nis');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Siswa...</option>';
  if (!kelas) return;
  const siswaAll = await apiCall('readData', ['Siswa']);
  const siswaTaKelas = siswaAll.filter(s => s.Tahun_Ajaran === appState.activeTA && s.Kelas === kelas);
  siswaTaKelas.sort((a, b) => a.Nama > b.Nama ? 1 : -1);
  siswaTaKelas.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.NIS;
    opt.dataset.nama = s.Nama;
    opt.textContent = `${s.Nama} (${s.NIS})`;
    sel.appendChild(opt);
  });
}

document.getElementById('visit-foto')?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    Swal.fire('Error', 'Ukuran foto maksimal 2MB!', 'error');
    e.target.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = function (evt) {
    document.getElementById('visit-foto-base64').value = evt.target.result;
    document.getElementById('visit-foto-preview').src = evt.target.result;
    document.getElementById('visit-foto-preview-container').style.display = 'block';
  };
  reader.readAsDataURL(file);
});

function hapusFotoVisit() {
  document.getElementById('visit-foto').value = '';
  document.getElementById('visit-foto-base64').value = '';
  document.getElementById('visit-foto-preview').src = '';
  document.getElementById('visit-foto-preview-container').style.display = 'none';
}

async function simpanHomeVisit() {
  const tanggal = document.getElementById('visit-tanggal').value;
  const kelas = document.getElementById('visit-kelas').value;
  const nisSel = document.getElementById('visit-nis');
  const nis = nisSel.value;
  const namaSiswa = nisSel.options[nisSel.selectedIndex]?.dataset?.nama || nis;
  const ortu = document.getElementById('visit-ortu').value;
  const nohp = document.getElementById('visit-nohp').value;
  const alamat = document.getElementById('visit-alamat').value;
  const tujuan = document.getElementById('visit-tujuan').value;
  const hasil = document.getElementById('visit-hasil').value;
  const fotoBase64 = document.getElementById('visit-foto-base64').value;

  if (!tanggal || !kelas || !nis || !tujuan || !hasil) {
    return Swal.fire('Error', 'Tanggal, Kelas, Siswa, Tujuan, dan Hasil wajib diisi!', 'error');
  }

  showLoader();
  const record = {
    Tahun_Ajaran: appState.activeTA,
    Tanggal: tanggal,
    NIS: nis,
    Nama_Siswa: namaSiswa,
    Kelas: kelas,
    Nama_Ortu: ortu,
    No_HP_Ortu: nohp,
    Alamat_Ortu: alamat,
    Tujuan: tujuan,
    Hasil_Kunjungan: hasil,
    Foto_Bukti: fotoBase64
  };

  apiCall('insertData', ['Home_Visit', record]).then(() => {
    hideLoader();
    closeAndCleanModal('modalHomeVisit');
    Swal.fire('Berhasil', 'Catatan Kunjungan Rumah tersimpan!', 'success');
    loadHomeVisit();
  }).catch(err => { hideLoader(); Swal.fire('Error', err.message || 'Gagal menyimpan', 'error'); });
}

function hapusHomeVisit(id) {
  Swal.fire({
    title: 'Hapus Kunjungan?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Data kunjungan akan dihapus.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc3545'
  }).then(result => {
    if (result.isConfirmed) {
      showLoader();
      apiCall('deleteData', ['Home_Visit', id]).then(() => {
        hideLoader(); showToast('Kunjungan dihapus.'); loadHomeVisit();
      }).catch(err => { hideLoader(); Swal.fire('Error', err.message, 'error'); });
    }
  });
}

async function editHomeVisit(id) {
  const v = homeVisitData.find(d => d.ID === id);
  if (!v) return;
  document.getElementById('visit-id').value = v.ID;
  document.getElementById('visit-tanggal').value = v.Tanggal;
  document.getElementById('visit-kelas').value = v.Kelas;
  await loadSiswaForVisit();
  document.getElementById('visit-nis').value = v.NIS;
  document.getElementById('visit-ortu').value = v.Nama_Ortu || '';
  document.getElementById('visit-nohp').value = v.No_HP_Ortu || '';
  document.getElementById('visit-alamat').value = v.Alamat_Ortu || '';
  document.getElementById('visit-tujuan').value = v.Tujuan || '';
  document.getElementById('visit-hasil').value = v.Hasil_Kunjungan || '';
  if (v.Foto_Bukti) {
    document.getElementById('visit-foto-base64').value = v.Foto_Bukti;
    document.getElementById('visit-foto-preview').src = v.Foto_Bukti;
    document.getElementById('visit-foto-preview-container').style.display = 'block';
  } else {
    hapusFotoVisit();
  }
  openModal('modalHomeVisit');
}

// Export Home Visit Excel
async function exportHomeVisitExcel() {
  const cNama = (document.getElementById('filter-visit-nama')?.value || '').toLowerCase();
  const cBulan = document.getElementById('filter-visit-bulan')?.value || '';

  let data = homeVisitData
    .filter(d => !cNama || (d.Nama_Siswa || '').toLowerCase().includes(cNama) || (d.NIS || '').toLowerCase().includes(cNama))
    .filter(d => !cBulan || (d.Tanggal || '').startsWith(cBulan))
    .sort((a, b) => b.Tanggal > a.Tanggal ? 1 : -1);

  if (!data.length) { return Swal.fire('Info', 'Tidak ada data untuk diekspor', 'info'); }

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Kunjungan Rumah');
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = 'LAPORAN KUNJUNGAN RUMAH (HOME VISIT)';
    worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.columns = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 10 }, { width: 30 }, { width: 20 }, { width: 40 }, { width: 40 }, { width: 40 }
    ];

    worksheet.getRow(4).values = ['NO', 'TANGGAL', 'NIS', 'NAMA SISWA', 'KELAS', 'NAMA ORTU', 'NO HP ORTU', 'ALAMAT', 'TUJUAN', 'HASIL KUNJUNGAN'];
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    data.forEach((d, idx) => {
      const row = worksheet.addRow([
        idx + 1, d.Tanggal, d.NIS, d.Nama_Siswa, d.Kelas, d.Nama_Ortu || '', d.No_HP_Ortu || '', d.Alamat_Ortu || '', d.Tujuan, d.Hasil_Kunjungan
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
    link.download = `Home_Visit_${appState.activeTA}.xlsx`;
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e); hideLoader(); Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

// ==========================================
// 8. ARSIP FILE BK (TAB 2 RPL & BK)
// ==========================================
async function loadArsipBK() {
  try {
    const data = await apiCall('readData', ['Arsip_BK']);
    dataArsipBK = data.filter(d => d.Tahun_Ajaran === appState.activeTA);

    const arsip = dataArsipBK.length > 0 ? dataArsipBK[0] : {};

    const items = [
      { id: 'silabus', field: 'Silabus' },
      { id: 'prota', field: 'Prota_Prosem' },
      { id: 'admin', field: 'Administrasi' }
    ];

    items.forEach(item => {
      const btnLihat = document.getElementById(`btn-lihat-arsipbk-${item.id}`);
      const btnHapus = document.getElementById(`btn-hapus-arsipbk-${item.id}`);
      const statusText = document.getElementById(`status-arsipbk-${item.id}`);

      // Basic check to see if string is likely base64 data URL
      if (arsip[item.field] && arsip[item.field].length > 100) {
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
  } catch (e) {
    console.error("Gagal load Arsip BK:", e);
  }
}

async function uploadArsipBK(jenisFile, inputElem) {
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
    let record = dataArsipBK.length > 0 ? { ...dataArsipBK[0] } : { ID: generateId(), Tahun_Ajaran: appState.activeTA };

    record[jenisFile] = base64Data;

    await apiCall('insertData', ['Arsip_BK', record]);
    hideLoader();
    showToast(`${jenisFile} berhasil diunggah.`);
    loadArsipBK();
  } catch (err) {
    hideLoader();
    Swal.fire('Error', err.message || 'Gagal mengunggah file', 'error');
  }
  inputElem.value = '';
}

function lihatArsipBK(jenisFile) {
  if (dataArsipBK.length === 0 || !dataArsipBK[0][jenisFile]) {
    Swal.fire('Info', 'File tidak ditemukan.', 'info');
    return;
  }
  const base64Data = dataArsipBK[0][jenisFile];
  try {
    if (base64Data.startsWith('data:image') || base64Data.startsWith('data:application/pdf')) {
      const win = window.open();
      win.document.write(`<iframe src="${base64Data}" width="100%" height="100%" style="border:none; margin:0; padding:0;"></iframe>`);
    } else {
      // If word document, download it instead
      const a = document.createElement('a');
      a.href = base64Data;
      a.download = `${jenisFile}_${appState.activeTA.replace('/', '-')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    Swal.fire('Error', 'Browser memblokir popup. Tidak dapat membuka file.', 'error');
  }
}

async function hapusArsipBK(jenisFile) {
  if (dataArsipBK.length === 0 || !dataArsipBK[0][jenisFile]) return;

  const res = await Swal.fire({
    title: 'Hapus File?',
    html: `<div class="text-danger mb-2">Peringatan: hati-hati dalam menghapus data. data yang telah dihapus tidak dapat dikembalikan lagi.</div>Apakah Anda yakin ingin menghapus file ${jenisFile.replace('_', ' ')}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus'
  });

  if (res.isConfirmed) {
    showLoader('Menghapus...');
    try {
      let record = { ...dataArsipBK[0] };
      record[jenisFile] = null;
      await apiCall('insertData', ['Arsip_BK', record]);
      hideLoader();
      Swal.fire('Berhasil', 'File berhasil dihapus.', 'success');
      loadArsipBK();
    } catch (e) {
      hideLoader();
      Swal.fire('Error', e.message || 'Gagal menghapus file', 'error');
    }
  }
}

// ==========================================
// 9. PROGRAM BK (TAB PROGRAM BK)
// ==========================================
let programBKData = [];

async function loadProgramBK() {
  try {
    const data = await apiCall('readData', ['Program_BK']);
    programBKData = data.filter(d => d.Tahun_Ajaran === appState.activeTA);
    renderTabelProgramBK();
  } catch (e) { console.error("Gagal load Program BK:", e); }
}

function renderTabelProgramBK() {
  const tb = document.getElementById('tbody-program-bk');
  if (!tb) return;

  const cJenis = document.getElementById('filter-pbk-jenis')?.value || '';
  const cTopik = (document.getElementById('filter-pbk-topik')?.value || '').toLowerCase();

  let data = programBKData
    .filter(d => !cJenis || d.Jenis_Program === cJenis)
    .filter(d => !cTopik || (d.Topik || '').toLowerCase().includes(cTopik) || (d.Sasaran || '').toLowerCase().includes(cTopik))
    .sort((a, b) => b.ID > a.ID ? 1 : -1);

  if (!data.length) {
    tb.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Belum ada Program BK.</td></tr>';
    return;
  }

  tb.innerHTML = data.map((d, idx) => {
    let statClass = 'bg-secondary';
    if (d.Status === 'Terlaksana') statClass = 'bg-success';
    if (d.Status === 'Sedang Berjalan') statClass = 'bg-warning text-dark';
    return `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${d.Jenis_Program}</strong></td>
      <td>${d.Bidang_Layanan}</td>
      <td class="text-start">${d.Topik}</td>
      <td>${d.Sasaran}</td>
      <td>${d.Waktu_Pelaksanaan}</td>
      <td><span class="badge ${statClass}">${d.Status || 'Belum Terlaksana'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProgramBK('${d.ID}')"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusProgramBK('${d.ID}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function bukaModalProgramBK() {
  document.getElementById('pbk-id').value = '';
  document.getElementById('pbk-jenis').value = 'Tahunan';
  document.getElementById('pbk-bidang').value = 'Pribadi';
  document.getElementById('pbk-topik').value = '';
  document.getElementById('pbk-sasaran').value = '';
  document.getElementById('pbk-waktu').value = '';
  document.getElementById('pbk-status').value = 'Belum Terlaksana';
  openModal('modalProgramBK');
}

function editProgramBK(id) {
  const p = programBKData.find(d => d.ID === id);
  if (!p) return;
  document.getElementById('pbk-id').value = p.ID;
  document.getElementById('pbk-jenis').value = p.Jenis_Program;
  document.getElementById('pbk-bidang').value = p.Bidang_Layanan;
  document.getElementById('pbk-topik').value = p.Topik;
  document.getElementById('pbk-sasaran').value = p.Sasaran;
  document.getElementById('pbk-waktu').value = p.Waktu_Pelaksanaan;
  document.getElementById('pbk-status').value = p.Status || 'Belum Terlaksana';
  openModal('modalProgramBK');
}

async function simpanProgramBK() {
  const id = document.getElementById('pbk-id').value || generateId();
  const jenis = document.getElementById('pbk-jenis').value;
  const bidang = document.getElementById('pbk-bidang').value;
  const topik = document.getElementById('pbk-topik').value;
  const sasaran = document.getElementById('pbk-sasaran').value;
  const waktu = document.getElementById('pbk-waktu').value;
  const status = document.getElementById('pbk-status').value;

  if (!topik || !sasaran || !waktu) {
    return Swal.fire('Error', 'Harap isi Topik, Sasaran, dan Waktu Pelaksanaan', 'error');
  }

  showLoader();
  const record = {
    ID: id,
    Tahun_Ajaran: appState.activeTA,
    Jenis_Program: jenis,
    Bidang_Layanan: bidang,
    Topik: topik,
    Sasaran: sasaran,
    Waktu_Pelaksanaan: waktu,
    Status: status
  };

  try {
    await apiCall('insertData', ['Program_BK', record]);
    showToast(document.getElementById('pbk-id').value ? 'Program BK diperbarui' : 'Program BK ditambahkan');
    hideLoader();
    closeAndCleanModal('modalProgramBK');
    loadProgramBK();
  } catch (e) {
    hideLoader(); Swal.fire('Error', e.message, 'error');
  }
}

function hapusProgramBK(id) {
  Swal.fire({
    title: 'Hapus Program?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Data program akan dihapus.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc3545'
  }).then(result => {
    if (result.isConfirmed) {
      showLoader();
      apiCall('deleteData', ['Program_BK', id]).then(() => {
        hideLoader(); showToast('Program dihapus.'); loadProgramBK();
      }).catch(err => { hideLoader(); Swal.fire('Error', err.message, 'error'); });
    }
  });
}

async function exportProgramBKExcel() {
  const cJenis = document.getElementById('filter-pbk-jenis')?.value || '';
  const cTopik = (document.getElementById('filter-pbk-topik')?.value || '').toLowerCase();

  let data = programBKData
    .filter(d => !cJenis || d.Jenis_Program === cJenis)
    .filter(d => !cTopik || (d.Topik || '').toLowerCase().includes(cTopik) || (d.Sasaran || '').toLowerCase().includes(cTopik))
    .sort((a, b) => {
      if (a.Jenis_Program < b.Jenis_Program) return -1;
      if (a.Jenis_Program > b.Jenis_Program) return 1;
      return 0;
    });

  if (!data.length) { return Swal.fire('Info', 'Tidak ada data untuk diekspor', 'info'); }

  showLoader();
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Program BK');
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 11 };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = 'PROGRAM BIMBINGAN DAN KONSELING (BK)';
    worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `TAHUN AJARAN: ${appState.activeTA} ${cJenis ? `| JENIS: ${cJenis.toUpperCase()}` : ''}`;
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.columns = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 40 }, { width: 15 }, { width: 25 }, { width: 15 }
    ];

    worksheet.getRow(4).values = ['NO', 'JENIS PROGRAM', 'BIDANG LAYANAN', 'MATERI / TOPIK KEGIATAN', 'SASARAN', 'WAKTU PELAKSANAAN', 'STATUS'];
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    });

    data.forEach((d, idx) => {
      const row = worksheet.addRow([
        idx + 1, d.Jenis_Program, d.Bidang_Layanan, d.Topik, d.Sasaran, d.Waktu_Pelaksanaan, d.Status || 'Belum Terlaksana'
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
    link.download = `Program_BK_${appState.activeTA.replace('/', '-')}.xlsx`;
    link.click();
    hideLoader();
  } catch (e) {
    console.error(e); hideLoader(); Swal.fire('Error', 'Gagal membuat file excel', 'error');
  }
}

// Jalankan notifikasi dan cek setiap 30 menit
requestNotifPermission();
setTimeout(cekPengingatHarian, 5000); // Cek awal setelah 5 detik
setInterval(cekPengingatHarian, 30 * 60 * 1000); // Cek ulang tiap 30 menit
