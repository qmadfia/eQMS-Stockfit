
// ===========================================
// 1. Deklarasi Variabel Global dan DOM References (Modifikasi)
// ===========================================
let totalInspected = 0;
let totalReworkLeft = 0;
let totalReworkRight = 0;
let totalReworkPairs = 0;
let defectCounts = {}; // { defectType: { position: { grade: count } } }
let activeDefectType = null;
let activeReworkPosition = null;
let currentSelectedGrade = null;

const qtyInspectOutputs = {
    'a-grade': 0,
    'r-grade': 0,
    'b-grade': 0,
    'c-grade': 0
};

// Referensi Elemen DOM Utama - Akan diisi di initApp
let outputElements = {};
let fttOutput;
let qtyInspectOutput;
let leftCounter;
let rightCounter;
let pairsCounter;
let summaryContainer;
let redoRateOutput;
let qtySampleSetInput;
let defectButtons;
let reworkButtons;
let gradeInputButtons;

// >>> TAMBAHAN UNTUK CONDITIONAL NCVS <<<
let auditorSelect; // Referensi untuk dropdown Auditor
let ncvsSelect;      // Referensi untuk dropdown NCVS

// Data mapping Auditor ke NCVS
const auditorNcvsMap = {
    "Amalia Nur Aisyah": ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6", "Line 7", "Line 8", "Line 9", "Line 10"]
};

// Kunci localStorage untuk menyimpan data NCVS yang sudah digunakan
const USED_NCVS_STORAGE_KEY = 'usedNcvsPerDay';
// >>> AKHIR TAMBAHAN UNTUK CONDITIONAL NCVS <<<

// ===========================================
// 2. Fungsi Pembantu: Mengatur Status Tombol
// ===========================================

// Fungsi untuk mengaktifkan/menonaktifkan sekelompok tombol
function toggleButtonGroup(buttons, enable) {
    buttons.forEach(button => {
        button.disabled = !enable;
        button.classList.toggle('inactive', !enable);
        // Hapus highlight 'active' saat dinonaktifkan
        if (!enable) {
            button.classList.remove('active');
        }
    });
}

// ===========================================
// 3. Fungsi Utama: Inisialisasi Status Tombol (Kondisi Awal & Setelah Siklus)
// ===========================================
function initButtonStates() {
    console.log("Mengatur status tombol ke kondisi awal siklus...");
    // Defect Menu = AKTIF (semua tombol defect)
    toggleButtonGroup(defectButtons, true);
    // Rework Section = NONAKTIF
    toggleButtonGroup(reworkButtons, false);

    // Qty Section (R, B, C Grade) = NONAKTIF, A-Grade = AKTIF
    // <<< MODIFIKASI UNTUK ALUR TERPANDU DIMULAI DI SINI >>>
    gradeInputButtons.forEach(button => {
        button.disabled = true; // Nonaktifkan semua grade
        button.classList.add('inactive');
        button.classList.remove('active'); // Pastikan tidak ada highlight aktif
    });
    // Khusus A-Grade, biarkan tetap aktif sebagai pilihan independen untuk memulai siklus
    if (outputElements['a-grade'] && gradeInputButtons.length > 0) {
        const aGradeButton = Array.from(gradeInputButtons).find(btn => btn.classList.contains('a-grade'));
        if (aGradeButton) {
            aGradeButton.disabled = false;
            aGradeButton.classList.remove('inactive');
        }
    }
    // <<< MODIFIKASI UNTUK ALUR TERPANDU BERAKHIR DI SINI >>>

    // Reset internal state
    activeDefectType = null;
    activeReworkPosition = null;
    currentSelectedGrade = null; // Reset grade yang sedang aktif
    console.log("Status tombol diatur ke awal siklus.");
}

// ===========================================
// 4. Update Qty Counters (Left, Right, Pairs)
// ===========================================
function updateQuantity(counterId) {
    const counterElement = document.getElementById(counterId);
    if (!counterElement) {
        console.error("Elemen counter tidak ditemukan:", counterId);
        return;
    }
    let currentValue = parseInt(counterElement.textContent) || 0;
    currentValue++;
    counterElement.textContent = currentValue;

    if (counterId === 'left-counter') {
        totalReworkLeft = currentValue;
    } else if (counterId === 'pairs-counter') { // Pastikan ID cocok dengan HTML 'pairs-counter'
        totalReworkPairs = currentValue;
    } else if (counterId === 'right-counter') {
        totalReworkRight = currentValue;
    }
    updateRedoRate(); // Panggil updateRedoRate setiap kali rework diupdate
}

// ===========================================
// 5. Update FTT dan Redo Rate
// ===========================================
function updateFTT() {
    if (!fttOutput) return;
    const totalRGrade = qtyInspectOutputs['r-grade'] || 0;
    const totalBGrade = qtyInspectOutputs['b-grade'] || 0;
    const totalCGrade = qtyInspectOutputs['c-grade'] || 0;

    // FTT = (Total Inspect - Total R/B/C) / Total Inspect
    const fttValue = totalInspected > 0 ? ((totalInspected - (totalRGrade + totalBGrade + totalCGrade)) / totalInspected) * 100 : 0;
    fttOutput.textContent = `${Math.max(0, fttValue).toFixed(2)}%`; // Pastikan tidak negatif

    if (fttValue >= 92) {
        fttOutput.className = 'counter high-ftt';
    } else if (fttValue >= 80) {
        fttOutput.className = 'counter medium-ftt';
    } else {
        fttOutput.className = 'counter low-ftt';
    }
}

function updateRedoRate() {
    if (!redoRateOutput) return;
    // Redo Rate = (Rework Kiri + Rework Kanan)/2 + Rework Pairs / Total Inspect
    const calculatedTotalRework = ((totalReworkLeft + totalReworkRight) / 2) + totalReworkPairs;
    const redoRateValue = totalInspected !== 0 ? (calculatedTotalRework / totalInspected) * 100 : 0;
    redoRateOutput.textContent = `${redoRateValue.toFixed(2)}%`;
}

// ===========================================
// 6. Update Total Qty Inspect (termasuk FTT dan Redo Rate)
// ===========================================
function updateTotalQtyInspect() {
    let total = 0;
    for (const category in qtyInspectOutputs) {
        total += qtyInspectOutputs[category];
    }
    if (qtyInspectOutput) {
        qtyInspectOutput.textContent = total;
    }
    totalInspected = total; // Perbarui variabel global
    updateFTT(); // Selalu panggil update FTT
    updateRedoRate(); // Selalu panggil update Redo Rate
}

// ===========================================
// 7. Menambahkan Defect ke Summary List
// ===========================================
function addDefectToSummary() {
    // KONDISI PENTING: Memastikan semua variabel kunci terisi SEBELUM mencatat defect.
    // Jika A-Grade, tidak perlu mencatat defect.
    if (!activeDefectType || !activeReworkPosition || !currentSelectedGrade || currentSelectedGrade === 'a-grade') {
        console.warn("addDefectToSummary: Kondisi tidak terpenuhi untuk menambah defect ke summary. Active Defect:", activeDefectType, "Active Rework:", activeReworkPosition, "Selected Grade:", currentSelectedGrade);
        return;
    }

    // Pastikan struktur defectCounts sudah ada
    if (!defectCounts[activeDefectType]) {
        defectCounts[activeDefectType] = { "LEFT": {}, "PAIRS": {}, "RIGHT": {} };
    }
    if (!defectCounts[activeDefectType][activeReworkPosition]) {
        defectCounts[activeDefectType][activeReworkPosition] = {};
    }
    if (!defectCounts[activeDefectType][activeReworkPosition][currentSelectedGrade]) {
        defectCounts[activeDefectType][activeReworkPosition][currentSelectedGrade] = 0;
    }

    defectCounts[activeDefectType][activeReworkPosition][currentSelectedGrade]++;

    console.log("defectCounts diupdate:", JSON.stringify(defectCounts));
    updateDefectSummaryDisplay(); // Panggil untuk menampilkan update
}

// ===========================================
// 8. Menampilkan Summary Defect
// ===========================================
function updateDefectSummaryDisplay() {
    if (!summaryContainer) return;

    summaryContainer.innerHTML = ''; // Bersihkan summary list
    const gradeOrder = ["r-grade", "b-grade", "c-grade"]; // Gunakan nama kelas grade
    const positionOrder = ["LEFT", "PAIRS", "RIGHT"];

    const summaryItems = [];

    for (const defectType in defectCounts) {
        for (const position of positionOrder) {
            if (defectCounts[defectType][position]) {
                for (const displayGrade of gradeOrder) {
                    if (defectCounts[defectType][position][displayGrade] && defectCounts[defectType][position][displayGrade] > 0) {
                        const count = defectCounts[defectType][position][displayGrade];
                        let gradeLabel = ''; // Variabel baru untuk label yang diinginkan

                        // Logika untuk menentukan label yang ditampilkan
                        if (displayGrade === 'r-grade') {
                            gradeLabel = 'REWORK';
                        } else if (displayGrade === 'b-grade') {
                            gradeLabel = 'B-GRADE';
                        } else if (displayGrade === 'c-grade') {
                            gradeLabel = 'C-GRADE';
                        }
                        // Jika ada grade lain di masa depan, bisa ditambahkan di sini

                        const item = document.createElement('div');
                        item.className = 'summary-item';
                        item.innerHTML = `
                            <div class="defect-col">${defectType}</div>
                            <div class="position-col">${position}</div>
                            <div class="level-col">${gradeLabel} <span class="count">${count}</span></div>
                        `;
                        summaryItems.push({
                            defectType: defectType,
                            grade: displayGrade, // Simpan grade asli untuk sorting
                            position: position,
                            element: item
                        });
                    }
                }
            }
        }
    }

    // Sorting items for consistent display
    summaryItems.sort((a, b) => {
        if (a.defectType < b.defectType) return -1;
        if (a.defectType > b.defectType) return 1;
        const gradeOrderIndexA = gradeOrder.indexOf(a.grade);
        const gradeOrderIndexB = gradeOrder.indexOf(b.grade);
        if (gradeOrderIndexA < gradeOrderIndexB) return -1;
        if (gradeOrderIndexA > gradeOrderIndexB) return 1;
        const positionOrderIndexA = positionOrder.indexOf(a.position);
        const positionOrderIndexB = positionOrder.indexOf(b.position);
        if (positionOrderIndexA < positionOrderIndexB) return -1;
        if (positionOrderIndexA > positionOrderIndexB) return 1;
        return 0;
    });

    summaryItems.forEach(itemData => {
        summaryContainer.appendChild(itemData.element);
    });
}

// ===========================================
// 9. Event Handlers untuk Tombol
// ===========================================

// Handler untuk klik tombol Defect Menu Item
function handleDefectClick(button) {
    activeDefectType = button.dataset.defect || button.textContent.trim();
    console.log(`Defect selected: ${activeDefectType}`);

    // <<< MODIFIKASI UNTUK ALUR TERPANDU DIMULAI DI SINI >>>
    // Set highlight pada tombol defect yang diklik dan nonaktifkan SEMUA defect lain
    defectButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn === button) {
            btn.classList.add('active');
            btn.disabled = false; // Biarkan yang diklik tetap aktif
            btn.classList.remove('inactive');
        } else {
            btn.disabled = true; // Nonaktifkan defect lain
            btn.classList.add('inactive');
        }
    });

    // Aktifkan Rework Section
    toggleButtonGroup(reworkButtons, true);

    // NONAKTIFKAN semua tombol grade (termasuk A-Grade) untuk sementara
    // karena setelah defect dipilih, harus dilanjutkan ke rework
    gradeInputButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('inactive');
        btn.classList.remove('active');
    });
    // <<< MODIFIKASI UNTUK ALUR TERPANDU BERAKHIR DI SINI >>>
}

// Handler untuk klik tombol Rework Section
function handleReworkClick(button) {
    activeReworkPosition = button.dataset.position || button.id.replace('rework-', '').toUpperCase();
    console.log(`Rework position selected: ${activeReworkPosition}`);

    // Update counter rework
    updateQuantity(button.id.replace('rework-', '') + '-counter');

    // <<< MODIFIKASI UNTUK ALUR TERPANDU DIMULAI DI SINI >>>
    // Nonaktifkan semua tombol rework setelah SATU diklik
    reworkButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn === button) {
            btn.classList.add('active'); // Highlight yang diklik
        }
        btn.disabled = true; // Langsung nonaktifkan SEMUA tombol rework (termasuk yang baru diklik, secara fungsional)
        btn.classList.add('inactive');
    });

    // Pastikan tombol defect tetap nonaktif
    toggleButtonGroup(defectButtons, false); // Akan menonaktifkan semua defect, termasuk yang aktif sebelumnya

    // Aktifkan tombol Qty Section (R, B, C Grade)
    gradeInputButtons.forEach(btn => {
        if (!btn.classList.contains('a-grade')) { // Hanya R, B, C Grade
            btn.disabled = false;
            btn.classList.remove('inactive');
        } else {
            // A-Grade tetap nonaktif pada alur defect -> rework
            btn.disabled = true;
            btn.classList.add('inactive');
        }
        btn.classList.remove('active'); // Pastikan tidak ada highlight aktif
    });
    // <<< MODIFIKASI UNTUK ALUR TERPANDU BERAKHIR DI SINI >>>
}


// Handler untuk klik tombol Qty Section (A, R, B, C Grade)
function handleGradeClick(button) {
    const gradeCategoryClass = Array.from(button.classList).find(cls => cls.endsWith('-grade'));
    if (!gradeCategoryClass) {
        console.warn("Tombol grade diklik tanpa class kategori grade:", button);
        return;
    }

    currentSelectedGrade = gradeCategoryClass; // Simpan grade yang baru diklik
    console.log(`Grade selected: ${currentSelectedGrade}`);

    // Hapus highlight dari semua tombol grade, lalu tambahkan ke yang diklik
    gradeInputButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Update counter grade
    qtyInspectOutputs[gradeCategoryClass]++;
    if (outputElements[gradeCategoryClass]) {
        outputElements[gradeCategoryClass].textContent = qtyInspectOutputs[gradeCategoryClass];
    }
    updateTotalQtyInspect(); // Perbarui total Qty Inspect, FTT, Redo Rate

    // Jika grade adalah R, B, atau C, tambahkan defect ke summary
    // Panggilan addDefectToSummary akan menggunakan activeDefectType, activeReworkPosition, currentSelectedGrade
    if (gradeCategoryClass !== 'a-grade') {
        addDefectToSummary();
    }

    // Setelah satu siklus (defect -> rework -> grade) selesai atau A-Grade diklik:
    // Kembalikan semua tombol ke kondisi awal siklus baru
    // <<< MODIFIKASI UNTUK ALUR TERPANDU DIMULAI DI SINI >>>
    setTimeout(() => { // Memberi sedikit delay untuk efek visual active-feedback
        initButtonStates(); // Mereset semua tombol ke kondisi awal
        // Jika A-Grade yang diklik, pastikan A-Grade tetap ter-highlight SETELAH reset
        if (gradeCategoryClass === 'a-grade') {
             const aGradeButton = Array.from(gradeInputButtons).find(btn => btn.classList.contains('a-grade'));
             if (aGradeButton) {
                 aGradeButton.classList.add('active');
             }
        }
    }, 100); // Sesuaikan delay jika perlu
    // <<< MODIFIKASI UNTUK ALUR TERPANDU BERAKHIR DI SINI >>>
}

// ===========================================
// 10. Validasi Input dan Simpan Data (Modifikasi)
// ===========================================
async function saveData() {
    console.log("Memulai proses simpan data...");

    // Validasi input form dasar
    if (!validateInputs() || !validateQtySampleSet()) {
        console.log("Validasi dasar gagal. Penyimpanan dibatalkan.");
        return;
    }

    // Validasi defect: jika ada R, B, C grade, harus ada defect yang tercatat
    if (!validateDefects()) {
        console.log("Validasi defect gagal. Penyimpanan dibatalkan.");
        return;
    }

    // Hitung total defect dari defectCounts untuk validasi
    let totalDefectCount = 0;
    for (const defectType in defectCounts) {
        for (const position in defectCounts[defectType]) {
            for (const grade in defectCounts[defectType][position]) {
                totalDefectCount += defectCounts[defectType][position][grade];
            }
        }
    }

    // Hitung total rework dari variabel global (Rework Kiri/Kanan dihitung per 2, Pairs per 1)
    const calculatedTotalRework = ((totalReworkLeft + totalReworkRight) / 2) + totalReworkPairs;

    // Validasi tambahan: total defect tidak boleh lebih rendah dari total rework
    if (totalDefectCount < calculatedTotalRework) {
        alert("Total defect yang tercatat (" + totalDefectCount + ") tidak boleh lebih rendah dari total rework terhitung (" + calculatedTotalRework + "). Harap pastikan setiap rework memiliki setidaknya satu defect yang dicatat.");
        console.log("Validasi gagal: Total defect < total rework.");
        return;
    }

    const fttValueText = fttOutput ? fttOutput.innerText.replace("%", "").trim() : "0";
    const finalFtt = parseFloat(fttValueText) / 100;

    const redoRateValueText = redoRateOutput ? redoRateOutput.innerText.replace("%", "").trim() : "0";
    const finalRedoRate = parseFloat(redoRateValueText) / 100;

    const defectsToSend = [];
    for (const defectType in defectCounts) {
        for (const position in defectCounts[defectType]) {
            for (const grade in defectCounts[defectType][position]) {
                const count = defectCounts[defectType][position][grade];
                if (count > 0) {
                    defectsToSend.push({
                        type: defectType,
                        position: position,
                        level: grade,
                        count: count
                    });
                }
            }
        }
    }

    const dataToSend = {
        timestamp: new Date().toISOString(),
        auditor: document.getElementById("auditor").value,
        ncvs: document.getElementById("ncvs").value,
        modelName: document.getElementById("model-name").value,
        styleNumber: document.getElementById("style-number").value,
        qtyInspect: totalInspected,
        qtySampleSet: qtySampleSetInput ? (parseInt(qtySampleSetInput.value, 10) || 0) : 0,
        ftt: finalFtt,
        redoRate: finalRedoRate,
        "a-grade": qtyInspectOutputs['a-grade'],
        "r-grade": qtyInspectOutputs['r-grade'],
        "b-grade": qtyInspectOutputs['b-grade'],
        "c-grade": qtyInspectOutputs['c-grade'],
        reworkKiri: totalReworkLeft,
        reworkKanan: totalReworkRight,
        reworkPairs: totalReworkPairs,
        defects: defectsToSend,
    };

    console.log("Data yang akan dikirim:", JSON.stringify(dataToSend, null, 2));

    const saveButton = document.querySelector(".save-button");
    saveButton.disabled = true;
    saveButton.textContent = "MENYIMPAN...";
dataToSend.appType = "stockfit";
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbz6MSvAqN2vhsasQ-fK_2hxgOkeue3zlc5TsfyLISX8VydruDi5CdTsDgmyPXozv3SB/exec", { // Perhatikan URL ini, saya ganti satu karakter saja agar unik untuk pengujian
            method: "POST",
            body: JSON.stringify(dataToSend),
        });
        const resultText = await response.text();
        console.log("Respons server:", resultText);
        alert(resultText);

        if (response.ok && resultText.toLowerCase().includes("berhasil")) {
            // >>> TAMBAHAN: Tandai NCVS yang baru saja digunakan <<<
            markNcvsAsUsed(auditorSelect.value, ncvsSelect.value);
            // Perbarui tampilan dropdown NCVS setelah menandai
            updateNcvsOptions(auditorSelect.value);
            // >>> AKHIR TAMBAHAN <<<

            resetAllFields();
        } else {
            console.warn("Server merespons OK, tapi pesan tidak mengandung 'berhasil' atau status tidak OK. Hasil:", resultText);
        }

    } catch (error) {
        console.error("Error saat mengirim data:", error);
        alert("Terjadi kesalahan saat menyimpan data. Cek koneksi internet atau hubungi Team QM System.");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "SIMPAN";
    }
}

// ===========================================
// 11. Validasi Input Form (Modifikasi)
// ===========================================
function validateInputs() {
    const auditor = auditorSelect.value.trim(); // Ambil nilai dari select
    const ncvs = ncvsSelect.value.trim();        // Ambil nilai dari select
    const modelName = document.getElementById("model-name").value.trim();
    const styleNumberInput = document.getElementById("style-number");
    const styleNumber = styleNumberInput.value.trim();

    // Pastikan auditor dan ncvs sudah dipilih
    if (!auditor || auditor === "") {
        alert("Harap isi semua form dasar (Auditor, NCVS, Model, Style Number) sebelum menyimpan data!");
        return false;
    }
    if (!ncvs || ncvs === "") {
        alert("Harap isi semua form dasar (Auditor, NCVS, Model, Style Number) sebelum menyimpan data!");
        return false;
    }

    if (!modelName || !styleNumber) {
        alert("Harap isi semua form dasar (Auditor, NCVS, Model, Style Number) sebelum menyimpan data!");
        return false;
    }

    const styleNumberPattern = /^[a-zA-Z0-9]{6}-[a-zA-Z0-9]{3}$/;
    if (!styleNumberPattern.test(styleNumber)) {
        alert("Format Style Number tidak sesuai. Contoh: AH1567-100 atau 767688-001");
        styleNumberInput.classList.add('invalid-input');
        return false;
    } else {
        styleNumberInput.classList.remove('invalid-input');
    }
    return true;
}
// ===========================================
// 12. Validasi Defect sebelum Simpan
// ===========================================
function validateDefects() {
    let hasDefectRecorded = false;
    for (const defectType in defectCounts) {
        for (const position in defectCounts[defectType]) {
            for (const grade in defectCounts[defectType][position]) {
                if (defectCounts[defectType][position][grade] > 0) {
                    hasDefectRecorded = true;
                    break;
                }
            }
            if (hasDefectRecorded) break;
        }
        if (hasDefectRecorded) break;
    }

    const hasRBCGradeInput = qtyInspectOutputs['r-grade'] > 0 || qtyInspectOutputs['b-grade'] > 0 || qtyInspectOutputs['c-grade'] > 0;

    if (hasRBCGradeInput && !hasDefectRecorded) {
        alert("Jika ada item Rework, B-Grade, atau C-Grade, harap pastikan setidaknya ada satu defect yang tercatat sebelum menyimpan data!");
        return false;
    }
    return true;
}

// ===========================================
// 13. Validasi Qty Sample Set
// ===========================================
function validateQtySampleSet() {
    if (!qtySampleSetInput) { // Ini tetap penting jika elemen tidak ada
        console.error("Elemen qty-sample-set tidak ditemukan!");
        return false; // Mengembalikan false karena input esensial tidak ada
    }

    const qtySampleSetValue = parseInt(qtySampleSetInput.value, 10); // Hapus '|| 0'

    // KASUS BARU: Validasi jika Qty Sample Set kosong atau 0 (dan bukan angka valid)
    if (isNaN(qtySampleSetValue) || qtySampleSetValue <= 0) {
        alert("Harap masukkan Jumlah Qty Sample Set yang valid dan lebih dari 0.");
        return false;
    }

    const currentTotalInspect = totalInspected;

    // KASUS YANG SAMA DENGAN SEBELUMNYA: Qty Sample Set tidak cocok dengan Qty Inspect
    if (currentTotalInspect !== qtySampleSetValue) {
        alert(`Jumlah total Qty Inspect (${currentTotalInspect}) harus sama dengan Qty Sample Set (${qtySampleSetValue}).`);
        return false;
    }

    // Jika semua validasi berhasil
    return true;
}
// ===========================================
// 14. Reset Semua Field Setelah Simpan (Modifikasi)
// ===========================================
function resetAllFields() {
    console.log("Memulai proses reset semua field dan data internal...");
    // Reset input form fields
    auditorSelect.value = ""; // Reset pilihan auditor
    updateNcvsOptions(""); // Kosongkan dan nonaktifkan dropdown NCVS

    document.getElementById("model-name").value = "";
    const styleNumberInput = document.getElementById("style-number");
    if (styleNumberInput) {
        styleNumberInput.value = "";
        styleNumberInput.classList.remove('invalid-input');
    }

    // Reset tampilan output numerik visual di DOM
    if (qtyInspectOutput) qtyInspectOutput.textContent = "0";
    if (leftCounter) leftCounter.textContent = "0";
    if (rightCounter) rightCounter.textContent = "0";
    if (pairsCounter) pairsCounter.textContent = "0";

    if (fttOutput) {
        fttOutput.textContent = "0%";
        fttOutput.className = 'counter';
    }
    if (redoRateOutput) redoRateOutput.textContent = "0.00%";

    // Reset tampilan visual untuk output grade (A, R, B, C)
    for (const gradeKey in outputElements) {
        if (outputElements[gradeKey]) {
            outputElements[gradeKey].textContent = "0";
        }
    }

    // RESET DATA INTERNAL UTAMA
    for (const categoryKey in qtyInspectOutputs) {
        qtyInspectOutputs[categoryKey] = 0;
    }
    defectCounts = {};
    totalInspected = 0;
    totalReworkLeft = 0;
    totalReworkRight = 0;
    totalReworkPairs = 0;
    activeDefectType = null;
    activeReworkPosition = null;
    currentSelectedGrade = null;

    if (summaryContainer) {
        summaryContainer.innerHTML = "";
    }

    // Atur ulang status tombol ke kondisi awal (Defect Menu aktif, Rework & Qty nonaktif)
    initButtonStates();

    // Pastikan qtySampleSetInput kembali ke nilai dari localStorage atau kosong jika belum ada.
    // Jika tidak ada di localStorage, ini akan menjadi string kosong, yang akan divalidasi nanti.
    if (qtySampleSetInput) {
        let storedQty = localStorage.getItem('qtySampleSet');
        qtySampleSetInput.value = (storedQty && !isNaN(parseInt(storedQty, 10)) && parseInt(storedQty, 10) > 0) ? parseInt(storedQty, 10) : '';
    }

    updateTotalQtyInspect(); // Pastikan semua kalkulasi dan tampilan di-refresh

    console.log("Semua field dan data internal telah berhasil direset.");
}


// ===========================================
// 15. Inisialisasi Aplikasi dan Event Listeners (Modifikasi)
// ===========================================
function initApp() {
    console.log("Menginisialisasi aplikasi dengan alur yang diperbarui...");

    // Inisialisasi referensi DOM
    outputElements = {
        'a-grade': document.getElementById('a-grade-counter'),
        'r-grade': document.getElementById('r-grade-counter'),
        'b-grade': document.getElementById('b-grade-counter'),
        'c-grade': document.getElementById('c-grade-counter')
    };
    fttOutput = document.getElementById('fttOutput');
    qtyInspectOutput = document.getElementById('qtyInspectOutput');
    leftCounter = document.getElementById('left-counter');
    rightCounter = document.getElementById('right-counter');
    pairsCounter = document.getElementById('pairs-counter');
    summaryContainer = document.getElementById('summary-list');
    redoRateOutput = document.getElementById('redoRateOutput');
    qtySampleSetInput = document.getElementById('qty-sample-set');

    defectButtons = document.querySelectorAll('.defect-button');
    reworkButtons = document.querySelectorAll('.rework-button');
    gradeInputButtons = document.querySelectorAll('.input-button');

    // >>> TAMBAHAN UNTUK CONDITIONAL NCVS <<<
    auditorSelect = document.getElementById('auditor');
    ncvsSelect = document.getElementById('ncvs');

    // Event listener untuk dropdown Auditor
    if (auditorSelect) {
        auditorSelect.addEventListener('change', (event) => {
            const selectedAuditor = event.target.value;
            updateNcvsOptions(selectedAuditor);
        });
    }
    // >>> AKHIR TAMBAHAN UNTUK CONDITIONAL NCVS <<<

    // Cek apakah elemen output ditemukan (debugging tambahan)
    for (const category in outputElements) {
        if (!outputElements[category]) {
            console.error(`INIT ERROR: Elemen output dengan ID '${category.replace('-grade', '-counter')}' tidak ditemukan di HTML!`);
        }
    }

    // Setup Event Listeners untuk tombol (defect, rework, grade)
    defectButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleDefectClick(button);
            button.classList.add('active-feedback');
            setTimeout(() => button.classList.remove('active-feedback'), 200);
        });
    });

    reworkButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleReworkClick(button);
            button.classList.add('active-feedback');
            setTimeout(() => button.classList.remove('active-feedback'), 200);
        });
    });

    gradeInputButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleGradeClick(button);
            button.classList.add('active-feedback');
            setTimeout(() => button.classList.remove('active-feedback'), 200);
        });
    });

    // Setup Tombol Simpan
    const saveButton = document.querySelector(".save-button");
    if (saveButton) {
        saveButton.addEventListener("click", saveData);
    }

    // Inisialisasi Qty Sample Set (Sesuai modifikasi terakhir Anda)
    if (qtySampleSetInput) {
        let storedQty = localStorage.getItem('qtySampleSet');
        let qtySampleSetValue;

        if (storedQty && !isNaN(parseInt(storedQty, 10)) && parseInt(storedQty, 10) > 0) {
            qtySampleSetValue = parseInt(storedQty, 10);
        } else {
            qtySampleSetValue = '';
        }

        qtySampleSetInput.value = qtySampleSetValue;

        qtySampleSetInput.addEventListener('change', () => {
            let newQty = parseInt(qtySampleSetInput.value, 10);
            if (!isNaN(newQty) && newQty > 0) {
                localStorage.setItem('qtySampleSet', newQty);
            } else {
                localStorage.removeItem('qtySampleSet');
            }
            updateTotalQtyInspect();
        });
    }

    // Hilangkan elemen tombol plus minus dari DOM (jika masih ada)
    const plusButtonElement = document.getElementById('plus-button');
    const minusButtonElement = document.getElementById('minus-button');
    if (plusButtonElement && plusButtonElement.parentNode) {
        plusButtonElement.parentNode.removeChild(plusButtonElement);
    }
    if (minusButtonElement && minusButtonElement.parentNode) {
        minusButtonElement.parentNode.removeChild(minusButtonElement);
    }

    // Atur status tombol awal saat aplikasi dimuat
    initButtonStates();
    updateTotalQtyInspect(); // Hitung dan tampilkan nilai awal

    // >>> TAMBAHAN UNTUK CONDITIONAL NCVS & Coloring <<<
    // Panggil ini di awal untuk memastikan dropdown NCVS diatur dengan benar (disabled)
    // dan juga menerapkan warna berdasarkan data localStorage saat aplikasi dimuat.
    updateNcvsOptions(auditorSelect.value);
    // >>> AKHIR TAMBAHAN UNTUK CONDITIONAL NCVS & Coloring <<<

    console.log("Aplikasi berhasil diinisialisasi sepenuhnya.");
}

// === Event listener utama untuk menjalankan inisialisasi setelah DOM siap ===
document.addEventListener('DOMContentLoaded', initApp);

// >>> FUNGSI BARU UNTUK CONDITIONAL NCVS & Coloring <<<

// Fungsi pembantu untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Fungsi untuk mendapatkan data NCVS yang sudah digunakan dari localStorage
function getUsedNcvsData() {
    const storedData = localStorage.getItem(USED_NCVS_STORAGE_KEY);
    let usedNcvsPerDay = {};

    if (storedData) {
        try {
            usedNcvsPerDay = JSON.parse(storedData);
        } catch (e) {
            console.error("Error parsing used NCVS data from localStorage:", e);
            // Jika parsing gagal, reset data untuk menghindari masalah
            usedNcvsPerDay = {};
        }
    }

    const todayDate = getTodayDateString();

    // Reset data jika tanggal di localStorage bukan hari ini
    if (!usedNcvsPerDay[todayDate]) {
        usedNcvsPerDay = {
            [todayDate]: {}
        }; // Buat objek baru untuk hari ini
        localStorage.setItem(USED_NCVS_STORAGE_KEY, JSON.stringify(usedNcvsPerDay));
    }

    return usedNcvsPerDay[todayDate]; // Kembalikan data untuk hari ini
}

// Fungsi untuk menandai NCVS sebagai sudah digunakan
function markNcvsAsUsed(auditor, ncvs) {
    if (!auditor || !ncvs) return;

    const todayDate = getTodayDateString();
    let usedNcvsForToday = getUsedNcvsData(); // Ini sudah memastikan data untuk hari ini ada

    if (!usedNcvsForToday[auditor]) {
        usedNcvsForToday[auditor] = [];
    }

    // Pastikan NCVS belum ada di daftar sebelum menambahkannya
    if (!usedNcvsForToday[auditor].includes(ncvs)) {
        usedNcvsForToday[auditor].push(ncvs);
    }

    // Simpan kembali data yang diperbarui ke localStorage
    const allUsedNcvsData = JSON.parse(localStorage.getItem(USED_NCVS_STORAGE_KEY) || '{}');
    allUsedNcvsData[todayDate] = usedNcvsForToday;
    localStorage.setItem(USED_NCVS_STORAGE_KEY, JSON.stringify(allUsedNcvsData));
}


function updateNcvsOptions(selectedAuditor) {
    // Kosongkan opsi NCVS yang ada
    ncvsSelect.innerHTML = '';

    // Tambahkan opsi default "Pilih NCVS"
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Pilih NCVS";
    ncvsSelect.appendChild(defaultOption);

    // Dapatkan data NCVS yang sudah digunakan untuk auditor hari ini
    const usedNcvsForToday = getUsedNcvsData();
    const usedNcvsBySelectedAuditor = usedNcvsForToday[selectedAuditor] || [];

    // Jika ada auditor yang dipilih, isi opsi NCVS yang relevan
    if (selectedAuditor && auditorNcvsMap[selectedAuditor]) {
        const ncvsList = auditorNcvsMap[selectedAuditor];
        ncvsList.forEach(ncvs => {
            const option = document.createElement('option');
            option.value = ncvs;
            option.textContent = ncvs;

            // >>> TAMBAHAN: Terapkan warna merah jika NCVS sudah digunakan <<<
            if (usedNcvsBySelectedAuditor.includes(ncvs)) {
                option.classList.add('used-ncvs'); // Tambahkan kelas CSS
                // Atau bisa juga style inline: option.style.color = 'red';
            }
            // >>> AKHIR TAMBAHAN <<<

            ncvsSelect.appendChild(option);
        });
        ncvsSelect.disabled = false; // Aktifkan dropdown NCVS
    } else {
        ncvsSelect.disabled = true; // Nonaktifkan dropdown NCVS jika tidak ada auditor yang dipilih
        defaultOption.textContent = "Pilih NCVS (pilih Auditor dahulu)"; // Kembali ke teks awal
    }
    ncvsSelect.value = ""; // Reset pilihan NCVS setelah perubahan auditor
}
// >>> AKHIR FUNGSI BARU UNTUK CONDITIONAL NCVS & Coloring <<<

// ===========================================
// 16. (Bagian 18 dari Part 2) - Announcement Logic
// ===========================================
// (Kode Announcement Anda yang sudah ada, tetap di sini atau pisahkan jika memang terpisah di file lain)
document.addEventListener('DOMContentLoaded', () => {
    const announcements = [
        { date: "05-22-2025", text: "E-QMS kini hadir dalam versi web sebagai upgrade dari sistem berbasis Google Spreadsheet, menawarkan kemudahan input bagi auditor, akurasi data yang lebih baik, serta mengurangi risiko human error maupun kendala teknis pada sistem lama. Implementasi E-QMS Web App merupakan bagian dari komitmen kami dalam digitalisasi proses mutu, sejalan dengan visi untuk menciptakan operasional yang agile, data-driven, dan berkelanjutan." },
    ];
    let currentAnnouncementIndex = 0;
    let viewedAnnouncements = JSON.parse(localStorage.getItem('viewedAnnouncements')) || [];
    const announcementPopup = document.getElementById('announcement-popup');
    const announcementDateElement = document.getElementById('date-text');
    const announcementTextElement = document.getElementById('announcement-text');
    const announcementButton = document.getElementById('announcement-button');
    const closeButton = document.querySelector('#announcement-popup .close-button');
    const prevButton = document.getElementById('prev-announcement');
    const nextButton = document.getElementById('next-announcement');

    function showAnnouncement(index) {
        if (!announcementPopup || !announcementDateElement || !announcementTextElement || announcements.length === 0) return;

        currentAnnouncementIndex = index;
        announcementDateElement.textContent = announcements[index].date;
        announcementTextElement.textContent = announcements[index].text;
        announcementPopup.style.display = 'block';

        const announcementIdentifier = `${announcements[index].date}-${announcements[index].text.substring(0, 20)}`;
        if (!viewedAnnouncements.includes(announcementIdentifier)) {
            viewedAnnouncements.push(announcementIdentifier);
            localStorage.setItem('viewedAnnouncements', JSON.stringify(viewedAnnouncements));
        }
    }

    function closeAnnouncement() {
        if (announcementPopup) announcementPopup.style.display = 'none';
    }

    function nextAnnouncement() {
        if (announcements.length === 0) return;
        const nextIndex = (currentAnnouncementIndex + 1) % announcements.length;
        showAnnouncement(nextIndex);
    }

    function prevAnnouncement() {
        if (announcements.length === 0) return;
        const prevIndex = (currentAnnouncementIndex - 1 + announcements.length) % announcements.length;
        showAnnouncement(prevIndex);
    }

    if (announcementButton) {
        announcementButton.addEventListener('click', () => {
            if (announcements.length > 0) showAnnouncement(currentAnnouncementIndex);
        });
    }
    if (closeButton) closeButton.addEventListener('click', closeAnnouncement);
    if (prevButton) prevButton.addEventListener('click', prevAnnouncement);
    if (nextButton) nextButton.addEventListener('click', nextAnnouncement);

    if (announcements.length > 0) {
        let firstUnreadIndex = -1;
        for (let i = 0; i < announcements.length; i++) {
            const announcementIdentifier = `${announcements[i].date}-${announcements[i].text.substring(0, 20)}`;
            if (!viewedAnnouncements.includes(announcementIdentifier)) {
                firstUnreadIndex = i;
                break;
            }
        }
        if (firstUnreadIndex !== -1) {
            showAnnouncement(firstUnreadIndex);
        } else {
            currentAnnouncementIndex = announcements.length - 1;
        }
    }
});
