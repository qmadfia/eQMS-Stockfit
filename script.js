// =============================
// 1. Variabel Global
// =============================
let totalInspected = 0; // Total barang yang diinspeksi
let totalReworkLeft = 0; // Total rework kiri
let totalReworkRight = 0; // Total rework kanan
let isAdding = false; // Flag untuk menandakan mode penambahan
let isSubtracting = false; // Flag untuk menandakan mode pengurangan

// Elemen DOM
const fttOutput = document.getElementById('fttOutput');
const qtyInspectOutput = document.getElementById('qtyInspectOutput');
const leftCounter = document.getElementById('left-counter');
const rightCounter = document.getElementById('right-counter');

// =============================
// 2. Event Listener untuk Qty Inspect
// =============================
const qtyInspectButton = document.querySelector('.input-button');
qtyInspectButton.addEventListener('click', () => {
    updateQuantity('qtyInspectOutput', 1); // Tambah Qty Inspect
    updateFTT(); // Perbarui FTT
});

// =============================
// 3. Event Listener untuk Rework
// =============================
const reworkLeftButton = document.getElementById('rework-left');
reworkLeftButton.addEventListener('click', () => {
    updateQuantity('left-counter', 1); // Tambah Rework Kiri
    updateFTT(); // Perbarui FTT
});

const reworkRightButton = document.getElementById('rework-right');
reworkRightButton.addEventListener('click', () => {
    updateQuantity('right-counter', 1); // Tambah Rework Kanan
    updateFTT(); // Perbarui FTT
});

// =============================
// 4. Fungsi untuk Menghitung FTT
// =============================
function updateFTT() {
    if (totalInspected === 0) {
        fttOutput.textContent = '0%';
        fttOutput.className = 'counter'; // Set default class (light blue)
        return;
    }
    const averageRework = (totalReworkLeft + totalReworkRight) / 2;
    const fttValue = ((totalInspected - averageRework) / totalInspected) * 100;
    fttOutput.textContent = `${Math.max(0, fttValue.toFixed(2))}%`; // Nilai FTT tidak boleh negatif

    // Update color based on FTT value
    if (fttValue >= 92) {
        fttOutput.className = 'counter high-ftt'; // Green
    } else if (fttValue >= 80) {
        fttOutput.className = 'counter medium-ftt'; // Yellow
    } else {
        fttOutput.className = 'counter low-ftt'; // Red
    }
}

// =============================
// 5. Fungsi untuk Mengupdate Kuantitas
// =============================
function updateQuantity(counterId, change) {
    const counterElement = document.getElementById(counterId);
    let currentValue = parseInt(counterElement.textContent) || 0; // Ambil nilai saat ini

    // Tambah atau kurangi nilai berdasarkan mode
    if (isAdding) {
        currentValue++; // Tambah jika mode penambahan aktif
    } else if (isSubtracting) {
        currentValue--; // Kurangi jika mode pengurangan aktif
    }

    // Pastikan nilai tidak kurang dari 0
    if (currentValue < 0) {
        currentValue = 0;
    }

    // Perbarui elemen counter
    counterElement.textContent = currentValue;

    // Perbarui totalInspected dan totalRework
    if (counterId === 'qtyInspectOutput') {
        totalInspected = currentValue; // Perbarui totalInspected
    } else if (counterId === 'left-counter') {
        totalReworkLeft = currentValue; // Perbarui totalReworkLeft
    } else if (counterId === 'right-counter') {
        totalReworkRight = currentValue; // Perbarui totalReworkRight
    }
}

// =============================
// 6. Fungsi untuk menangani klik tombol defect
// =============================
const defectCounts = {
    "BOND GAP": 0,
    "OVER CEMENT": 0,
    "OVER PRIMER": 0,
    "STAIN R/B": 0,
    "STAIN IP": 0,
    "REBOUND": 0,
    "POOR TRIMMING": 0,
    "POOR PAINTING": 0,
    "UNFITTING": 0,
    "POOR CEMENT": 0,
    "DOUBLE SKIN": 0,
    "CONTAMINATION": 0,
    "COLOR BLEEDING": 0,
    "DAMAGE": 0,
    "SHRINKAGE": 0,
    "SOLELAYING": 0,
    "BUBBLE": 0
};

// Setup defect buttons
function setupDefectButtons() {
    const defectButtons = document.querySelectorAll('.defect-button');
    defectButtons.forEach(button => {
        button.addEventListener('click', () => {
            const defectName = button.textContent.trim();
            handleDefectClick(defectName);
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 200);
        });
    });
}

// Function to handle defect button clicks
function handleDefectClick(defectName) {
    if (defectCounts.hasOwnProperty(defectName)) {
        if (isAdding) {
            defectCounts[defectName]++;  // Menambah defect jika tombol Plus aktif
        } else if (isSubtracting) {
            defectCounts[defectName]--;  // Mengurangi defect jika tombol Minus aktif
        }

        // Update nilai defect pada tampilan
        console.log(`Defect ${defectName} updated to ${defectCounts[defectName]}`);
    } else {
        console.warn(`Defect '${defectName}' tidak dikenali.`);
    }

    // Update summary defect
    updateDefectSummary();
}

// Update the defect summary
function updateDefectSummary() {
    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = ''; // Clear previous content

    // Loop through defect counts and display them
    for (const [defect, count] of Object.entries(defectCounts)) {
        if (count !== 0) {
            const summaryItem = document.createElement('div');
            summaryItem.className = 'summary-item';
            summaryItem.textContent = `${defect}: ${count}`;
            summaryList.appendChild(summaryItem);
        }
    }
}

// =============================
// 7. Event Listeners untuk Plus dan Minus Buttons
// =============================
document.getElementById('plus-button').addEventListener('click', () => {
    isAdding = true; // Aktifkan mode penambahan
    isSubtracting = false; // Nonaktifkan mode pengurangan

    // Ubah kelas untuk tombol plus
    document.getElementById('plus-button').classList.add('active');
    document.getElementById('plus-button').classList.remove('inactive');

    // Ubah kelas untuk tombol minus
    document.getElementById('minus-button').classList.remove('active');
    document.getElementById('minus-button').classList.add('inactive');
});

document.getElementById('minus-button').addEventListener('click', () => {
    isAdding = false; // Nonaktifkan mode penambahan
    isSubtracting = true; // Aktifkan mode pengurangan

    // Ubah kelas untuk tombol minus
    document.getElementById('minus-button').classList.add('active');
    document.getElementById('minus-button').classList.remove('inactive');

    // Ubah kelas untuk tombol plus
    document.getElementById('plus-button').classList.remove('active');
    document.getElementById('plus-button').classList.add('inactive');
});

// =============================
// 8. Inisialisasi Aplikasi
// =============================
function init() {
    setupDefectButtons(); // Setup defect buttons
    setupQuantityButtons(); // Setup quantity buttons
}

// Tunggu hingga DOM dimuat sebelum menginisialisasi
document.addEventListener('DOMContentLoaded', init);

// =============================
// 9. Setup Quantity Buttons
// =============================
function setupQuantityButtons() {
    // Qty Inspect
    document.getElementById('plus-qty').addEventListener('click', function() {
        updateQuantity('qtyInspectOutput', 1);
    });

    document.getElementById('minus-qty').addEventListener('click', function() {
        updateQuantity('qtyInspectOutput', -1);
    });

    // Rework Kiri
    document.getElementById('plus-rework-kiri').addEventListener('click', function() {
        updateQuantity('left-counter', 1);
    });

    document.getElementById('minus-rework-kiri').addEventListener('click', function() {
        updateQuantity('left-counter', -1);
    });

    // Rework Kanan
    document.getElementById('plus-rework-kanan').addEventListener('click', function() {
        updateQuantity('right-counter', 1);
    });
            document.getElementById('minus-rework-kanan').addEventListener('click', function() {
        updateQuantity('right-counter', -1);
    });
}

// =============================
// 10. Kirim Data ke Google Sheets via Web App
// =============================
document.querySelector(".save-button").addEventListener("click", async () => {
  const fttElement = document.getElementById("fttOutput");
  const fttRaw = fttElement ? fttElement.innerText.replace("%", "").trim() : "0";
  const ftt = parseFloat(fttRaw) / 100; // Konversi ke desimal

  if (isNaN(ftt)) {
    alert("FTT value is invalid!");
    return;
  }

  const summaryItems = document.querySelectorAll(".summary-item");
  const defects = Array.from(summaryItems).map(item => {
    const [type, count] = item.textContent.split(":");
    return { type: type.trim(), count: parseInt(count.trim(), 10) };
  });

  const data = {
    auditor: document.getElementById("auditor").value,
    ncvs: document.getElementById("ncvs").value,
    modelName: document.getElementById("model-name").value,
    styleNumber: document.getElementById("style-number").value,
    ftt, // Kirim nilai desimal
    qtyInspect: parseInt(document.getElementById("qtyInspectOutput").innerText, 10),
    reworkKanan: parseInt(document.getElementById("right-counter").innerText, 10),
    reworkKiri: parseInt(document.getElementById("left-counter").innerText, 10),
    defects, // Tambahkan array defects
    source: "stockfit", // Tambahkan informasi asal aplikasi
  };

  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbzYG3h-oKE9tGJZKljxlkzqWpIa1IZPsvknWgcL2rffy1JMs7nsWd5yMu-iHBT7DS5UMw/exec", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const result = await response.text();
    alert(result);

    // Reset all fields after successful save
    resetAllFields();
  } catch (error) {
    alert("Terjadi kesalahan saat menyimpan data.");
    console.error(error);
  }
});


// =============================
// 11. Reset Data Setelah Simpan
// =============================
function resetAllFields() {
  // Reset input form fields
  document.getElementById("auditor").value = "";
  document.getElementById("ncvs").value = "";
  document.getElementById("model-name").value = "";
  document.getElementById("style-number").value = "";

  // Reset counters and output sections
  document.getElementById("qtyInspectOutput").textContent = "0";
  document.getElementById("left-counter").textContent = "0";
  document.getElementById("right-counter").textContent = "0";
  document.getElementById("fttOutput").textContent = "0%";

  // Reset defect summary
  const summaryList = document.getElementById("summary-list");
  summaryList.innerHTML = ""; // Clear the summary section

  // Reset defect counts
  for (const defect in defectCounts) {
    defectCounts[defect] = 0; // Reset defect counters
  }

  // Reset global counters
  totalInspected = 0;
  totalReworkLeft = 0;
  totalReworkRight = 0;

  console.log("All fields have been reset.");
}
