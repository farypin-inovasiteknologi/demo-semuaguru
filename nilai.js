// ==========================================
// ABSENSI & BUKTI DUKUNG
// ==========================================
function loadAbsensiMatrix() {
  const tgl = document.getElementById('buka-info-tanggal').innerText;
  const kls = document.getElementById('buka-info-kelas').innerText;
  const mpl = document.getElementById('buka-info-mapel').innerText;
  const tb = document.getElementById('tbody-MatrixAbsensi');
  if (!tgl || !kls || !mpl || tgl === '-') return;

  tb.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div> Memuat Absensi...</td></tr>';

  apiCall('getAbsensiMatrix', [appState.activeTA, tgl, kls, mpl]).then(data => {
    if (data.length === 0) { tb.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Tidak ada siswa di kelas ini.</td></tr>`; return; }
    tb.innerHTML = '';
    data.forEach((s, index) => {
      const mkRad = (val, lbl) => `<input type="radio" name="abs_${s.NIS}" id="abs_${s.NIS}_${val}" value="${val}" class="abs-radio" ${s.Status === val ? 'checked' : ''} onchange="triggerAutoSaveAbsensi('${s.NIS}', this.value)"><label for="abs_${s.NIS}_${val}" class="abs-label">${val}</label>`;

      let buktiHtml = '';
      if (s.Bukti_Dukung) {
        buktiHtml = `
            <a href="${s.Bukti_Dukung}" target="_blank" class="btn btn-sm btn-success"><i class="fa-solid fa-check"></i> Lihat</a>
            <button class="btn btn-sm btn-danger ms-1" onclick="hapusBuktiUrl('${s.NIS}')"><i class="fa-solid fa-times"></i></button>
          `;
      } else {
        buktiHtml = `<button class="btn btn-sm btn-outline-primary" onclick="triggerUploadBukti('${s.NIS}')"><i class="fa-solid fa-upload"></i> Upload</button>`;
      }

      tb.innerHTML += `<tr>
            <td class="text-center">${index + 1}</td>
            <td class="text-center">${s.NIS}</td>
            <td class="fw-bold">${s.Nama}</td>
            <td class="text-center">${s.L_P || '-'}</td>
            <td><div class="d-flex justify-content-center">${mkRad('H')}${mkRad('I')}${mkRad('S')}${mkRad('A')}</div></td>
            <td class="text-center" id="td-bukti-${s.NIS}">${buktiHtml}</td>
          </tr>`;
    });
  }).catch(err => { console.error(err); });
}

function triggerAutoSaveAbsensi(nis, status) {
  const tgl = document.getElementById('buka-info-tanggal').innerText;
  const kls = document.getElementById('buka-info-kelas').innerText;
  const mpl = document.getElementById('buka-info-mapel').innerText;
  apiCall('autoSaveAbsensi', [appState.activeTA, tgl, kls, mpl, nis, status]).then((r) => {
    showToast(`Kehadiran NIS ${r.nis} (${r.status}) tersimpan.`);
  }).catch(err => { console.error(err); });
}

let activeNisUpload = null;
function triggerUploadBukti(nis) {
  activeNisUpload = nis;
  const fInput = document.getElementById('bukti-dukung-input');
  fInput.value = '';
  fInput.click();
}

document.getElementById('bukti-dukung-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // PDF Handling
  if (file.type === 'application/pdf') {
    if (file.size > 300 * 1024) {
      Swal.fire('Terlalu Besar', 'Untuk PDF, ukuran maksimal adalah 300KB.', 'error');
      return;
    }
    uploadBuktiToServer(file);
    return;
  }

  // Image Handling (Auto Compress)
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (ev) {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = function () {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension 800px
        if (width > 800) { height *= 800 / width; width = 800; }
        if (height > 800) { width *= 800 / height; height = 800; }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to ~60% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64Data = dataUrl.split(',')[1];

        openModal('modalUploadArsip'); // reuse UI

        const tgl = document.getElementById('buka-info-tanggal').innerText;
        const kls = document.getElementById('buka-info-kelas').innerText;
        const mpl = document.getElementById('buka-info-mapel').innerText;

        apiCall('uploadFileToDrive', [base64Data, "Bukti_" + activeNisUpload + ".jpg", "image/jpeg", "", "Bukti"]).then(res => {
          closeAndCleanModal('modalUploadArsip');
          if (res.success) {
            Swal.fire('Sukses', 'Bukti Dukung berhasil diunggah!', 'success');
            apiCall('updateBuktiDukung', [appState.activeTA, tgl, kls, mpl, activeNisUpload, res.url]).then(() => loadAbsensiMatrix()).catch(err => { console.error(err); });
          } else {
            Swal.fire('Error', res.message, 'error');
          }
        }).catch(err => { console.error(err); });
      }
    }
  }
});

function uploadBuktiToServer(file) {
  openModal('modalUploadArsip');
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Data = e.target.result.split(',')[1];
    const tgl = document.getElementById('buka-info-tanggal').innerText;
    const kls = document.getElementById('buka-info-kelas').innerText;
    const mpl = document.getElementById('buka-info-mapel').innerText;

    apiCall('uploadFileToDrive', [base64Data, file.name, file.type, "", "Bukti"]).then(res => {
      closeAndCleanModal('modalUploadArsip');
      if (res.success) {
        Swal.fire('Sukses', 'Bukti Dukung berhasil diunggah!', 'success');
        apiCall('updateBuktiDukung', [appState.activeTA, tgl, kls, mpl, activeNisUpload, res.url]).then(() => loadAbsensiMatrix()).catch(err => { console.error(err); });
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    }).catch(err => { console.error(err); });
  };
  reader.readAsDataURL(file);
}

// ==========================================
// JURNAL MENGAJAR (MODAL)
// ==========================================
function loadFormJurnal() {
  const tgl = document.getElementById('buka-info-tanggal').innerText;
  const kls = document.getElementById('buka-info-kelas').innerText;
  const mpl = document.getElementById('buka-info-mapel').innerText;

  // Clear form
  document.getElementById('form-buka-jurnal').reset();
  document.getElementById('buka-jur-id').value = '';

  apiCall('readData', ['Jurnal']).then(d => {
    // Cari jurnal untuk tgl, kelas, mapel ini
    const j = d.find(x => x.Tanggal === tgl && x.Kelas === kls && x.Mapel === mpl);
    if (j) {
      document.getElementById('buka-jur-id').value = j.ID;
      document.getElementById('buka-jur-materi').value = j.Materi || '';
      document.getElementById('buka-jur-permasalahan').value = j.Permasalahan || '';
      document.getElementById('buka-jur-solusi').value = j.Solusi || '';
      document.getElementById('buka-jur-keterangan').value = j.Keterangan || '';
    }
  }).catch(err => { console.error(err); });
}

function simpanJurnalDariModal() {
  const id = document.getElementById('buka-jur-id').value;
  const tgl = document.getElementById('buka-info-tanggal').innerText;
  const kls = document.getElementById('buka-info-kelas').innerText;
  const mpl = document.getElementById('buka-info-mapel').innerText;

  let payload = {
    ID: id || ('JUR-' + new Date().getTime()),
    Tanggal: tgl,
    Kelas: kls,
    Mapel: mpl,
    Materi: document.getElementById('buka-jur-materi').value,
    Permasalahan: document.getElementById('buka-jur-permasalahan').value,
    Solusi: document.getElementById('buka-jur-solusi').value,
    Keterangan: document.getElementById('buka-jur-keterangan').value,
    Tahun_Ajaran: appState.activeTA
  };

  apiCall('insertData', ['Jurnal', payload]).then(() => {
    Swal.fire({ title: 'Jurnal Tersimpan!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
  }).catch(err => { console.error(err); });
}

function loadJurnal() {
  apiCall('readData', ['Jurnal']).then(d => {
    appState.jurnalData = appState.activeTA ? d.filter(x => x.Tahun_Ajaran === appState.activeTA) : [];
    const tb = document.getElementById('tbody-Jurnal');
    tb.innerHTML = appState.jurnalData.length ? '' : '<tr><td colspan="6" class="text-center">Belum ada jurnal</td></tr>';
    appState.jurnalData.forEach(j => {
      tb.innerHTML += `<tr><td>${j.Tanggal}</td><td>${j.Kelas}</td><td>${j.Mapel}</td><td>${j.Materi}</td><td>${j.Keterangan || '-'}</td>
          <td>
            <button class="btn btn-sm btn-info text-white" onclick="lihatJurnal('${j.ID}')"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-sm btn-warning text-dark" onclick="editJurnal('${j.ID}')"><i class="fa-solid fa-edit"></i></button>
          </td></tr>`;
    });
    hideLoader();
  }).catch(err => { console.error(err); });
}

function lihatJurnal(id) {
  const j = appState.jurnalData.find(x => x.ID === id);
  if (!j) return;
  const html = `
      <div class="container-fluid text-start" style="font-size:0.95rem;">
        <div class="row border-bottom py-2"><div class="col-4 fw-bold text-muted">Tanggal</div><div class="col-8">${j.Tanggal}</div></div>
        <div class="row border-bottom py-2"><div class="col-4 fw-bold text-muted">Kelas</div><div class="col-8"><span class="badge bg-primary">${j.Kelas}</span></div></div>
        <div class="row border-bottom py-2"><div class="col-4 fw-bold text-muted">Mapel</div><div class="col-8">${j.Mapel}</div></div>
        <div class="row border-bottom py-2"><div class="col-4 fw-bold text-muted">Materi</div><div class="col-8">${j.Materi}</div></div>
        <div class="row border-bottom py-2"><div class="col-4 fw-bold text-muted">Permasalahan</div><div class="col-8 text-danger">${j.Permasalahan || '-'}</div></div>
        <div class="row border-bottom py-2"><div class="col-4 fw-bold text-muted">Solusi</div><div class="col-8 text-success">${j.Solusi || '-'}</div></div>
        <div class="row py-2"><div class="col-4 fw-bold text-muted">Keterangan</div><div class="col-8">${j.Keterangan || '-'}</div></div>
      </div>
    `;
  Swal.fire({ title: '<i class="fa-solid fa-book-open text-primary"></i> Detail Jurnal', html: html, width: '600px', showConfirmButton: false, showCloseButton: true });
}

function editJurnal(id) {
  const j = appState.jurnalData.find(x => x.ID === id);
  if (!j) return;
  document.getElementById('jurnal-id').value = j.ID;
  document.getElementById('jurnal-tgl').value = j.Tanggal;
  document.getElementById('jurnal-kelas').value = j.Kelas;
  document.getElementById('jurnal-mapel').value = j.Mapel;
  document.getElementById('jurnal-materi').value = j.Materi;
  document.getElementById('jurnal-permasalahan').value = j.Permasalahan || '';
  document.getElementById('jurnal-solusi').value = j.Solusi || '';
  document.getElementById('jurnal-keterangan').value = j.Keterangan || '';
  openModal('modalJurnal');
}

// Auto-Save Matriks (Nilai Ujian)
let globalNilaiBulan = "Juli";
let activeJadwalId = null;
function loadNilaiMatrix() {
  const tgl = document.getElementById('buka-info-tanggal').innerText;
  const kls = document.getElementById('buka-info-kelas').innerText;
  const mpl = document.getElementById('buka-info-mapel').innerText;
  const tb = document.getElementById('tbody-MatrixNilai');
  if (!kls || !mpl || kls === '-') { tb.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Gagal memuat info kelas/mapel.</td></tr>'; return; }
  tb.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm"></div> Memuat...</td></tr>';

  // Set active jadwal for materi saving
  const j = appState.jadwalData.find(x => x.Tanggal === tgl && x.Kelas === kls && x.Mapel === mpl);
  if (j) activeJadwalId = j.ID;
  const materiVal = j ? (j.Materi_Harian || '') : '';

  apiCall('getNilaiMatrix', [appState.activeTA, tgl, kls, mpl]).then(data => {
    if (data.length === 0) { tb.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Tidak ada siswa.</td></tr>`; return; }

    tb.innerHTML = `<tr>
        <td colspan="3" class="fw-bold bg-light text-end">Materi yang diajarkan:</td>
        <td colspan="4"><input type="text" class="form-control form-control-sm" placeholder="Materi Harian (Opsional)" value="${materiVal}" onblur="triggerAutoSaveJadwalMateri(this.value)"></td>
      </tr>`;
    data.forEach((s, index) => {
      tb.innerHTML += `<tr>
            <td class="text-center">${index + 1}</td>
            <td class="text-center">${s.NIS}</td>
            <td class="fw-bold text-start text-nowrap">${s.Nama}</td>
            <td><input type="number" class="form-control form-control-sm text-center" min="0" max="100" value="${s.Pengetahuan}" onblur="validateAndSaveHarian('${s.NIS}', 'Pengetahuan', this)"></td>
            <td><input type="number" class="form-control form-control-sm text-center" min="0" max="100" value="${s.Keterampilan}" onblur="validateAndSaveHarian('${s.NIS}', 'Keterampilan', this)"></td>
            <td>
              <select class="form-select form-select-sm" onchange="triggerAutoSaveNilai('${s.NIS}', 'Sikap', this.value)">
                <option value="" ${s.Sikap === '' ? 'selected' : ''}>Pilih</option>
                <option value="A" ${s.Sikap === 'A' ? 'selected' : ''}>A (Sangat Baik)</option>
                <option value="B" ${s.Sikap === 'B' ? 'selected' : ''}>B (Baik)</option>
                <option value="C" ${s.Sikap === 'C' ? 'selected' : ''}>C (Cukup)</option>
                <option value="D" ${s.Sikap === 'D' ? 'selected' : ''}>D (Kurang)</option>
                <option value="E" ${s.Sikap === 'E' ? 'selected' : ''}>E (Sangat Kurang)</option>
              </select>
            </td>
            <td><input type="text" class="form-control form-control-sm" value="${s.Catatan}" onblur="triggerAutoSaveNilai('${s.NIS}', 'Catatan', this.value)"></td>
          </tr>`;
    });
  }).catch(err => { console.error(err); });
}

function triggerAutoSaveJadwalMateri(val) {
  if (!activeJadwalId) return;
  apiCall('autoSaveJadwalMateri', [activeJadwalId, val]).then(() => showToast('Materi tersimpan.')).catch(err => { console.error(err); });
}

function validateAndSaveHarian(nis, fld, el) {
  if (el.value === '') {
    triggerAutoSaveNilai(nis, fld, '');
    return;
  }
  let val = parseFloat(el.value);
  if (isNaN(val)) return;
  if (val > 100) {
    Swal.fire('Peringatan', 'Nilai tidak boleh lebih dari 100. Dikembalikan ke 0.', 'warning');
    el.value = 0;
    val = 0;
  }
  // force integer
  val = Math.round(val);
  el.value = val;
  triggerAutoSaveNilai(nis, fld, val);
}

function triggerAutoSaveNilai(nis, fld, skor) {
  if (skor === undefined || skor === null) return;
  const tgl = document.getElementById('buka-info-tanggal').innerText;
  const kls = document.getElementById('buka-info-kelas').innerText;
  const mpl = document.getElementById('buka-info-mapel').innerText;
  apiCall('autoSaveNilai', [appState.activeTA, tgl, kls, mpl, nis, fld, skor]).then(() => showToast(`Data ${fld} NIS ${nis} tersimpan.`)).catch(err => { console.error(err); });
}

// ==========================================
// NILAI UJIAN
// ==========================================
function updateJenisUjianOptions() {
  const smt = document.getElementById('filter-uji-smt').value;
  const jenisEl = document.getElementById('filter-uji-jenis');
  if (smt === "1") {
    jenisEl.innerHTML = `
        <option value="UTS Smt 1">UTS Smt 1</option>
        <option value="Ujian Akhir Semester">Ujian Akhir Semester</option>
      `;
  } else {
    jenisEl.innerHTML = `
        <option value="UTS Smt 2">UTS Smt 2</option>
        <option value="Ujian Kenaikan Kelas">Ujian Kenaikan Kelas</option>
        <option value="Ujian Sekolah">Ujian Sekolah</option>
      `;
  }
  loadNilaiUjianMatrix();
}

function loadNilaiUjianMatrix() {
  const ta = document.getElementById('filter-uji-ta').value;
  const smt = document.getElementById('filter-uji-smt').value;
  const jenis = document.getElementById('filter-uji-jenis').value;
  const kls = document.getElementById('filter-uji-kelas').value;
  const mpl = document.getElementById('filter-uji-mapel').value;
  const tb = document.getElementById('tbody-MatrixNilaiUjian');
  if (!kls || !mpl || !jenis) { tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Lengkapi semua filter.</td></tr>'; return; }
  tb.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div> Memuat...</td></tr>';

  apiCall('getNilaiUjianMatrix', [ta, smt, kls, mpl, jenis]).then(data => {
    if (data.length === 0) { tb.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Tidak ada siswa.</td></tr>`; return; }
    tb.innerHTML = '';
    data.forEach(s => {
      const mkInp = (fld, val) => {
        let fVal = val;
        if (val !== '' && !isNaN(val)) fVal = parseFloat(val).toFixed(2);
        return `<input type="number" class="form-control form-control-sm text-center" placeholder="0-100" max="100" step="0.01" value="${fVal}" onblur="validateAndSaveUjian('${s.NIS}', '${fld}', this)">`;
      };

      const mkSikap = (fld, val) => `
          <select class="form-select form-select-sm" onchange="triggerAutoSaveNilaiUjian('${s.NIS}', '${fld}', this.value)">
            <option value="" ${val === '' ? 'selected' : ''}>Pilih</option>
            <option value="A (Sangat Baik)" ${val === 'A (Sangat Baik)' ? 'selected' : ''}>A (Sangat Baik)</option>
            <option value="B (Baik)" ${val === 'B (Baik)' ? 'selected' : ''}>B (Baik)</option>
            <option value="C (Cukup)" ${val === 'C (Cukup)' ? 'selected' : ''}>C (Cukup)</option>
            <option value="D (Kurang)" ${val === 'D (Kurang)' ? 'selected' : ''}>D (Kurang)</option>
            <option value="E (Buruk)" ${val === 'E (Buruk)' ? 'selected' : ''}>E (Buruk)</option>
          </select>`;

      const mkCat = (fld, val) => `<input type="text" class="form-control form-control-sm" placeholder="Catatan Ujian" value="${val}" onblur="triggerAutoSaveNilaiUjian('${s.NIS}', '${fld}', this.value)">`;
      const fmtKonv = (val) => (!val || val === '-') ? '-' : Number(val).toFixed(2);

      tb.innerHTML += `<tr data-nis="${s.NIS}">
            <td class="align-middle text-center">${s.NIS}</td>
            <td class="text-start fw-bold align-middle">${s.Nama}</td>
            <td class="align-middle text-center">${s.L_P || '-'}</td>
            <td>${mkInp('Pengetahuan', s.Pengetahuan)}</td>
            <td class="bg-secondary bg-opacity-10 align-middle text-center fw-bold text-primary konv-peng">${fmtKonv(s.Konversi_Peng)}</td>
            <td>${mkInp('Keterampilan', s.Keterampilan)}</td>
            <td class="bg-secondary bg-opacity-10 align-middle text-center fw-bold text-primary konv-ket">${fmtKonv(s.Konversi_Ket)}</td>
            <td>${mkSikap('Sikap', s.Sikap)}</td>
            <td>${mkCat('Catatan', s.Catatan)}</td>
          </tr>`;
    });
  }).catch(err => { console.error(err); });
}

function konversiNilaiOtomatis() {
  const minTarget = parseFloat(document.getElementById('konv-min').value);
  const maxTarget = parseFloat(document.getElementById('konv-max').value);

  if (isNaN(minTarget) || isNaN(maxTarget)) {
    Swal.fire('Error', 'Target Terendah dan Tertinggi harus berupa angka!', 'error');
    return;
  }

  const rows = document.querySelectorAll('#tbody-MatrixNilaiUjian tr[data-nis]');
  if (rows.length === 0) {
    Swal.fire('Error', 'Tidak ada data siswa untuk dikonversi!', 'error');
    return;
  }

  let arrPeng = [];
  let arrKet = [];

  // Kumpulkan nilai asli
  rows.forEach(tr => {
    let inps = tr.querySelectorAll('input[type="number"]');
    let peng = parseFloat(inps[0].value);
    let ket = parseFloat(inps[1].value);
    if (!isNaN(peng)) arrPeng.push(peng);
    if (!isNaN(ket)) arrKet.push(ket);
  });

  if (arrPeng.length === 0 && arrKet.length === 0) {
    Swal.fire('Info', 'Belum ada nilai asli yang diinput!', 'info');
    return;
  }

  // Cari min max dari data yang ada
  const minPeng = arrPeng.length > 0 ? Math.min(...arrPeng) : 0;
  const maxPeng = arrPeng.length > 0 ? Math.max(...arrPeng) : 100;
  const minKet = arrKet.length > 0 ? Math.min(...arrKet) : 0;
  const maxKet = arrKet.length > 0 ? Math.max(...arrKet) : 100;

  // Pastikan target min < max, jika terbalik maka tukar
  let tMin = Math.min(minTarget, maxTarget);
  let tMax = Math.max(minTarget, maxTarget);

  let updateArray = [];

  // Fungsi konversi linear
  const calcKonv = (val, minAsli, maxAsli) => {
    if (isNaN(val)) return '-';
    if (maxAsli === minAsli) return tMax; // Jika semua nilai sama
    let hasil = tMin + ((val - minAsli) / (maxAsli - minAsli)) * (tMax - tMin);
    // Pastikan tidak melampaui batas target akibat pembulatan
    if (hasil > tMax) hasil = tMax;
    if (hasil < tMin) hasil = tMin;
    return hasil.toFixed(2);
  };

  rows.forEach(tr => {
    let nis = tr.getAttribute('data-nis');
    let inps = tr.querySelectorAll('input[type="number"]');

    let pengAsli = parseFloat(inps[0].value);
    let ketAsli = parseFloat(inps[1].value);

    let konvPeng = calcKonv(pengAsli, minPeng, maxPeng);
    let konvKet = calcKonv(ketAsli, minKet, maxKet);

    // Update UI
    tr.querySelector('.konv-peng').innerText = konvPeng;
    tr.querySelector('.konv-ket').innerText = konvKet;

    if (konvPeng !== '-') updateArray.push({ nis: nis, field: 'Konversi_Peng', val: konvPeng });
    if (konvKet !== '-') updateArray.push({ nis: nis, field: 'Konversi_Ket', val: konvKet });
  });

  if (updateArray.length > 0) {
    const ta = document.getElementById('filter-uji-ta').value;
    const smt = document.getElementById('filter-uji-smt').value;
    const jenis = document.getElementById('filter-uji-jenis').value;
    const kls = document.getElementById('filter-uji-kelas').value;
    const mpl = document.getElementById('filter-uji-mapel').value;

    Swal.fire({
      title: 'Menyimpan...',
      text: 'Menerapkan dan menyimpan nilai konversi',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    apiCall('batchSaveNilaiUjian', [ta, smt, kls, mpl, jenis, updateArray]).then(() => {
      Swal.fire('Selesai', 'Konversi berhasil dan tersimpan!', 'success');
    }).catch(err => {
      Swal.fire('Error', 'Gagal menyimpan: ' + err.message, 'error');
    });
  } else {
    Swal.fire('Info', 'Tidak ada nilai yang dikonversi.', 'info');
  }
}

function validateAndSaveUjian(nis, fld, el) {
  if (!el.value) return;
  let val = parseFloat(el.value);
  if (isNaN(val)) return;
  if (val > 100) {
    Swal.fire('Peringatan', 'Nilai tidak boleh lebih dari 100. Dikembalikan ke 0.', 'warning');
    el.value = '0.00';
    val = 0;
  } else {
    el.value = val.toFixed(2);
  }
  triggerAutoSaveNilaiUjian(nis, fld, el.value);
}

function triggerAutoSaveNilaiUjian(nis, fld, skor) {
  if (!skor) return;
  const ta = document.getElementById('filter-uji-ta').value;
  const smt = document.getElementById('filter-uji-smt').value;
  const jenis = document.getElementById('filter-uji-jenis').value;
  const kls = document.getElementById('filter-uji-kelas').value;
  const mpl = document.getElementById('filter-uji-mapel').value;
  apiCall('autoSaveNilaiUjian', [ta, smt, kls, mpl, jenis, nis, fld, skor]).then(() => showToast(`Data ${fld} NIS ${nis} tersimpan.`)).catch(err => { console.error(err); });
}

function toggleKonversi() {
  const isChecked = document.getElementById('toggle-konversi').checked;
  document.getElementById('konv-min').disabled = !isChecked;
  document.getElementById('konv-max').disabled = !isChecked;
  document.getElementById('btn-jalankan-konv').disabled = !isChecked;

  if (!isChecked) {
    Swal.fire({
      title: 'Matikan Konversi?',
      text: 'Kolom nilai konversi akan dihapus/direset dari database. Lanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(res => {
      if (res.isConfirmed) {
        resetKonversiNilai();
      } else {
        document.getElementById('toggle-konversi').checked = true;
        toggleKonversi(); // Revert UI
      }
    });
  }
}

function resetKonversiNilai() {
  const ta = document.getElementById('filter-uji-ta').value;
  const smt = document.getElementById('filter-uji-smt').value;
  const jenis = document.getElementById('filter-uji-jenis').value;
  const kls = document.getElementById('filter-uji-kelas').value;
  const mpl = document.getElementById('filter-uji-mapel').value;

  Swal.fire({
    title: 'Menghapus...',
    text: 'Mereset nilai konversi',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  apiCall('resetKonversiNilaiUjian', [ta, smt, kls, mpl, jenis]).then(() => {
    // Hapus nilai dari tampilan UI tanpa harus memuat ulang semuanya
    document.querySelectorAll('.konv-peng').forEach(el => el.innerText = '-');
    document.querySelectorAll('.konv-ket').forEach(el => el.innerText = '-');
    Swal.fire('Selesai', 'Konversi berhasil dinonaktifkan dan direset!', 'success');
  }).catch(err => {
    Swal.fire('Error', 'Gagal mereset: ' + err.message, 'error');
    document.getElementById('toggle-konversi').checked = true;
    toggleKonversi(); // Revert
  });
}

