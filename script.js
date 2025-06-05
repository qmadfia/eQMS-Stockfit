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

// >>> TAMBAHAN UNTUK COMPREHENSIVE LOCALSTORAGE <<<
const STORAGE_KEYS = {
    FORM_DATA: 'qms_form_data',
    DEFECT_COUNTS: 'qms_defect_counts',
    QTY_OUTPUTS: 'qms_qty_outputs',
    REWORK_COUNTERS: 'qms_rework_counters',
    STATE_VARIABLES: 'qms_state_variables',
    QTY_SAMPLE_SET: 'qtySampleSet' // Tetap menggunakan key yang sudah ada
};
// >>> AKHIR TAMBAHAN UNTUK CONDITIONAL NCVS <<<

const MAX_INSPECTION_LIMIT = 50; // Konstanta untuk batas maksimum inspeksi

// ===========================================
// 2. Fungsi localStorage Komprehensif (BARU)
// ===========================================

// Fungsi untuk menyimpan semua data ke localStorage
function saveToLocalStorage() {
    try {
        // 1. Form Data
        const formData = {
            auditor: auditorSelect ? auditorSelect.value : '',
            ncvs: ncvsSelect ? ncvsSelect.value : '',
            modelName: document.getElementById("model-name") ? document.getElementById("model-name").value : '',
            styleNumber: document.getElementById("style-number") ? document.getElementById("style-number").value : ''
        };
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));

        // 2. Defect Counts
        localStorage.setItem(STORAGE_KEYS.DEFECT_COUNTS, JSON.stringify(defectCounts));

        // 3. Qty Outputs
        localStorage.setItem(STORAGE_KEYS.QTY_OUTPUTS, JSON.stringify(qtyInspectOutputs));

        // 4. Rework Counters
        const reworkCounters = {
            left: totalReworkLeft,
            right: totalReworkRight,
            pairs: totalReworkPairs
        };
        localStorage.setItem(STORAGE_KEYS.REWORK_COUNTERS, JSON.stringify(reworkCounters));

        // 5. State Variables
        const stateVariables = {
            activeDefectType: activeDefectType,
            activeReworkPosition: activeReworkPosition,
            currentSelectedGrade: currentSelectedGrade,
            totalInspected: totalInspected
        };
        localStorage.setItem(STORAGE_KEYS.STATE_VARIABLES, JSON.stringify(stateVariables));

        console.log("Data berhasil disimpan ke localStorage");
    } catch (error) {
        console.error("Error saat menyimpan data ke localStorage:", error);
    }
}

// Fungsi untuk memuat semua data dari localStorage
function loadFromLocalStorage() {
    try {
        // 1. Load Form Data
        const savedFormData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
        if (savedFormData) {
            const formData = JSON.parse(savedFormData);
            if (auditorSelect) auditorSelect.value = formData.auditor || '';
            if (ncvsSelect) {
                // Update NCVS options berdasarkan auditor yang dimuat
                updateNcvsOptions(formData.auditor || '');
                ncvsSelect.value = formData.ncvs || '';
            }
            if (document.getElementById("model-name")) document.getElementById("model-name").value = formData.modelName || '';
            if (document.getElementById("style-number")) document.getElementById("style-number").value = formData.styleNumber || '';
        }

        // 2. Load Defect Counts
        const savedDefectCounts = localStorage.getItem(STORAGE_KEYS.DEFECT_COUNTS);
        if (savedDefectCounts) {
            defectCounts = JSON.parse(savedDefectCounts);
            updateDefectSummaryDisplay(); // Update tampilan summary
        }

        // 3. Load Qty Outputs
        const savedQtyOutputs = localStorage.getItem(STORAGE_KEYS.QTY_OUTPUTS);
        if (savedQtyOutputs) {
            const qtyData = JSON.parse(savedQtyOutputs);
            for (const grade in qtyData) {
                qtyInspectOutputs[grade] = qtyData[grade];
                if (outputElements[grade]) {
                    outputElements[grade].textContent = qtyData[grade];
                }
            }
        }

        // 4. Load Rework Counters
        const savedReworkCounters = localStorage.getItem(STORAGE_KEYS.REWORK_COUNTERS);
        if (savedReworkCounters) {
            const reworkData = JSON.parse(savedReworkCounters);
            totalReworkLeft = reworkData.left || 0;
            totalReworkRight = reworkData.right || 0;
            totalReworkPairs = reworkData.pairs || 0;
            
            if (leftCounter) leftCounter.textContent = totalReworkLeft;
            if (rightCounter) rightCounter.textContent = totalReworkRight;
            if (pairsCounter) pairsCounter.textContent = totalReworkPairs;
        }

        // 5. Load State Variables
        const savedStateVariables = localStorage.getItem(STORAGE_KEYS.STATE_VARIABLES);
        if (savedStateVariables) {
            const stateData = JSON.parse(savedStateVariables);
            activeDefectType = stateData.activeDefectType || null;
            activeReworkPosition = stateData.activeReworkPosition || null;
            currentSelectedGrade = stateData.currentSelectedGrade || null;
            totalInspected = stateData.totalInspected || 0;
        }

        // 6. Load Qty Sample Set (menggunakan key yang sudah ada)
        const savedQtySampleSet = localStorage.getItem(STORAGE_KEYS.QTY_SAMPLE_SET);
        if (qtySampleSetInput && savedQtySampleSet) {
            const qtySampleSetValue = parseInt(savedQtySampleSet, 10);
            if (!isNaN(qtySampleSetValue) && qtySampleSetValue > 0) {
                qtySampleSetInput.value = qtySampleSetValue;
            }
        }

        // Update tampilan yang bergantung pada data yang dimuat
        updateTotalQtyInspect();
        updateButtonStatesFromLoadedData();

        console.log("Data berhasil dimuat dari localStorage");
    } catch (error) {
        console.error("Error saat memuat data dari localStorage:", error);
    }
}

// Fungsi untuk mengatur status tombol berdasarkan data yang dimuat
function updateButtonStatesFromLoadedData() {
    // Reset semua tombol ke kondisi awal
    initButtonStates();

    // Jika ada activeDefectType, highlight tombol defect yang aktif
    if (activeDefectType) {
        defectButtons.forEach(btn => {
            const defectName = btn.dataset.defect || btn.textContent.trim();
            if (defectName === activeDefectType) {
                btn.classList.add('active');
                // Aktifkan rework section jika defect sudah dipilih
                toggleButtonGroup(reworkButtons, true);
                // Nonaktifkan defect lain
                toggleButtonGroup(defectButtons, false);
                btn.disabled = false;
                btn.classList.remove('inactive');
            }
        });
    }

    // Jika ada activeReworkPosition, highlight tombol rework yang aktif
    if (activeReworkPosition) {
        reworkButtons.forEach(btn => {
            const position = btn.dataset.position || btn.id.replace('rework-', '').toUpperCase();
            if (position === activeReworkPosition) {
                btn.classList.add('active');
                // Aktifkan grade buttons (kecuali A-Grade dalam alur defect->rework)
                gradeInputButtons.forEach(gradeBtn => {
                    if (!gradeBtn.classList.contains('a-grade')) {
                        gradeBtn.disabled = false;
                        gradeBtn.classList.remove('inactive');
                    }
                });
            }
        });
        // Nonaktifkan semua tombol rework setelah ada yang aktif (sesuai alur)
        toggleButtonGroup(reworkButtons, false);
    }

    // Jika ada currentSelectedGrade, highlight tombol grade yang aktif
    if (currentSelectedGrade) {
        gradeInputButtons.forEach(btn => {
            if (btn.classList.contains(currentSelectedGrade)) {
                btn.classList.add('active');
            }
        });
    }
}

// Fungsi untuk membersihkan localStorage (kecuali qty sample set)
function clearLocalStorageExceptQtySampleSet() {
    try {
        localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
        localStorage.removeItem(STORAGE_KEYS.DEFECT_COUNTS);
        localStorage.removeItem(STORAGE_KEYS.QTY_OUTPUTS);
        localStorage.removeItem(STORAGE_KEYS.REWORK_COUNTERS);
        localStorage.removeItem(STORAGE_KEYS.STATE_VARIABLES);
        // Qty Sample Set tetap disimpan untuk digunakan di sesi berikutnya
        
        console.log("localStorage dibersihkan (kecuali qty sample set)");
    } catch (error) {
        console.error("Error saat membersihkan localStorage:", error);
    }
}

// ===========================================
// 3. Fungsi Pembantu: Mengatur Status Tombol (Modifikasi)
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
// 4. Fungsi Utama: Inisialisasi Status Tombol (Kondisi Awal & Setelah Siklus) (Perbaikan)
// ===========================================
function initButtonStates() {
    console.log("Mengatur status tombol ke kondisi awal siklus...");

    // Hanya aktifkan tombol defect secara default.
    // Tombol rework dan grade akan aktif berdasarkan pilihan selanjutnya.
    toggleButtonGroup(defectButtons, true); // Aktifkan semua tombol defect
    toggleButtonGroup(reworkButtons, false); // Nonaktifkan tombol rework
    toggleButtonGroup(gradeInputButtons, false); // Nonaktifkan tombol grade (kecuali A-Grade nanti)

    // Hapus highlight dari semua tombol
    defectButtons.forEach(btn => btn.classList.remove('active'));
    reworkButtons.forEach(btn => btn.classList.remove('active'));
    gradeInputButtons.forEach(btn => btn.classList.remove('active'));

    // Aktifkan kembali hanya tombol A-Grade secara default untuk siklus baru
    const aGradeButton = Array.from(gradeInputButtons).find(btn => btn.classList.contains('a-grade'));
    if (aGradeButton) {
        aGradeButton.disabled = false;
        aGradeButton.classList.remove('inactive');
    }

    // Reset hanya variabel yang mengontrol pilihan aktif, BUKAN data counter
    activeDefectType = null;
    activeReworkPosition = null;
    currentSelectedGrade = null;
    
    // !!! PENTING: Jangan reset totalReworkLeft/Right/Pairs di sini.
    // Reset ini hanya terjadi di handleDefectClick atau resetAllFields.

    console.log("Status tombol diatur ke awal siklus.");

    // Terakhir, jika sudah mencapai batas, pastikan semua tombol dinonaktifkan setelah init.
    // Ini menangani kasus loadFromLocalStorage di mana totalInspected sudah >= 50.
    if (totalInspected >= MAX_INSPECTION_LIMIT) {
        toggleButtonGroup(defectButtons, false);
        toggleButtonGroup(reworkButtons, false);
        toggleButtonGroup(gradeInputButtons, false);
        console.log(`Batas inspeksi ${MAX_INSPECTION_LIMIT} telah tercapai saat inisialisasi. Tombol input dinonaktifkan.`);
    }
}
// ===========================================
// 5. Update Qty Counters (Left, Right, Pairs) (Modifikasi)
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
    saveToLocalStorage(); // Simpan ke localStorage setiap ada perubahan
}

// ===========================================
// 6. Update FTT dan Redo Rate (Modifikasi)
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
// 7. Update Total Qty Inspect (termasuk FTT dan Redo Rate) (Perbaikan)
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
    saveToLocalStorage(); // Simpan ke localStorage setiap ada perubahan

    // --- LOGIKA BATAS INSPEKSI 50 YANG DIPERBAIKI ---
    if (totalInspected >= MAX_INSPECTION_LIMIT) {
        // Menonaktifkan SEMUA tombol input yang relevan secara PERMANEN
        // (sampai aplikasi di-reset)
        toggleButtonGroup(defectButtons, false);
        toggleButtonGroup(reworkButtons, false);
        toggleButtonGroup(gradeInputButtons, false);
        console.log(`Batas inspeksi ${MAX_INSPECTION_LIMIT} telah tercapai. Input dinonaktifkan.`);
        // Pastikan tidak ada tombol yang ter-highlight saat ini
        defectButtons.forEach(btn => btn.classList.remove('active'));
        reworkButtons.forEach(btn => btn.classList.remove('active'));
        gradeInputButtons.forEach(btn => btn.classList.remove('active'));
    } else {
        // JANGAN panggil initButtonStates di sini, karena itu mereset state.
        // initButtonStates akan dipanggil pada tempat yang tepat (setelah siklus input selesai).
        // Biarkan alur handleDefectClick, handleReworkClick, handleGradeClick yang mengatur status tombol dinamis.
    }
    // --- AKHIR LOGIKA BATAS INSPEKSI 50 ---
}

// ===========================================
// 8. Menambahkan Defect ke Summary List (Modifikasi)
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
    saveToLocalStorage(); // Simpan ke localStorage setiap ada perubahan
}

// ===========================================
// 9. Menampilkan Summary Defect
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
// 10. Event Handlers untuk Tombol (Modifikasi)
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
    
    saveToLocalStorage(); // Simpan ke localStorage setiap ada perubahan
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
    
    saveToLocalStorage(); // Simpan ke localStorage setiap ada perubahan
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
        saveToLocalStorage(); // Simpan ke localStorage setelah reset
    }, 100); // Sesuaikan delay jika perlu
    // <<< MODIFIKASI UNTUK ALUR TERPANDU BERAKHIR DI SINI >>>
}


// ===========================================
// 11. Validasi Input dan Simpan Data (MELANJUTKAN dari yang terpotong)
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
        qtyInspect: totalInspected, // Gunakan kembali qtyInspect
        qtySampleSet: qtySampleSetInput ? (parseInt(qtySampleSetInput.value, 10) || 0) : 0, // Pastikan ada fallback jika qtySampleSetInput null
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
        const response = await fetch("https://script.google.com/macros/s/AKfycbz6MSvAqN2vhsasQ-fK_2hxgOkeue3zlc5TsfyLISX8VydruDi5CdTsDgmyPXozv3SB/exec", {
            method: "POST",
            body: JSON.stringify(dataToSend),
        });
        const resultText = await response.text();
        console.log("Respons server:", resultText);
        alert(resultText);

        if (response.ok && resultText.toLowerCase().includes("berhasil")) {
            // Tandai NCVS yang baru saja digunakan
            markNcvsAsUsed(auditorSelect.value, ncvsSelect.value);
            // Perbarui tampilan dropdown NCVS setelah menandai
            updateNcvsOptions(auditorSelect.value);

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
// 12. Validasi Input Form (dari dokumen kedua)
// ===========================================
function validateInputs() {
    const auditor = auditorSelect.value.trim();
    const ncvs = ncvsSelect.value.trim();
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
// 13. Validasi Defect sebelum Simpan
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
// 14. Validasi Qty Sample Set
// ===========================================
function validateQtySampleSet() {
    if (!qtySampleSetInput) {
        console.error("Elemen qty-sample-set tidak ditemukan!");
        return false;
    }

    const qtySampleSetValue = parseInt(qtySampleSetInput.value, 10);

    // Validasi jika Qty Sample Set kosong atau 0
    if (isNaN(qtySampleSetValue) || qtySampleSetValue <= 0) {
        alert("Harap masukkan Jumlah Qty Sample Set yang valid dan lebih dari 0.");
        return false;
    }

    const currentTotalInspect = totalInspected;

    // Qty Sample Set harus sama dengan Qty Inspect
    if (currentTotalInspect !== qtySampleSetValue) {
        alert(`Jumlah total Qty Inspect (${currentTotalInspect}) harus sama dengan Qty Sample Set (${qtySampleSetValue}).`);
        return false;
    }

    return true;
}

// ===========================================
// 15. Reset Semua Field Setelah Simpan
// ===========================================
function resetAllFields() {
    console.log("Memulai proses reset semua field dan data internal...");
    
    // Reset input form fields
    auditorSelect.value = "";
    updateNcvsOptions("");

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

    // Atur ulang status tombol ke kondisi awal
    initButtonStates();

    // Restore qtySampleSetInput dari localStorage
    if (qtySampleSetInput) {
        let storedQty = localStorage.getItem('qtySampleSet');
        qtySampleSetInput.value = (storedQty && !isNaN(parseInt(storedQty, 10)) && parseInt(storedQty, 10) > 0) ? parseInt(storedQty, 10) : '';
    }

    updateTotalQtyInspect();

    console.log("Semua field dan data internal telah berhasil direset.");
}

// ===========================================
// 16. Inisialisasi Aplikasi dan Event Listeners (Dilengkapi dengan loadFromLocalStorage)
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

    // Inisialisasi dropdown conditional NCVS
    auditorSelect = document.getElementById('auditor');
    ncvsSelect = document.getElementById('ncvs');

    // Event listener untuk dropdown Auditor
    if (auditorSelect) {
        auditorSelect.addEventListener('change', (event) => {
            const selectedAuditor = event.target.value;
            updateNcvsOptions(selectedAuditor);
            saveToLocalStorage(); // Auto-save saat ada perubahan
        });
    }

    // Event listener untuk dropdown NCVS
    if (ncvsSelect) {
        ncvsSelect.addEventListener('change', () => {
            saveToLocalStorage(); // Auto-save saat ada perubahan
        });
    }

    // Event listener untuk input form lainnya
    const modelNameInput = document.getElementById("model-name");
    const styleNumberInput = document.getElementById("style-number");
    
    if (modelNameInput) {
        modelNameInput.addEventListener('input', saveToLocalStorage);
    }
    
    if (styleNumberInput) {
        styleNumberInput.addEventListener('input', saveToLocalStorage);
    }

    // Cek apakah elemen output ditemukan
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

    // Inisialisasi Qty Sample Set
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
            saveToLocalStorage(); // Auto-save saat ada perubahan
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

    // >>> PENTING: LOAD DATA DARI LOCALSTORAGE SAAT APLIKASI DIMUAT <<<
    loadFromLocalStorage();

    // Atur status tombol awal saat aplikasi dimuat (setelah load data)
    if (!activeDefectType && !activeReworkPosition && !currentSelectedGrade) {
        initButtonStates();
    }
    
    updateTotalQtyInspect(); // Hitung dan tampilkan nilai awal

    // Setup conditional NCVS
    updateNcvsOptions(auditorSelect ? auditorSelect.value : '');

    console.log("Aplikasi berhasil diinisialisasi sepenuhnya dengan localStorage.");
}

// === Event listener utama untuk menjalankan inisialisasi setelah DOM siap ===
document.addEventListener('DOMContentLoaded', initApp);

// ===========================================
// 17. Fungsi NCVS Conditional & Coloring
// ===========================================

// Fungsi pembantu untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
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
            usedNcvsPerDay = {};
        }
    }

    const todayDate = getTodayDateString();

    // Reset data jika tanggal di localStorage bukan hari ini
    if (!usedNcvsPerDay[todayDate]) {
        usedNcvsPerDay = {
            [todayDate]: {}
        };
        localStorage.setItem(USED_NCVS_STORAGE_KEY, JSON.stringify(usedNcvsPerDay));
    }

    return usedNcvsPerDay[todayDate];
}

// Fungsi untuk menandai NCVS sebagai sudah digunakan
function markNcvsAsUsed(auditor, ncvs) {
    if (!auditor || !ncvs) return;

    const todayDate = getTodayDateString();
    let usedNcvsForToday = getUsedNcvsData();

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

            // Terapkan warna merah jika NCVS sudah digunakan
            if (usedNcvsBySelectedAuditor.includes(ncvs)) {
                option.classList.add('used-ncvs');
            }

            ncvsSelect.appendChild(option);
        });
        ncvsSelect.disabled = false;
    } else {
        ncvsSelect.disabled = true;
        defaultOption.textContent = "Pilih NCVS (pilih Auditor dahulu)";
    }
    ncvsSelect.value = "";
}

// ===========================================
// 18. Announcement Logic
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    const announcements = [
        { 
            date: "06-03-2025", 
            text: `E-QMS kini hadir dalam versi web sebagai upgrade dari sistem berbasis Google Spreadsheet, menawarkan kemudahan input bagi auditor, akurasi data yang lebih baik, serta mengurangi risiko human error maupun kendala teknis pada sistem lama. Implementasi E-QMS Web App merupakan bagian dari komitmen kami dalam digitalisasi proses mutu, sejalan dengan visi untuk menciptakan operasional yang agile, data-driven, dan berkelanjutan.

Apabila terdapat kendala teknis, silakan hubungi nomor berikut: 088972745194.`
        },
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
        // Menggunakan innerHTML dan mengganti '\n' dengan '<br>' untuk menampilkan baris baru
        announcementTextElement.innerHTML = announcements[index].text.replace(/\n/g, '<br>'); 
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
