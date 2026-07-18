// db.js - IndexedDB Logic for Offline Mode
const db = new Dexie("SemuaGuruDB");

db.version(1).stores({
  Pengaturan: 'Kunci, Nilai',
  Tahun_Ajaran: 'ID, Nama_TA, Spreadsheet_ID',
  Relasi_Mapel: 'ID, Tahun_Ajaran, Tipe_Mode, Induk, Anak',
  Siswa: 'ID, Tahun_Ajaran, NIS, NISN, Nama, Tempat_Lahir, Tanggal_Lahir, L_P, Nama_Ayah, Nama_Ibu, Kelas, No_HP',
  Jadwal: 'ID, Tahun_Ajaran, Tanggal, Hari, Jam, Kelas, Mapel, File_RPP, File_LKPD, File_Lainnya, Materi_Harian, File_Materi',
  Jurnal: 'ID, Tahun_Ajaran, Tanggal, Kelas, Mapel, Materi, Permasalahan, Solusi, Keterangan',
  Absensi: 'ID, Tahun_Ajaran, Tanggal, Kelas, Mapel, NIS, Status, Bukti_Dukung',
  Nilai: 'ID, Tahun_Ajaran, Tanggal, Kelas, Mapel, NIS, Pengetahuan, Keterampilan, Sikap, Catatan',
  Nilai_Ujian: 'ID, Tahun_Ajaran, Semester, Kelas, Mapel, Jenis_Ujian, NIS, Pengetahuan, Keterampilan, Sikap, Catatan'
});

db.version(2).stores({
  Buku_Kasus: 'ID, Tahun_Ajaran, Tanggal, NIS, Nama_Siswa, Kelas, Jenis, Catatan, Tindak_Lanjut'
});

db.version(3).stores({
  Arsip_Ujian: 'ID, Tahun_Ajaran, Semester, Kelas, Mapel, Jenis_Ujian, File_Kisi, File_Soal, File_Kunci'
});

db.version(4).stores({
  RPL_BK: 'ID, Tahun_Ajaran, Tanggal, Kelas, Jenis_Layanan, Topik, File_Dokumen',
  Home_Visit: 'ID, Tahun_Ajaran, Tanggal, NIS, Nama_Siswa, Kelas, Nama_Ortu, Hasil_Kunjungan, Foto_Bukti'
});

db.version(5).stores({
  Arsip_BK: 'ID, Tahun_Ajaran, Silabus, Prota_Prosem, Administrasi'
});

db.version(6).stores({
  Buku_Kasus: 'ID, Tahun_Ajaran, Tanggal, NIS, Nama_Siswa, Kelas, Jenis, Nama_Pelanggaran, Poin, Catatan, Tindak_Lanjut, Status_Tindak_Lanjut, Keterangan',
  Pelanggaran: 'ID, Tahun_Ajaran, Jenis_Kasus, Nama_Pelanggaran, Poin'
});

db.version(7).stores({
  Surat_Peringatan: 'ID, Tahun_Ajaran, Tanggal, Kelas, NIS, Nama_Siswa, Total_Poin, Status, Tgl_Pemanggilan, Waktu_Pemanggilan, Tempat_TTD, Tgl_TTD'
});

db.version(8).stores({
  Program_Guru: 'ID, Tahun_Ajaran, Jenis_Program, Mapel, Kelas, Materi, Alokasi_Waktu, Bulan_Pelaksanaan',
  Remedial: 'ID, Tahun_Ajaran, Tanggal, Mapel, Kelas, Materi, Jenis_Kegiatan, Nama_Siswa, Nilai_Awal, Nilai_Akhir, Status',
  Arsip_PG: 'ID, Tahun_Ajaran, Silabus, Prota, Promes'
});

db.version(9).stores({
  Program_BK: 'ID, Tahun_Ajaran, Jenis_Program, Bidang_Layanan, Topik, Sasaran, Waktu_Pelaksanaan, Status'
});

// Setup default config if empty
db.on('populate', () => {
  db.Pengaturan.bulkAdd([
    { Kunci: 'Mode_Aktif', Nilai: 'Guru Kelas' },
    { Kunci: 'Tahun_Ajaran', Nilai: '2025/2026' },
    { Kunci: 'Semester', Nilai: '1' },
    { Kunci: 'Username', Nilai: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.OFFLINE_USERNAME : 'admin@gmail.com' },
    { Kunci: 'Password_Hash', Nilai: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.OFFLINE_PASSWORD_HASH : 'efdb65055b4b7304e4183a7b492a65115bc1750b296ab9fc49e894737a42f95c' },
    { Kunci: 'Nama_Aplikasi', Nilai: 'SEMUA GURU' },
    { Kunci: 'Nama_Sekolah', Nilai: 'UPT Sekolah Dasar' },
    { Kunci: 'Nama_Guru', Nilai: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.OFFLINE_NAMA_GURU : 'Administrator' }
  ]);
});

async function apiCallIndexedDB(action, payload = []) {
  if (typeof dbAPI[action] === 'function') {
    return await dbAPI[action].apply(dbAPI, payload);
  }
  throw new Error("Fungsi " + action + " belum diimplementasikan di versi Offline.");
}

const dbAPI = {
  getSettings: async function () {
    const config = await db.Pengaturan.toArray();
    let res = {};
    config.forEach(c => res[c.Kunci] = c.Nilai);
    
    // Hard override untuk lisensi offline
    if (typeof APP_ENV !== 'undefined' && APP_ENV === 'offline' && typeof APP_CONFIG !== 'undefined') {
       res['Username'] = APP_CONFIG.OFFLINE_USERNAME;
       res['Nama_Guru'] = APP_CONFIG.OFFLINE_NAMA_GURU;
       // Password tidak dioverride ke plaintext lagi, menggunakan hash
       res['Password_Hash'] = APP_CONFIG.OFFLINE_PASSWORD_HASH;
    }
    return res;
  },

  checkLogin: async function (u, p) {
    const config = await this.getSettings();
    
    // Fungsi hash bawaan browser Web Crypto API
    const hashData = async (string) => {
      const utf8 = new TextEncoder().encode(string);
      const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('');
    };
    
    const pHash = await hashData(p);
    
    // Validasi login
    if (config['Username'] === u && config['Password_Hash'] === pHash) return true;
    
    // Fallback keamanan sementara (jika migrasi dr database versi lama yg masih nyimpan 'Password' biasa)
    if (config['Password'] && config['Password'] === p) return true;
    
    return false;
  },

  sendPasswordToEmail: async function(email) {
    const config = await this.getSettings();
    if (config['Username'] === email) {
      return { success: false, message: `[PENTING] Demi keamanan, password offline telah dienkripsi dan tidak bisa ditampilkan. Jika Anda lupa password, silakan hubungi Helpdesk via WA: ${HELPDESK_CONFIG.WA} atau Email: ${HELPDESK_CONFIG.EMAIL}.` };
    }
    return { success: false, message: "Hubungi administrator untuk melakukan reset password." };
  },

  setModeMengajar: async function (mode) {
    await db.Pengaturan.put({ Kunci: 'Mode_Aktif', Nilai: mode });
    return mode;
  },

  saveMultipleSettings: async function (settingsObj) {
    const toPut = [];
    for (const key in settingsObj) {
      if (typeof APP_ENV !== 'undefined' && APP_ENV === 'offline') {
         if (key === 'Username' || key === 'Nama_Guru' || key === 'Password') continue; // Tolak simpan perubahan username, nama guru, & password di offline
      }
      toPut.push({ Kunci: key, Nilai: settingsObj[key] });
    }
    await db.Pengaturan.bulkPut(toPut);
    return true;
  },

  readData: async function (sheetName) {
    return await db[sheetName].toArray();
  },

  insertData: async function (sheetName, record) {
    if (!record.ID) {
      // FIX: Gunakan crypto.randomUUID() agar tidak ada collision
      record.ID = 'ID-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (new Date().getTime() + '-' + Math.floor(Math.random() * 1000000)));
    }
    await db[sheetName].put(record);

    // Cascade insert Jurnal for Jadwal
    if (sheetName === 'Jadwal') {
      const existingJurnal = await db.Jurnal.where('ID').equals(record.ID).first();
      if (!existingJurnal) {
        await db.Jurnal.put({
          ID: record.ID,
          Tahun_Ajaran: record.Tahun_Ajaran || '',
          Tanggal: record.Tanggal,
          Kelas: record.Kelas,
          Mapel: record.Mapel,
          Materi: '', Permasalahan: '', Solusi: '', Keterangan: ''
        });
      } else {
        await db.Jurnal.update(record.ID, { Tanggal: record.Tanggal, Kelas: record.Kelas, Mapel: record.Mapel });
      }
    }
    return { success: true, message: "Data berhasil disimpan!" };
  },

  cascadeEditInduk: async function (tipe, oldName, newName) {
    if (!oldName || !newName || oldName === newName) return false;
    
    // 1. Update Relasi_Mapel (Induk)
    await db.Relasi_Mapel.where('Induk').equals(oldName).modify(r => {
       if (r.Tipe_Mode === tipe) r.Induk = newName;
    });

    if (tipe === 'Guru Mapel') {
      // Induk = Mapel
      await db.Jadwal.where('Mapel').equals(oldName).modify({ Mapel: newName });
      await db.Jurnal.where('Mapel').equals(oldName).modify({ Mapel: newName });
      await db.Absensi.where('Mapel').equals(oldName).modify({ Mapel: newName });
      await db.Nilai.where('Mapel').equals(oldName).modify({ Mapel: newName });
      await db.Nilai_Ujian.where('Mapel').equals(oldName).modify({ Mapel: newName });
      await db.Arsip_Ujian.where('Mapel').equals(oldName).modify({ Mapel: newName });
    } 
    else if (tipe === 'Guru Kelas' || tipe === 'Guru BK') {
      // Induk = Kelas
      // Tahun Ajaran menyimpan Kelas sebagai Nama_TA
      await db.Tahun_Ajaran.where('Nama_TA').equals(oldName).modify({ Nama_TA: newName });
      
      // Cascade ke semua tabel yang menyimpan Kelas
      await db.Siswa.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Jadwal.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Jurnal.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Absensi.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Nilai.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Nilai_Ujian.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Arsip_Ujian.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Buku_Kasus.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.RPL_BK.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Home_Visit.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Arsip_BK.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Pelanggaran.where('Kelas').equals(oldName).modify({ Kelas: newName });
      await db.Surat_Peringatan.where('Kelas').equals(oldName).modify({ Kelas: newName });
    }
    
    return { success: true };
  },

  deleteData: async function (sheetName, id) {
    const record = await db[sheetName].get(id);
    if (!record) return { success: false };

    await db[sheetName].delete(id);

    // Cascade delete
    if (sheetName === 'Tahun_Ajaran') {
      const taName = record.Nama_TA;
      if (taName) {
        const kRelasi = await db.Relasi_Mapel.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Relasi_Mapel.bulkDelete(kRelasi);
        const kSiswa = await db.Siswa.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Siswa.bulkDelete(kSiswa);
        const kJadwal = await db.Jadwal.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Jadwal.bulkDelete(kJadwal);
        const kJurnal = await db.Jurnal.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Jurnal.bulkDelete(kJurnal);
        const kAbsensi = await db.Absensi.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Absensi.bulkDelete(kAbsensi);
        const kNilai = await db.Nilai.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Nilai.bulkDelete(kNilai);
        const kNilaiUjian = await db.Nilai_Ujian.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Nilai_Ujian.bulkDelete(kNilaiUjian);
        const kBukuKasus = await db.Buku_Kasus.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Buku_Kasus.bulkDelete(kBukuKasus);
        const kArsipUjian = await db.Arsip_Ujian.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Arsip_Ujian.bulkDelete(kArsipUjian);
        const kRplBk = await db.RPL_BK.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.RPL_BK.bulkDelete(kRplBk);
        const kHomeVisit = await db.Home_Visit.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Home_Visit.bulkDelete(kHomeVisit);
        const kArsipBk = await db.Arsip_BK.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Arsip_BK.bulkDelete(kArsipBk);
        const kPelanggaran = await db.Pelanggaran.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Pelanggaran.bulkDelete(kPelanggaran);
        const kSuratPeringatan = await db.Surat_Peringatan.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Surat_Peringatan.bulkDelete(kSuratPeringatan);
        const kProgramGuru = await db.Program_Guru.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Program_Guru.bulkDelete(kProgramGuru);
        const kRemedial = await db.Remedial.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Remedial.bulkDelete(kRemedial);
        const kArsipPg = await db.Arsip_PG.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Arsip_PG.bulkDelete(kArsipPg);
        const kProgramBk = await db.Program_BK.filter(x => x.Tahun_Ajaran === taName).primaryKeys();
        await db.Program_BK.bulkDelete(kProgramBk);
      }
    }

    if (sheetName === 'Relasi_Mapel') {
      // If we delete a Kelas, we might want to cascade delete data for that Kelas
      // In Guru Kelas mode, Induk = Kelas. In Guru Mapel mode, Anak = Kelas.
      const kelasDeleted = (record.Tipe_Mode === 'Guru Kelas' || record.Tipe_Mode === 'Guru BK') ? record.Induk : record.Anak;
      const ta = record.Tahun_Ajaran;
      if (kelasDeleted && ta) {
        // Only cascade if there are no other relations for this class in this TA
        const otherRelations = await db.Relasi_Mapel.filter(x => x.ID !== id && x.Tahun_Ajaran === ta && x.Tipe_Mode === record.Tipe_Mode && (x.Tipe_Mode === 'Guru Kelas' || x.Tipe_Mode === 'Guru BK' ? x.Induk === kelasDeleted : x.Anak === kelasDeleted)).count();
        if (otherRelations === 0) {
          const kSiswa = await db.Siswa.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Siswa.bulkDelete(kSiswa);
          const kJadwal = await db.Jadwal.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Jadwal.bulkDelete(kJadwal);
          const kJurnal = await db.Jurnal.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Jurnal.bulkDelete(kJurnal);
          const kAbsensi = await db.Absensi.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Absensi.bulkDelete(kAbsensi);
          const kNilai = await db.Nilai.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Nilai.bulkDelete(kNilai);
          const kNilaiUjian = await db.Nilai_Ujian.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Nilai_Ujian.bulkDelete(kNilaiUjian);
          const kBukuKasus = await db.Buku_Kasus.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Buku_Kasus.bulkDelete(kBukuKasus);
          const kArsipUjian = await db.Arsip_Ujian.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Arsip_Ujian.bulkDelete(kArsipUjian);
          const kRplBk = await db.RPL_BK.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.RPL_BK.bulkDelete(kRplBk);
          const kHomeVisit = await db.Home_Visit.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Home_Visit.bulkDelete(kHomeVisit);
          const kSuratPeringatan = await db.Surat_Peringatan.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Surat_Peringatan.bulkDelete(kSuratPeringatan);
          const kProgramGuru = await db.Program_Guru.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Program_Guru.bulkDelete(kProgramGuru);
          const kRemedial = await db.Remedial.filter(x => x.Tahun_Ajaran === ta && x.Kelas === kelasDeleted).primaryKeys();
          await db.Remedial.bulkDelete(kRemedial);
        }
      }
    }

    if (sheetName === 'Jadwal') {
      await db.Jurnal.delete(id);
      if (record.Tanggal && record.Kelas && record.Mapel) {
        // Delete related Absensi & Nilai
        const keysAbs = await db.Absensi.filter(a => a.Tanggal === record.Tanggal && a.Kelas === record.Kelas && a.Mapel === record.Mapel).primaryKeys();
        await db.Absensi.bulkDelete(keysAbs);
        const keysNil = await db.Nilai.filter(a => a.Tanggal === record.Tanggal && a.Kelas === record.Kelas && a.Mapel === record.Mapel).primaryKeys();
        await db.Nilai.bulkDelete(keysNil);
      }
    }

    if (sheetName === 'Siswa' && record.NIS) {
      const kNil = await db.Nilai.filter(n => n.NIS === record.NIS).primaryKeys();
      await db.Nilai.bulkDelete(kNil);
      const kNilU = await db.Nilai_Ujian.filter(n => n.NIS === record.NIS).primaryKeys();
      await db.Nilai_Ujian.bulkDelete(kNilU);
      const kAbs = await db.Absensi.filter(n => n.NIS === record.NIS).primaryKeys();
      await db.Absensi.bulkDelete(kAbs);
    }

    return { success: true };
  },

  importSiswaBatch: async function (payload) {
    let failed = 0;
    let failedNis = [];
    let toAdd = [];
    const existing = await db.Siswa.toArray();
    
    payload.forEach(row => {
      if (existing.find(e => e.NIS === row.NIS)) {
        failed++;
        failedNis.push(row.NIS);
      } else {
        // FIX: UUID aman
        row.ID = 'ID-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (new Date().getTime() + '-' + Math.floor(Math.random() * 1000000)));
        toAdd.push(row);
      }
    });
    await db.Siswa.bulkAdd(toAdd);
    return { success: toAdd.length, failed: failed, failedNis: failedNis };
  },

  getAbsensiMatrix: async function (ta, tanggal, kelas, mapel) {
    const siswa = await db.Siswa.filter(s => s.Kelas === kelas && s.Tahun_Ajaran === ta).toArray();
    const absensi = await db.Absensi.filter(a => a.Tanggal === tanggal && a.Kelas === kelas && a.Mapel === mapel && a.Tahun_Ajaran === ta).toArray();
    
    let res = siswa.map(s => {
      const a = absensi.find(x => x.NIS === s.NIS);
      return {
        NIS: s.NIS, Nama: s.Nama, L_P: s.L_P,
        Status: a ? a.Status : '', Bukti_Dukung: a ? a.Bukti_Dukung : ''
      };
    });
    res.sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
    return res;
  },

  autoSaveAbsensi: async function (ta, tanggal, kelas, mapel, nis, status) {
    const existing = await db.Absensi.filter(a => a.Tanggal === tanggal && a.Kelas === kelas && a.Mapel === mapel && a.NIS === nis && a.Tahun_Ajaran === ta).first();
    if (existing) {
      await db.Absensi.update(existing.ID, { Status: status });
    } else {
      await db.Absensi.put({
        ID: 'ABS-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : new Date().getTime()),
        Tahun_Ajaran: ta, Tanggal: tanggal, Kelas: kelas, Mapel: mapel, NIS: nis, Status: status, Bukti_Dukung: ''
      });
    }
    return { success: true, nis, status };
  },

  uploadFileToDrive: async function (base64Data, fileName, mimeType, targetId, fileType) {
    // In offline mode, we store the Base64 dataURL directly or save to physical folder
    let dataUrl = `data:${mimeType};base64,${base64Data}`;
    
    // FIX: Gunakan window.electronAPI (preload.js) yang aman, bukan require('fs') langsung
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron) {
      try {
        const fileNameSuffix = targetId + '_' + fileType;
        const savedPath = window.electronAPI.saveFile(base64Data, fileNameSuffix, mimeType);
        if (savedPath) {
          dataUrl = savedPath;
        }
      } catch (err) {
        console.error('Gagal menyimpan ke folder lokal via electronAPI, fallback ke Base64', err);
      }
    }
    
    if (fileType === 'RPP' || fileType === 'LKPD' || fileType === 'Lainnya') {
      const j = await db.Jadwal.get(targetId);
      if (j) {
        if (fileType === 'RPP') j.File_RPP = dataUrl;
        if (fileType === 'LKPD') j.File_LKPD = dataUrl;
        if (fileType === 'Lainnya') j.File_Lainnya = dataUrl;
        await db.Jadwal.put(j);
      }
    }
    return { success: true, url: dataUrl };
  },

  updateBuktiDukung: async function (ta, tanggal, kelas, mapel, nis, url) {
    const a = await db.Absensi.filter(x => x.Tanggal === tanggal && x.Kelas === kelas && x.Mapel === mapel && x.NIS === nis && x.Tahun_Ajaran === ta).first();
    if (a) {
      await db.Absensi.update(a.ID, { Bukti_Dukung: url });
      return { success: true, url };
    }
    return { success: false, message: 'Isi kehadiran dulu!' };
  },

  getStats: async function(namaTA) {
    // FIX: db.Kelas dan db.Mapel tidak ada di skema.
    // Hitung unik Kelas & Mapel dari tabel Jadwal yang memang memiliki kolom tersebut.
    const siswa = await db.Siswa.where('Tahun_Ajaran').equals(namaTA).count();
    const jadwalData = await db.Jadwal.where('Tahun_Ajaran').equals(namaTA).toArray();
    const jadwal = jadwalData.length;
    const kelas = new Set(jadwalData.map(j => j.Kelas).filter(Boolean)).size;
    const mapel = new Set(jadwalData.map(j => j.Mapel).filter(Boolean)).size;
    return { siswa, kelas, mapel, jadwal };
  },

  createTahunAjaranShard: async function(namaTA, id) {
    await db.Tahun_Ajaran.put({
      ID: id,
      Nama_TA: namaTA,
      Spreadsheet_ID: 'LOKAL'
    });
    return true;
  },

  getNilaiMatrix: async function (ta, tanggal, kelas, mapel) {
    const siswa = await db.Siswa.filter(s => s.Kelas === kelas && s.Tahun_Ajaran === ta).toArray();
    const nilai = await db.Nilai.filter(n => n.Tanggal === tanggal && n.Kelas === kelas && n.Mapel === mapel && n.Tahun_Ajaran === ta).toArray();
    
    let res = siswa.map(s => {
      const n = nilai.find(x => x.NIS === s.NIS);
      return {
        NIS: s.NIS, Nama: s.Nama, L_P: s.L_P,
        Pengetahuan: n ? n.Pengetahuan : '',
        Keterampilan: n ? n.Keterampilan : '',
        Sikap: n ? n.Sikap : '',
        Catatan: n ? n.Catatan : ''
      };
    });
    res.sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
    return res;
  },

  autoSaveJadwalMateri: async function (id, val) {
    await db.Jadwal.update(id, { Materi_Harian: val });
    return true;
  },

  autoSaveNilai: async function (ta, tanggal, kelas, mapel, nis, fld, skor) {
    const existing = await db.Nilai.filter(n => n.Tanggal === tanggal && n.Kelas === kelas && n.Mapel === mapel && n.NIS === nis && n.Tahun_Ajaran === ta).first();
    if (existing) {
      let upd = {}; upd[fld] = skor;
      await db.Nilai.update(existing.ID, upd);
    } else {
      let rec = {
        ID: 'NIL-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : new Date().getTime()),
        Tahun_Ajaran: ta, Tanggal: tanggal, Kelas: kelas, Mapel: mapel, NIS: nis,
        Pengetahuan: '', Keterampilan: '', Sikap: '', Catatan: ''
      };
      rec[fld] = skor;
      await db.Nilai.put(rec);
    }
    return true;
  },

  getNilaiUjianMatrix: async function (ta, smt, kelas, mapel, jenisUjian) {
    const siswa = await db.Siswa.filter(s => s.Kelas === kelas && s.Tahun_Ajaran === ta).toArray();
    const nilai = await db.Nilai_Ujian.filter(n => n.Semester === smt && n.Kelas === kelas && n.Mapel === mapel && n.Jenis_Ujian === jenisUjian && n.Tahun_Ajaran === ta).toArray();
    
    let res = siswa.map(s => {
      const n = nilai.find(x => x.NIS === s.NIS);
      return {
        NIS: s.NIS, Nama: s.Nama, L_P: s.L_P,
        Pengetahuan: n ? n.Pengetahuan : '',
        Keterampilan: n ? n.Keterampilan : '',
        Sikap: n ? n.Sikap : '',
        Catatan: n ? n.Catatan : '',
        Konversi_Peng: n ? n.Konversi_Peng : '',
        Konversi_Ket: n ? n.Konversi_Ket : ''
      };
    });
    res.sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
    return res;
  },

  autoSaveNilaiUjian: async function (ta, smt, kls, mpl, jenis, nis, fld, skor) {
    const existing = await db.Nilai_Ujian.filter(n => n.Semester === smt && n.Kelas === kls && n.Mapel === mpl && n.Jenis_Ujian === jenis && n.NIS === nis && n.Tahun_Ajaran === ta).first();
    if (existing) {
      let upd = {}; upd[fld] = skor;
      await db.Nilai_Ujian.update(existing.ID, upd);
    } else {
      let rec = {
        ID: 'NILU-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : new Date().getTime()),
        Tahun_Ajaran: ta, Semester: smt, Kelas: kls, Mapel: mpl, Jenis_Ujian: jenis, NIS: nis,
        Pengetahuan: '', Keterampilan: '', Sikap: '', Catatan: '', Konversi_Peng: '', Konversi_Ket: ''
      };
      rec[fld] = skor;
      await db.Nilai_Ujian.put(rec);
    }
    return true;
  },

  batchSaveNilaiUjian: async function (ta, smt, kls, mpl, jenis, updates) {
    for (let u of updates) {
      await this.autoSaveNilaiUjian(ta, smt, kls, mpl, jenis, u.nis, u.field, u.val);
    }
    return true;
  },

  resetKonversiNilaiUjian: async function (ta, smt, kls, mpl, jenis) {
    const nilai = await db.Nilai_Ujian.filter(n => n.Semester === smt && n.Kelas === kls && n.Mapel === mpl && n.Jenis_Ujian === jenis && n.Tahun_Ajaran === ta).toArray();
    for (let n of nilai) {
      await db.Nilai_Ujian.update(n.ID, { Konversi_Peng: '', Konversi_Ket: '' });
    }
    return true;
  },

  backupFullJSON: async function () {
    const allData = {};
    for (const table of db.tables) {
      allData[table.name] = await table.toArray();
    }
    return allData;
  },

  restoreFullJSON: async function (jsonData) {
    if (!jsonData) throw new Error("Data JSON kosong!");
    
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        if (jsonData[table.name]) {
          await table.clear();
          if (jsonData[table.name].length > 0) {
            await table.bulkAdd(jsonData[table.name]);
          }
        }
      }
    });
    return { success: true };
  }
};
