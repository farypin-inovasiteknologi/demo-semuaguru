// ==========================================
  // EKSPOR EXCEL (MENGGUNAKAN EXCELJS)
  // ==========================================
  async function exportToExcel(jenisLaporan) {
    let sheetName = '';
    let filterValues = {};

    if (jenisLaporan === 'absensi') {
      sheetName = 'Absensi';
      filterValues = {
        'Kelas': document.getElementById('lap-abs-kelas').value,
        'Mapel': document.getElementById('lap-abs-mapel').value,
        'Bulan': document.getElementById('lap-abs-bulan').value
      };
      if (!filterValues['Kelas'] || !filterValues['Bulan']) { Swal.fire('Error', 'Pilih Kelas dan Bulan', 'error'); return; }
    } else if (jenisLaporan === 'absensi_semester') {
      sheetName = 'Absensi';
      filterValues = {
        'Kelas': document.getElementById('lap-abs-smt-kelas').value,
        'Mapel': document.getElementById('lap-abs-smt-mapel').value,
        'Semester': document.getElementById('lap-abs-smt-pilihan').value,
        'Tahun_Ajaran': appState.activeTA
      };
      if (!filterValues['Kelas']) { Swal.fire('Error', 'Pilih Kelas', 'error'); return; }
    } else if (jenisLaporan === 'nilai_harian') {
      sheetName = 'Nilai';
      filterValues = {
        'Kelas': document.getElementById('lap-nil-kelas').value,
        'Mapel': document.getElementById('lap-nil-mapel').value,
        'Semester': document.getElementById('lap-nil-smt').value,
        'Tahun_Ajaran': appState.activeTA
      };
      if (!filterValues['Kelas'] || !filterValues['Mapel']) { Swal.fire('Error', 'Pilih Kelas dan Mapel', 'error'); return; }
    } else if (jenisLaporan === 'nilai_ujian') {
      sheetName = 'Nilai_Ujian';
      filterValues = {
        'Kelas': document.getElementById('lap-uji-kelas').value,
        'Semester': document.getElementById('lap-uji-smt').value,
        'Jenis_Ujian': document.getElementById('lap-uji-jenis').value,
        'Tahun_Ajaran': appState.activeTA
      };
      if (!filterValues['Kelas']) { Swal.fire('Error', 'Pilih Kelas', 'error'); return; }
    }

    showLoader();
    try {
      const data = await apiCall('readData', [sheetName]) || [];
      hideLoader();
      
      // Filter Data
      const filtered = data.filter(row => {
        let match = true;
        for (let key in filterValues) {
          if (filterValues[key]) {
            if (jenisLaporan === 'absensi_semester' && key === 'Semester') continue; // ditangani di bawah
            if (key === 'Bulan' && row['Tanggal']) {
              if (!row['Tanggal'].startsWith(filterValues[key])) match = false;
            } else if (key === 'Tahun_Ajaran' && row['Tahun_Ajaran']) {
               if (row['Tahun_Ajaran'] != filterValues[key]) match = false;
            } else if (key !== 'Tahun_Ajaran') {
              if (row[key] != filterValues[key]) match = false;
            }
          }
        }
        if (jenisLaporan === 'absensi_semester' && match && row['Tanggal']) {
          const m = parseInt(row['Tanggal'].split('-')[1]);
          const isGanjil = m >= 7 && m <= 12;
          const wantSmt = parseInt(filterValues['Semester']);
          if (wantSmt === 1 && !isGanjil) match = false;
          if (wantSmt === 2 && isGanjil) match = false;
        }
        return match;
      });

      const siswaKelas = appState.siswa.filter(s => String(s.Kelas).trim() === String(filterValues['Kelas']).trim());
      if (siswaKelas.length === 0) {
        Swal.fire('Info', 'Tidak ada data siswa di kelas ini.', 'info');
        return;
      }

      // Initialize ExcelJS Workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Styles
      const titleFont = { name: 'Arial', size: 14, bold: true };
      const subTitleFont = { name: 'Arial', size: 11, bold: true };
      const headerFont = { name: 'Arial', size: 10, bold: true };
      const normalFont = { name: 'Arial', size: 10 };
      const centerAlign = { vertical: 'middle', horizontal: 'center' };
      const leftAlign = { vertical: 'middle', horizontal: 'left' };
      const borderStyle = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };

      if (jenisLaporan === 'absensi') {
         // Header Info
         worksheet.getCell('A3').value = 'Kelas'; worksheet.getCell('B3').value = `: ${filterValues['Kelas']}`;
         worksheet.getCell('A4').value = 'Mapel'; worksheet.getCell('B4').value = `: ${filterValues['Mapel'] || 'Semua'}`;
         worksheet.getCell('A5').value = 'Bulan'; worksheet.getCell('B5').value = `: ${filterValues['Bulan']}`;
         worksheet.getCell('A3').font = subTitleFont; worksheet.getCell('A4').font = subTitleFont; worksheet.getCell('A5').font = subTitleFont;

         const [year, month] = filterValues['Bulan'].split('-');
         const daysInMonth = new Date(year, month, 0).getDate();

         let headerArr = ['NO', 'NIS', 'NAMA', 'JK'];
         let cols = [
           { width: 5 }, { width: 15 }, { width: 35 }, { width: 5 } // Basic columns
         ];
         for(let i=1; i<=daysInMonth; i++) {
           headerArr.push(i);
           cols.push({ width: 3 }); // Small columns for days
         }
         headerArr.push('H', 'I', 'S', 'A');
         cols.push({ width: 5 }, { width: 5 }, { width: 5 }, { width: 5 });

         worksheet.columns = cols;
         worksheet.mergeCells(1, 1, 1, cols.length); // Dynamic title merge
         const titleCell = worksheet.getCell('A1');
         titleCell.value = 'REKAPITULASI ABSENSI SISWA';
         titleCell.font = titleFont;
         titleCell.alignment = centerAlign;
         worksheet.getRow(7).values = headerArr;
         
         const headerRow = worksheet.getRow(7);
         headerRow.eachCell((cell) => {
           cell.font = headerFont;
           cell.fill = headerFill;
           cell.alignment = centerAlign;
           cell.border = borderStyle;
         });
         headerRow.height = 25;

         let currentRow = 8;
         siswaKelas.forEach((s, idx) => {
             let rowValues = [idx+1, s.NIS, s.Nama, s.L_P || ''];
             let counts = { H: 0, I: 0, S: 0, A: 0 };
             for(let i=1; i<=daysInMonth; i++) {
                 const dayStr = String(i).padStart(2, '0');
                 const dateStr = `${filterValues['Bulan']}-${dayStr}`;
                 const abs = filtered.find(r => String(r.NIS) === String(s.NIS) && r.Tanggal === dateStr);
                 let stat = abs && abs.Status ? abs.Status.charAt(0).toUpperCase() : '';
                 rowValues.push(stat);
                 if (stat === 'H') counts.H++;
                 else if (stat === 'I') counts.I++;
                 else if (stat === 'S') counts.S++;
                 else if (stat === 'A') counts.A++;
             }
             rowValues.push(counts.H, counts.I, counts.S, counts.A);
             
              const row = worksheet.addRow(rowValues);
              row.eachCell((cell, colNumber) => {
                cell.font = normalFont;
                cell.border = borderStyle;
                if (colNumber === 3) cell.alignment = leftAlign;
                else cell.alignment = centerAlign;
              });
              currentRow++;
          });
      } else if (jenisLaporan === 'absensi_semester') {
         worksheet.getCell('A3').value = 'Kelas'; worksheet.getCell('B3').value = `: ${filterValues['Kelas']}`;
         worksheet.getCell('A4').value = 'Mapel'; worksheet.getCell('B4').value = `: ${filterValues['Mapel'] || 'Semua'}`;
         worksheet.getCell('A5').value = 'Semester'; worksheet.getCell('B5').value = `: ${filterValues['Semester'] === '1' ? '1 (Ganjil)' : '2 (Genap)'} (${filterValues['Tahun_Ajaran']})`;
         worksheet.getCell('A3').font = subTitleFont; worksheet.getCell('A4').font = subTitleFont; worksheet.getCell('A5').font = subTitleFont;

         let bulanList = filterValues['Semester'] === '1' 
           ? [{m:7, n:'Juli'}, {m:8, n:'Agustus'}, {m:9, n:'September'}, {m:10, n:'Oktober'}, {m:11, n:'November'}, {m:12, n:'Desember'}]
           : [{m:1, n:'Januari'}, {m:2, n:'Februari'}, {m:3, n:'Maret'}, {m:4, n:'April'}, {m:5, n:'Mei'}, {m:6, n:'Juni'}];

         worksheet.mergeCells(1, 1, 1, 4 + (bulanList.length * 4) + 4);
         const titleCell = worksheet.getCell('A1');
         titleCell.value = 'REKAPITULASI ABSENSI SEMESTER';
         titleCell.font = titleFont;
         titleCell.alignment = centerAlign;

         let cols = [{ width: 5 }, { width: 15 }, { width: 35 }, { width: 5 }];
         for (let i=0; i < bulanList.length * 4 + 4; i++) cols.push({width: 5});
         worksheet.columns = cols;

         // Row 7 (Bulan / Total)
         let r7 = ['NO', 'NIS', 'NAMA', 'JK'];
         bulanList.forEach(b => { r7.push(b.n); r7.push('','',''); });
         r7.push('TOTAL SMT'); r7.push('','','');
         worksheet.getRow(7).values = r7;

         // Row 8 (H I S A)
         let r8 = ['','','',''];
         bulanList.forEach(() => { r8.push('H','I','S','A'); });
         r8.push('H','I','S','A');
         worksheet.getRow(8).values = r8;

         // Merge header cells
         worksheet.mergeCells('A7:A8');
         worksheet.mergeCells('B7:B8');
         worksheet.mergeCells('C7:C8');
         worksheet.mergeCells('D7:D8');
         
         let colStart = 5; // column E
         bulanList.forEach(b => {
            worksheet.mergeCells(7, colStart, 7, colStart + 3);
            colStart += 4;
         });
         worksheet.mergeCells(7, colStart, 7, colStart + 3);

         [7, 8].forEach(rIdx => {
           worksheet.getRow(rIdx).eachCell((cell) => {
             cell.font = headerFont;
             cell.fill = headerFill;
             cell.alignment = centerAlign;
             cell.border = borderStyle;
           });
         });

         let currentRow = 9;
         siswaKelas.forEach((s, idx) => {
             let rowValues = [idx+1, s.NIS, s.Nama, s.L_P || ''];
             let totalCounts = { H: 0, I: 0, S: 0, A: 0 };
             
             bulanList.forEach(b => {
                 let bCounts = { H: 0, I: 0, S: 0, A: 0 };
                 const absBulanIni = filtered.filter(r => {
                     if (String(r.NIS) !== String(s.NIS)) return false;
                     if (!r.Tanggal) return false;
                     const m = parseInt(r.Tanggal.split('-')[1]);
                     return m === b.m;
                 });
                 
                 absBulanIni.forEach(a => {
                     let stat = a.Status ? a.Status.charAt(0).toUpperCase() : '';
                     if (stat === 'H') { bCounts.H++; totalCounts.H++; }
                     else if (stat === 'I') { bCounts.I++; totalCounts.I++; }
                     else if (stat === 'S') { bCounts.S++; totalCounts.S++; }
                     else if (stat === 'A') { bCounts.A++; totalCounts.A++; }
                 });
                 rowValues.push(bCounts.H || '-', bCounts.I || '-', bCounts.S || '-', bCounts.A || '-');
             });
             
             rowValues.push(totalCounts.H || '-', totalCounts.I || '-', totalCounts.S || '-', totalCounts.A || '-');
             
             const row = worksheet.addRow(rowValues);
             row.eachCell((cell, colNumber) => {
               cell.font = normalFont;
               cell.border = borderStyle;
               if (colNumber === 3) cell.alignment = leftAlign;
               else cell.alignment = centerAlign;
             });
             currentRow++;
         });
      } else if (jenisLaporan === 'nilai_ujian') {
         let jenisUjiLabel = filterValues['Jenis_Ujian'] || 'Ujian Sumatif';
         // Header Info
         worksheet.getCell('A3').value = 'Tahun Ajaran'; worksheet.getCell('C3').value = `: ${filterValues['Tahun_Ajaran']}`;
         worksheet.getCell('A4').value = 'Semester'; worksheet.getCell('C4').value = `: ${filterValues['Semester']}`;
         worksheet.getCell('A5').value = 'Kelas'; worksheet.getCell('C5').value = `: ${filterValues['Kelas']}`;
         worksheet.getCell('A6').value = 'Jenis Ujian'; worksheet.getCell('C6').value = `: ${jenisUjiLabel}`;
         [3,4,5,6].forEach(r => worksheet.getCell(`A${r}`).font = subTitleFont);

         // Define Headers
         let cols = [
           { width: 5 }, { width: 35 }, { width: 15 }, { width: 5 }, // No, Nama, NIS, JK
           { width: 10 }, { width: 10 }, // Asli (Peng, Ket)
           { width: 10 }, { width: 10 }, // Konv (Peng, Ket)
           { width: 15 }, { width: 35 }  // Sikap, Catatan
         ];
         worksheet.columns = cols;

         worksheet.mergeCells(1, 1, 1, cols.length); // Dynamic title merge
         const titleCell = worksheet.getCell('A1');
         titleCell.value = 'REKAPITULASI NILAI UJIAN SISWA';
         titleCell.font = titleFont;
         titleCell.alignment = centerAlign;

         // Row 8: Top level headers
         worksheet.getRow(8).values = ['NO', 'NAMA SISWA', 'NIS', 'L/P', 'NILAI ASLI', '', 'NILAI RAPOT / KONVERSI', '', 'SIKAP', 'CATATAN'];
         // Row 9: Sub level headers
         worksheet.getRow(9).values = ['', '', '', '', 'Pengetahuan', 'Keterampilan', 'Pengetahuan', 'Keterampilan', '', ''];

         // Merge logic
         worksheet.mergeCells('A8:A9'); // NO
         worksheet.mergeCells('B8:B9'); // NAMA
         worksheet.mergeCells('C8:C9'); // NIS
         worksheet.mergeCells('D8:D9'); // L/P
         worksheet.mergeCells('E8:F8'); // NILAI ASLI
         worksheet.mergeCells('G8:H8'); // NILAI KONVERSI
         worksheet.mergeCells('I8:I9'); // SIKAP
         worksheet.mergeCells('J8:J9'); // CATATAN
         
         [8, 9].forEach(r => {
             const row = worksheet.getRow(r);
             row.height = 25;
             row.eachCell((cell) => {
               cell.font = headerFont;
               cell.fill = headerFill;
               cell.alignment = centerAlign;
               cell.border = borderStyle;
             });
         });

         let currentRow = 10;
         siswaKelas.forEach((s, idx) => {
             const uRow = filtered.find(r => String(r.NIS) === String(s.NIS) && r.Jenis_Ujian === jenisUjiLabel);
             
             let rowValues = [
                 idx + 1, 
                 s.Nama, 
                 s.NIS, 
                 s.L_P || '',
                 uRow ? uRow.Pengetahuan : '',
                 uRow ? uRow.Keterampilan : '',
                 uRow ? uRow.Konversi_Peng : '',
                 uRow ? uRow.Konversi_Ket : '',
                 uRow ? uRow.Sikap : '',
                 uRow ? uRow.Catatan : ''
             ];
             
             const row = worksheet.addRow(rowValues);
             row.eachCell((cell, colNumber) => {
               cell.font = normalFont;
               cell.border = borderStyle;
               if (colNumber === 2 || colNumber === 10) cell.alignment = leftAlign; // Nama and Catatan Left aligned
               else cell.alignment = centerAlign;
             });
             currentRow++;
         });
      }

      // Menambahkan Tanda Tangan
      const lastRow = worksheet.lastRow.number;
      const kepsekNama = appState.settings && appState.settings['Nama_Kepsek'] ? appState.settings['Nama_Kepsek'] : '__________________';
      const kepsekNip  = appState.settings && appState.settings['NIP_Kepsek'] ? appState.settings['NIP_Kepsek'] : '';
      const guruNama   = appState.settings && appState.settings['Nama_Guru'] ? appState.settings['Nama_Guru'] : '__________________';
      const guruNip    = appState.settings && appState.settings['NIP_Guru'] ? appState.settings['NIP_Guru'] : '';
      const tanggalCetak = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

      // Calculate width for signature
      let totalCols = worksheet.columnCount;
      let leftCol = 2; // Col B
      let rightCol = totalCols > 5 ? totalCols - 2 : totalCols;

      worksheet.getCell(lastRow + 3, rightCol).value = `............., ${tanggalCetak}`;
      worksheet.getCell(lastRow + 4, leftCol).value = 'Mengetahui,';
      worksheet.getCell(lastRow + 5, leftCol).value = 'Kepala Sekolah';
      worksheet.getCell(lastRow + 5, rightCol).value = 'Guru Mata Pelajaran / Kelas';

      worksheet.getCell(lastRow + 9, leftCol).value = kepsekNama;
      worksheet.getCell(lastRow + 10, leftCol).value = `NIP. ${kepsekNip}`;
      worksheet.getCell(lastRow + 9, rightCol).value = guruNama;
      worksheet.getCell(lastRow + 10, rightCol).value = `NIP. ${guruNip}`;

      [4,5,9,10].forEach(offset => {
        worksheet.getCell(lastRow + offset, leftCol).font = subTitleFont;
        worksheet.getCell(lastRow + offset, rightCol).font = subTitleFont;
      });

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_${jenisLaporan}_${new Date().getTime()}.xlsx`;
      link.click();
      
    } catch (err) {
      hideLoader();
      console.error(err);
      Swal.fire('Error', 'Gagal mengekspor laporan: ' + err.message, 'error');
    }
  }

  // ==========================================
  // LOGIKA CROPPER.JS DINAMIS
  // ==========================================
  let cropperInstance = null;
  let targetId = ''; // 'kiri', 'kanan', atau 'guru'
  let currentRatio = 1;

  // Fungsi membuka modal menerima rasio khusus (default 1/1)
  function openCropperModal(inputElement, posisi, ratio = 1) {
    if (!inputElement.files || inputElement.files.length === 0) return;

    targetId = posisi;
    currentRatio = ratio;

    const file = inputElement.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const imageElement = document.getElementById('image-to-crop');
      imageElement.src = e.target.result;

      const cropModal = new bootstrap.Modal(document.getElementById('modalCropper'));
      cropModal.show();

      document.getElementById('modalCropper').addEventListener('shown.bs.modal', function () {
        if (cropperInstance) cropperInstance.destroy();

        cropperInstance = new Cropper(imageElement, {
          aspectRatio: currentRatio,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        });
      }, { once: true });
    };

    reader.readAsDataURL(file);
    inputElement.value = ''; // Reset agar bisa memilih file yang sama
  }

  function applyCrop() {
    if (!cropperInstance) return;

    // Tentukan ukuran resolusi Canvas berdasarkan target
    let finalWidth = (targetId === 'guru') ? 300 : 250;
    let finalHeight = (targetId === 'guru') ? 400 : 250;

    const canvas = cropperInstance.getCroppedCanvas({
      width: finalWidth,
      height: finalHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    // Logo kiri/kanan gunakan PNG agar latar belakang transparan tetap terjaga
    // Foto guru gunakan JPEG (lebih kecil, tidak perlu transparansi)
    const isLogo = (targetId === 'kiri' || targetId === 'kanan');
    const base64Data = isLogo
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.75);

    if (targetId === 'kiri') {
      document.getElementById('prev-logo-kiri').src = base64Data;
      document.getElementById('base64-logo-kiri').value = base64Data;
    } else if (targetId === 'kanan') {
      document.getElementById('prev-logo-kanan').src = base64Data;
      document.getElementById('base64-logo-kanan').value = base64Data;
    } else if (targetId === 'guru') {
      document.getElementById('prev-foto-guru').src = base64Data;
      document.getElementById('base64-foto-guru').value = base64Data;
    }

    closeAndCleanModal('modalCropper');
    showToast(`Gambar berhasil dipotong dan diterapkan.`);
  }

  function updateJenisUjian() {
    const smt = document.getElementById('lap-uji-smt').value;
    const jenis = document.getElementById('lap-uji-jenis');
    jenis.innerHTML = '';
    if (smt === '1') {
      jenis.innerHTML += '<option value="UTS Smt 1">UTS Smt 1</option>';
      jenis.innerHTML += '<option value="Ujian Akhir Semester">Ujian Akhir Semester</option>';
    } else {
      jenis.innerHTML += '<option value="UTS Smt 2">UTS Smt 2</option>';
      jenis.innerHTML += '<option value="Ujian Kenaikan Kelas">Ujian Kenaikan Kelas</option>';
      jenis.innerHTML += '<option value="Ujian Sekolah">Ujian Sekolah</option>';
    }
  }
  
async function exportNilaiHarianBukaJadwal() {
  const kelas = document.getElementById('buka-info-kelas').innerText;
  const mapel = document.getElementById('buka-info-mapel').innerText;
  const tanggal = document.getElementById('buka-info-tanggal').innerText;
  const semester = document.getElementById('buka-nil-smt').value || '1';
  const ta = appState.activeTA;

  if (!kelas || !mapel) {
    Swal.fire('Error', 'Informasi kelas/mapel tidak tersedia. Buka ulang jadwal.', 'error');
    return;
  }

  showLoader();
  try {
    let [data, jurnalData] = await Promise.all([
      apiCall('readData', ['Nilai']),
      apiCall('readData', ['Jurnal'])
    ]);
    data = data || [];
    jurnalData = jurnalData || [];
    hideLoader();
    
    const filtered = data.filter(row => 
      String(row.Kelas).trim() === String(kelas).trim() && 
      String(row.Mapel).trim() === String(mapel).trim() && 
      String(row.Tahun_Ajaran).trim() === String(ta).trim() &&
      String(row.Tanggal).trim() === String(tanggal).trim()
    );

    const siswaKelas = appState.siswa.filter(s => String(s.Kelas).trim() === String(kelas).trim());
    if (siswaKelas.length === 0) {
      Swal.fire('Info', 'Tidak ada data siswa di kelas ini.', 'info');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Nilai_Harian');

    const titleFont = { name: 'Arial', size: 14, bold: true };
    const subTitleFont = { name: 'Arial', size: 11, bold: true };
    const headerFont = { name: 'Arial', size: 10, bold: true };
    const normalFont = { name: 'Arial', size: 10 };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };
    const leftAlign = { vertical: 'middle', horizontal: 'left' };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    const jad = appState.jadwalData.find(j => 
      String(j.Tanggal).trim() === String(tanggal).trim() &&
      String(j.Kelas).trim() === String(kelas).trim() &&
      String(j.Mapel).trim() === String(mapel).trim()
    );
    let materi = jad ? (jad.Materi_Harian || '') : '-';

    worksheet.getCell('A3').value = 'Tahun Ajaran'; worksheet.getCell('C3').value = `: ${ta}`;
    worksheet.getCell('A4').value = 'Semester'; worksheet.getCell('C4').value = `: ${semester}`;
    worksheet.getCell('A5').value = 'Kelas'; worksheet.getCell('C5').value = `: ${kelas}`;
    worksheet.getCell('A6').value = 'Mapel'; worksheet.getCell('C6').value = `: ${mapel}`;
    worksheet.getCell('A7').value = 'Tanggal'; worksheet.getCell('C7').value = `: ${tanggal}`;
    worksheet.getCell('A8').value = 'Materi Ajar'; worksheet.getCell('C8').value = `: ${materi}`;
    [3,4,5,6,7,8].forEach(r => worksheet.getCell(`A${r}`).font = subTitleFont);

    let cols = [
      { width: 5 }, { width: 15 }, { width: 35 }, { width: 5 },
      { width: 8 }, { width: 8 }, { width: 8 }, { width: 15 }
    ];
    worksheet.columns = cols;
    worksheet.mergeCells(1, 1, 1, cols.length);
    
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REKAPITULASI NILAI HARIAN SISWA';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    let headerArr = ['NO', 'NIS', 'NAMA', 'JK', 'P', 'K', 'S', 'CTTN'];
    worksheet.getRow(10).values = headerArr;
    
    const headerRow = worksheet.getRow(10);
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = borderStyle;
    });
    headerRow.height = 25;

    let currentRow = 11;
    siswaKelas.forEach((s, idx) => {
        let rowValues = [idx+1, s.NIS, s.Nama, s.L_P || ''];
        const nil = filtered.find(r => String(r.NIS).trim() === String(s.NIS).trim());
        let p = nil ? (parseFloat(nil.Pengetahuan) || 0) : 0;
        let k = nil ? (parseFloat(nil.Keterampilan) || 0) : 0;
        let skp = nil ? (nil.Sikap || '') : '';
        let cttn = nil ? (nil.Catatan || '') : '';
        rowValues.push(p || '', k || '', skp, cttn);

        const row = worksheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.font = normalFont;
          cell.border = borderStyle;
          if (colNumber === 3) cell.alignment = leftAlign;
          else cell.alignment = centerAlign;
        });
        currentRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let tglName = tanggal.replace(/\//g, '-');
    link.download = `Laporan_NilaiHarian_${kelas}_${mapel}_${tglName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(error);
    hideLoader();
    Swal.fire('Error', 'Gagal mengekspor data: ' + error.message, 'error');
  }
}

window.exportNilaiHarianBukaJadwal = exportNilaiHarianBukaJadwal;

async function exportAbsensiHarianBukaJadwal() {
  const kelas = document.getElementById('buka-info-kelas').innerText;
  const mapel = document.getElementById('buka-info-mapel').innerText;
  const tanggal = document.getElementById('buka-info-tanggal').innerText;
  const semester = document.getElementById('buka-nil-smt').value || '1';
  const ta = appState.activeTA;

  if (!kelas || !mapel) {
    Swal.fire('Error', 'Informasi kelas/mapel tidak tersedia. Buka ulang jadwal.', 'error');
    return;
  }

  showLoader();
  try {
    const data = await apiCall('readData', ['Absensi']) || [];
    hideLoader();
    
    const filtered = data.filter(row => 
      String(row.Kelas).trim() === String(kelas).trim() && 
      String(row.Mapel).trim() === String(mapel).trim() && 
      String(row.Tahun_Ajaran).trim() === String(ta).trim() &&
      String(row.Tanggal).trim() === String(tanggal).trim()
    );

    const siswaKelas = appState.siswa.filter(s => String(s.Kelas).trim() === String(kelas).trim());
    if (siswaKelas.length === 0) {
      Swal.fire('Info', 'Tidak ada data siswa di kelas ini.', 'info');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Absensi_Harian');

    const titleFont = { name: 'Arial', size: 14, bold: true };
    const subTitleFont = { name: 'Arial', size: 11, bold: true };
    const headerFont = { name: 'Arial', size: 10, bold: true };
    const normalFont = { name: 'Arial', size: 10 };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };
    const leftAlign = { vertical: 'middle', horizontal: 'left' };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    worksheet.getCell('A3').value = 'Tahun Ajaran'; worksheet.getCell('C3').value = `: ${ta}`;
    worksheet.getCell('A4').value = 'Semester'; worksheet.getCell('C4').value = `: ${semester}`;
    worksheet.getCell('A5').value = 'Kelas'; worksheet.getCell('C5').value = `: ${kelas}`;
    worksheet.getCell('A6').value = 'Mapel'; worksheet.getCell('C6').value = `: ${mapel}`;
    worksheet.getCell('A7').value = 'Tanggal'; worksheet.getCell('C7').value = `: ${tanggal}`;
    [3,4,5,6,7].forEach(r => worksheet.getCell(`A${r}`).font = subTitleFont);

    let cols = [
      { width: 5 }, { width: 15 }, { width: 35 }, { width: 5 },
      { width: 10 }, { width: 15 }, { width: 25 }
    ];
    
    worksheet.columns = cols;
    worksheet.mergeCells(1, 1, 1, cols.length);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REKAPITULASI ABSENSI HARIAN SISWA';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    let headerArr = ['NO', 'NIS', 'NAMA', 'JK', 'STATUS', 'KETERANGAN', 'BUKTI DUKUNG'];
    worksheet.getRow(9).values = headerArr;
    const headerRow = worksheet.getRow(9);
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = borderStyle;
    });
    headerRow.height = 25;

    const ketMap = { 'H': 'Hadir', 'I': 'Izin', 'S': 'Sakit', 'A': 'Alfa' };
    let currentRow = 10;
    siswaKelas.forEach((s, idx) => {
        let rowValues = [idx+1, s.NIS, s.Nama, s.L_P || ''];
        
        const abs = filtered.find(r => String(r.NIS).trim() === String(s.NIS).trim());
        if (abs) {
            let stat = (abs.Status || '').trim().toUpperCase();
            rowValues.push(stat, ketMap[stat] || '', abs.Bukti_Dukung || '');
        } else {
            rowValues.push('', '', '');
        }

        const row = worksheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.font = normalFont;
          cell.border = borderStyle;
          if (colNumber === 3) cell.alignment = leftAlign;
          else cell.alignment = centerAlign;
        });
        currentRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let tglName = tanggal.replace(/\//g, '-');
    link.download = `Laporan_AbsensiHarian_${kelas}_${mapel}_${tglName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(error);
    hideLoader();
    Swal.fire('Error', 'Gagal mengekspor data: ' + error.message, 'error');
  }
}
window.exportAbsensiHarianBukaJadwal = exportAbsensiHarianBukaJadwal;

async function exportJurnalHarianBukaJadwal() {
  const kelas = document.getElementById('buka-info-kelas').innerText;
  const mapel = document.getElementById('buka-info-mapel').innerText;
  const ta = appState.activeTA;

  if (!kelas || !mapel) {
    Swal.fire('Error', 'Informasi kelas/mapel tidak tersedia. Buka ulang jadwal.', 'error');
    return;
  }

  showLoader();
  try {
    const data = await apiCall('readData', ['Jurnal']) || [];
    hideLoader();
    
    // Filter out Jurnal
    const filtered = data.filter(row => 
      String(row.Kelas).trim() === String(kelas).trim() && 
      String(row.Mapel).trim() === String(mapel).trim() && 
      String(row.Tahun_Ajaran).trim() === String(ta).trim()
    );

    if (filtered.length === 0) {
      Swal.fire('Info', 'Tidak ada data jurnal di kelas ini.', 'info');
      return;
    }
    filtered.sort((a, b) => a.Tanggal.localeCompare(b.Tanggal));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jurnal_Harian');

    const titleFont = { name: 'Arial', size: 14, bold: true };
    const subTitleFont = { name: 'Arial', size: 11, bold: true };
    const headerFont = { name: 'Arial', size: 10, bold: true };
    const normalFont = { name: 'Arial', size: 10 };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };
    const leftAlign = { vertical: 'top', horizontal: 'left', wrapText: true };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    worksheet.getCell('A3').value = 'Tahun Ajaran'; worksheet.getCell('C3').value = `: ${ta}`;
    worksheet.getCell('A4').value = 'Kelas'; worksheet.getCell('C4').value = `: ${kelas}`;
    worksheet.getCell('A5').value = 'Mapel'; worksheet.getCell('C5').value = `: ${mapel}`;
    [3,4,5].forEach(r => worksheet.getCell(`A${r}`).font = subTitleFont);

    let headerArr = ['NO', 'TANGGAL', 'MATERI', 'PERMASALAHAN', 'SOLUSI', 'KETERANGAN'];
    let cols = [{ width: 5 }, { width: 12 }, { width: 35 }, { width: 30 }, { width: 30 }, { width: 25 }];
    
    worksheet.columns = cols;
    worksheet.mergeCells(1, 1, 1, cols.length);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'JURNAL MENGAJAR HARIAN';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    worksheet.getRow(7).values = headerArr;
    const headerRow = worksheet.getRow(7);
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = borderStyle;
    });
    headerRow.height = 25;

    let currentRow = 8;
    filtered.forEach((j, idx) => {
        let tglStr = j.Tanggal ? j.Tanggal.split('-').reverse().join('/') : '';
        let rowValues = [idx+1, tglStr, j.Materi || '', j.Permasalahan || '', j.Solusi || '', j.Keterangan || ''];
        
        const row = worksheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.font = normalFont;
          cell.border = borderStyle;
          if (colNumber >= 3) cell.alignment = leftAlign;
          else cell.alignment = centerAlign;
        });
        currentRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Jurnal_Mengajar_${kelas}_${mapel}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(error);
    hideLoader();
    Swal.fire('Error', 'Gagal mengekspor data: ' + error.message, 'error');
  }
}
window.exportJurnalHarianBukaJadwal = exportJurnalHarianBukaJadwal;

// ==========================================================
// FITUR 3: CETAK E-RAPOR PDF (jsPDF + AutoTable)
// ==========================================================
async function cetakERapor() {
  const kelas = document.getElementById('rap-kelas')?.value;
  const smt = document.getElementById('rap-smt')?.value || '1';
  if (!kelas) return Swal.fire('Error', 'Pilih kelas terlebih dahulu!', 'error');

  showLoader();
  try {
    const { jsPDF } = window.jspdf;
    const settings = await apiCall('getSettings', []);
    const ta = appState.activeTA;

    const siswaAll = await apiCall('readData', ['Siswa']);
    const siswaTaKelas = siswaAll.filter(s => s.Tahun_Ajaran === ta && s.Kelas === kelas).sort((a, b) => a.Nama > b.Nama ? 1 : -1);
    if (!siswaTaKelas.length) { hideLoader(); return Swal.fire('Info', 'Tidak ada siswa di kelas ini.', 'info'); }

    const nilaiAll = await apiCall('readData', ['Nilai']);
    const nilaiUjianAll = await apiCall('readData', ['Nilai_Ujian']);
    const absenAll = await apiCall('readData', ['Absensi']);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoKiri = settings['Logo_Kiri'] || null;
    const logoKanan = settings['Logo_Kanan'] || null;
    const namaInstansi = settings['Nama_Instansi'] || '';
    const namaOPD = settings['Nama_OPD'] || '';
    const namaSekolah = settings['Nama_Sekolah'] || 'UPT Sekolah Dasar';
    const alamat = settings['Alamat_Lengkap'] || '';
    const namaGuru = settings['Nama_Guru'] || '';
    const nip = settings['NIP'] || '';

    for (let idx = 0; idx < siswaTaKelas.length; idx++) {
      const siswa = siswaTaKelas[idx];
      if (idx > 0) doc.addPage();

      // === KOP SURAT (Dinamis) ===
      const cx = 105;
      let kopY = 12;
      
      doc.setFont('helvetica', 'bold').setFontSize(14); // Instansi 14px
      doc.text(namaInstansi || namaSekolah, cx, kopY, { align: 'center' });
      kopY += 6;
      
      if (namaOPD && namaOPD.trim()) {
        doc.setFontSize(14).setFont('helvetica', 'normal'); // OPD 14px
        doc.text(namaOPD, cx, kopY, { align: 'center' });
        kopY += 6;
      }
      
      if (namaInstansi && namaInstansi.trim()) {
        doc.setFont('helvetica', 'bold').setFontSize(17); // Sekolah 17px
        doc.text(namaSekolah, cx, kopY, { align: 'center' });
        kopY += 7;
      }
      
      doc.setFont('helvetica', 'normal').setFontSize(9); // Alamat 9px
      if (alamat && alamat.trim()) {
        doc.text(alamat, cx, kopY, { align: 'center' });
        kopY += 5;
      }
      
      // Garis Bawah KOP
      doc.setLineWidth(0.5).line(10, kopY + 1, 200, kopY + 1);
      doc.setLineWidth(0.2).line(10, kopY + 2.5, 200, kopY + 2.5);
      const garisBawahKop = kopY + 2.5;

      // === LOGO KIRI & KANAN ===
      // Gambar logo digambar SETELAH tahu tinggi total KOP agar proporsional
      let startX = 10;
      let logoMaxH = garisBawahKop - 10; // Sisakan margin atas dan bawah
      let logoW = logoMaxH; // Asumsi logo rasio 1:1 (persegi)
      let logoY = 8;
      
      if (logoKiri && logoKiri.startsWith('data:')) {
        const fmtK = logoKiri.includes('data:image/png') ? 'PNG' : 'JPEG';
        try { doc.addImage(logoKiri, fmtK, startX, logoY, logoW, logoMaxH); } catch(e) {}
      }
      if (logoKanan && logoKanan.startsWith('data:')) {
        const fmtKn = logoKanan.includes('data:image/png') ? 'PNG' : 'JPEG';
        try { doc.addImage(logoKanan, fmtKn, 200 - startX - logoW, logoY, logoW, logoMaxH); } catch(e) {}
      }

      // === JUDUL ===
      doc.setFont('helvetica', 'bold').setFontSize(13);
      doc.text('LAPORAN HASIL BELAJAR SISWA', cx, garisBawahKop + 9, { align: 'center' });
      doc.setFontSize(10).setFont('helvetica', 'normal');
      doc.text('Tahun Ajaran: ' + ta + '   |   Semester: ' + (smt === '1' ? 'Ganjil' : 'Genap') + '   |   Kelas: ' + kelas, cx, garisBawahKop + 16, { align: 'center' });

      // === IDENTITAS SISWA ===
      let y = garisBawahKop + 24;

      doc.setFontSize(10);
      const identitas = [
        ['Nama Siswa', siswa.Nama || '-'],
        ['NIS / NISN', siswa.NIS + ' / ' + (siswa.NISN || '-')],
        ['Jenis Kelamin', siswa.L_P === 'L' ? 'Laki-laki' : 'Perempuan'],
        ['Nama Orang Tua', (siswa.Nama_Ayah || '-') + ' / ' + (siswa.Nama_Ibu || '-')]
      ];
      identitas.forEach(function(row) {
        doc.setFont('helvetica', 'bold').text(row[0], 12, y);
        doc.setFont('helvetica', 'normal').text(': ' + row[1], 58, y);
        y += 6;
      });
      y += 3;

      // === TABEL NILAI HARIAN ===
      const nilaiSiswa = nilaiAll.filter(n => n.NIS === siswa.NIS && n.Tahun_Ajaran === ta);
      const mapelList = [...new Set(nilaiSiswa.map(n => n.Mapel))].sort();
      const rataMapel = mapelList.map(mp => {
        const rows = nilaiSiswa.filter(n => n.Mapel === mp);
        const avgP = rows.reduce((s, n) => s + (parseFloat(n.Pengetahuan) || 0), 0) / (rows.length || 1);
        const avgK = rows.reduce((s, n) => s + (parseFloat(n.Keterampilan) || 0), 0) / (rows.length || 1);
        const avgS = rows.reduce((s, n) => s + (parseFloat(n.Sikap) || 0), 0) / (rows.length || 1);
        return [mp, Math.round(avgP * 10) / 10, Math.round(avgK * 10) / 10, Math.round(avgS * 10) / 10];
      });

      doc.setFont('helvetica', 'bold').setFontSize(10).text('A. Nilai Harian (Rata-rata)', 12, y);
      y += 4;
      if (rataMapel.length) {
        doc.autoTable({ startY: y, head: [['Mata Pelajaran', 'Pengetahuan', 'Keterampilan', 'Sikap']], body: rataMapel,
          styles: { fontSize: 9, halign: 'center' }, columnStyles: { 0: { halign: 'left' } },
          headStyles: { fillColor: [13, 110, 253] }, margin: { left: 12, right: 12 } });
        y = doc.lastAutoTable.finalY + 6;
      } else {
        doc.setFont('helvetica', 'italic').setFontSize(9).text('(belum ada data nilai harian)', 14, y + 4);
        y += 10;
      }

      // === TABEL NILAI UJIAN ===
      const nilaiUjSiswa = nilaiUjianAll.filter(n => n.NIS === siswa.NIS && n.Tahun_Ajaran === ta && String(n.Semester) === String(smt));
      const ujianRows = nilaiUjSiswa.map(n => [n.Jenis_Ujian, n.Mapel, n.Pengetahuan || '-', n.Keterampilan || '-', n.Sikap || '-']);
      doc.setFont('helvetica', 'bold').setFontSize(10).text('B. Nilai Ujian / Sumatif', 12, y);
      y += 4;
      if (ujianRows.length) {
        doc.autoTable({ startY: y, head: [['Jenis Ujian', 'Mapel', 'Pengetahuan', 'Keterampilan', 'Sikap']], body: ujianRows,
          styles: { fontSize: 9, halign: 'center' }, columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } },
          headStyles: { fillColor: [25, 135, 84] }, margin: { left: 12, right: 12 } });
        y = doc.lastAutoTable.finalY + 6;
      } else {
        doc.setFont('helvetica', 'italic').setFontSize(9).text('(belum ada data nilai ujian)', 14, y + 4);
        y += 10;
      }

      // === REKAP KEHADIRAN ===
      const absenSiswa = absenAll.filter(a => a.NIS === siswa.NIS && a.Tahun_Ajaran === ta);
      const statAbs = { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
      absenSiswa.forEach(a => { if (statAbs[a.Status] !== undefined) statAbs[a.Status]++; });
      doc.setFont('helvetica', 'bold').setFontSize(10).text('C. Rekap Kehadiran', 12, y);
      y += 4;
      doc.autoTable({ startY: y, head: [['Hadir', 'Sakit', 'Izin', 'Alfa', 'Total Pertemuan']],
        body: [[statAbs.Hadir, statAbs.Sakit, statAbs.Izin, statAbs.Alfa, absenSiswa.length]],
        styles: { fontSize: 9, halign: 'center' }, headStyles: { fillColor: [220, 53, 69] }, margin: { left: 12, right: 12 } });
      y = doc.lastAutoTable.finalY + 10;

      // === TANDA TANGAN ===
      const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFont('helvetica', 'normal').setFontSize(10);
      doc.text('Dicetak tanggal: ' + tglCetak, 12, y);
      y += 10;
      doc.text('Guru Pengampu,', 150, y, { align: 'center' });
      y += 30;
      doc.setFont('helvetica', 'bold').text(namaGuru, 150, y, { align: 'center' });
      doc.setFont('helvetica', 'normal').text('NIP. ' + nip, 150, y + 5, { align: 'center' });
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'eRapor_' + kelas + '_Smt' + smt + '_' + ta.replace('/', '-') + '.pdf';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    hideLoader();
    Swal.fire('Sukses', 'e-Rapor PDF untuk ' + siswaTaKelas.length + ' siswa berhasil dibuat!', 'success');
  } catch (err) {
    hideLoader(); console.error(err);
    Swal.fire('Error', 'Gagal membuat PDF: ' + err.message, 'error');
  }
}
window.cetakERapor = cetakERapor;
