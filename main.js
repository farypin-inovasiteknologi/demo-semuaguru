// ==========================================
// REGISTRI URL DATABASE MULTI-TENANT
// ==========================================
const TENANT_REGISTRY = {
  "guru01": "https://script.google.com/macros/s/AKfycbyvQObXtPHsW2uE8XOd4uDq8dyzpvRg_Mxnv2lvPUr0FWNPA6G7V-BoFNnVrFhI_rwPnw/exec",
  "guru02": "https://script.google.com/macros/s/GANTI_DENGAN_URL_LAIN/exec",
  "demo": "https://script.google.com/macros/s/GANTI_DENGAN_URL_LAIN/exec"
};

// ==========================================
// KONFIGURASI HELPDESK (Aman untuk Online/Publik)
// ==========================================
const HELPDESK_CONFIG = {
  NAME: "Farypin Inovasi Teknologi",
  WA: "6285219901909",
  EMAIL: "farypintech2026@gmail.com",
  WEBSITE: "https://farypin-inovasiteknologi.com"
};

let GAS_API_URL = "";

function openExternal(url) {
  // FIX: Gunakan window.electronAPI (preload.js) yang aman, bukan require('electron') langsung
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

window.generateId = function () {
  return 'ID-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100000);
}

window.getBase64 = function (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function apiCall(action, payload = []) {
  const writeActions = ['insertData', 'deleteData', 'importSiswaBatch', 'autoSaveAbsensi', 'autoSaveJadwalMateri', 'autoSaveNilai', 'autoSaveNilaiUjian', 'batchSaveNilaiUjian', 'resetKonversiNilaiUjian', 'updateBuktiDukung', 'insertBukuKasus', 'deleteBukuKasus', 'hapusDataTahunAjaran', 'cascadeEditInduk'];

  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online' && writeActions.includes(action)) {
    Swal.fire('Akses Dibatasi', 'Tidak bisa ubah/hapus data di versi online, harap lakukan melalui versi offline di laptop Anda.', 'info');
    throw new Error('Akses Dibatasi');
  }

  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'offline') {
    return await apiCallIndexedDB(action, payload);
  }

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

  if ((typeof APP_ENV !== 'undefined' && APP_ENV === 'offline') || GAS_API_URL) {
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

    if (typeof APP_ENV !== 'undefined') {
      const badge = document.getElementById('net-status-badge');
      if (APP_ENV === 'offline') {
        badge.innerText = 'Status: OFFLINE (Lokal)';
        badge.className = 'badge bg-danger mt-1';
        document.getElementById('sync-btn-container').style.display = 'block';

        // Kunci input nama guru dan password (anti-pembajakan lisensi luring)
        const inNamaGuru = document.getElementById('peng-guru-nama');
        if (inNamaGuru) {
          inNamaGuru.readOnly = true;
          inNamaGuru.title = "Nama Guru (Lisensi) tidak dapat diubah pada versi Offline";
        }
        const inNamaProfil = document.getElementById('peng-nama-guru');
        if (inNamaProfil) {
          inNamaProfil.readOnly = true;
          inNamaProfil.title = "Nama Profil Guru tidak dapat diubah pada versi Offline";
        }
        const inPassword = document.getElementById('peng-password');
        if (inPassword) {
          inPassword.readOnly = true;
          inPassword.title = "Password tidak dapat diubah pada versi Offline";
        }
      } else {
        badge.innerText = 'Status: ONLINE (Cloud)';
        badge.className = 'badge bg-success mt-1';
      }
    }

    updateModeBadges(appState.modeAktif);
    if (appState.modeAktif === 'Guru Mapel') {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#tab-gurumapel"]')).show();
    } else if (appState.modeAktif === 'Guru BK') {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#tab-gurubk"]')).show();
    }

    // Load UI Landing/Login
    document.getElementById('landing-nama-sekolah').innerText = settings['Nama_Sekolah'] || 'UPT Sekolah Dasar';
    if (settings['Logo_Kiri']) {
      document.getElementById('landing-logo-kiri').src = settings['Logo_Kiri'];
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
    if (settings['Background_Login']) {
      const pbg = document.getElementById('prev-bg-login');
      if (pbg) {
        pbg.src = settings['Background_Login'];
        pbg.style.display = 'inline-block';
        document.getElementById('btn-hapus-bg').style.display = 'block';
      }
      const bbg = document.getElementById('base64-bg-login');
      if (bbg) bbg.value = settings['Background_Login'];
    } else {
      const pbg = document.getElementById('prev-bg-login');
      if (pbg) pbg.style.display = 'none';
      const hbg = document.getElementById('btn-hapus-bg');
      if (hbg) hbg.style.display = 'none';
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

    // Check session — verifikasi token sesi (bukan hanya string 'true')
    if (sessionStorage.getItem('isLoggedIn') === 'true' && sessionStorage.getItem('sessionToken')) {
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
      // FIX: Session token aman — bukan sekadar string 'true'
      const sessionToken = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36) + Date.now().toString(36));
      sessionStorage.setItem('sessionToken', sessionToken);
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
      // FIX: Bersihkan semua session data
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('sessionToken');
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
  const bBk = document.getElementById('badge-status-gurubk');

  if (bKelas) {
    bKelas.className = mode === 'Guru Kelas' ? 'badge bg-success fs-6' : 'badge bg-secondary fs-6';
    bKelas.innerText = mode === 'Guru Kelas' ? 'Mode Aktif' : 'Tidak Aktif';
  }
  if (bMapel) {
    bMapel.className = mode === 'Guru Mapel' ? 'badge bg-success fs-6' : 'badge bg-secondary fs-6';
    bMapel.innerText = mode === 'Guru Mapel' ? 'Mode Aktif' : 'Tidak Aktif';
  }
  if (bBk) {
    bBk.className = mode === 'Guru BK' ? 'badge bg-success fs-6' : 'badge bg-secondary fs-6';
    bBk.innerText = mode === 'Guru BK' ? 'Mode Aktif' : 'Tidak Aktif';
  }

  // Update Sidebar
  document.querySelectorAll('.nav-reguler').forEach(el => {
    el.style.display = (mode === 'Guru BK') ? 'none' : 'block';
  });
  document.querySelectorAll('.nav-bk').forEach(el => {
    el.style.display = (mode === 'Guru BK') ? 'block' : 'none';
  });

  // Penyesuaian Teks Navigasi Khusus
  const navKelolaMapel = document.getElementById('nav-kelolamapel');
  if (navKelolaMapel) {
    navKelolaMapel.innerHTML = (mode === 'Guru BK')
      ? `<i class="fa-solid fa-users-rectangle w-20px"></i> Kelola Kelas Binaan`
      : `<i class="fa-solid fa-layer-group w-20px"></i> Kelola Kamar & Relasi`;
  }
  const navKasus = document.getElementById('nav-bukukasus');
  if (navKasus) {
    navKasus.innerHTML = (mode === 'Guru BK')
      ? `<i class="fa-solid fa-book-medical w-20px"></i> Konseling & Kasus`
      : `<i class="fa-solid fa-book-medical w-20px"></i> Buku Kasus Siswa`;
  }

  // Sembunyikan tab dan field khusus Guru BK untuk mode lain
  const tabSurat = document.querySelector('button[data-bs-target="#tab-surat-peringatan"]')?.parentElement;
  const tabPoin = document.querySelector('button[data-bs-target="#tab-poin-pelanggaran"]')?.parentElement;
  const fieldSubKasus = document.getElementById('kasus-pelanggaran')?.parentElement;

  if (tabSurat && tabPoin) {
    if (mode === 'Guru BK') {
      tabSurat.style.display = 'block';
      tabPoin.style.display = 'block';
      if (fieldSubKasus) fieldSubKasus.style.display = 'block';
    } else {
      tabSurat.style.display = 'none';
      tabPoin.style.display = 'none';
      if (fieldSubKasus) fieldSubKasus.style.display = 'none';
    }
  }
}

function generateId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 10) + Date.now().toString(36));
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
  const el = document.getElementById(modalId);
  if (!el) return;
  const modalInstance = bootstrap.Modal.getInstance(el);
  if (modalInstance) {
    modalInstance.hide();
  } else {
    el.classList.remove('show');
    el.style.display = 'none';
  }
  setTimeout(() => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }, 400);
}

function setMode(mode) {
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    Swal.fire('Akses Dibatasi', 'Mode mengajar tidak bisa diubah di versi Online. Harap lakukan melalui versi offline di laptop Anda.', 'info');
    return;
  }
  showLoader();
  apiCall('setModeMengajar', [mode]).then(res => {
    appState.modeAktif = res;
    document.getElementById('mode-badge').innerText = `Mode: ${res}`;
    updateModeBadges(res);

    // Alihkan tampilan ke tab yang sesuai dengan mode
    if (res === 'Guru Mapel') {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#tab-gurumapel"]')).show();
    } else if (res === 'Guru BK') {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#tab-gurubk"]')).show();
    } else {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#tab-siswa"]')).show();
    }

    Swal.fire('Berhasil', `Mode Mengajar diset ke: ${res}`, 'success');
    refreshDropdowns();
    hideLoader();
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function simpanPengaturanSistem() {
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    Swal.fire('Dikunci', 'Pengaturan Sistem tidak bisa diubah di versi Online. Harap ubah melalui versi Offline.', 'info');
    return;
  }
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
    if (data['Logo_Kiri']) document.getElementById('landing-logo-kiri').src = data['Logo_Kiri'];
    if (data['Logo_Kanan']) document.getElementById('landing-logo-kanan').src = data['Logo_Kanan'];
    if (data['Nama_Sekolah']) document.getElementById('landing-nama-sekolah').innerText = data['Nama_Sekolah'];
    Swal.fire('Tersimpan', 'Pengaturan sistem diperbarui', 'success');
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function simpanPengaturanProfil() {
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    Swal.fire('Dikunci', 'Pengaturan Profil tidak bisa diubah di versi Online. Harap ubah melalui versi Offline.', 'info');
    return;
  }
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
    if (data['Foto_Guru']) document.getElementById('login-foto-guru').src = data['Foto_Guru'];
    if (data['Nama_Guru']) document.getElementById('login-nama-guru').innerText = data['Nama_Guru'];
    Swal.fire('Tersimpan', 'Profil Guru diperbarui', 'success');
  }).catch(err => { console.error(err); hideLoader(); Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error'); });
}

function simpanPengaturanAkun() {
  const u = document.getElementById('peng-username').value;
  const p = document.getElementById('peng-password').value;
  const bg = document.getElementById('base64-bg-login').value;

  if (!p) { Swal.fire('Error', 'Password tidak boleh kosong!', 'error'); return; }

  let dataSave = {};
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    // Online HANYA boleh ubah Password
    dataSave = { 'Password': p };
  } else {
    // Offline boleh simpan background, tapi password ditolak oleh db.js secara otomatis
    dataSave = { 'Username': u, 'Password': p };
    if (bg) {
      dataSave['Background_Login'] = bg;
    }
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
      img.onload = function () {
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
        document.getElementById('prev-bg-login').style.display = 'inline-block';
        document.getElementById('btn-hapus-bg').style.display = 'block';
      }
      document.getElementById('prev-bg-login').src = e.target.result;
    }
    reader.readAsDataURL(file);
  }
}

function hapusGambar(jenis) {
  let prevId = '';
  let inputId = '';
  let fileId = '';
  let placeholderText = '';

  if (jenis === 'kiri') {
    prevId = 'prev-logo-kiri'; inputId = 'base64-logo-kiri'; fileId = 'file-logo-kiri'; placeholderText = 'Logo+Kiri';
  } else if (jenis === 'kanan') {
    prevId = 'prev-logo-kanan'; inputId = 'base64-logo-kanan'; fileId = 'file-logo-kanan'; placeholderText = 'Logo+Kanan';
  } else if (jenis === 'guru') {
    prevId = 'prev-foto-guru'; inputId = 'base64-foto-guru'; fileId = 'file-foto-guru'; placeholderText = 'Foto+3:4';
  } else if (jenis === 'bg') {
    prevId = 'prev-bg-login'; inputId = 'base64-bg-login'; fileId = 'file-bg-login';
  }

  if (prevId) {
    if (jenis === 'bg') {
      document.getElementById(prevId).src = '';
      document.getElementById(prevId).style.display = 'none';
      document.getElementById('btn-hapus-bg').style.display = 'none';
    } else {
      document.getElementById(prevId).src = `https://placehold.co/200x200/eee/999?text=${placeholderText}`;
    }
    document.getElementById(inputId).value = '';
    const fileEl = document.getElementById(fileId);
    if (fileEl) fileEl.value = '';

    // Auto save untuk profil jika jenis guru
    if (jenis === 'guru') {
      simpanPengaturanProfil();
    } else if (jenis === 'bg') {
      // Background adalah bagian akun
      simpanPengaturanAkun();
    } else {
      simpanPengaturanSistem();
    }
  }
}

function lupaPassword() {
  Swal.fire({
    title: 'Lupa Password?',
    text: "Masukkan alamat email admin yang terdaftar pada sistem.",
    input: 'email',
    inputPlaceholder: 'email@gmail.com',
    showCancelButton: true,
    confirmButtonText: 'Kirim Password',
    cancelButtonText: 'Batal',
    showLoaderOnConfirm: true,
    preConfirm: async (email) => {
      try {
        const res = await apiCall('sendPasswordToEmail', [email]);
        if (!res || !res.success) {
          Swal.hideLoading();
          Swal.showValidationMessage(res ? res.message : 'Respons tidak valid dari server.');
          return false;
        }
        return res;
      } catch (error) {
        Swal.hideLoading();
        Swal.showValidationMessage(`Koneksi Gagal / Fungsi belum tersedia: ${error.message}`);
        return false;
      }
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      Swal.fire('Berhasil!', result.value.message, 'success');
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
    'Guru_Nama': ng,
    'Guru_NIP': nipg
  }]).then(() => {
    hideLoader();
    Swal.fire('Tersimpan', 'Pengaturan Tanda Tangan diperbarui', 'success');
  }).catch(err => {
    hideLoader();
    console.error(err);
    Swal.fire('Gagal', 'Terjadi kesalahan: ' + err.message, 'error');
  });
}

// Relasi Data
function refreshRelasiData() {
  apiCall('readData', ['Relasi_Mapel']).then(data => {
    appState.relasi = appState.activeTA ? data.filter(x => x.Tahun_Ajaran === appState.activeTA) : [];
    renderRelasiCards('Guru Kelas', 'list-gurukelas', 'Kelas', 'Mata Pelajaran');
    renderRelasiCards('Guru Mapel', 'list-gurumapel', 'Mata Pelajaran', 'Daftar Kelas');
    renderRelasiCards('Guru BK', 'list-gurubk', 'Kelas Binaan', '');
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
                <div>
                  <button class="btn btn-sm btn-outline-warning text-dark me-1" onclick="editIndukRelasi('${tipe}','${induk}', 'Kelas')"><i class="fa-solid fa-edit"></i> Edit</button>
                  <button class="btn btn-sm btn-outline-light" onclick="hapusIndukRelasi('${tipe}','${induk}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
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
    } else if (tipe === 'Guru Mapel') {
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
              <div class="card-header bg-gradient-info text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold"><i class="fa-solid fa-book-open"></i> Mapel: ${induk}</h5>
                <div>
                  <button class="btn btn-sm btn-outline-warning text-dark me-1" onclick="editIndukRelasi('${tipe}','${induk}', 'Mata Pelajaran')"><i class="fa-solid fa-edit"></i> Edit</button>
                  <button class="btn btn-sm btn-outline-light" onclick="hapusIndukRelasi('${tipe}','${induk}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
              </div>
              <div class="card-body">
                <h6 class="fw-bold mb-2">Daftar Kelas yang Diajar</h6>
                <div class="mb-3">${anakHtml}</div>
                <button class="btn btn-sm btn-outline-success w-100" onclick="openModalRelasi('${tipe}', 'Anak', '${induk}')"><i class="fa-solid fa-plus"></i> Tambah Kelas</button>
              </div>
          </div></div>
        `;
    } else if (tipe === 'Guru BK') {
      // Mode Guru BK: Hanya Induk = Kelas Binaan, Anak = null
      htmlAll += `
          <div class="col-md-4 mb-3"><div class="card shadow-sm border-0 h-100 hover-float">
              <div class="card-header bg-gradient-warning text-dark d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold"><i class="fa-solid fa-users-rectangle"></i> ${induk}</h5>
                <div>
                  <button class="btn btn-sm btn-outline-warning text-dark me-1" onclick="editIndukRelasi('${tipe}','${induk}', 'Kelas Binaan')"><i class="fa-solid fa-edit"></i> Edit</button>
                  <button class="btn btn-sm btn-outline-dark" onclick="hapusIndukRelasi('${tipe}','${induk}')"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
              <div class="card-body text-center">
                <h6 class="fw-bold mb-3 text-muted">Kelola Siswa Binaan</h6>
                <button class="btn btn-warning w-100 py-3 fw-bold shadow-sm" onclick="bukaKelolaSiswaKelas('${induk}')">
                  <i class="fa-solid fa-users fa-2x mb-2 d-block"></i> Data Siswa Kelas ${induk}
                </button>
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
  document.getElementById('lbl-induk').innerText = tipe === 'Guru Kelas' ? 'Nama Kelas (Cth: 7A)' : (tipe === 'Guru BK' ? 'Nama Kelas Binaan (Cth: 7A)' : 'Nama Mata Pelajaran (Cth: Matematika)');
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
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    Swal.fire('Akses Dibatasi', 'Tidak bisa ubah/hapus data di versi online, harap lakukan melalui versi offline di laptop Anda.', 'info');
    return;
  }
  Swal.fire({
    title: 'Hapus Data?',
    text: `Semua data terkait ${induk} akan terhapus. Lanjutkan?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  }).then(async (result) => {
    if (result.isConfirmed) {
      showLoader();

      // Hapus data anak secara lokal
      const items = appState.relasi.filter(r => r.Tipe_Mode === tipe && r.Induk === induk);
      for (let item of items) {
        await apiCall('deleteData', ['Relasi_Mapel', item.ID]);
      }

      // Hapus Tahun Ajaran jika Guru Kelas atau BK
      if (tipe === 'Guru Kelas' || tipe === 'Guru BK') {
        const ta = appState.tahunAjaran.find(t => t.Nama_TA === induk);
        if (ta) {
          await apiCall('deleteData', ['Tahun_Ajaran', ta.ID]);
        }
      }

      await refreshRelasiData();
      hideLoader();
      Swal.fire('Terhapus', 'Data berhasil dihapus.', 'success');
    }
  });
}

function editIndukRelasi(tipe, oldName, labelType) {
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    Swal.fire('Akses Dibatasi', 'Tidak bisa ubah/hapus data di versi online, harap lakukan melalui versi offline di laptop Anda.', 'info');
    return;
  }
  Swal.fire({
    title: `Edit Nama ${labelType}`,
    text: `Anda akan mengubah nama '${oldName}'. Perubahan ini akan menjalar ke seluruh data Siswa, Jadwal, Nilai, dll yang menggunakan nama ini.`,
    input: 'text',
    inputValue: oldName,
    showCancelButton: true,
    confirmButtonText: 'Simpan Perubahan',
    cancelButtonText: 'Batal',
    inputValidator: (value) => {
      if (!value) return 'Nama tidak boleh kosong!';
      if (value === oldName) return 'Nama belum diubah!';
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const newName = result.value.trim();
      showLoader();
      try {
        await apiCall('cascadeEditInduk', [tipe, oldName, newName]);
        await refreshRelasiData();
        hideLoader();
        Swal.fire('Berhasil!', `Data '${oldName}' telah diubah menjadi '${newName}' beserta semua data terkait.`, 'success');
      } catch (err) {
        console.error(err);
        hideLoader();
        Swal.fire('Error', err.message, 'error');
      }
    }
  });
}

function refreshDropdowns() {
  const isGuruKelas = appState.modeAktif === 'Guru Kelas';
  const isGuruBk = appState.modeAktif === 'Guru BK';
  const relAktif = appState.relasi.filter(r => r.Tipe_Mode === appState.modeAktif);

  // Induk: Guru Kelas = Kelas, Guru Mapel = Mapel, Guru BK = Kelas
  // Anak: Guru Kelas = Mapel, Guru Mapel = Kelas, Guru BK = null
  let listKelas = isGuruKelas || isGuruBk ? relAktif.map(r => r.Induk) : relAktif.map(r => r.Anak);
  let listMapel = isGuruKelas ? relAktif.map(r => r.Anak) : (isGuruBk ? [] : relAktif.map(r => r.Induk));

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
  const isGuruBk = appState.modeAktif === 'Guru BK';
  const relAktif = appState.relasi.filter(r => r.Tipe_Mode === appState.modeAktif);

  if (isGuruKelas) {
    if (triggerType === 'kelas') {
      const anakList = relAktif.filter(r => r.Induk === sourceVal).map(r => r.Anak);
      [...new Set(anakList)].filter(Boolean).forEach(a => targetEl.innerHTML += `<option value="${a}">${a}</option>`);
    } else if (triggerType === 'mapel') {
      const indukList = relAktif.filter(r => r.Anak === sourceVal).map(r => r.Induk);
      [...new Set(indukList)].filter(Boolean).forEach(a => targetEl.innerHTML += `<option value="${a}">${a}</option>`);
    }
  } else if (isGuruBk) {
    // Guru BK tidak memiliki mapel, jadi tidak perlu mengisi dropdown mapel
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
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const modal = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
  modal.show();
}

function autoHari(tglStr) {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dt = new Date(tglStr);
  if (!isNaN(dt)) document.getElementById('jadwal-hari').value = hari[dt.getDay()];
}

function simpanData(e, sheetName, modalId) {
  e.preventDefault(); showLoader();
  const fd = new FormData(e.target);
  let data = {};
  fd.forEach((v, k) => {
    if (sheetName === 'Siswa') {
      if (k === 'Nama') v = v.toUpperCase();
      if (k === 'Tempat_Lahir') v = v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    data[k] = v;
  });

  if (sheetName === 'Siswa') {
    let nisn = String(data['NISN'] || '').trim();
    let nis = String(data['NIS'] || '').trim();
    let nama = String(data['Nama'] || '').trim();

    if (!nis || !nama) {
      hideLoader();
      return Swal.fire('Error', 'NIS dan Nama wajib diisi!', 'error');
    }
    if (isNaN(nis)) {
      hideLoader();
      return Swal.fire('Error', 'NIS hanya boleh berisi angka!', 'error');
    }
    if (nisn && nisn.length !== 10) {
      hideLoader();
      return Swal.fire('Error', 'Jika NISN diisi, wajib 10 angka bulat!', 'error');
    }
  }

  // Validasi Jadwal
  if (sheetName === 'Jadwal') {
    if (!data['Tanggal'] || !data['Kelas'] || !data['Mapel']) {
      hideLoader();
      return Swal.fire('Error', 'Tanggal, Kelas, dan Mapel wajib diisi!', 'error');
    }
  }

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

  // Use Blob to force browser download and avoid Node.js EPERM in Electron
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Import_Siswa.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

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
      let payload = json.map(row => {
        let nName = (row['Nama'] || row['Nama Lengkap'] || '').toUpperCase();
        let nTempat = (row['Tempat_Lahir'] || row['Tempat Lahir'] || '');
        if (nTempat) nTempat = String(nTempat).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        let nNisn = String(row['NISN'] || '').trim();
        if (nNisn && nNisn.length > 0 && nNisn.length < 10) {
          nNisn = nNisn.padStart(10, '0');
        }

        return {
          Tahun_Ajaran: appState.activeTA,
          NIS: row['NIS'] || '',
          NISN: nNisn,
          Nama: nName,
          Tempat_Lahir: nTempat,
          Tanggal_Lahir: row['Tanggal_Lahir'] || row['Tanggal Lahir'] || '',
          L_P: row['L_P'] || row['L/P'] || row['Jenis Kelamin'] || '',
          Nama_Ayah: row['Nama_Ayah'] || row['Nama Ayah'] || '',
          Nama_Ibu: row['Nama_Ibu'] || row['Nama Ibu'] || '',
          Kelas: activeKelolaSiswaKelas // Override with current active class modal
        };
      }).filter(r => r.NIS && r.Nama);

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
  Swal.fire({ title: 'Hapus?', html: '<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>Apakah Anda yakin ingin menghapus data ini?', icon: 'warning', showCancelButton: true }).then(r => {
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

function changePageSiswa(delta) {
  let tb = document.getElementById('tbody-Siswa');
  let rowCount = tb.querySelectorAll('tr').length;
  if (delta === 1 && rowCount === 0) return;
  if (currentPageSiswa + delta >= 1) {
    currentPageSiswa += delta;
    renderTabelSiswa();
  }
}

// ==========================================
// SINKRONISASI OFFLINE KE ONLINE
// ==========================================
async function mulaiSinkronisasi() {
  const savedUrl = localStorage.getItem('sync_url') || '';
  Swal.fire({
    title: 'Sinkronisasi ke Cloud',
    text: "Masukkan URL Exec dari Google Apps Script Anda:",
    input: 'url',
    inputValue: savedUrl,
    inputPlaceholder: 'https://script.google.com/macros/s/.../exec',
    showCancelButton: true,
    confirmButtonText: 'Mulai Proses Sinkronisasi',
    cancelButtonText: 'Batal',
    showLoaderOnConfirm: true,
    preConfirm: async (url) => {
      if (!url || !url.includes('script.google.com')) {
        Swal.showValidationMessage('URL tidak valid');
        return false;
      }
      localStorage.setItem('sync_url', url);
      try {
        const payload = {
          Pengaturan: await db.Pengaturan.toArray(),
          Tahun_Ajaran: await db.Tahun_Ajaran.toArray(),
          Relasi_Mapel: await db.Relasi_Mapel.toArray(),
          Siswa: await db.Siswa.toArray(),
          Jadwal: await db.Jadwal.toArray(),
          Jurnal: await db.Jurnal.toArray(),
          Absensi: await db.Absensi.toArray(),
          Nilai: await db.Nilai.toArray(),
          Nilai_Ujian: await db.Nilai_Ujian.toArray(),
          Buku_Kasus: await db.Buku_Kasus.toArray(),
          Arsip_Ujian: await db.Arsip_Ujian.toArray(),
          RPL_BK: await db.RPL_BK.toArray(),
          Home_Visit: await db.Home_Visit.toArray(),
          Arsip_BK: await db.Arsip_BK.toArray(),
          Pelanggaran: await db.Pelanggaran.toArray(),
          Surat_Peringatan: await db.Surat_Peringatan.toArray()
        };

        // Convert file path 'uploads/' back to base64 if running in Electron
        if (typeof require !== 'undefined') {
          const fs = require('fs');
          const path = require('path');

          for (let j of payload.Jadwal) {
            ['File_RPP', 'File_LKPD', 'File_Lainnya'].forEach(f => {
              if (j[f] && j[f].startsWith('uploads/')) {
                let fp = path.join(process.cwd(), j[f]);
                if (fs.existsSync(fp)) {
                  let b64 = fs.readFileSync(fp, { encoding: 'base64' });
                  let ext = fp.endsWith('.pdf') ? 'application/pdf' : 'image/png';
                  j[f] = `data:${ext};base64,${b64}`;
                }
              }
            });
          }

          for (let a of payload.Absensi) {
            if (a.Bukti_Dukung && a.Bukti_Dukung.startsWith('uploads/')) {
              let fp = path.join(process.cwd(), a.Bukti_Dukung);
              if (fs.existsSync(fp)) {
                let b64 = fs.readFileSync(fp, { encoding: 'base64' });
                let ext = fp.endsWith('.pdf') ? 'application/pdf' : 'image/png';
                a.Bukti_Dukung = `data:${ext};base64,${b64}`;
              }
            }
          }

          for (let u of payload.Arsip_Ujian) {
            ['File_Kisi', 'File_Soal', 'File_Kunci'].forEach(f => {
              if (u[f] && u[f].startsWith('uploads/')) {
                let fp = path.join(process.cwd(), u[f]);
                if (fs.existsSync(fp)) {
                  let b64 = fs.readFileSync(fp, { encoding: 'base64' });
                  let ext = fp.endsWith('.pdf') ? 'application/pdf' : 'image/png';
                  u[f] = `data:${ext};base64,${b64}`;
                }
              }
            });
          }
        }

        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ action: 'bulkSync', payload: [payload], shardId: null })
        });
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        return data;
      } catch (error) {
        Swal.showValidationMessage(`Sinkronisasi Gagal: ${error.message}`);
        return false;
      }
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('Sinkronisasi Berhasil!', 'Seluruh data offline telah berhasil dicadangkan ke Google Sheets.', 'success');
    }
  });
}

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
    hideLoader();
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
    html: `<div class="text-danger mb-2">Peringatan: Hati-hati dalam menghapus data. Data yang telah dihapus tidak dapat dikembalikan lagi.</div>
           Ketik "HAPUS" untuk menghapus Tahun Ajaran <b>${namaTA}</b>. Seluruh data terkait mungkin ikut terpengaruh.`,
    icon: 'warning',
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
  loadJadwal();
  if (typeof loadProgramGuru === 'function') loadProgramGuru();
  if (typeof loadRemedial === 'function') loadRemedial();

  loadDashboardStats(namaTA);
  // Muat grafik analitik
  setTimeout(() => renderDashboardCharts(), 500);
  // Muat data Buku Kasus, RPL, dan Home Visit
  if (typeof loadBukuKasus === 'function') loadBukuKasus();
  if (typeof loadProgramBK === 'function') loadProgramBK();
  if (typeof loadRPL === 'function') loadRPL();
  if (typeof loadHomeVisit === 'function') loadHomeVisit();
  if (typeof loadArsipBK === 'function') loadArsipBK();

  // Pindah ke menu Dashboard TA secara otomatis
  nav('dashboard-ta');
}

async function backupDataJSON() {
  if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
    Swal.fire({
      title: 'Memproses Backup',
      html: 'Proses ini memakan waktu agak lama karena mengunduh data dari Google Cloud.<br><br><b>Mohon bersabar dan jangan tutup halaman ini.</b>',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  } else {
    showLoader();
  }

  try {
    let backupObj = {};
    if (typeof APP_ENV !== 'undefined' && APP_ENV === 'online') {
      const sheets = ['Pengaturan', 'Tahun_Ajaran', 'Relasi_Mapel', 'Siswa', 'Jadwal', 'Jurnal', 'Absensi', 'Nilai', 'Nilai_Ujian', 'Buku_Kasus', 'Arsip_Ujian', 'RPL_BK', 'Home_Visit', 'Arsip_BK', 'Pelanggaran', 'Surat_Peringatan', 'Program_Guru', 'Remedial', 'Arsip_PG', 'Program_BK'];
      for (const s of sheets) {
        try {
          backupObj[s] = await apiCall('readData', [s]) || [];
        } catch (err) {
          console.warn(`Gagal memuat ${s} untuk backup`, err);
          backupObj[s] = [];
        }
      }
    } else {
      backupObj = await apiCall('backupFullJSON', []);
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Backup_FULL_SemuaGuru_${new Date().getTime()}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);

    hideLoader();
    Swal.fire('Sukses', 'Backup Full JSON berhasil diunduh.', 'success');
  } catch (e) {
    hideLoader();
    Swal.fire('Error', 'Gagal backup: ' + e.message, 'error');
  }
}

function restoreDB(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (confirm("Perhatian! Restore Database akan menimpa seluruh data saat ini, baik Pengaturan, Tahun Ajaran, beserta seluruh data operasional (Siswa, Jadwal, dll). Anda yakin ingin melanjutkan?")) {
    const reader = new FileReader();
    reader.onload = async function (event) {
      try {
        const jsonData = JSON.parse(event.target.result);
        showLoader();
        const res = await apiCall('restoreFullJSON', [jsonData]);
        hideLoader();
        if (res && res.success) {
          Swal.fire('Sukses', 'Database berhasil di-restore! Halaman akan dimuat ulang.', 'success').then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire('Error', 'Restore gagal: ' + (res ? res.message : 'Unknown error'), 'error');
        }
      } catch (err) {
        hideLoader();
        Swal.fire('Error', 'Format file JSON tidak valid atau terjadi kesalahan: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }
  e.target.value = '';
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

  refreshDropdowns();

  // Set class if opened from specific class modal
  if (activeKelolaSiswaKelas && form.elements['Kelas']) {
    let sel = form.elements['Kelas'];
    let found = false;
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === activeKelolaSiswaKelas) {
        found = true; break;
      }
    }
    if (!found) {
      const opt = document.createElement('option');
      opt.value = activeKelolaSiswaKelas;
      opt.text = activeKelolaSiswaKelas;
      sel.appendChild(opt);
    }
    sel.value = activeKelolaSiswaKelas;

    // Optional: Make it readonly so they don't change it
    sel.setAttribute('readonly', true);
    sel.style.pointerEvents = 'none'; // prevent dropdown if it's a select
  } else if (form.elements['Kelas']) {
    form.elements['Kelas'].removeAttribute('readonly');
    form.elements['Kelas'].style.pointerEvents = 'auto';
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

  refreshDropdowns();

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

  if (form.elements['Kelas']) {
    form.elements['Kelas'].value = s.Kelas;
    form.elements['Kelas'].removeAttribute('readonly');
    form.elements['Kelas'].style.pointerEvents = 'auto';
  }

  if (document.getElementById('siswa-nis')) document.getElementById('siswa-nis').readOnly = true;
  if (document.getElementById('siswa-nisn')) document.getElementById('siswa-nisn').readOnly = true;
  if (document.getElementById('nis-warning')) document.getElementById('nis-warning').style.display = 'none';
  const submitBtn = document.querySelector('#modalSiswa button[type="submit"]');
  if (submitBtn) submitBtn.disabled = false;

  openModal('modalSiswa');
}


// ==========================================================
// FITUR 1: DASHBOARD ANALITIK - GRAFIK
// ==========================================================
let _chartKehadiran = null;
let _chartNilai = null;

async function renderDashboardCharts() {
  if (typeof Chart === 'undefined') return;
  const ta = appState.activeTA;
  if (!ta) return;

  try {
    // --- GRAFIK KEHADIRAN (Pie) ---
    const absenData = await apiCall('readData', ['Absensi']);
    const now = new Date();
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const absenBulanIni = absenData.filter(a => a.Tahun_Ajaran === ta && (a.Tanggal || '').startsWith(bulanIni));

    const statusCount = { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
    absenBulanIni.forEach(a => { if (statusCount[a.Status] !== undefined) statusCount[a.Status]++; });

    const ctxK = document.getElementById('chart-kehadiran');
    if (ctxK) {
      if (_chartKehadiran) _chartKehadiran.destroy();
      _chartKehadiran = new Chart(ctxK, {
        type: 'doughnut',
        data: {
          labels: ['Hadir', 'Sakit', 'Izin', 'Alfa'],
          datasets: [{ data: Object.values(statusCount), backgroundColor: ['#198754', '#0d6efd', '#ffc107', '#dc3545'], hoverOffset: 8 }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
      });
    }

    // --- GRAFIK NILAI per KELAS (Bar) ---
    const nilaiData = await apiCall('readData', ['Nilai']);
    const nilaiTA = nilaiData.filter(n => n.Tahun_Ajaran === ta);
    const kelasList = [...new Set(nilaiTA.map(n => n.Kelas))].sort();
    const rataKelas = kelasList.map(kls => {
      const rows = nilaiTA.filter(n => n.Kelas === kls);
      const avg = rows.reduce((s, n) => s + (parseFloat(n.Pengetahuan) || 0), 0) / (rows.length || 1);
      return Math.round(avg * 10) / 10;
    });

    const ctxN = document.getElementById('chart-nilai');
    if (ctxN) {
      if (_chartNilai) _chartNilai.destroy();
      _chartNilai = new Chart(ctxN, {
        type: 'bar',
        data: {
          labels: kelasList,
          datasets: [{ label: 'Rata-rata Nilai Pengetahuan', data: rataKelas, backgroundColor: '#0d6efd88', borderColor: '#0d6efd', borderWidth: 2, borderRadius: 6 }]
        },
        options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } }, maintainAspectRatio: false }
      });
    }

    // --- SISWA PERLU PERHATIAN ---
    const alfaCount = {};
    absenBulanIni.filter(a => a.Status === 'Alfa').forEach(a => {
      alfaCount[a.NIS] = (alfaCount[a.NIS] || { count: 0, nama: a.NIS, kelas: a.Kelas });
      alfaCount[a.NIS].count++;
    });
    const siswaData = await apiCall('readData', ['Siswa']);
    const siswaTA = siswaData.filter(s => s.Tahun_Ajaran === ta);
    Object.keys(alfaCount).forEach(nis => {
      const siswa = siswaTA.find(s => s.NIS === nis);
      if (siswa) alfaCount[nis].nama = siswa.Nama;
    });

    // Siswa nilai rendah (<65)
    const nilaiRendah = {};
    nilaiTA.filter(n => parseFloat(n.Pengetahuan) < 65).forEach(n => {
      if (!nilaiRendah[n.NIS]) {
        const siswa = siswaTA.find(s => s.NIS === n.NIS);
        nilaiRendah[n.NIS] = { count: 0, nama: siswa ? siswa.Nama : n.NIS, kelas: n.Kelas };
      }
      nilaiRendah[n.NIS].count++;
    });

    const area = document.getElementById('dash-perhatian-siswa');
    if (area) {
      let html = '<div class="row g-2">';
      const alfaSiswa = Object.values(alfaCount).filter(a => a.count >= 3);
      alfaSiswa.forEach(a => {
        html += `<div class="col-md-4"><div class="border rounded p-2 bg-danger bg-opacity-10">
          <span class="badge bg-danger me-1">Alfa ${a.count}x</span> <strong>${a.nama}</strong> <small class="text-muted">(${a.kelas})</small></div></div>`;
      });
      const rendahSiswa = Object.values(nilaiRendah).filter(r => r.count >= 2);
      rendahSiswa.forEach(r => {
        html += `<div class="col-md-4"><div class="border rounded p-2 bg-warning bg-opacity-10">
          <span class="badge bg-warning text-dark me-1">Nilai Rendah</span> <strong>${r.nama}</strong> <small class="text-muted">(${r.kelas})</small></div></div>`;
      });
      if (!alfaSiswa.length && !rendahSiswa.length) {
        html += `<div class="col-12"><p class="text-success mb-0"><i class="fa-solid fa-check-circle me-2"></i>Semua siswa dalam kondisi baik bulan ini! 🎉</p></div>`;
      }
      html += '</div>';
      area.innerHTML = html;
    }
  } catch (e) { console.error('Chart error:', e); }
}


// ==========================================================
// FITUR 4: NOTIFIKASI DESKTOP OTOMATIS
// ==========================================================
function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function kirimNotifDesktop(judul, pesan, ikon) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(judul, { body: pesan, icon: ikon || 'logosemuaguru.png' });
}

async function cekPengingatHarian() {
  if (!appState.activeTA) return;
  const jam = new Date().getHours();
  // Aktif cek hanya di atas jam 7 pagi
  if (jam < 7) return;

  const today = new Date().toISOString().split('T')[0];
  try {
    const jadwal = await apiCall('readData', ['Jadwal']);
    const jadwalHariIni = jadwal.filter(j => j.Tahun_Ajaran === appState.activeTA && j.Tanggal === today);
    if (!jadwalHariIni.length) return;

    const absensi = await apiCall('readData', ['Absensi']);
    const absHariIni = absensi.filter(a => a.Tanggal === today && a.Tahun_Ajaran === appState.activeTA);
    if (absHariIni.length === 0) {
      kirimNotifDesktop('📋 Semua Guru - Pengingat Absensi', `Anda memiliki ${jadwalHariIni.length} jadwal hari ini. Jangan lupa mengisi absensi siswa!`);
    }
  } catch (e) { /* silent */ }
}

