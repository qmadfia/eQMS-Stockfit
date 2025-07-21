// PENTING: Ganti dengan URL Web App Google Apps Script Anda
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJSdmbQGrI8gpbSHcuPEhnOYRdaFcOwnh5Y7I7qM1YyqXV4OyABW4dL4ce1uEB0rXe/exec';

// Global variables
let allInspections = [];
let allDefects = [];
let chartInstances = {};
let currentFttPeriod = 'days';
let currentDefectPlant = 'all'; // Default ke 'all' karena filter plant dihapus
let currentGradePlant = 'all';  // Default ke 'all' karena filter plant dihapus
let ncvsFttSortOrder = 'desc';

// New state variable for table view limit
let currentLimitView = 'today'; // Default tampilan awal tabel adalah 'today'

// Auditor mappings for plants (tetap ada karena digunakan di updateDefectChart dan updateGradePieChart)
const plant1Auditors = ['Badrowi', 'Sopan Sopian']; // Adjust with your Plant 1 auditors
const plant2Auditors = ['Iksan']; // Adjust with your Plant 2 auditors

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    document.getElementById('applyFilter').addEventListener('click', updateDashboard);
    document.getElementById('resetFilter').addEventListener('click', resetFilters);

    document.getElementById('ftt-time-filter').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            currentFttPeriod = e.target.dataset.period;
            document.querySelectorAll('#ftt-time-filter .btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            updateDashboard();
        }
    });

    // Event listeners untuk filter plant telah dihapus karena elemen HTML-nya sudah dihapus
    // document.getElementById('defect-plant-filter').addEventListener('click', (e) => { ... });
    // document.getElementById('grade-plant-filter').addEventListener('click', (e) => { ... });

    document.getElementById('ncvs-sort-filter').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            ncvsFttSortOrder = e.target.dataset.sort;
            document.querySelectorAll('#ncvs-sort-filter .btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            updateDashboard();
        }
    });

    // NEW: Event listener for Limit View Filter dropdown
    document.getElementById('limitViewFilter').addEventListener('change', (e) => {
        currentLimitView = e.target.value;
        updateDashboard(); // Panggil updateDashboard saat filter limit view berubah
    });
});

async function fetchData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const urlErrorOverlay = document.getElementById('url-error-overlay');

    if (SCRIPT_URL === 'ENTER_YOUR_WEB_APP_URL_HERE' || !SCRIPT_URL) {
        urlErrorOverlay.classList.remove('hidden');
        loadingOverlay.style.display = 'none';
        return;
    }

    loadingOverlay.style.display = 'flex';
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        allInspections = data.inspections.map(item => ({
            Timestamp: new Date(item.Timestamp),
            Auditor: item.Auditor,
            NCVS: item.NCVS,
            Model: item.Model,
            'Style Number': item['Style Number'],
            Qty_Inspect: Number(item['Qty Inspect']) || 0,
            FTT: Number(item.FTT) || 0,
            Rework_Rate: Number(item['Rework Rate']) || 0,
            A_Grade: Number(item['A-Grade']) || 0,
            B_Grade: Number(item['B-Grade']) || 0,
            C_Grade: Number(item['C-Grade']) || 0,
            Rework_Kiri: Number(item['Rework Kiri']) || 0,
            Rework_Kanan: Number(item['Rework Kanan']) || 0,
            Rework_Pairs: Number(item['Rework Pairs']) || 0
        }));
        allDefects = data.defects.map(item => ({ ...item, Timestamp: new Date(item.Timestamp) }));

        populateFilters(data.filters);
        updateDashboard();

    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data. Please ensure the Web App URL is correct, re-deployed, and accessible to "Anyone".\nError: ' + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function populateFilters(filters) {
    const populate = (elementId, options) => {
        const select = document.getElementById(elementId);
        select.innerHTML = '<option value="">All</option>'; // Changed text
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = option;
            select.appendChild(opt);
        });
    };
    populate('auditorFilter', filters.auditors.sort());
    populate('ncvsFilter', filters.ncvs.sort());
    populate('modelFilter', filters.models.sort());
    populate('styleNumberFilter', filters.styleNumbers.sort());
}

function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('auditorFilter').value = '';
    document.getElementById('ncvsFilter').value = '';
    document.getElementById('modelFilter').value = '';
    document.getElementById('styleNumberFilter').value = '';
    updateDashboard();
}

function updateDashboard() {
    const filters = {
        startDate: document.getElementById('startDate').value ? new Date(document.getElementById('startDate').value) : null,
        endDate: document.getElementById('endDate').value ? new Date(document.getElementById('endDate').value) : null,
        auditor: document.getElementById('auditorFilter').value,
        ncvs: document.getElementById('ncvsFilter').value,
        model: document.getElementById('modelFilter').value,
        styleNumber: document.getElementById('styleNumberFilter').value,
    };

    if (filters.endDate) filters.endDate.setHours(23, 59, 59, 999);

    const filteredInspections = allInspections.filter(item => {
        const itemDate = item.Timestamp;
        return (!filters.startDate || itemDate >= filters.startDate) &&
            (!filters.endDate || itemDate <= filters.endDate) &&
            (!filters.auditor || item.Auditor === filters.auditor) &&
            (!filters.ncvs || item.NCVS == filters.ncvs) &&
            (!filters.model || item.Model === filters.model);
    });

    const filteredDefects = allDefects.filter(item => {
        const itemDate = item.Timestamp;
        return (!filters.startDate || itemDate >= filters.startDate) &&
            (!filters.endDate || itemDate <= filters.endDate) &&
            (!filters.auditor || item.Auditor === filters.auditor) &&
            (!filters.ncvs || item.NCVS == filters.ncvs) &&
            (!filters.model || item.Model === filters.model) &&
            (!filters.styleNumber || item['Style Number'] === filters.styleNumber);
    });

    updateMetrics(filteredInspections);
    updateFttChart(filteredInspections, currentFttPeriod);
    updateDefectChart(filteredDefects, currentDefectPlant); // currentDefectPlant akan selalu 'all'
    updateGradePieChart(filteredInspections, currentGradePlant); // currentGradePlant akan selalu 'all'
    updateNcvsFttChart(filteredInspections, ncvsFttSortOrder);
    updateInspectionTable(filteredInspections);
}

function updateMetrics(data) {
    const totalInspected = data.reduce((sum, item) => sum + item.Qty_Inspect, 0);
    const totalAGrade = data.reduce((sum, item) => sum + item.A_Grade, 0);

    const fttSum = data.reduce((sum, item) => sum + item.FTT, 0);
    const reworkSum = data.reduce((sum, item) => sum + item.Rework_Rate, 0);

    const avgFtt = data.length > 0 ? fttSum / data.length : 0;
    const avgRework = data.length > 0 ? reworkSum / data.length : 0;
    const aGradePercentage = totalInspected > 0 ? (totalAGrade / totalInspected) * 100 : 0;

    document.getElementById('fttOutput').textContent = `${(avgFtt * 100).toFixed(2)}%`;
    document.getElementById('reworkRateOutput').textContent = `${(avgRework * 100).toFixed(2)}%`;
    document.getElementById('aGradeOutput').textContent = `${aGradePercentage.toFixed(2)}%`;
}

function renderChart(ctx, type, data, options) {
    const id = ctx.canvas.id;
    if (chartInstances[id]) {
        chartInstances[id].destroy();
    }
    chartInstances[id] = new Chart(ctx, { type, data, options });
}

function updateFttChart(data, period) {
    const ctx = document.getElementById('fttChart').getContext('2d');
    const groupedData = {};

    data.forEach(item => {
        const date = item.Timestamp;
        let key;
        if (period === 'days') {
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear();
            key = `${month}/${day}/${year}`;
        } else { // months
            key = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
        }
        if (!groupedData[key]) {
            groupedData[key] = { fttSum: 0, count: 0 };
        }
        groupedData[key].fttSum += item.FTT;
        groupedData[key].count++;
    });

    const labels = Object.keys(groupedData).sort((a, b) => {
        if (period === 'days') {
            return new Date(a) - new Date(b);
        } else {
            const dateA = new Date(a.replace(/(\w+)\s(\d{4})/, "1 $1 $2"));
            const dateB = new Date(b.replace(/(\w+)\s(\d{4})/, "1 $1 $2"));
            return dateA - dateB;
        }
    });

    const finalLabels = (period === 'days' && labels.length > 11) ? labels.slice(-11) : labels;
    const chartData = finalLabels.map(label => {
        const avg = groupedData[label].count > 0 ? groupedData[label].fttSum / groupedData[label].count : 0;
        return (avg * 100);
    });

    renderChart(ctx, 'line', {
        labels: finalLabels,
        datasets: [{
            label: 'Average FTT (%)',
            data: chartData,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
        }]
    }, {
        responsive: true, maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: value => `${value.toFixed(0)}%`
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += `${context.parsed.y.toFixed(2)}%`;
                        }
                        return label;
                    }
                }
            }
        }
    });
}


function updateDefectChart(data, plant) {
    const ctx = document.getElementById('defectChart').getContext('2d');
    let filteredData = data;

    // Logika filter plant tetap dipertahankan, namun karena currentDefectPlant default ke 'all'
    // dan tidak ada lagi UI untuk mengubahnya, filter ini secara efektif dinonaktifkan
    // kecuali jika Anda secara programatis mengubah currentDefectPlant.
    if (plant === 'plant1') {
        filteredData = data.filter(d => plant1Auditors.includes(d.Auditor));
    } else if (plant === 'plant2') {
        filteredData = data.filter(d => plant2Auditors.includes(d.Auditor));
    }

    const defectCounts = {};
    filteredData.forEach(item => {
        const defectName = item.Defect;
        let count = Number(item.Total) || 0;

        if (item.Position === 'Pairs') {
            count = count * 2;
        }
        defectCounts[defectName] = (defectCounts[defectName] || 0) + count;
    });

    const sortedDefects = Object.entries(defectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    const labels = sortedDefects.map(d => d[0]);
    const chartData = sortedDefects.map(d => d[1]);

    renderChart(ctx, 'bar', {
        labels: labels,
        datasets: [{
            label: 'Total Defects',
            data: chartData,
            backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(255, 159, 64, 0.6)', 'rgba(255, 205, 86, 0.6)'],
            borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 159, 64, 1)', 'rgba(255, 205, 86, 1)'],
            borderWidth: 1
        }]
    }, {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
    });
}

function updateGradePieChart(data, plant) {
    const ctx = document.getElementById('gradePieChart').getContext('2d');
    let filteredData = data;

    // Logika filter plant tetap dipertahankan, namun secara efektif dinonaktifkan
    if (plant === 'plant1') {
        filteredData = data.filter(d => plant1Auditors.includes(d.Auditor));
    } else if (plant === 'plant2') {
        filteredData = data.filter(d => plant2Auditors.includes(d.Auditor));
    }

    const totals = { a: 0, rework: 0, b: 0, c: 0 };

    filteredData.forEach(item => {
        totals.a += item.A_Grade;
        totals.b += item.B_Grade;
        totals.c += item.C_Grade;
        totals.rework += ((item.Rework_Kiri + item.Rework_Kanan) / 2) + item.Rework_Pairs;
    });

    renderChart(ctx, 'pie', {
        labels: ['A-Grade', 'Rework', 'B-Grade', 'C-Grade'],
        datasets: [{
            data: [totals.a, totals.rework, totals.b, totals.c],
            backgroundColor: ['#4CAF50', '#FFC107', '#FF9800', '#F44336'],
        }]
    }, { responsive: true, maintainAspectRatio: false });
}

function updateNcvsFttChart(data, sortOrder) {
    const ctx = document.getElementById('ncvsFttChart').getContext('2d');
    const ncvsData = {};

    data.forEach(item => {
        const ncvs = item.NCVS;
        if (!ncvs) return;
        if (!ncvsData[ncvs]) {
            ncvsData[ncvs] = { fttSum: 0, count: 0 };
        }
        ncvsData[ncvs].fttSum += item.FTT;
        ncvsData[ncvs].count++;
    });

    let processedData = Object.entries(ncvsData).map(([ncvs, values]) => ({
        ncvs: ncvs,
        avgFtt: values.count > 0 ? (values.fttSum / values.count) * 100 : 0
    }));

    processedData.sort((a, b) => {
        return sortOrder === 'asc' ? a.avgFtt - b.avgFtt : b.avgFtt - a.avgFtt;
    });

    const labels = processedData.map(item => item.ncvs);
    const chartData = processedData.map(item => item.avgFtt);

    renderChart(ctx, 'bar', {
        labels: labels,
        datasets: [{
            label: 'Average FTT (%)',
            data: chartData,
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
        }]
    }, {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: value => `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}%`
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.x !== null) {
                            label += `${context.parsed.x.toFixed(2)}%`;
                        }
                        return label;
                    }
                }
            }
        }
    });
}

function updateInspectionTable(data) {
    const tbody = document.getElementById('inspectionTableBody');
    tbody.innerHTML = '';

    let limitedData = data;

    // Filter Auditor tabel telah dihapus dari sini (sebelumnya dikomentari)
    // if (currentAuditorTableFilter !== 'all') {
    //     limitedData = limitedData.filter(item => item.Auditor === currentAuditorTableFilter);
    // }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Logika pemfilteran tanggal berdasarkan currentLimitView
    if (currentLimitView === 'today') {
        limitedData = limitedData.filter(item => {
            const itemDate = new Date(item.Timestamp.getFullYear(), item.Timestamp.getMonth(), item.Timestamp.getDate());
            return itemDate.getTime() === today.getTime();
        });
    } else if (currentLimitView === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        limitedData = limitedData.filter(item => {
            const itemDate = new Date(item.Timestamp.getFullYear(), item.Timestamp.getMonth(), item.Timestamp.getDate());
            return itemDate.getTime() === yesterday.getTime();
        });
    } else if (currentLimitView === 'this_week') {
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);
        limitedData = limitedData.filter(item => item.Timestamp >= firstDayOfWeek);
    } else if (currentLimitView === 'last_week') {
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
        endOfLastWeek.setHours(23, 59, 59, 999);

        const startOfLastWeek = new Date(endOfLastWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
        startOfLastWeek.setHours(0, 0, 0, 0);

        limitedData = limitedData.filter(item => item.Timestamp >= startOfLastWeek && item.Timestamp <= endOfLastWeek);
    }

    const sortedData = limitedData.sort((a, b) => b.Timestamp.getTime() - a.Timestamp.getTime());

    if (sortedData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="11" class="px-6 py-4 text-center text-sm text-gray-500">No data available for the selected view.</td>`;
        tbody.appendChild(row);
        return;
    }

    sortedData.forEach(item => {
        const row = document.createElement('tr');
        const reworkText = `${item.Rework_Kiri.toFixed(0)} / ${item.Rework_Kanan.toFixed(0)} / ${item.Rework_Pairs.toFixed(0)}`;
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.Timestamp.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.Auditor}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.NCVS}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.Model}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.Qty_Inspect}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${(item.FTT * 100).toFixed(2)}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${(item.Rework_Rate * 100).toFixed(2)}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.A_Grade}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.B_Grade}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${item.C_Grade}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${reworkText}</td>
        `;
        tbody.appendChild(row);
    });
}
