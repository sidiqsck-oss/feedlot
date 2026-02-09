// ===== Reweight Module =====

let currentInduksiData = null;

// Initialize Reweight module
async function initReweightModule() {
    await loadReweightDropdowns();
    await loadReweightTable();
    await loadReweightSummaries();
    setupReweightEventListeners();
    setReweightDefaultDate();
}

// Set default date
function setReweightDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reweightTanggal').value = today;
}

// Load dropdowns for filter
async function loadReweightDropdowns() {
    const shipments = await getAllItems('shipments');
    const selects = ['reweightTableFilter', 'reweightSummaryAwalFilter', 'reweightSummaryAkhirFilter'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Semua Shipment</option>';
        shipments.forEach(shipment => {
            const option = document.createElement('option');
            option.value = shipment.id;
            option.textContent = shipment.name;
            select.appendChild(option);
        });
    });
}

// Load reweight table
async function loadReweightTable(shipmentFilter = '') {
    const tbody = document.getElementById('reweightTableBody');
    tbody.innerHTML = '';

    let data = await getAllItems('reweight');

    // Get induksi data for each reweight item
    const enrichedData = [];
    for (const item of data) {
        const induksi = await getItem('induksi', item.induksiId);
        if (induksi) {
            enrichedData.push({ ...item, induksi });
        }
    }

    // Apply filter
    let filteredData = enrichedData;
    if (shipmentFilter) {
        filteredData = enrichedData.filter(item => item.induksi.shipmentId == shipmentFilter);
    }

    for (const item of filteredData) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${item.id}"></td>
            <td>${item.induksi.rfid}</td>
            <td>${item.induksi.eartag}</td>
            <td>${formatDate(item.induksi.tanggalInduksi)}</td>
            <td>${formatDate(item.tanggalReweight)}</td>
            <td>${item.induksi.beratInduksi.toFixed(1)}</td>
            <td>${item.beratReweight.toFixed(1)}</td>
            <td>${item.penAwal}</td>
            <td>${item.penAkhir}</td>
            <td>${item.dof}</td>
            <td>${item.adg.toFixed(3)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteReweight(${item.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Load both summaries
async function loadReweightSummaries() {
    await loadReweightSummaryAwal(document.getElementById('reweightSummaryAwalFilter').value);
    await loadReweightSummaryAkhir(document.getElementById('reweightSummaryAkhirFilter').value);
}

// Load summary PEN Awal
async function loadReweightSummaryAwal(shipmentFilter = '') {
    const tbody = document.getElementById('reweightSummaryAwalBody');
    tbody.innerHTML = '';

    let data = await getAllItems('reweight');

    // Get induksi data and filter
    const enrichedData = [];
    for (const item of data) {
        const induksi = await getItem('induksi', item.induksiId);
        if (induksi) {
            if (!shipmentFilter || induksi.shipmentId == shipmentFilter) {
                enrichedData.push({ ...item, induksi });
            }
        }
    }

    // Group by PEN Awal
    const penGroups = {};
    for (const item of enrichedData) {
        const pen = item.penAwal;
        if (!penGroups[pen]) {
            penGroups[pen] = {
                count: 0,
                totalWeight: 0,
                totalAdg: 0,
                types: new Set()
            };
        }
        penGroups[pen].count++;
        penGroups[pen].totalWeight += item.beratReweight;
        penGroups[pen].totalAdg += item.adg;

        const typeName = await getNameById('cattleTypes', item.induksi.cattleTypeId);
        if (typeName) penGroups[pen].types.add(typeName);
    }

    // Render
    for (const [pen, stats] of Object.entries(penGroups)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pen}</td>
            <td>${stats.count}</td>
            <td>${stats.totalWeight.toFixed(1)}</td>
            <td>${(stats.totalWeight / stats.count).toFixed(1)}</td>
            <td>${(stats.totalAdg / stats.count).toFixed(3)}</td>
            <td>${Array.from(stats.types).join(', ')}</td>
        `;
        tbody.appendChild(tr);
    }
}

// Load summary PEN Akhir
async function loadReweightSummaryAkhir(shipmentFilter = '') {
    const tbody = document.getElementById('reweightSummaryAkhirBody');
    tbody.innerHTML = '';

    let data = await getAllItems('reweight');

    // Get induksi data and filter
    const enrichedData = [];
    for (const item of data) {
        const induksi = await getItem('induksi', item.induksiId);
        if (induksi) {
            if (!shipmentFilter || induksi.shipmentId == shipmentFilter) {
                enrichedData.push({ ...item, induksi });
            }
        }
    }

    // Group by PEN Akhir
    const penGroups = {};
    for (const item of enrichedData) {
        const pen = item.penAkhir;
        if (!penGroups[pen]) {
            penGroups[pen] = {
                count: 0,
                totalWeight: 0,
                totalAdg: 0,
                types: new Set()
            };
        }
        penGroups[pen].count++;
        penGroups[pen].totalWeight += item.beratReweight;
        penGroups[pen].totalAdg += item.adg;

        const typeName = await getNameById('cattleTypes', item.induksi.cattleTypeId);
        if (typeName) penGroups[pen].types.add(typeName);
    }

    // Render
    for (const [pen, stats] of Object.entries(penGroups)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pen}</td>
            <td>${stats.count}</td>
            <td>${stats.totalWeight.toFixed(1)}</td>
            <td>${(stats.totalWeight / stats.count).toFixed(1)}</td>
            <td>${(stats.totalAdg / stats.count).toFixed(3)}</td>
            <td>${Array.from(stats.types).join(', ')}</td>
        `;
        tbody.appendChild(tr);
    }
}

// Setup event listeners
function setupReweightEventListeners() {
    // RFID input - auto-fill from induksi
    document.getElementById('reweightRfid').addEventListener('change', lookupInduksiForReweight);
    document.getElementById('reweightRfid').addEventListener('input', debounce(lookupInduksiForReweight, 500));

    // Weight/date change - recalculate DOF/ADG
    document.getElementById('reweightBerat').addEventListener('input', calculateDofAdg);
    document.getElementById('reweightTanggal').addEventListener('change', calculateDofAdg);

    // Submit
    document.getElementById('reweightSubmit').addEventListener('click', submitReweight);

    // Select all
    document.getElementById('reweightSelectAll').addEventListener('change', (e) => {
        document.querySelectorAll('#reweightTableBody .row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });

    // Delete selected
    document.getElementById('reweightDeleteSelected').addEventListener('click', deleteSelectedReweight);

    // Export
    document.getElementById('reweightExport').addEventListener('click', exportReweightExcel);

    // Import
    document.getElementById('reweightImport').addEventListener('click', () => {
        document.getElementById('reweightImportFile').click();
    });
    document.getElementById('reweightImportFile').addEventListener('change', importReweightExcel);

    // Template
    document.getElementById('reweightTemplate').addEventListener('click', downloadReweightTemplate);

    // Filters
    document.getElementById('reweightTableFilter').addEventListener('change', (e) => {
        loadReweightTable(e.target.value);
    });
    document.getElementById('reweightSummaryAwalFilter').addEventListener('change', (e) => {
        loadReweightSummaryAwal(e.target.value);
    });
    document.getElementById('reweightSummaryAkhirFilter').addEventListener('change', (e) => {
        loadReweightSummaryAkhir(e.target.value);
    });

    // Export summaries
    document.getElementById('reweightSummaryAwalExport').addEventListener('click', () => exportReweightSummary('awal'));
    document.getElementById('reweightSummaryAkhirExport').addEventListener('click', () => exportReweightSummary('akhir'));
}

// Lookup induksi data by RFID
async function lookupInduksiForReweight() {
    const rfid = document.getElementById('reweightRfid').value.trim();
    if (!rfid) return;

    const induksi = await getItemByIndex('induksi', 'rfid', rfid);
    if (induksi) {
        currentInduksiData = induksi;

        // Fill form fields
        document.getElementById('reweightTglInduksi').value = induksi.tanggalInduksi;
        document.getElementById('reweightEartag').value = induksi.eartag;
        document.getElementById('reweightBeratInduksi').value = induksi.beratInduksi;
        document.getElementById('reweightPenInduksi').value = induksi.pen;

        const shipmentName = await getNameById('shipments', induksi.shipmentId);
        document.getElementById('reweightShipment').value = shipmentName;

        const frameName = await getNameById('frames', induksi.frameId);
        document.getElementById('reweightFrame').value = frameName;

        const typeName = await getNameById('cattleTypes', induksi.cattleTypeId);
        document.getElementById('reweightJenis').value = typeName;

        calculateDofAdg();
    } else {
        currentInduksiData = null;
        clearReweightInduksiFields();
    }
}

// Clear induksi fields
function clearReweightInduksiFields() {
    document.getElementById('reweightTglInduksi').value = '';
    document.getElementById('reweightEartag').value = '';
    document.getElementById('reweightBeratInduksi').value = '';
    document.getElementById('reweightPenInduksi').value = '';
    document.getElementById('reweightShipment').value = '';
    document.getElementById('reweightFrame').value = '';
    document.getElementById('reweightJenis').value = '';
    document.getElementById('reweightDof').value = '';
    document.getElementById('reweightAdg').value = '';
}

// Calculate DOF and ADG
function calculateDofAdg() {
    if (!currentInduksiData) return;

    const tanggalInduksi = new Date(currentInduksiData.tanggalInduksi);
    const tanggalReweight = new Date(document.getElementById('reweightTanggal').value);
    const beratInduksi = currentInduksiData.beratInduksi;
    const beratReweight = parseFloat(document.getElementById('reweightBerat').value) || 0;

    // Calculate DOF (Days on Feed)
    const dof = Math.floor((tanggalReweight - tanggalInduksi) / (1000 * 60 * 60 * 24));
    document.getElementById('reweightDof').value = dof > 0 ? dof : 0;

    // Calculate ADG (Average Daily Gain)
    if (dof > 0 && beratReweight > 0) {
        const adg = (beratReweight - beratInduksi) / dof;
        document.getElementById('reweightAdg').value = adg.toFixed(3);
    } else {
        document.getElementById('reweightAdg').value = '';
    }
}

// Submit reweight data
async function submitReweight() {
    if (!currentInduksiData) {
        alert('Data induksi tidak ditemukan! Scan RFID terlebih dahulu.');
        return;
    }

    const beratReweight = parseFloat(document.getElementById('reweightBerat').value) || 0;
    const dof = parseInt(document.getElementById('reweightDof').value) || 0;
    const adg = parseFloat(document.getElementById('reweightAdg').value) || 0;

    if (!beratReweight) {
        alert('Berat tidak boleh kosong!');
        return;
    }

    const data = {
        induksiId: currentInduksiData.id,
        tanggalReweight: document.getElementById('reweightTanggal').value,
        beratReweight,
        penAwal: document.getElementById('reweightPenAwal').value.trim(),
        penAkhir: document.getElementById('reweightPenAkhir').value.trim(),
        dof,
        adg,
        vitamin: parseInt(document.getElementById('reweightVitamin').value) || 1
    };

    try {
        await addItem('reweight', data);
        await loadReweightTable(document.getElementById('reweightTableFilter').value);
        await loadReweightSummaries();
        clearReweightForm();
        showNotification('Data berhasil disimpan!', 'success');
    } catch (error) {
        console.error('Error saving reweight:', error);
        alert('Gagal menyimpan data!');
    }
}

// Clear form
function clearReweightForm() {
    document.getElementById('reweightRfid').value = '';
    document.getElementById('reweightBerat').value = '';
    document.getElementById('reweightPenAwal').value = '';
    document.getElementById('reweightPenAkhir').value = '';
    document.getElementById('reweightVitamin').value = '1';
    clearReweightInduksiFields();
    currentInduksiData = null;
}

// Delete single
async function deleteReweight(id) {
    if (confirm('Hapus data ini?')) {
        await deleteItem('reweight', id);
        await loadReweightTable(document.getElementById('reweightTableFilter').value);
        await loadReweightSummaries();
        showNotification('Data berhasil dihapus!', 'success');
    }
}

// Delete selected
async function deleteSelectedReweight() {
    const checkboxes = document.querySelectorAll('#reweightTableBody .row-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Pilih data yang akan dihapus!');
        return;
    }

    if (confirm(`Hapus ${checkboxes.length} data terpilih?`)) {
        for (const cb of checkboxes) {
            await deleteItem('reweight', parseInt(cb.dataset.id));
        }
        await loadReweightTable(document.getElementById('reweightTableFilter').value);
        await loadReweightSummaries();
        document.getElementById('reweightSelectAll').checked = false;
        showNotification(`${checkboxes.length} data berhasil dihapus!`, 'success');
    }
}

// Export Excel
async function exportReweightExcel() {
    const data = await getAllItems('reweight');
    const exportData = [];

    for (const item of data) {
        const induksi = await getItem('induksi', item.induksiId);
        if (!induksi) continue;

        const shipmentName = await getNameById('shipments', induksi.shipmentId);
        const frameName = await getNameById('frames', induksi.frameId);
        const typeName = await getNameById('cattleTypes', induksi.cattleTypeId);

        exportData.push({
            'RFID': induksi.rfid,
            'Eartag': induksi.eartag,
            'Shipment': shipmentName,
            'Tanggal Induksi': induksi.tanggalInduksi,
            'Tanggal Reweight': item.tanggalReweight,
            'Berat Induksi': induksi.beratInduksi,
            'Berat Reweight': item.beratReweight,
            'PEN Induksi': induksi.pen,
            'PEN Awal': item.penAwal,
            'PEN Akhir': item.penAkhir,
            'DOF': item.dof,
            'ADG': item.adg,
            'Frame': frameName,
            'Vitamin': item.vitamin,
            'Jenis Sapi': typeName
        });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reweight');
    XLSX.writeFile(wb, `Reweight_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export berhasil!', 'success');
}

// Import Excel
async function importReweightExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            let imported = 0;
            for (const row of jsonData) {
                const induksi = await getItemByIndex('induksi', 'rfid', String(row['RFID']));
                if (!induksi) continue;

                const item = {
                    induksiId: induksi.id,
                    tanggalReweight: row['Tanggal Reweight'],
                    beratReweight: parseFloat(row['Berat Reweight']) || 0,
                    penAwal: String(row['PEN Awal'] || ''),
                    penAkhir: String(row['PEN Akhir'] || ''),
                    dof: parseInt(row['DOF']) || 0,
                    adg: parseFloat(row['ADG']) || 0,
                    vitamin: parseInt(row['Vitamin']) || 1
                };

                try {
                    await addItem('reweight', item);
                    imported++;
                } catch (err) {
                    console.log('Error importing:', err);
                }
            }

            await loadReweightTable();
            await loadReweightSummaries();
            showNotification(`Import berhasil! ${imported} data ditambahkan.`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal import file!');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// Download template
function downloadReweightTemplate() {
    const template = [
        {
            'RFID': '123456789012345',
            'Tanggal Reweight': '2026-03-07',
            'Berat Reweight': 280,
            'PEN Awal': 'P1',
            'PEN Akhir': 'P2',
            'DOF': 30,
            'ADG': 1.0,
            'Vitamin': 1
        }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Reweight.xlsx');
    showNotification('Template berhasil didownload!', 'success');
}

// Export summary
async function exportReweightSummary(type) {
    const filterSelect = type === 'awal' ? 'reweightSummaryAwalFilter' : 'reweightSummaryAkhirFilter';
    const filter = document.getElementById(filterSelect).value;

    let data = await getAllItems('reweight');

    const enrichedData = [];
    for (const item of data) {
        const induksi = await getItem('induksi', item.induksiId);
        if (induksi) {
            if (!filter || induksi.shipmentId == filter) {
                enrichedData.push({ ...item, induksi });
            }
        }
    }

    const penField = type === 'awal' ? 'penAwal' : 'penAkhir';
    const penGroups = {};

    for (const item of enrichedData) {
        const pen = item[penField];
        if (!penGroups[pen]) {
            penGroups[pen] = { count: 0, totalWeight: 0, totalAdg: 0, types: new Set() };
        }
        penGroups[pen].count++;
        penGroups[pen].totalWeight += item.beratReweight;
        penGroups[pen].totalAdg += item.adg;

        const typeName = await getNameById('cattleTypes', item.induksi.cattleTypeId);
        if (typeName) penGroups[pen].types.add(typeName);
    }

    const exportData = [];
    for (const [pen, stats] of Object.entries(penGroups)) {
        exportData.push({
            [`PEN ${type === 'awal' ? 'Awal' : 'Akhir'}`]: pen,
            'Jumlah': stats.count,
            'Total Berat': stats.totalWeight.toFixed(1),
            'Avg Berat': (stats.totalWeight / stats.count).toFixed(1),
            'Avg ADG': (stats.totalAdg / stats.count).toFixed(3),
            'Jenis Sapi': Array.from(stats.types).join(', ')
        });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `Summary_Reweight_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export summary berhasil!', 'success');
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
