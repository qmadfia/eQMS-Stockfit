// ===========================================
// 1. Deklarasi Variabel Global dan DOM References (Modifikasi)
// ===========================================
// --- IMPOR DATABASE DARI FILE TERPISAH ---
// Pastikan path './databasemodel.js' sudah benar sesuai lokasi file Anda.
import { styleModelDatabase } from './databasemodel.js';
let totalInspected = 0;
// Variabel lama ini masih berguna untuk tampilan UI, tapi tidak untuk kalkulasi final
let totalReworkLeft = 0;
let totalReworkRight = 0;
let totalReworkPairs = 0;
let defectCounts = {}; 

// --- VARIABEL BARU UNTUK POLA MULTIPLE DEFECT ---
let selectedDefects = []; 
let currentInspectionPairs = []; 

// --- VARIABEL BARU UNTUK LOGIKA REWORK AKURAT ---
// Menyimpan array dari posisi rework untuk setiap item R-Grade
// Contoh: [['PAIRS', 'LEFT'], ['LEFT'], ['RIGHT'], ['PAIRS']]
let reworkLog = [];

// --- MODIFIKASI DIMULAI ---
// Variabel baru untuk melacak posisi rework yang sudah dipakai dalam satu siklus inspeksi
let usedReworkPositionsThisCycle = [];
// --- MODIFIKASI SELESAI ---
// ---------------------------------------------

// ... (sisa variabel tetap sama) ...

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
let ncvsSelect;
let auditorSelect;
let modelNameInput;
let styleNumberInput;
// Data mapping Auditor ke NCVS
const auditorNcvsMap = {
    "Amalia Nur Aisyah": ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6", "Line 7", "Line 8", "Line 9", "Line 10"],
    "Siti Patimah": ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6", "Line 7", "Line 8", "Line 9", "Line 10"]
};

// Kunci localStorage
const USED_NCVS_STORAGE_KEY = 'usedNcvsPerDay';
const STORAGE_KEYS = {
    FORM_DATA: 'qms_form_data',
    DEFECT_COUNTS: 'qms_defect_counts',
    QTY_OUTPUTS: 'qms_qty_outputs',
    REWORK_COUNTERS: 'qms_rework_counters',
    STATE_VARIABLES: 'qms_state_variables',
    QTY_SAMPLE_SET: 'qtySampleSet'
};

const MAX_INSPECTION_LIMIT = 24;

// ===========================================
// 2. Fungsi localStorage Komprehensif (Modifikasi)
// ===========================================

function saveToLocalStorage() {
    try {
        const formData = {
            auditor: auditorSelect ? auditorSelect.value : '',
            ncvs: ncvsSelect ? ncvsSelect.value : '',
            modelName: document.getElementById("model-name") ? document.getElementById("model-name").value : '',
            styleNumber: document.getElementById("style-number") ? document.getElementById("style-number").value : ''
        };
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
        localStorage.setItem(STORAGE_KEYS.DEFECT_COUNTS, JSON.stringify(defectCounts));
        localStorage.setItem(STORAGE_KEYS.QTY_OUTPUTS, JSON.stringify(qtyInspectOutputs));

        const reworkCounters = {
            left: totalReworkLeft,
            right: totalReworkRight,
            pairs: totalReworkPairs
        };
        localStorage.setItem(STORAGE_KEYS.REWORK_COUNTERS, JSON.stringify(reworkCounters));

        // Menyimpan state baru untuk multiple defect
       const stateVariables = {
            selectedDefects: selectedDefects,
            currentInspectionPairs: currentInspectionPairs,
            totalInspected: totalInspected,
            reworkLog: reworkLog,
            // --- MODIFIKASI DIMULAI ---
            usedReworkPositionsThisCycle: usedReworkPositionsThisCycle // Simpan status rework yang digunakan
            // --- MODIFIKASI SELESAI ---
        };
        localStorage.setItem(STORAGE_KEYS.STATE_VARIABLES, JSON.stringify(stateVariables));

    } catch (error) {
        console.error("Error saat menyimpan data ke localStorage:", error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedFormData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
        if (savedFormData) {
            const formData = JSON.parse(savedFormData);
            if (auditorSelect) auditorSelect.value = formData.auditor || '';
            if (ncvsSelect) {
                updateNcvsOptions(formData.auditor || '');
                ncvsSelect.value = formData.ncvs || '';
            }
            if (document.getElementById("model-name")) document.getElementById("model-name").value = formData.modelName || '';
            if (document.getElementById("style-number")) document.getElementById("style-number").value = formData.styleNumber || '';
        }

        const savedDefectCounts = localStorage.getItem(STORAGE_KEYS.DEFECT_COUNTS);
        if (savedDefectCounts) {
            defectCounts = JSON.parse(savedDefectCounts);
        }

        const savedQtyOutputs = localStorage.getItem(STORAGE_KEYS.QTY_OUTPUTS);
        if (savedQtyOutputs) {
            const qtyData = JSON.parse(savedQtyOutputs);
            for (const grade in qtyData) {
                qtyInspectOutputs[grade] = qtyData[grade];
            }
        }

        const savedReworkCounters = localStorage.getItem(STORAGE_KEYS.REWORK_COUNTERS);
        if (savedReworkCounters) {
            const reworkData = JSON.parse(savedReworkCounters);
            totalReworkLeft = reworkData.left || 0;
            totalReworkRight = reworkData.right || 0;
            totalReworkPairs = reworkData.pairs || 0;
        }

       const savedStateVariables = localStorage.getItem(STORAGE_KEYS.STATE_VARIABLES);
        if (savedStateVariables) {
            const stateData = JSON.parse(savedStateVariables);
            selectedDefects = stateData.selectedDefects || [];
            currentInspectionPairs = stateData.currentInspectionPairs || [];
            totalInspected = stateData.totalInspected || 0;
            reworkLog = stateData.reworkLog || [];
            // --- MODIFIKASI DIMULAI ---
            usedReworkPositionsThisCycle = stateData.usedReworkPositionsThisCycle || []; // Muat status rework yang digunakan
            // --- MODIFIKASI SELESAI ---
        }
        
        // Memuat Qty Sample Set
        const savedQtySampleSet = localStorage.getItem(STORAGE_KEYS.QTY_SAMPLE_SET);
        if (qtySampleSetInput && savedQtySampleSet) {
             qtySampleSetInput.value = parseInt(savedQtySampleSet, 10) > 0 ? savedQtySampleSet : '';
        }
        
        // Update semua tampilan berdasarkan data yang dimuat
        updateAllDisplays();
        updateButtonStatesFromLoadedData();

    } catch (error) {
        console.error("Error saat memuat data dari localStorage:", error);
        resetAllFields(); // Jika ada error, reset semuanya untuk menghindari state korup
    }
}

function updateAllDisplays() {
    // Update counter grade
    for (const grade in qtyInspectOutputs) {
        if (outputElements[grade]) {
            outputElements[grade].textContent = qtyInspectOutputs[grade];
        }
    }
    // Update rework counters
    if (leftCounter) leftCounter.textContent = totalReworkLeft;
    if (rightCounter) rightCounter.textContent = totalReworkRight;
    if (pairsCounter) pairsCounter.textContent = totalReworkPairs;
    
    // Update summary dan statistik utama
    updateDefectSummaryDisplay();
    updateTotalQtyInspect();
}

function updateButtonStatesFromLoadedData() {
    // Reset semua highlight dan state
    defectButtons.forEach(btn => btn.classList.remove('active'));
    
    // Highlight defect yang sedang dipilih dari data yang di-load
    selectedDefects.forEach(defectName => {
        const button = Array.from(defectButtons).find(btn => (btn.dataset.defect || btn.textContent.trim()) === defectName);
        if (button) {
            button.classList.add('active');
        }
    });

    // Atur status Rework Section
    const enableRework = selectedDefects.length > 0;
    toggleButtonGroup(reworkButtons, enableRework);
    
    // --- MODIFIKASI DIMULAI ---
    // Panggil fungsi baru untuk menonaktifkan tombol rework yang sudah digunakan dari data yang dimuat
    updateReworkButtonStates();
    // --- MODIFIKASI SELESAI ---

    // Atur status Qty Section (R/B/C) sesuai aturan baru
    updateQtySectionState();
}

function clearLocalStorageExceptQtySampleSet() {
    try {
        localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
        localStorage.removeItem(STORAGE_KEYS.DEFECT_COUNTS);
        localStorage.removeItem(STORAGE_KEYS.QTY_OUTPUTS);
        localStorage.removeItem(STORAGE_KEYS.REWORK_COUNTERS);
        localStorage.removeItem(STORAGE_KEYS.STATE_VARIABLES);
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
        // --- MODIFIKASI DIMULAI ---
        // Hanya ubah status 'disabled' jika tidak dinonaktifkan secara paksa oleh logika lain
        if (!button.dataset.forceDisabled) {
             button.disabled = !enable;
             button.classList.toggle('inactive', !enable);
        }
        // --- MODIFIKASI SELESAI ---
        
        // Hapus highlight 'active' saat dinonaktifkan
        if (!enable) {
            button.classList.remove('active');
        }
    });
}

// --- MODIFIKASI DIMULAI ---
// ===========================================
// FUNGSI PEMBANTU BARU: Menonaktifkan Tombol Rework Individual
// ===========================================
/**
 * Memperbarui status tombol rework (Left, Pairs, Right) secara individual.
 * Tombol akan dinonaktifkan jika posisinya sudah tercatat di `usedReworkPositionsThisCycle`.
 */
function updateReworkButtonStates() {
    reworkButtons.forEach(button => {
        const position = button.id.replace('rework-', '').toUpperCase();
        
        // Cek apakah posisi ini sudah digunakan dalam siklus saat ini
        if (usedReworkPositionsThisCycle.includes(position)) {
            button.disabled = true;
            button.classList.add('inactive');
            // Tambahkan atribut data untuk menandai bahwa ini dinonaktifkan secara paksa
            button.dataset.forceDisabled = 'true'; 
        } else {
            // Hapus penanda paksa jika tidak lagi digunakan (misal saat reset)
             delete button.dataset.forceDisabled;
             // Status aktif/nonaktif selanjutnya akan diatur oleh toggleButtonGroup
             // Namun kita pastikan class inactive juga bersih jika tombol ini tidak di-disable lagi
             if (!button.disabled) {
                 button.classList.remove('inactive');
             }
        }
    });
}
// --- MODIFIKASI SELESAI ---


// ===========================================
// FUNGSI PEMBANTU BARU: Mengontrol Status Tombol A-Grade
// ===========================================
function updateAGradeButtonState() {
    // Cari tombol A-Grade secara spesifik
    const aGradeButton = Array.from(gradeInputButtons).find(btn => btn.classList.contains('a-grade'));
    if (!aGradeButton) return; // Keluar jika tombol tidak ditemukan

    // Tombol A-Grade harus nonaktif jika ada defect yang sedang dipilih
    // ATAU jika sudah ada pasangan {defect, posisi} yang tercatat untuk item ini.
    const shouldBeDisabled = selectedDefects.length > 0 || currentInspectionPairs.length > 0;

    aGradeButton.disabled = shouldBeDisabled;
    aGradeButton.classList.toggle('inactive', shouldBeDisabled);
}

// ===========================================
// 4. Fungsi Utama: Inisialisasi Status Tombol (Modifikasi)
// ===========================================
function initButtonStates() {
    console.log("Mengatur status tombol ke kondisi awal siklus...");

    // Reset variabel state untuk siklus baru
    selectedDefects = [];
    currentInspectionPairs = [];
    // --- MODIFIKASI DIMULAI ---
    usedReworkPositionsThisCycle = []; // KOSONGKAN riwayat rework untuk siklus baru
    // --- MODIFIKASI SELESAI ---

    // Reset tampilan visual tombol
    defectButtons.forEach(btn => btn.classList.remove('active'));
    
    // Aktifkan semua tombol defect
    toggleButtonGroup(defectButtons, true);

    // Panggil fungsi ini untuk mengaktifkan kembali A-Grade
    updateAGradeButtonState();
    
    // --- MODIFIKASI DIMULAI ---
    // Panggil fungsi update rework untuk memastikan semua tombol kembali aktif (atribut forceDisabled dihapus)
    updateReworkButtonStates(); 
    // Kemudian nonaktifkan grup Rework & Qty (R/B/C)
    toggleButtonGroup(reworkButtons, false); 
    // --- MODIFIKASI SELESAI ---
    updateQtySectionState(); 
    
    // Cek batas inspeksi
    if (totalInspected >= MAX_INSPECTION_LIMIT) {
        toggleButtonGroup(defectButtons, false);
        toggleButtonGroup(gradeInputButtons, false); // Nonaktifkan semua grade termasuk A
        console.log(`Batas inspeksi ${MAX_INSPECTION_LIMIT} tercapai. Input dinonaktifkan.`);
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
// 6. Update FTT dan Redo Rate (MODIFIKASI FINAL v2)
// ===========================================
function updateFTT() {
    if (!fttOutput) return;

    // --- MODIFIKASI ---
    // Gunakan fungsi pembantu baru untuk mendapatkan total rework yang valid.
    const processedReworks = getProcessedReworkCounts();
    const calculatedTotalRework = processedReworks.calculatedTotal;
    // --------------------

    const totalBGrade = qtyInspectOutputs['b-grade'] || 0;
    const totalCGrade = qtyInspectOutputs['c-grade'] || 0;

    // FTT = (Total Inspect - (Total Rework Valid + Total B/C)) / Total Inspect
    const fttValue = totalInspected > 0 ? ((totalInspected - (calculatedTotalRework + totalBGrade + totalCGrade)) / totalInspected) * 100 : 0;
    fttOutput.textContent = `${Math.max(0, fttValue).toFixed(2)}%`; 

    // Opsi: Update class styling jika ada
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

    // --- MODIFIKASI ---
    // Gunakan fungsi pembantu baru untuk mendapatkan total rework yang valid.
    const processedReworks = getProcessedReworkCounts();
    const calculatedTotalRework = processedReworks.calculatedTotal;
    // --------------------

    const redoRateValue = totalInspected !== 0 ? (calculatedTotalRework / totalInspected) * 100 : 0;
    redoRateOutput.textContent = `${redoRateValue.toFixed(2)}%`;
}

// ===========================================
// FUNGSI PEMBANTU BARU: Memproses & Memisahkan Tipe Rework (REVISI TOTAL)
// ===========================================
/**
 * Menganalisis log rework per item untuk menghitung nilai rework secara akurat
 * sesuai dengan logika baru.
 *
 * Logika:
 * 1. Jika item memiliki 'PAIRS', dihitung sebagai 1 rework unit (pairs dominan).
 * 2. Jika item memiliki 'LEFT' DAN 'RIGHT' (tanpa 'PAIRS'), dihitung sebagai 1 rework unit.
 * 3. Jika item HANYA memiliki 'LEFT', dihitung sebagai 0.5 rework unit.
 * 4. Jika item HANYA memiliki 'RIGHT', dihitung sebagai 0.5 rework unit.
 *
 * @returns {object} Sebuah objek berisi nilai rework final untuk FTT, Redo Rate, dan database.
 */
function getProcessedReworkCounts() {
    let finalReworkPairs = 0; // Untuk database: item yang dihitung sebagai 'Pairs'
    let finalReworkKiri = 0;  // Untuk database: item yang HANYA 'Left'
    let finalReworkKanan = 0; // Untuk database: item yang HANYA 'Right'
    let calculatedTotal = 0;  // Untuk FTT & Redo Rate (contoh: 0.5, 1, 1.5, dst.)

    // Iterasi melalui setiap item rework yang telah dicatat di log
    for (const reworkPositions of reworkLog) {
        const hasPairs = reworkPositions.includes('PAIRS');
        const hasLeft = reworkPositions.includes('LEFT');
        const hasRight = reworkPositions.includes('RIGHT');

        if (hasPairs) {
            // Aturan 1: Jika 'PAIRS' ada, hitung sebagai 1 & catat sebagai rework 'Pairs'.
            calculatedTotal += 1;
            finalReworkPairs += 1;
        } else if (hasLeft && hasRight) {
            // Aturan 2: Jika 'LEFT' dan 'RIGHT' ada (tanpa 'PAIRS'), hitung sebagai 1 & catat sebagai 'Pairs'.
            calculatedTotal += 1;
            finalReworkPairs += 1;
        } else if (hasLeft) {
            // Aturan 3: Jika HANYA 'LEFT' ada.
            calculatedTotal += 0.5;
            finalReworkKiri += 1;
        } else if (hasRight) {
            // Aturan 4: Jika HANYA 'RIGHT' ada.
            calculatedTotal += 0.5;
            finalReworkKanan += 1;
        }
    }

    return {
        finalReworkPairs,
        finalReworkKiri,
        finalReworkKanan,
        calculatedTotal
    };
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
// 8. Menambahkan Defect ke Summary List (Logika Baru)
// ===========================================
function addAllDefectsToSummary(finalGrade) {
    // Pastikan ada data pasangan yang akan dicatat dan grade sudah final
    if (currentInspectionPairs.length === 0 || !finalGrade) {
        console.warn("addDefectsToSummary: Tidak ada pasangan defect/posisi untuk dicatat.");
        return;
    }

    // Iterasi melalui setiap pasangan {defect, posisi} yang telah dikonfirmasi
    currentInspectionPairs.forEach(pair => {
        const { type, position } = pair;

        // Pastikan struktur defectCounts sudah ada
        if (!defectCounts[type]) {
            defectCounts[type] = { "LEFT": {}, "PAIRS": {}, "RIGHT": {} };
        }
        if (!defectCounts[type][position]) {
            defectCounts[type][position] = {};
        }
        if (!defectCounts[type][position][finalGrade]) {
            defectCounts[type][position][finalGrade] = 0;
        }

        // Tambahkan hitungan
        defectCounts[type][position][finalGrade]++;
    });

    console.log("defectCounts diupdate:", JSON.stringify(defectCounts));
    saveToLocalStorage();
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
// 10. Event Handlers untuk Tombol (LOGIKA INTI BARU)
// ===========================================

// --- FUNGSI PEMBANTU BARU UNTUK MENGONTROL QTY SECTION ---
function updateQtySectionState() {
    // Aturan: Qty (R/B/C) aktif HANYA JIKA tidak ada defect "menggantung"
    // DAN sudah ada minimal satu cacat yang tercatat.
    const enable = selectedDefects.length === 0 && currentInspectionPairs.length > 0;
    
    gradeInputButtons.forEach(btn => {
        if (!btn.classList.contains('a-grade')) {
            btn.disabled = !enable;
            btn.classList.toggle('inactive', !enable);
        }
    });
}

// Handler untuk klik tombol Defect Menu Item
function handleDefectClick(button) {
    const defectName = button.dataset.defect || button.textContent.trim();
    const index = selectedDefects.indexOf(defectName);

    if (index > -1) {
        // Jika sudah ada, hapus (batalkan pilihan)
        selectedDefects.splice(index, 1);
        button.classList.remove('active');
    } else {
        // Jika belum ada, tambahkan
        selectedDefects.push(defectName);
        button.classList.add('active');
    }

    // Aktifkan Rework Section jika ada defect yang dipilih
    const enableRework = selectedDefects.length > 0;
    toggleButtonGroup(reworkButtons, enableRework);

    // --- MODIFIKASI DIMULAI ---
    // Setelah mengaktifkan/menonaktifkan grup, jalankan fungsi untuk menonaktifkan tombol individual yang sudah terpakai
    if(enableRework) {
        updateReworkButtonStates();
    }
    // --- MODIFIKASI SELESAI ---

    // Nonaktifkan Qty Section (R/B/C)
    updateQtySectionState();
    
    // Update status tombol A-Grade setiap kali defect dipilih atau dibatalkan
    updateAGradeButtonState();

    saveToLocalStorage();
}

// Handler untuk klik tombol Rework Section
function handleReworkClick(button) {
    // --- MODIFIKASI DIMULAI ---
    // Keluar jika tombol sudah dinonaktifkan (baik karena grup tidak aktif atau sudah diklik sebelumnya)
    if (button.disabled) {
        console.log("Tombol rework ini tidak dapat digunakan saat ini.");
        return;
    }
    // --- MODIFIKASI SELESAI ---

    const reworkPosition = button.id.replace('rework-', '').toUpperCase();
    
    // Pastikan ada defect yang dipilih sebelum memproses
    if (selectedDefects.length === 0) return;
    
    // --- MODIFIKASI DIMULAI ---
    // Tambahkan posisi yang baru diklik ke array pelacak
    usedReworkPositionsThisCycle.push(reworkPosition);
    // --- MODIFIKASI SELESAI ---

    // Update counter rework
    updateQuantity(button.id.replace('rework-', '') + '-counter');

    // Pindahkan semua defect yang dipilih ke dalam pasangan yang dikonfirmasi
    selectedDefects.forEach(defectName => {
        currentInspectionPairs.push({ type: defectName, position: reworkPosition });
    });

    // Reset defect yang dipilih
    selectedDefects = [];
    defectButtons.forEach(btn => btn.classList.remove('active'));

    // --- MODIFIKASI DIMULAI ---
    // Panggil fungsi untuk menonaktifkan tombol yang baru saja diklik secara permanen untuk siklus ini
    updateReworkButtonStates();
    // Nonaktifkan kembali Rework Section (karena tidak ada defect yang sedang dipilih)
    toggleButtonGroup(reworkButtons, false);    
    // --- MODIFIKASI SELESAI ---
    
    // Aktifkan Qty Section karena status kembali "bersih"
    updateQtySectionState();

    // Update status tombol A-Grade. A-Grade tetap harus nonaktif karena item ini memiliki defect.
    updateAGradeButtonState();

    saveToLocalStorage();
}

// Handler untuk klik tombol Qty Section (A, R, B, C Grade)
function handleGradeClick(button) {
    const gradeCategory = Array.from(button.classList).find(cls => cls.endsWith('-grade'));
    if (!gradeCategory) return;

    // --- MODIFIKASI DIMULAI ---
    // Jika tombol adalah B-Grade atau C-Grade, tampilkan konfirmasi
    if (gradeCategory === 'b-grade' || gradeCategory === 'c-grade') {
        // Simpan referensi ke tombol dan kategori grade untuk digunakan di callback popup
        showConfirmationPopup(gradeCategory, () => {
            // Callback jika pengguna memilih 'YA'
            processGradeClick(button, gradeCategory);
        });
        return; // Hentikan eksekusi handleGradeClick sampai konfirmasi diterima
    }
    // --- MODIFIKASI SELESAI ---

    // Untuk A-Grade dan R-Grade, langsung proses
    processGradeClick(button, gradeCategory);
}

// --- FUNGSI BARU: Fungsi pembantu untuk memproses klik grade setelah konfirmasi ---
function processGradeClick(button, gradeCategory) {
    // Jika item ini adalah R-Grade dan memiliki cacat yang tercatat...
    if (gradeCategory === 'r-grade' && currentInspectionPairs.length > 0) {
        // Ambil posisi rework yang unik dari pasangan cacat saat ini
        const reworkPositionsForItem = [...new Set(currentInspectionPairs.map(pair => pair.position))];
        
        // Hanya tambahkan ke log jika ada posisi rework yang valid
        if (reworkPositionsForItem.length > 0) {
            reworkLog.push(reworkPositionsForItem);
            console.log("Rework Log diupdate:", reworkLog);
        }
    }

    // Tambah hitungan Qty Inspect di memori
    qtyInspectOutputs[gradeCategory]++;
    
    // Panggil fungsi ini untuk me-render SEMUA perubahan angka ke layar
    updateAllDisplays();  
    
    if (gradeCategory !== 'a-grade') {
        // Proses semua pasangan defect yang terkumpul
        addAllDefectsToSummary(gradeCategory);
    }
    
    // Update lagi tampilan ringkasan defect setelah ditambahkan
    updateDefectSummaryDisplay(); 
    saveToLocalStorage();
    
    // Reset seluruh alur untuk item berikutnya
    setTimeout(() => {
        initButtonStates();
    }, 150);
}


// --- FUNGSI BARU: Menampilkan Pop-up Konfirmasi ---
function showConfirmationPopup(grade, onConfirmCallback) {
    const confirmationText = `Apakah Anda menemukan defect ${grade.toUpperCase()}?`;

    // Buat elemen popup dinamis
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'confirmation-overlay'; // Tambahkan class untuk styling CSS

    const popupContent = document.createElement('div');
    popupContent.className = 'confirmation-content';

    const message = document.createElement('p');
    message.textContent = confirmationText;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'confirmation-buttons';

    const backButton = document.createElement('button');
    backButton.textContent = 'Kembali';
    backButton.className = 'button-back'; // Class untuk styling

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'YA';
    confirmButton.className = 'button-confirm'; // Class untuk styling

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(confirmButton);

    popupContent.appendChild(message);
    popupContent.appendChild(buttonContainer);
    popupOverlay.appendChild(popupContent);

    document.body.appendChild(popupOverlay); // Tambahkan ke body

    // Event listener untuk tombol 'Kembali'
    backButton.addEventListener('click', () => {
        document.body.removeChild(popupOverlay); // Hapus popup
        console.log("Aksi dibatalkan oleh pengguna.");
        // Tidak perlu melakukan apa-apa lagi, karena callback tidak dipanggil
    });

    // Event listener untuk tombol 'YA'
    confirmButton.addEventListener('click', () => {
        document.body.removeChild(popupOverlay); // Hapus popup
        onConfirmCallback(); // Panggil callback untuk melanjutkan proses grade
    });
}


// ===========================================
// 11. Validasi Input dan Simpan Data (MODIFIKASI FINAL v3 - dengan Lazy Loading)
// ===========================================
async function saveData() {
    console.log("Memulai proses simpan data...");

    // --- MODIFIKASI DIMULAI ---
    // Dapatkan elemen overlay dari DOM
    const loadingOverlay = document.getElementById('loading-overlay');
    // --- MODIFIKASI SELESAI ---

    if (!validateInputs() || !validateQtySampleSet()) {
        console.log("Validasi dasar gagal. Penyimpanan dibatalkan.");
        return;
    }

    // Panggil fungsi pembantu untuk mendapatkan semua hitungan rework yang benar
    const processedReworks = getProcessedReworkCounts();
    const { finalReworkPairs, finalReworkKiri, finalReworkKanan, calculatedTotal } = processedReworks;

    // ... (sisa logika validasi dan persiapan data tetap sama) ...
    const totalDefectCount = Object.values(defectCounts).reduce((sum, positions) =>
        sum + Object.values(positions).reduce((posSum, grades) =>
            posSum + Object.values(grades).reduce((gradeSum, count) => gradeSum + count, 0),
        0),
    0);

    if (totalDefectCount < calculatedTotal) {
        alert("Peringatan: Total defect yang tercatat (" + totalDefectCount + ") lebih rendah dari total unit rework terhitung (" + calculatedTotal.toFixed(2) + "). Harap pastikan semua data sudah benar.");
        console.log("Validasi gagal: Total defect < total rework terhitung.");
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
        ftt: finalFtt,
        redoRate: finalRedoRate,
        "a-grade": qtyInspectOutputs['a-grade'],
        "b-grade": qtyInspectOutputs['b-grade'],
        "c-grade": qtyInspectOutputs['c-grade'],
        reworkKiri: finalReworkKiri,
        reworkKanan: finalReworkKanan,
        reworkPairs: finalReworkPairs,
        defects: defectsToSend,
    };

    console.log("Data yang akan dikirim (setelah diproses):", JSON.stringify(dataToSend, null, 2));

    const saveButton = document.querySelector(".save-button");
    saveButton.disabled = true;
    saveButton.textContent = "MENYIMPAN...";

    // --- MODIFIKASI DIMULAI ---
    // Tampilkan loading overlay SEBELUM memulai proses fetch
    if (loadingOverlay) {
        loadingOverlay.classList.add('visible');
    }
    // --- MODIFIKASI SELESAI ---
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
            markNcvsAsUsed(auditorSelect.value, ncvsSelect.value);
            updateNcvsOptions(auditorSelect.value);
            resetAllFields();
        } 
    } catch (error) {
        console.error("Error saat mengirim data:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
        // --- MODIFIKASI DIMULAI ---
        // SELALU sembunyikan overlay di blok finally, baik proses berhasil maupun gagal
        if (loadingOverlay) {
            loadingOverlay.classList.remove('visible');
        }
        // --- MODIFIKASI SELESAI ---

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
// 15. Reset Semua Field Setelah Simpan (Modifikasi)
// ===========================================
function resetAllFields() {
    console.log("Memulai proses reset semua field dan data internal...");
    
    // Reset input form
    if (auditorSelect) auditorSelect.value = "";
    updateNcvsOptions("");
    document.getElementById("model-name").value = "";
    const styleNumberInput = document.getElementById("style-number");
    if (styleNumberInput) {
        styleNumberInput.value = "";
        styleNumberInput.classList.remove('invalid-input');
    }
    
        // Reset input Model Name dan pastikan aktif kembali
    if (modelNameInput) {
        modelNameInput.value = "";
        modelNameInput.disabled = false; // Penting: aktifkan kembali
    }

    // Reset data internal utama
    for (const categoryKey in qtyInspectOutputs) {
        qtyInspectOutputs[categoryKey] = 0;
    }
    defectCounts = {};
    totalInspected = 0;
    totalReworkLeft = 0;
    totalReworkRight = 0;
    totalReworkPairs = 0;
    
    // KOSONGKAN SEMUA DATA INTERNAL YANG BARU
    selectedDefects = [];
    currentInspectionPairs = [];
    reworkLog = []; // <-- TAMBAHKAN INI

    // Reset tampilan
    updateAllDisplays();
    
    // Hapus summary
    if (summaryContainer) {
        summaryContainer.innerHTML = "";
    }

    // Atur ulang status tombol ke kondisi awal
    initButtonStates(); 
    
    // Hapus semua data dari localStorage kecuali qty sample
    clearLocalStorageExceptQtySampleSet();
    
    console.log("Semua field dan data internal telah berhasil direset.");
}

// ===========================================
// FUNGSI BARU: Auto-fill Model Name berdasarkan Style Number
// ===========================================
function autoFillModelName() {
    // Pastikan elemen input sudah diinisialisasi
    if (!styleNumberInput || !modelNameInput) {
        console.error("Elemen Style Number atau Model Name tidak ditemukan.");
        return;
    }

    // Ambil nilai dari input Style Number, bersihkan spasi, dan ubah ke huruf besar
    // agar cocok dengan kunci di styleModelDatabase (jika kunci Anda huruf besar).
    const enteredStyleNumber = styleNumberInput.value.trim().toUpperCase();
    
    // Cari model yang cocok di database
    const matchedModel = styleModelDatabase[enteredStyleNumber];

    if (matchedModel) {
        // Jika ditemukan kecocokan, isi input Model Name
        modelNameInput.value = matchedModel;
        // Nonaktifkan input Model Name agar tidak diubah secara manual
        modelNameInput.disabled = true;
    } else {
        // Jika tidak ditemukan kecocokan, kosongkan input Model Name
        modelNameInput.value = "";
        // Aktifkan kembali input Model Name agar auditor bisa mengetik manual
        modelNameInput.disabled = false;
    }
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

    // Pastikan Anda menginisialisasi DOM references untuk input Model Name dan Style Number di sini:
    modelNameInput = document.getElementById("model-name");
    styleNumberInput = document.getElementById("style-number");

    // Event listener untuk input form lainnya
    if (modelNameInput) {
        modelNameInput.addEventListener('input', saveToLocalStorage);
    }
    
    if (styleNumberInput) {
        // Saat auditor mengetik di Style Number, panggil fungsi autoFillModelName
        styleNumberInput.addEventListener('input', () => {
            saveToLocalStorage(); // Auto-save perubahan input
            autoFillModelName(); // Panggil fungsi auto-fill
        });
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

    const statisticButton = document.querySelector('.statistic-button');

    if (statisticButton) {
        statisticButton.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
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
    defaultOption.textContent = "Pilih Line";
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
        defaultOption.textContent = "Pilih Line (pilih Auditor dahulu)";
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
          {  
            date: "06-30-2025",
            // Teks pengumuman yang panjang tetap sama
            text: `🛠️ FTT Sampling App Update v.2025.06

🎨 Tampilan & UI
1. Memperbaiki warna menu grade-defect yang secara fungsi aktif namun secara visual terlihat tidak aktif
2. Memperbarui ukuran frame antar section
3. Menambahkan highlight pada defect yang dipilih
4. Menambahkan tombol menu untuk dashboard data statistik
5. Mengimplementasikan overlay loading

🧩 Logika Inspeksi & Validasi
1. Membuat pola inspeksi untuk multi-defect dan multi-position
2. Mengembangkan logika pencegah double-click pada fitur defect position
3. Membuat logika agar setiap inspeksi hanya boleh berisi satu pairs defect position
4. Mengaktifkan pilihan grade-defect hanya jika defect position diklik
5. Menonaktifkan opsi A-grade ketika defect ditemukan
6. Membuat logika agar saat memilih B/C-grade, posisi defect tidak disimpan ke bagian rework
7. Membuat logika agar jumlah B/C-grade tidak memengaruhi perhitungan rework rate
8. Menambahkan validasi bahwa jumlah inspeksi tidak boleh melebihi 50/24

🔢 Counter, Grade, dan Nilai
1. Menambahkan nilai hitung ke masing-masing counter grade
2. Mengubah nilai counter defect-left dan defect-right menjadi 0.5
3. Menyesuaikan formula perhitungan FTT dan rework rate dengan pola nilai defect position yang baru

📦 Data Handling & Penyimpanan
1. Memastikan seluruh data input tersimpan dengan benar di localStorage
2. Mengimplementasikan validasi localStorage agar data tetap tersimpan meski browser ditutup atau di-refresh
3. Mengoptimasi keamanan dan volume data input API
4. Mengoptimasi batas permintaan (request limits) pada Vercel
5. Menerapkan rate limiting pada Vercel Functions
6. Menyimpan nilai yang tepat untuk Rework Left, Right, dan Pairs ke dalam database`
        },
{  
            date: "07-31-2025", 
            text: `🛠️ FTT Sampling App Update v.2025.07 – Dashboard Enhancement & Maintenance

📊 Statistical Dashboard Upgrade
1. Menambahkan filter: Start/End Date, Auditor, NCVS, Model, Style Number
2. Mengimplementasikan bar, pie, dan line chart untuk FTT, defect, dan grade
3. Menampilkan Avg. FTT, Rework Rate, dan A-Grade Ratio (%, 2 desimal)
4. Menyesuaikan label, axis, dan format tanggal pada chart
5. Membatasi jumlah data point dan menambahkan opsi rentang waktu dinamis

📄 Full Inspection Data
1. Menambahkan fitur sort, filter, dan quick filter
2. Merapikan struktur, alignment, dan default view tabel

⚙️ Functional & UI Maintenance
1. Memformat seluruh metrik ke persen, presisi 2 desimal
2. Menyempurnakan spacing antar section dan konsistensi judul
3. Menambahkan input validation saat user mengakses menu B-Grade atau C-Grade
4. Menambahkan fitur auto-fill pada field model name berdasarkan input style number

🧱 Code Structure & Integration
1. Modularisasi HTML, CSS, JS untuk maintainability
2. Menghubungkan dashboard ke halaman utama aplikasi
3. Menambahkan tombol “Back to Main Page”
4. Optimasi load data dan refactor script untuk performa lebih baik`
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
