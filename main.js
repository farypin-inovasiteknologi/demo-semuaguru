// ==========================================
// REGISTRI URL DATABASE MULTI-TENANT
// ==========================================
const TENANT_REGISTRY = {
  "guru01": "https://script.google.com/macros/s/AKfycbyG7sACxrTCwV_ISkv-g9gqJjQk5OM-5Hwy_N1QGUl_AJu5Gj_0EBvCvdTV2w-6U0KMxA/exec",
  "guru02": "https://script.google.com/macros/s/GANTI_DENGAN_URL_LAIN/exec",
  "demo": "https://script.google.com/macros/s/GANTI_DENGAN_URL_LAIN/exec"
};

let GAS_API_URL = "";

async function apiCall(action, payload = []) {
  if (!GAS_API_URL) {
    throw new Error("Koneksi Database tidak valid. URL tidak terdaftar.");
  }
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: action, payload: payload, shardId: appState.activeShardId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'error') {
      throw new Error(data.message);
    }
    return data.data;
  } catch (e) {
    console.error("API Call Error:", e);
    throw e;
  }
}


let appState = {
  modeAktif: '',
  relasi: [],
  siswa: [],
  tahunAjaran: [],
  activeTA: '',
  activeShardId: ''
};

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('id'); // Tidak ada fallback 'default'
  GAS_API_URL = TENANT_REGISTRY[tenantId];

  const today = new Date().toISOString().split('T')[0];
  const absTgl = document.getElementById('filter-abs-tgl');
  if (absTgl) absTgl.value = today;

  if (GAS_API_URL) {
    initApp();
  } else {
    hideLoader();
    document.getElementById('landing-container').style.display = 'flex';
    document.getElementById('landing-nama-sekolah').innerText = "Akses Dibatasi";

    // Sembunyikan tombol Masuk Aplikasi
    const btnMasuk = document.querySelector('#landing-container .btn-modern');
    if (btnMasuk) {
      btnMasuk.style.display = 'none';
    }

    Swal.fire({
      icon: 'error',
      title: 'Akses Ditolak',
      text: 'Anda tidak bisa login karena ID URL Anda belum terdaftar.',
      confirmButtonText: 'Tutup',
      allowOutsideClick: false
    });
  }
});

function initApp() {
  apiCall('getSettings', []).then(settings => {
    appState.modeAktif = settings['Mode_Aktif'] || 'Guru Kelas';
    document.getElementById('mode-badge').innerText = `Mode: ${appState.modeAktif}`;
    updateModeBadges(appState.modeAktif);
    if (appState.modeAktif === 'Guru Mapel') {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#tab-gurumapel"]')).show();
    }

    // Load UI Landing/Login
    document.getElementById('landing-nama-sekolah').innerText = settings['Nama_Sekolah'] || 'UPT Sekolah Dasar';
    if (settings['Logo_Kiri']) {
      document.getElementById('landing-logo-kiri').src = settings['Logo_Kiri'];
      const sidebarLogo = document.getElementById('sidebar-logo-app');
      if (sidebarLogo) sidebarLogo.src = settings['Logo_Kiri'];
    }
    if (settings['Logo_Kanan']) {
      document.getElementById('landing-logo-kanan').src = settings['Logo_Kanan'];
    }

    if (settings['Foto_Guru']) document.getElementById('login-foto-guru').src = settings['Foto_Guru'];
    document.getElementById('login-nama-guru').innerText = settings['Nama_Guru'] || 'Nama Guru';

    if (settings['Background_Login']) {
      document.getElementById('landing-container').style.backgroundImage = `url(${settings['Background_Login']})`;
      document.getElementById('login-container').style.backgroundImage = `url(${settings['Background_Login']})`;
    }

    // Load form pengaturan
    document.getElementById('peng-instansi').value = settings['Nama_Instansi'] || '';
    document.getElementById('peng-opd').value = settings['Nama_OPD'] || '';
    document.getElementById('peng-sekolah').value = settings['Nama_Sekolah'] || '';
    document.getElementById('peng-alamat').value = settings['Alamat_Lengkap'] || '';
    document.getElementById('peng-email').value = settings['Email_Sekolah'] || '';
    document.getElementById('peng-website').value = settings['Website_Sekolah'] || '';

    if (settings['Logo_Kiri']) {
      document.getElementById('prev-logo-kiri').src = settings['Logo_Kiri'];
      document.getElementById('base64-logo-kiri').value = settings['Logo_Kiri'];
    }
    if (settings['Logo_Kanan']) {
      document.getElementById('prev-logo-kanan').src = settings['Logo_Kanan'];
      document.getElementById('base64-logo-kanan').value = settings['Logo_Kanan'];
    }
    if (settings['Foto_Guru']) {
      document.getElementById('prev-foto-guru').src = settings['Foto_Guru'];
      document.getElementById('base64-foto-guru').value = settings['Foto_Guru'];
    }

    document.getElementById('peng-nip').value = settings['NIP'] || '';
    document.getElementById('peng-nuptk').value = settings['NUPTK'] || '';
    document.getElementById('peng-nama-guru').value = settings['Nama_Guru'] || '';
    document.getElementById('peng-tempat-lahir').value = settings['Tempat_Lahir'] || '';
    document.getElementById('peng-tanggal-lahir').value = settings['Tanggal_Lahir'] || '';
    document.getElementById('peng-jk').value = settings['Jenis_Kelamin'] || 'Laki-laki';
    document.getElementById('peng-status-pegawai').value = settings['Status_Pegawai'] || 'PNS';
    document.getElementById('peng-pangkat').value = settings['Pangkat_Golongan'] || '';
    document.getElementById('peng-jabatan').value = settings['Jabatan'] || '';
    document.getElementById('peng-guru-email').value = settings['Profil_Email'] || '';
    document.getElementById('peng-guru-nohp').value = settings['Profil_NoHP'] || '';

    document.getElementById('peng-username').value = settings['Username'] || '';
    document.getElementById('peng-password').value = settings['Password'] || '';

    if (settings['Nama_Kepsek']) document.getElementById('peng-kepsek-nama').value = settings['Nama_Kepsek'];
    if (settings['NIP_Kepsek']) document.getElementById('peng-kepsek-nip').value = settings['NIP_Kepsek'];
    if (settings['Nama_Guru']) document.getElementById('peng-guru-nama').value = settings['Nama_Guru'];
    if (settings['NIP_Guru']) document.getElementById('peng-guru-nip').value = settings['NIP_Guru'];

    refreshRelasiData();
    loadTahunAjaran();
    loadSiswa();
    loadJadwal();

    // Check session
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
      hideLoader();
      document.getElementById('app-container').style.display = 'block';
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } else {
      hideLoader();
      document.getElementById('landing-container').style.display = 'flex';
    }
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

// UI Tools
async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value;
  const p = document.getElementById('login-password').value;

  const btn = e.target.querySelector('button');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Loading...';
  btn.disabled = true;

  try {
    const isValid = await apiCall('checkLogin', [u, p]);

    if (isValid) {
      sessionStorage.setItem('isLoggedIn', 'true');
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('app-container').style.display = 'block';
      Swal.fire('Login Berhasil', 'Selamat datang kembali!', 'success');
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } else {
      Swal.fire('Login Gagal', 'Username atau Password salah!', 'error');
    }
  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'Terjadi kesalahan sistem.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function handleLogout() {
  Swal.fire({
    title: 'Keluar Aplikasi?',
    text: "Anda akan kembali ke halaman utama.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Keluar'
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.removeItem('isLoggedIn');
      document.getElementById('app-container').style.display = 'none';
      document.getElementById('landing-container').style.display = 'flex';

      // Reset input login
      document.getElementById('login-username').value = '';
      document.getElementById('login-password').value = '';
    }
  });
}

function updateModeBadges(mode) {
  const bKelas = document.getElementById('badge-status-gurukelas');
  const bMapel = document.getElementById('badge-status-gurumapel');
  if (mode === 'Guru Kelas') {
    bKelas.className = 'badge bg-success fs-6'; bKelas.innerText = 'Mode Aktif';
    bMapel.className = 'badge bg-secondary fs-6'; bMapel.innerText = 'Tidak Aktif';
  } else {
    bKelas.className = 'badge bg-secondary fs-6'; bKelas.innerText = 'Tidak Aktif';
    bMapel.className = 'badge bg-success fs-6'; bMapel.innerText = 'Mode Aktif';
  }
}

function nav(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const activeNav = document.querySelector(`.nav-item[onclick="nav('${pageId}')"]`);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  // Update bottom nav active state
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
  const activeBNav = document.querySelector(`.bottom-nav-item[onclick="nav('${pageId}')"]`);
  if (activeBNav) {
    activeBNav.classList.add('active');
  }
}

function showLoader() { document.getElementById('loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }
function showToast(msg) {
  const c = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'save-toast';
  toast.innerHTML = `<i class="fa-solid fa-check-circle text-success"></i> ${msg}`;
  c.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function closeAndCleanModal(modalId) {
  let modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
  if (modalInstance) {
    modalInstance.hide();
  }
  setTimeout(() => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }, 400);
}

function setMode(mode) {
  showLoader();
  apiCall('setModeMengajar', [mode]).then(res => {
    appState.modeAktif = res;
    document.getElementById('mode-badge').innerText = `Mode: ${res}`;
    updateModeBadges(res);
    Swal.fire('Berhasil', `Mode Mengajar diset ke: ${res}`, 'success');
    refreshDropdowns();
    hideLoader();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function simpanPengaturanSistem() {
  showLoader();
  const data = {
    'Nama_Instansi': document.getElementById('peng-instansi').value,
    'Nama_OPD': document.getElementById('peng-opd').value,
    'Nama_Sekolah': document.getElementById('peng-sekolah').value,
    'Alamat_Lengkap': document.getElementById('peng-alamat').value,
    'Email_Sekolah': document.getElementById('peng-email').value,
    'Website_Sekolah': document.getElementById('peng-website').value,
    'Logo_Kiri': document.getElementById('base64-logo-kiri').value,
    'Logo_Kanan': document.getElementById('base64-logo-kanan').value
  };
  apiCall('saveMultipleSettings', [data]).then(() => {
    hideLoader();
    Swal.fire('Tersimpan', 'Pengaturan sistem diperbarui', 'success');
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function simpanPengaturanProfil() {
  showLoader();
  const data = {
    'NIP': document.getElementById('peng-nip').value,
    'NUPTK': document.getElementById('peng-nuptk').value,
    'Nama_Guru': document.getElementById('peng-nama-guru').value,
    'Tempat_Lahir': document.getElementById('peng-tempat-lahir').value,
    'Tanggal_Lahir': document.getElementById('peng-tanggal-lahir').value,
    'Jenis_Kelamin': document.getElementById('peng-jk').value,
    'Status_Pegawai': document.getElementById('peng-status-pegawai').value,
    'Pangkat_Golongan': document.getElementById('peng-pangkat').value,
    'Jabatan': document.getElementById('peng-jabatan').value,
    'Foto_Guru': document.getElementById('base64-foto-guru').value,
    'Profil_Email': document.getElementById('peng-guru-email').value,
    'Profil_NoHP': document.getElementById('peng-guru-nohp').value
  };
  apiCall('saveMultipleSettings', [data]).then(() => {
    hideLoader();
    Swal.fire('Tersimpan', 'Profil Guru diperbarui', 'success');
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function simpanPengaturanAkun() {
  const u = document.getElementById('peng-username').value;
  const p = document.getElementById('peng-password').value;
  const bg = document.getElementById('base64-bg-login').value;

  if (!u || !p) { Swal.fire('Error', 'Username dan Password tidak boleh kosong!', 'error'); return; }

  let dataSave = { 'Username': u, 'Password': p };
  if (bg) {
    dataSave['Background_Login'] = bg;
  }

  showLoader();
  apiCall('saveMultipleSettings', [dataSave]).then(() => {
    hideLoader();
    Swal.fire('Sukses', 'Data akun dan otentikasi berhasil diperbarui.', 'success').then(() => window.location.reload());
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function previewBackground(input) {
  if (input.files && input.files[0]) {
    let file = input.files[0];
    let reader = new FileReader();
    
    reader.onload = function (e) {
      let img = new Image();
      img.onload = function() {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        
        let MAX_WIDTH = 800; // compress dimension
        let MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG 40%
        let dataurl = canvas.toDataURL('image/jpeg', 0.4);
        
        // Google Sheets cell character limit is 50,000
        if (dataurl.length > 49000) {
           Swal.fire('Error', 'Gambar masih terlalu besar/kompleks. Silakan gunakan gambar yang lebih sederhana atau dengan resolusi yang lebih kecil.', 'error');
           input.value = '';
           return;
        }

        document.getElementById('base64-bg-login').value = dataurl;
      }
      img.src = e.target.result;
    }
    reader.readAsDataURL(file);
  }
}

function lupaPassword() {
  Swal.fire({
    title: 'Lupa Password?',
    text: "Masukkan alamat email Anda untuk menerima password saat ini.",
    input: 'email',
    inputPlaceholder: 'Email admin',
    showCancelButton: true,
    confirmButtonText: 'Kirim',
    cancelButtonText: 'Batal',
    showLoaderOnConfirm: true,
    preConfirm: (email) => {
      return new Promise((resolve) => {
        apiCall('withFailureHandler', [err => {
          resolve({ success: false, message: "Terjadi kesalahan koneksi." });
        }]).then(res => {
          resolve(res);
        }).catch(err => { console.error(err); }).sendPasswordToEmail(email);
      });
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value.success) {
        Swal.fire('Berhasil!', result.value.message, 'success');
      } else {
        Swal.fire('Gagal!', result.value.message, 'error');
      }
    }
  });
}

function simpanTandaTangan() {
  const nks = document.getElementById('peng-kepsek-nama').value;
  const nipks = document.getElementById('peng-kepsek-nip').value;
  const ng = document.getElementById('peng-guru-nama').value;
  const nipg = document.getElementById('peng-guru-nip').value;

  showLoader();
  apiCall('saveMultipleSettings', [{
    'Kepsek_Nama': nks,
    'Kepsek_NIP': nipks,
  }]).then(() => {
    hideLoader();
    Swal.fire('Tersimpan', 'Pengaturan Tanda Tangan diperbarui', 'success');
  }).catch(err => { console.error(err); }).saveMultipleSettings({
    'Kepsek_Nama': nks,
    'Kepsek_NIP': nipks,
    'Guru_Nama': ng,
    'Guru_NIP': nipg
  });
}

// Relasi Data
function refreshRelasiData() {
  apiCall('readData', ['Relasi_Mapel']).then(data => {
    appState.relasi = appState.activeTA ? data.filter(x => x.Tahun_Ajaran === appState.activeTA) : [];
    renderRelasiCards('Guru Kelas', 'list-gurukelas', 'Kelas', 'Mata Pelajaran');
    renderRelasiCards('Guru Mapel', 'list-gurumapel', 'Mata Pelajaran', 'Daftar Kelas');
    refreshDropdowns();
    hideLoader();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function renderRelasiCards(tipe, containerId, labelInduk, labelAnak) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  const items = appState.relasi.filter(r => r.Tipe_Mode === tipe);
  const indukList = [...new Set(items.map(r => r.Induk))];

  if (indukList.length === 0) {
    cont.innerHTML = `<div class="col-12"><div class="alert alert-light text-muted border-0 shadow-sm">Belum ada ${labelInduk} ditambahkan.</div></div>`;
    return;
  }

  let htmlAll = '';
  indukList.forEach(induk => {
    const anakItems = items.filter(r => r.Induk === induk && r.Anak);

    if (tipe === 'Guru Kelas') {
      // Mode Guru Kelas: Induk = Kelas, Anak = Mapel
      let anakHtml = anakItems.map(a => `<div class="badge bg-secondary me-1 mb-1 p-2">${a.Anak} <i class="fa-solid fa-times ms-1 text-light cursor-pointer" onclick="hapusRecord('Relasi_Mapel', '${a.ID}', refreshRelasiData)"></i></div>`).join('');
      if (!anakHtml) anakHtml = '<small class="text-muted">Belum ada Mapel.</small>';

      htmlAll += `
          <div class="col-md-12 mb-3"><div class="card shadow-sm border-0 hover-float">
              <div class="card-header bg-gradient-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold"><i class="fa-solid fa-chalkboard-user"></i> Kelas: ${induk}</h5>
                <button class="btn btn-sm btn-outline-light" onclick="hapusIndukRelasi('${tipe}','${induk}')"><i class="fa-solid fa-trash"></i> Hapus Kelas</button>
              </div>
              <div class="card-body row">
                <div class="col-md-4 border-end text-center p-3">
                  <h6 class="fw-bold mb-3">Kelola Siswa</h6>
                  <button class="btn btn-warning w-100 py-3 fw-bold" onclick="bukaKelolaSiswaKelas('${induk}')"><i class="fa-solid fa-users fa-2x mb-2 d-block"></i>Data Siswa Kelas ${induk}</button>
                </div>
                <div class="col-md-8 p-3">
                  <h6 class="fw-bold mb-3">Daftar Mata Pelajaran</h6>
                  <div class="mb-3">${anakHtml}</div>
                  <button class="btn btn-sm btn-outline-primary" onclick="openModalRelasi('${tipe}', 'Anak', '${induk}')"><i class="fa-solid fa-plus"></i> Tambah Mapel</button>
                </div>
              </div>
          </div></div>
        `;
    } else {
      // Mode Guru Mapel: Induk = Mapel, Anak = Kelas
      let anakHtml = anakItems.map(a => `
          <div class="card bg-light border-0 shadow-sm mb-2">
            <div class="card-body p-2 d-flex justify-content-between align-items-center">
              <span class="fw-bold"><i class="fa-solid fa-door-open text-primary"></i> Kelas ${a.Anak}</span>
              <div>
                <button class="btn btn-sm btn-warning me-1" onclick="bukaKelolaSiswaKelas('${a.Anak}')"><i class="fa-solid fa-users"></i> Siswa</button>
                <button class="btn btn-sm btn-danger" onclick="hapusRecord('Relasi_Mapel', '${a.ID}', refreshRelasiData)"><i class="fa-solid fa-times"></i></button>
              </div>
            </div>
          </div>
        `).join('');
      if (!anakHtml) anakHtml = '<small class="text-muted">Belum ada Kelas.</small>';

      htmlAll += `
          <div class="col-md-6 mb-3"><div class="card shadow-sm border-0 h-100 hover-float">
              <div class="card-header bg-gradient-success text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold"><i class="fa-solid fa-book"></i> Mapel: ${induk}</h5>
                <button class="btn btn-sm btn-outline-light" onclick="hapusIndukRelasi('${tipe}','${induk}')"><i class="fa-solid fa-trash"></i> Hapus Mapel</button>
              </div>
              <div class="card-body">
                <h6 class="fw-bold mb-2">Daftar Kelas yang Diajar</h6>
                <div class="mb-3">${anakHtml}</div>
                <button class="btn btn-sm btn-outline-success w-100" onclick="openModalRelasi('${tipe}', 'Anak', '${induk}')"><i class="fa-solid fa-plus"></i> Tambah Kelas</button>
              </div>
          </div></div>
        `;
    }
  });
  cont.innerHTML = htmlAll;
}

function openModalRelasi(tipe, level, indukVal = '') {
  document.getElementById('rel-tipe').value = tipe;
  document.getElementById('rel-level').value = level;
  document.getElementById('rel-indukval').value = indukVal;
  document.getElementById('form-relasi-induk').style.display = level === 'Induk' ? 'block' : 'none';
  document.getElementById('form-relasi-anak').style.display = level === 'Anak' ? 'block' : 'none';
  document.getElementById('lbl-induk').innerText = tipe === 'Guru Kelas' ? 'Nama Kelas (Cth: 7A)' : 'Nama Mata Pelajaran (Cth: Matematika)';
  document.getElementById('lbl-anak').innerText = tipe === 'Guru Kelas' ? 'Tambahkan Mapel ke kelas ini' : 'Tambahkan Kelas untuk diajar';
  document.getElementById('inp-induk').value = '';
  document.getElementById('inp-anak').value = '';
  document.getElementById('mRelasiTitle').innerText = level === 'Induk' ? 'Buat Kamar Utama' : `Isi Kamar: ${indukVal}`;
  new bootstrap.Modal(document.getElementById('modalRelasi')).show();
}

function simpanRelasi() {
  const tipe = document.getElementById('rel-tipe').value;
  const level = document.getElementById('rel-level').value;
  const induk = level === 'Induk' ? document.getElementById('inp-induk').value : document.getElementById('rel-indukval').value;
  const anak = level === 'Anak' ? document.getElementById('inp-anak').value : '';
  if (level === 'Induk' && !induk) return Swal.fire('Error', 'Nama tidak boleh kosong', 'error');
  if (level === 'Anak' && !anak) return Swal.fire('Error', 'Nama sub tidak boleh kosong', 'error');

  const isExists = appState.relasi.find(r => r.Tipe_Mode === tipe && r.Induk === induk && r.Anak === anak && r.Tahun_Ajaran === appState.activeTA);
  if (isExists) return Swal.fire('Error', 'Data kamar / relasi ini sudah ada!', 'error');

  showLoader();
  apiCall('insertData', ['Relasi_Mapel', { Tipe_Mode: tipe, Induk: induk, Anak: anak, Tahun_Ajaran: appState.activeTA }]).then(() => {
    bootstrap.Modal.getInstance(document.getElementById('modalRelasi')).hide();
    refreshRelasiData();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function hapusIndukRelasi(tipe, induk) {
  Swal.fire({ title: 'Hapus Kamar?', text: 'Seluruh isinya ikut terhapus.', icon: 'warning', showCancelButton: true }).then(r => {
    if (r.isConfirmed) {
      const toDel = appState.relasi.filter(x => x.Tipe_Mode === tipe && x.Induk === induk);
      let count = 0; showLoader();
      toDel.forEach(item => {
        apiCall('deleteData', ['Relasi_Mapel', item.ID]).then(() => {
          count++; if (count === toDel.length) refreshRelasiData();
        }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
      });
      if (toDel.length === 0) hideLoader();
    }
  });
}

function refreshDropdowns() {
  const isGuruKelas = appState.modeAktif === 'Guru Kelas';
  const relAktif = appState.relasi.filter(r => r.Tipe_Mode === appState.modeAktif);

  // Induk: Guru Kelas = Kelas, Guru Mapel = Mapel
  // Anak: Guru Kelas = Mapel, Guru Mapel = Kelas
  let listKelas = isGuruKelas ? relAktif.map(r => r.Induk) : relAktif.map(r => r.Anak);
  let listMapel = isGuruKelas ? relAktif.map(r => r.Anak) : relAktif.map(r => r.Induk);

  listKelas = [...new Set(listKelas)].filter(Boolean);
  listMapel = [...new Set(listMapel)].filter(Boolean);

  document.querySelectorAll('.dropdown-kelas-all').forEach(el => {
    let v = el.value; el.innerHTML = '<option value="">Pilih...</option>';
    listKelas.forEach(k => el.innerHTML += `<option value="${k}">${k}</option>`); el.value = v;
  });

  document.querySelectorAll('.dropdown-kelas').forEach(el => {
    let v = el.value; el.innerHTML = '<option value="">Pilih...</option>';
    listKelas.forEach(k => el.innerHTML += `<option value="${k}">${k}</option>`); el.value = v;
  });

  document.querySelectorAll('.dropdown-mapel').forEach(el => {
    let v = el.value; el.innerHTML = '<option value="">Pilih...</option>';
    listMapel.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`); el.value = v;
  });
}

function updateDependentDropdown(triggerType, sourceId, targetId) {
  const sourceVal = document.getElementById(sourceId).value;
  const targetEl = document.getElementById(targetId);

  // Simpan nilai pilihan target saat ini agar tidak tereset secara tidak sengaja
  const currentTargetVal = targetEl.value;

  // Jika dikosongkan, reset semua dropdown (refresh full)
  if (!sourceVal) {
    refreshDropdowns();
    return;
  }

  targetEl.innerHTML = `<option value="">Pilih...</option>`;
  const isGuruKelas = appState.modeAktif === 'Guru Kelas';
  const relAktif = appState.relasi.filter(r => r.Tipe_Mode === appState.modeAktif);

  if (isGuruKelas) {
    if (triggerType === 'kelas') {
      const anakList = relAktif.filter(r => r.Induk === sourceVal).map(r => r.Anak);
      [...new Set(anakList)].filter(Boolean).forEach(a => targetEl.innerHTML += `<option value="${a}">${a}</option>`);
    } else if (triggerType === 'mapel') {
      const indukList = relAktif.filter(r => r.Anak === sourceVal).map(r => r.Induk);
      [...new Set(indukList)].filter(Boolean).forEach(a => targetEl.innerHTML += `<option value="${a}">${a}</option>`);
    }
  } else { // Guru Mapel
    if (triggerType === 'mapel') {
      const anakList = relAktif.filter(r => r.Induk === sourceVal).map(r => r.Anak);
      [...new Set(anakList)].filter(Boolean).forEach(a => targetEl.innerHTML += `<option value="${a}">${a}</option>`);
    } else if (triggerType === 'kelas') {
      const indukList = relAktif.filter(r => r.Anak === sourceVal).map(r => r.Induk);
      [...new Set(indukList)].filter(Boolean).forEach(a => targetEl.innerHTML += `<option value="${a}">${a}</option>`);
    }
  }

  // Kembalikan nilai yang dipilih jika masih valid (ada di dalam opsi yang baru)
  if (currentTargetVal) {
    const optionExists = Array.from(targetEl.options).some(opt => opt.value === currentTargetVal);
    if (optionExists) targetEl.value = currentTargetVal;
  }
}

// Generic Crud Form
function openModal(id) { new bootstrap.Modal(document.getElementById(id)).show(); }

function autoHari(tglStr) {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dt = new Date(tglStr);
  if (!isNaN(dt)) document.getElementById('jadwal-hari').value = hari[dt.getDay()];
}

function simpanData(e, sheetName, modalId) {
  e.preventDefault(); showLoader();
  const fd = new FormData(e.target);
  let data = {}; fd.forEach((v, k) => data[k] = v);
  if (appState.activeTA && sheetName !== 'Pengaturan' && sheetName !== 'Tahun_Ajaran') {
    data['Tahun_Ajaran'] = appState.activeTA;
  }
  apiCall('insertData', [sheetName, data]).then(() => {
    closeAndCleanModal(modalId);
    e.target.reset();
    Swal.fire('Sukses', 'Data berhasil disimpan', 'success');
    if (sheetName === 'Siswa') loadSiswa();
    if (sheetName === 'Jadwal') loadJadwal();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function downloadTemplateSiswa() {
  const ws_data = [
    ['NIS', 'NISN', 'Nama', 'Tempat_Lahir', 'Tanggal_Lahir', 'L_P', 'Nama_Ayah', 'Nama_Ibu', 'Kelas', 'No_HP'],
    ['12345', '0012345678', 'Budi Santoso', 'Jakarta', '2010-05-20', 'L', 'Sutrisno', 'Siti', '7A', '081234567890']
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  Swal.fire('Info', 'Template Excel berhasil diunduh. Silakan isi dan Upload kembali.', 'info');
}

function prosesImportSiswa() {
  const fileInput = document.getElementById('file-import-siswa');
  if (fileInput.files.length === 0) return Swal.fire('Error', 'Pilih file terlebih dahulu!', 'error');

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    showLoader();
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      let json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (json.length === 0) {
        hideLoader();
        return Swal.fire('Error', 'File kosong atau format salah.', 'error');
      }

      // Mapping properties if necessary, assuming headers match exactly
      let payload = json.map(row => ({
        Tahun_Ajaran: appState.activeTA,
        NIS: row['NIS'] || '',
        NISN: row['NISN'] || '',
        Nama: row['Nama'] || row['Nama Lengkap'] || '',
        Tempat_Lahir: row['Tempat_Lahir'] || row['Tempat Lahir'] || '',
        Tanggal_Lahir: row['Tanggal_Lahir'] || row['Tanggal Lahir'] || '',
        L_P: row['L_P'] || row['L/P'] || row['Jenis Kelamin'] || '',
        Nama_Ayah: row['Nama_Ayah'] || row['Nama Ayah'] || '',
        Nama_Ibu: row['Nama_Ibu'] || row['Nama Ibu'] || '',
        Kelas: activeKelolaSiswaKelas // Override with current active class modal
      })).filter(r => r.NIS && r.Nama);

      if (payload.length === 0) {
        hideLoader();
        return Swal.fire('Error', 'Data tidak valid. Pastikan kolom NIS dan Nama terisi.', 'error');
      }

      apiCall('importSiswaBatch', [payload]).then(res => {
        hideLoader();
        let msg = `Berhasil: ${res.success} data.\nGagal (NIS ganda): ${res.failed} data.`;
        if (res.failed > 0) msg += `\nNIS Gagal: ${res.failedNis.join(', ')}`;
        Swal.fire(res.failed > 0 ? 'Info Import' : 'Sukses', msg, res.failed > 0 ? 'warning' : 'success');
        closeAndCleanModal('modalImportSiswa');
        loadSiswa();
      }).catch(err => {
        hideLoader();
        Swal.fire('Error', err.message, 'error');
        console.error(err);
      });

    } catch (err) {
      hideLoader();
      Swal.fire('Error', 'Gagal memproses file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function hapusRecord(sheet, id, callback) {
  Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true }).then(r => {
    if (r.isConfirmed) {
      showLoader();
      apiCall('deleteData', [sheet, id]).then(() => {
        Swal.fire('Terhapus', '', 'success');
        if (callback) callback(); else hideLoader();
      }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
    }
  });
}

let currentPageSiswa = 1;

function renderTabelSiswa() {
  const tb = document.getElementById('tbody-Siswa');
  const searchVal = document.getElementById('siswa-search') ? document.getElementById('siswa-search').value.toLowerCase() : '';
  const classFilter = activeKelolaSiswaKelas; // Use the active modal class instead of dropdown
  const perPageStr = document.getElementById('siswa-per-page') ? document.getElementById('siswa-per-page').value : '10';
  const perPage = parseInt(perPageStr, 10) || 10;

  let filtered = appState.siswa.filter(s => {
    const matchSearch = (s.Nama || '').toLowerCase().includes(searchVal) || (s.NIS || '').toLowerCase().includes(searchVal);
    const matchClass = classFilter ? (s.Kelas === classFilter) : true;
    return matchSearch && matchClass;
  });

  const totalRows = filtered.length;
  const totalPages = Math.ceil(totalRows / perPage) || 1;
  if (currentPageSiswa > totalPages) currentPageSiswa = totalPages;

  const startIdx = (currentPageSiswa - 1) * perPage;
  const endIdx = startIdx + perPage;
  const paginated = filtered.slice(startIdx, endIdx);

  tb.innerHTML = paginated.length ? '' : '<tr><td colspan="7" class="text-center">Belum ada data siswa yang cocok.</td></tr>';

  paginated.forEach(s => {
    tb.innerHTML += `<tr><td>${s.NIS}</td><td><span class="fw-bold">${s.Nama}</span><br><small class="text-muted">NISN: ${s.NISN || '-'}</small></td><td>${s.L_P}</td>
            <td>${s.Tempat_Lahir}, ${s.Tanggal_Lahir}</td><td><span class="badge bg-info">${s.Kelas}</span></td>
            <td>${s.Nama_Ayah || '-'} / ${s.Nama_Ibu || '-'}</td>
            <td>
              <button class="btn btn-sm btn-info text-white" onclick="lihatSiswa('${s.ID}')"><i class="fa-solid fa-eye"></i></button>
              <button class="btn btn-sm btn-warning text-dark" onclick="editSiswa('${s.ID}')"><i class="fa-solid fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="hapusRecord('Siswa','${s.ID}', loadSiswa)"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`;
  });

  const info = document.getElementById('siswa-pagination-info');
  if (info) {
    const startRow = totalRows === 0 ? 0 : startIdx + 1;
    const endRow = Math.min(startIdx + perPage, totalRows);
    info.innerText = `Menampilkan ${startRow}-${endRow} dari ${totalRows} data`;
  }

  const ul = document.getElementById('siswa-pagination');
  if (ul) {
    let pHTML = '';
    pHTML += `<li class="page-item ${currentPageSiswa === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="currentPageSiswa--; loadSiswa(); return false;">&laquo;</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPageSiswa - 1 && i <= currentPageSiswa + 1)) {
        pHTML += `<li class="page-item ${i === currentPageSiswa ? 'active' : ''}"><a class="page-link" href="#" onclick="currentPageSiswa=${i}; loadSiswa(); return false;">${i}</a></li>`;
      } else if (i === currentPageSiswa - 2 || i === currentPageSiswa + 2) {
        pHTML += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
      }
    }

    pHTML += `<li class="page-item ${currentPageSiswa === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="currentPageSiswa++; loadSiswa(); return false;">&raquo;</a></li>`;
    ul.innerHTML = pHTML;
  }
}

// Load Data
function loadTahunAjaran() {
  apiCall('readData', ['Tahun_Ajaran']).then(d => {
    appState.tahunAjaran = d;
    renderTahunAjaran();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function renderTahunAjaran() {
  const list = document.getElementById('list-tahun-ajaran');
  if (!list) return;
  list.innerHTML = '';
  if (appState.tahunAjaran.length === 0) {
    list.innerHTML = `<div class="col-12 text-center py-5 text-muted">Belum ada Tahun Ajaran. Silakan tambah baru.</div>`;
    return;
  }
  appState.tahunAjaran.forEach(ta => {
    list.innerHTML += `
        <div class="col-md-4">
            <div class="card shadow-sm h-100 border-0 bg-gradient-info text-white text-center rounded-4 cursor-pointer hover-float transition-all position-relative" onclick="masukTahunAjaran('${ta.Nama_TA}')">
                <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle shadow" style="z-index: 2; width: 32px; height: 32px;" onclick="event.stopPropagation(); hapusTahunAjaran('${ta.Nama_TA}', '${ta.ID}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            <div class="card-body py-4">
              <i class="fa-solid fa-calendar-alt fa-3x mb-3 text-white-50"></i>
              <h4 class="fw-bold mb-0">${ta.Nama_TA}</h4>
              <small class="text-white-50">Klik untuk mengelola</small>
            </div>
        </div>
      </div>
      `;
  });
}

function tambahTahunAjaran() {
  const form = document.querySelector('#modalTahunAjaran form');
  form.reset();
  document.getElementById('Tahun_Ajaran-ID').value = '';
  openModal('modalTahunAjaran');
}

function simpanTahunAjaran(e) {
  e.preventDefault();
  const id = document.getElementById('Tahun_Ajaran-ID').value || 'TA_' + Date.now();
  const nama = document.getElementById('Tahun_Ajaran-Nama_TA').value;

  if (!nama) {
    Swal.fire('Oops', 'Tahun awal belum diisi dengan benar', 'warning');
    return;
  }

  const isExists = appState.tahunAjaran.find(ta => ta.Nama_TA === nama);
  if (isExists) {
    Swal.fire('Gagal', 'Tahun Ajaran ' + nama + ' sudah ada!', 'error');
    return;
  }

  showLoader();
  apiCall('createTahunAjaranShard', [nama, id]).then(res => {
    hideLoader();
    closeAndCleanModal('modalTahunAjaran');
    Swal.fire('Tersimpan', 'Tahun Ajaran berhasil disimpan', 'success');
    loadTahunAjaran();
  }).catch(err => {
    hideLoader();
    Swal.fire('Error', err.message, 'error');
    console.error(err);
  });
}

function hapusTahunAjaran(namaTA, id) {
  Swal.fire({
    title: 'Hapus Tahun Ajaran?',
    text: `Ketik "HAPUS" untuk menghapus Tahun Ajaran ${namaTA}. Seluruh data terkait mungkin ikut terpengaruh.`,
    input: 'text',
    inputPlaceholder: 'Ketik HAPUS disini',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus'
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value === 'HAPUS') {
        hapusRecord('Tahun_Ajaran', id, loadTahunAjaran);
      } else {
        Swal.fire('Dibatalkan', 'Kata kunci tidak cocok. Tahun Ajaran aman.', 'error');
      }
    }
  });
}

function loadDashboardStats(namaTA) {
  document.getElementById('dash-stat-siswa').innerText = '...';
  document.getElementById('dash-stat-kelas').innerText = '...';
  document.getElementById('dash-stat-mapel').innerText = '...';
  document.getElementById('dash-stat-jadwal').innerText = '...';

  // Count Siswa
  apiCall('readData', ['Siswa']).then(data => {
    const count = data.filter(d => d.Tahun_Ajaran === namaTA).length;
    document.getElementById('dash-stat-siswa').innerText = count;
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });

  // Count Kelas & Mapel
  apiCall('readData', ['Relasi_Mapel']).then(data => {
    const taData = data.filter(d => d.Tahun_Ajaran === namaTA);
    const kelasSet = new Set(taData.map(d => d.Induk).filter(Boolean));
    const mapelSet = new Set(taData.map(d => d.Anak).filter(Boolean));
    document.getElementById('dash-stat-kelas').innerText = kelasSet.size;
    document.getElementById('dash-stat-mapel').innerText = mapelSet.size;
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });

  // Count Jadwal
  apiCall('readData', ['Jadwal']).then(data => {
    const count = data.filter(d => d.Tahun_Ajaran === namaTA).length;
    document.getElementById('dash-stat-jadwal').innerText = count;
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function masukTahunAjaran(namaTA) {
  appState.activeTA = namaTA;
  const targetTA = appState.tahunAjaran.find(ta => ta.Nama_TA === namaTA);
  appState.activeShardId = targetTA ? (targetTA.Spreadsheet_ID || '') : '';

  document.getElementById('nav-operational').style.display = 'block';
  document.getElementById('sidebar-ta-label').innerText = 'TA: ' + namaTA;

  // Bottom Nav & Mobile Header Changes
  document.getElementById('bottom-nav-global').style.display = 'none';
  document.getElementById('bottom-nav-operational').style.display = 'flex';
  document.getElementById('mobile-back-btn').style.display = 'block';

  // Set Dashboard TA title
  const dashTitle = document.getElementById('dash-ta-title');
  if (dashTitle) dashTitle.innerText = 'Selamat datang di Tahun Ajaran ' + namaTA;

  document.querySelectorAll('.nav-root').forEach(el => el.style.display = 'none');

  // Set form filter nilai ujian Tahun Ajaran
  const filterTaUjian = document.getElementById('filter-uji-ta');
  if (filterTaUjian) filterTaUjian.value = namaTA;

  // Refresh all data displays to filter by activeTA
  loadSiswa();
  refreshRelasiData();
  if (typeof loadJurnal === 'function') loadJurnal();
  if (typeof loadAbsensi === 'function') loadAbsensi();
  if (typeof loadNilai === 'function') loadNilai();
  if (typeof loadNilaiUjian === 'function') loadNilaiUjian();

  loadDashboardStats(namaTA);

  // Pindah ke menu Dashboard TA secara otomatis
  nav('dashboard-ta');
}

function keluarTahunAjaran() {
  appState.activeTA = '';
  document.getElementById('nav-operational').style.display = 'none';
  document.querySelectorAll('.nav-root').forEach(el => el.style.display = 'block');

  // Bottom Nav & Mobile Header Changes
  document.getElementById('bottom-nav-global').style.display = 'flex';
  document.getElementById('bottom-nav-operational').style.display = 'none';
  document.getElementById('mobile-back-btn').style.display = 'none';

  nav('dashboard');
}

let activeKelolaSiswaKelas = '';

function bukaKelolaSiswaKelas(kelas) {
  activeKelolaSiswaKelas = kelas;
  document.getElementById('mKelolaSiswaTitle').innerText = `Data Siswa - Kelas ${kelas}`;

  // Set the hidden filter logic in renderTabelSiswa to use activeKelolaSiswaKelas instead of the dropdown
  currentPageSiswa = 1;
  loadSiswa();

  openModal('modalKelolaSiswaKelas');
}

function loadSiswa() {
  apiCall('readData', ['Siswa']).then(d => {
    appState.siswa = appState.activeTA ? d.filter(x => x.Tahun_Ajaran === appState.activeTA) : [];
    renderTabelSiswa();
    hideLoader();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function lihatSiswa(id) {
  const s = appState.siswa.find(x => x.ID === id);
  if (!s) return;
  const html = `
      <div class="container-fluid text-start" style="font-size:0.95rem;">
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">NIS</div><div class="col-7">${s.NIS}</div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Nama Lengkap</div><div class="col-7 fw-bold">${s.Nama}</div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Jenis Kelamin</div><div class="col-7">${s.L_P === 'L' ? 'Laki-laki' : s.L_P === 'P' ? 'Perempuan' : '-'}</div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Tempat, Tgl Lahir</div><div class="col-7">${s.Tempat_Lahir}, ${s.Tanggal_Lahir}</div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Kelas</div><div class="col-7"><span class="badge bg-primary">${s.Kelas}</span></div></div>
        <div class="row border-bottom py-2"><div class="col-5 fw-bold text-muted">Nama Ayah</div><div class="col-7">${s.Nama_Ayah || '-'}</div></div>
        <div class="row py-2"><div class="col-5 fw-bold text-muted">Nama Ibu</div><div class="col-7">${s.Nama_Ibu || '-'}</div></div>
      </div>
    `;
  Swal.fire({ title: '<i class="fa-solid fa-user-graduate text-primary"></i> Detail Siswa', html: html, width: '500px', showConfirmButton: false, showCloseButton: true });
}

function checkUnikNIS(nisVal) {
  const id = document.querySelector('#modalSiswa form').elements['ID'].value;
  if (id !== '') return;
  const found = appState.siswa.find(s => String(s.NIS) === String(nisVal));
  const warning = document.getElementById('nis-warning');
  const submitBtn = document.querySelector('#modalSiswa button[type="submit"]');
  if (found) {
    warning.style.display = 'block';
    warning.innerText = `NIS terpakai: ${found.Nama}`;
    submitBtn.disabled = true;
  } else {
    warning.style.display = 'none';
    submitBtn.disabled = false;
  }
}

function bukaModalTambahSiswa() {
  const form = document.querySelector('#modalSiswa form');
  form.reset();
  form.elements['ID'].value = '';

  // Set class if opened from specific class modal
  if (activeKelolaSiswaKelas && form.elements['Kelas']) {
    form.elements['Kelas'].value = activeKelolaSiswaKelas;
    // Optional: Make it readonly so they don't change it
    form.elements['Kelas'].setAttribute('readonly', true);
    form.elements['Kelas'].style.pointerEvents = 'none'; // prevent dropdown if it's a select
  }

  if (document.getElementById('siswa-nis')) document.getElementById('siswa-nis').readOnly = false;
  if (document.getElementById('siswa-nisn')) document.getElementById('siswa-nisn').readOnly = false;
  if (document.getElementById('nis-warning')) document.getElementById('nis-warning').style.display = 'none';
  const submitBtn = document.querySelector('#modalSiswa button[type="submit"]');
  if (submitBtn) submitBtn.disabled = false;

  openModal('modalSiswa');
}

function editSiswa(id) {
  const s = appState.siswa.find(x => x.ID === id);
  if (!s) return;
  const form = document.querySelector('#modalSiswa form');
  form.elements['ID'].value = s.ID;
  form.elements['NIS'].value = s.NIS;
  if (form.elements['NISN']) form.elements['NISN'].value = s.NISN || '';
  form.elements['Nama'].value = s.Nama;
  form.elements['Tempat_Lahir'].value = s.Tempat_Lahir;
  form.elements['Tanggal_Lahir'].value = s.Tanggal_Lahir;
  form.elements['L_P'].value = s.L_P;
  form.elements['Nama_Ayah'].value = s.Nama_Ayah;
  form.elements['Nama_Ibu'].value = s.Nama_Ibu;
  if (form.elements['No_HP']) form.elements['No_HP'].value = s.No_HP || '';
  form.elements['Kelas'].value = s.Kelas;

  if (document.getElementById('siswa-nis')) document.getElementById('siswa-nis').readOnly = true;
  if (document.getElementById('siswa-nisn')) document.getElementById('siswa-nisn').readOnly = true;
  if (document.getElementById('nis-warning')) document.getElementById('nis-warning').style.display = 'none';
  const submitBtn = document.querySelector('#modalSiswa button[type="submit"]');
  if (submitBtn) submitBtn.disabled = false;

  openModal('modalSiswa');
}

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

  if (filterBulan) filtered = filtered.filter(j => (j.Tanggal || '').startsWith(filterBulan));
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

let activeUploadId = null;
let activeUploadType = null;

function triggerUploadArsip(id, type) {
  activeUploadId = id;
  activeUploadType = type;
  const fileInput = document.getElementById('arsip-file-input');
  fileInput.value = ''; // Reset
  fileInput.click();
}

document.getElementById('arsip-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    Swal.fire('Terlalu Besar', 'Ukuran file maksimal 3MB', 'error');
    return;
  }
  openModal('modalUploadArsip');

  const reader = new FileReader();
  reader.onload = function (e) {
    const result = e.target.result;
    const base64Data = result.split(',')[1];

    apiCall('uploadFileToDrive', [base64Data, file.name, file.type, activeUploadId, activeUploadType]).then(res => {
      closeAndCleanModal('modalUploadArsip');
      if (res.success) {
        Swal.fire('Sukses', 'Arsip berhasil diunggah!', 'success');
        // Reload data
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

// ==========================================
// BUKA JADWAL (MODAL UTAMA)
// ==========================================
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
  loadAbsensiMatrix();
  loadNilaiMatrix();
  loadFormJurnal();
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
  if (!confirm('Hapus file ini?')) return;
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



