// ===== Induksi Module =====

// Initialize Induksi module
async function initInduksiModule() {
    await loadDropdowns();
    await loadInduksiTable();
    await loadInduksiSummary();
    setupInduksiEventListeners();
    setDefaultDate();
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('induksiTanggal').value = today;
}

// Load all dropdowns
async function loadDropdowns() {
    await loadShipmentDropdowns();
    await loadFrameDropdown();
    await loadPropertyDropdown();
    await loadCattleTypeDropdown();
}

// Load shipment dropdowns
async function loadShipmentDropdowns() {
    const shipments = await getAllItems('shipments');
    const selects = ['induksiShipment', 'induksiTableFilter', 'induksiSummaryFilter'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;

        // Keep first option for filters
        if (selectId !== 'induksiShipment') {
            select.innerHTML = '<option value="">Semua Shipment</option>';
        } else {
            select.innerHTML = '';
        }

        shipments.forEach(shipment => {
            const option = document.createElement('option');
            option.value = shipment.id;
            option.textContent = shipment.name;
            select.appendChild(option);
        });

        // Restore selection if exists
        if (currentValue) select.value = currentValue;
    });
}

// Load frame dropdown
async function loadFrameDropdown() {
    const frames = await getAllItems('frames');
    const select = document.getElementById('induksiFrame');
    select.innerHTML = '<option value="">Pilih Frame</option>';
    frames.forEach(frame => {
        const option = document.createElement('option');
        option.value = frame.id;
        option.textContent = frame.name;
        select.appendChild(option);
    });
}

// Load property dropdown
async function loadPropertyDropdown() {
    const properties = await getAllItems('properties');
    const select = document.getElementById('induksiProperty');
    select.innerHTML = '<option value="">Pilih Property</option>';
    properties.forEach(property => {
        const option = document.createElement('option');
        option.value = property.id;
        option.textContent = property.name;
        select.appendChild(option);
    });
}

// Load cattle type dropdown
async function loadCattleTypeDropdown() {
    const types = await getAllItems('cattleTypes');
    const select = document.getElementById('induksiJenis');
    select.innerHTML = '<option value="">Pilih Jenis</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        select.appendChild(option);
    });
}

// Load induksi table
async function loadInduksiTable(shipmentFilter = '') {
    const tbody = document.getElementById('induksiTableBody');
    tbody.innerHTML = '';

    let data = await getAllItems('induksi');

    // Apply filter
    if (shipmentFilter) {
        data = data.filter(item => item.shipmentId == shipmentFilter);
    }

    for (const item of data) {
        const shipmentName = await getNameById('shipments', item.shipmentId);
        const frameName = await getNameById('frames', item.frameId);
        const propertyName = await getNameById('properties', item.propertyId);
        const typeName = await getNameById('cattleTypes', item.cattleTypeId);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${item.id}"></td>
            <td>${item.rfid}</td>
            <td>${item.eartag}</td>
            <td>${formatDate(item.tanggalInduksi)}</td>
            <td>${item.beratInduksi.toFixed(1)}</td>
            <td>${item.pen}</td>
            <td>${item.gigi}</td>
            <td>${frameName}</td>
            <td>${propertyName}</td>
            <td>${item.vitamin}</td>
            <td>${typeName}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteInduksi(${item.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Load induksi summary
async function loadInduksiSummary(shipmentFilter = '') {
    const tbody = document.getElementById('induksiSummaryBody');
    tbody.innerHTML = '';

    let data = await getAllItems('induksi');

    // Apply filter
    if (shipmentFilter) {
        data = data.filter(item => item.shipmentId == shipmentFilter);
    }

    // Group by PEN
    const penGroups = {};
    for (const item of data) {
        if (!penGroups[item.pen]) {
            penGroups[item.pen] = {
                count: 0,
                totalWeight: 0,
                types: new Set(),
                frames: new Set()
            };
        }
        penGroups[item.pen].count++;
        penGroups[item.pen].totalWeight += item.beratInduksi;

        const typeName = await getNameById('cattleTypes', item.cattleTypeId);
        const frameName = await getNameById('frames', item.frameId);
        if (typeName) penGroups[item.pen].types.add(typeName);
        if (frameName) penGroups[item.pen].frames.add(frameName);
    }

    // Render summary
    for (const [pen, stats] of Object.entries(penGroups)) {
        const avgWeight = stats.totalWeight / stats.count;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pen}</td>
            <td>${stats.count}</td>
            <td>${stats.totalWeight.toFixed(1)}</td>
            <td>${avgWeight.toFixed(1)}</td>
            <td>${Array.from(stats.types).join(', ')}</td>
            <td>${Array.from(stats.frames).join(', ')}</td>
        `;
        tbody.appendChild(tr);
    }
}

// Setup event listeners
function setupInduksiEventListeners() {
    // Submit form
    document.getElementById('induksiSubmit').addEventListener('click', submitInduksi);

    // Select all checkbox
    document.getElementById('induksiSelectAll').addEventListener('change', (e) => {
        document.querySelectorAll('#induksiTableBody .row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });

    // Delete selected
    document.getElementById('induksiDeleteSelected').addEventListener('click', deleteSelectedInduksi);

    // Export
    document.getElementById('induksiExport').addEventListener('click', exportInduksiExcel);

    // Import
    document.getElementById('induksiImport').addEventListener('click', () => {
        document.getElementById('induksiImportFile').click();
    });
    document.getElementById('induksiImportFile').addEventListener('change', importInduksiExcel);

    // Template download
    document.getElementById('induksiTemplate').addEventListener('click', downloadInduksiTemplate);

    // Table filter
    document.getElementById('induksiTableFilter').addEventListener('change', (e) => {
        loadInduksiTable(e.target.value);
    });

    // Summary filter
    document.getElementById('induksiSummaryFilter').addEventListener('change', (e) => {
        loadInduksiSummary(e.target.value);
    });

    // Summary export
    document.getElementById('induksiSummaryExport').addEventListener('click', exportInduksiSummary);
}

// Submit induksi data
async function submitInduksi() {
    const data = {
        shipmentId: parseInt(document.getElementById('induksiShipment').value),
        rfid: document.getElementById('induksiRfid').value.trim(),
        tanggalInduksi: document.getElementById('induksiTanggal').value,
        eartag: document.getElementById('induksiEartag').value.trim(),
        beratInduksi: parseFloat(document.getElementById('induksiBerat').value) || 0,
        pen: document.getElementById('induksiPen').value.trim(),
        gigi: document.getElementById('induksiGigi').value.trim(),
        frameId: parseInt(document.getElementById('induksiFrame').value) || null,
        propertyId: parseInt(document.getElementById('induksiProperty').value) || null,
        vitamin: parseInt(document.getElementById('induksiVitamin').value) || 1,
        cattleTypeId: parseInt(document.getElementById('induksiJenis').value) || null
    };

    // Validation
    if (!data.rfid) {
        alert('RFID tidak boleh kosong!');
        return;
    }
    if (!data.beratInduksi) {
        alert('Berat tidak boleh kosong!');
        return;
    }

    try {
        await addItem('induksi', data);
        await loadInduksiTable(document.getElementById('induksiTableFilter').value);
        await loadInduksiSummary(document.getElementById('induksiSummaryFilter').value);
        clearInduksiForm();
        showNotification('Data berhasil disimpan!', 'success');
    } catch (error) {
        if (error.name === 'ConstraintError') {
            alert('RFID sudah ada dalam database!');
        } else {
            console.error('Error saving induksi:', error);
            alert('Gagal menyimpan data!');
        }
    }
}

// Clear form
function clearInduksiForm() {
    document.getElementById('induksiRfid').value = '';
    document.getElementById('induksiEartag').value = '';
    document.getElementById('induksiBerat').value = '';
    document.getElementById('induksiPen').value = '';
    document.getElementById('induksiGigi').value = '';
    document.getElementById('induksiVitamin').value = '1';
}

// Delete single item
async function deleteInduksi(id) {
    if (confirm('Hapus data ini?')) {
        await deleteItem('induksi', id);
        await loadInduksiTable(document.getElementById('induksiTableFilter').value);
        await loadInduksiSummary(document.getElementById('induksiSummaryFilter').value);
        showNotification('Data berhasil dihapus!', 'success');
    }
}

// Delete selected items
async function deleteSelectedInduksi() {
    const checkboxes = document.querySelectorAll('#induksiTableBody .row-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Pilih data yang akan dihapus!');
        return;
    }

    if (confirm(`Hapus ${checkboxes.length} data terpilih?`)) {
        for (const cb of checkboxes) {
            await deleteItem('induksi', parseInt(cb.dataset.id));
        }
        await loadInduksiTable(document.getElementById('induksiTableFilter').value);
        await loadInduksiSummary(document.getElementById('induksiSummaryFilter').value);
        document.getElementById('induksiSelectAll').checked = false;
        showNotification(`${checkboxes.length} data berhasil dihapus!`, 'success');
    }
}

// Export to Excel
async function exportInduksiExcel() {
    const data = await getAllItems('induksi');
    const exportData = [];

    for (const item of data) {
        const shipmentName = await getNameById('shipments', item.shipmentId);
        const frameName = await getNameById('frames', item.frameId);
        const propertyName = await getNameById('properties', item.propertyId);
        const typeName = await getNameById('cattleTypes', item.cattleTypeId);

        exportData.push({
            'Shipment': shipmentName,
            'RFID': item.rfid,
            'Tanggal Induksi': item.tanggalInduksi,
            'Eartag': item.eartag,
            'Berat Induksi': item.beratInduksi,
            'PEN': item.pen,
            'Gigi': item.gigi,
            'Frame': frameName,
            'Kode Property': propertyName,
            'Vitamin': item.vitamin,
            'Jenis Sapi': typeName
        });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Induksi');
    XLSX.writeFile(wb, `Induksi_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export berhasil!', 'success');
}

// Import from Excel
async function importInduksiExcel(event) {
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
                // Get or create references
                const shipmentId = await getOrCreateItem('shipments', row['Shipment']);
                const frameId = await getOrCreateItem('frames', row['Frame']);
                const propertyId = await getOrCreateItem('properties', row['Kode Property']);
                const cattleTypeId = await getOrCreateItem('cattleTypes', row['Jenis Sapi']);

                const item = {
                    shipmentId,
                    rfid: String(row['RFID'] || ''),
                    tanggalInduksi: row['Tanggal Induksi'] || new Date().toISOString().split('T')[0],
                    eartag: String(row['Eartag'] || ''),
                    beratInduksi: parseFloat(row['Berat Induksi']) || 0,
                    pen: String(row['PEN'] || ''),
                    gigi: String(row['Gigi'] || ''),
                    frameId,
                    propertyId,
                    vitamin: parseInt(row['Vitamin']) || 1,
                    cattleTypeId
                };

                try {
                    await addItem('induksi', item);
                    imported++;
                } catch (err) {
                    console.log('Skip duplicate:', item.rfid);
                }
            }

            await loadDropdowns();
            await loadInduksiTable();
            await loadInduksiSummary();
            showNotification(`Import berhasil! ${imported} data ditambahkan.`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal import file!');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// Get or create reference item
async function getOrCreateItem(storeName, name) {
    if (!name) return null;

    const existing = await getItemByIndex(storeName, 'name', name);
    if (existing) return existing.id;

    try {
        return await addItem(storeName, { name });
    } catch {
        const item = await getItemByIndex(storeName, 'name', name);
        return item ? item.id : null;
    }
}

// Download template
function downloadInduksiTemplate() {
    const template = [
        {
            'Shipment': 'SHIP001',
            'RFID': '123456789012345',
            'Tanggal Induksi': '2026-02-07',
            'Eartag': 'A001',
            'Berat Induksi': 250,
            'PEN': 'P1',
            'Gigi': '2',
            'Frame': 'Large',
            'Kode Property': 'PROP001',
            'Vitamin': 1,
            'Jenis Sapi': 'Brahman'
        }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Induksi.xlsx');
    showNotification('Template berhasil didownload!', 'success');
}

// Export summary
async function exportInduksiSummary() {
    const filter = document.getElementById('induksiSummaryFilter').value;
    let data = await getAllItems('induksi');

    if (filter) {
        data = data.filter(item => item.shipmentId == filter);
    }

    // Group by PEN
    const penGroups = {};
    for (const item of data) {
        if (!penGroups[item.pen]) {
            penGroups[item.pen] = {
                count: 0,
                totalWeight: 0,
                types: new Set(),
                frames: new Set()
            };
        }
        penGroups[item.pen].count++;
        penGroups[item.pen].totalWeight += item.beratInduksi;

        const typeName = await getNameById('cattleTypes', item.cattleTypeId);
        const frameName = await getNameById('frames', item.frameId);
        if (typeName) penGroups[item.pen].types.add(typeName);
        if (frameName) penGroups[item.pen].frames.add(frameName);
    }

    const exportData = [];
    for (const [pen, stats] of Object.entries(penGroups)) {
        exportData.push({
            'PEN': pen,
            'Jumlah Sapi': stats.count,
            'Total Berat (kg)': stats.totalWeight.toFixed(1),
            'Avg Berat (kg)': (stats.totalWeight / stats.count).toFixed(1),
            'Jenis Sapi': Array.from(stats.types).join(', '),
            'Frame': Array.from(stats.frames).join(', ')
        });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `Summary_Induksi_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export summary berhasil!', 'success');
}

// Helper: Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID');
}
