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
          if (filterValues[key] && key !== 'Tahun_Ajaran') {
            if (key === 'Bulan' && row['Tanggal']) {
              if (!row['Tanggal'].startsWith(filterValues[key])) match = false;
            } else {
              if (row[key] != filterValues[key]) match = false;
            }
          }
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

    const base64Data = canvas.toDataURL('image/jpeg', 0.6);

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
