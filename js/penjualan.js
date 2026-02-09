// ===== Penjualan Module =====

let currentSalesList = [];
let currentPenjualanInduksi = null;

// Initialize Penjualan module
async function initPenjualanModule() {
    await loadBuyerDropdown();
    await loadSalesHistory();
    setupPenjualanEventListeners();
    setPenjualanDefaultDate();
    loadPrintSettings();
}

// Set default date
function setPenjualanDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('penjualanTanggal').value = today;
}

// Load buyer dropdown
async function loadBuyerDropdown() {
    const buyers = await getAllItems('buyers');
    const select = document.getElementById('penjualanPembeli');
    select.innerHTML = '<option value="">Pilih Pembeli</option>';
    buyers.forEach(buyer => {
        const option = document.createElement('option');
        option.value = buyer.id;
        option.textContent = buyer.name;
        select.appendChild(option);
    });
}

// Load sales history
async function loadSalesHistory() {
    const tbody = document.getElementById('salesHistoryBody');
    tbody.innerHTML = '';

    const sales = await getAllItems('sales');

    // Group by buyer and date
    const grouped = {};
    for (const sale of sales) {
        const key = `${sale.buyerId}_${sale.tanggalJual}`;
        if (!grouped[key]) {
            grouped[key] = {
                buyerId: sale.buyerId,
                tanggalJual: sale.tanggalJual,
                count: 0,
                totalWeight: 0,
                items: []
            };
        }

        const induksi = await getItem('induksi', sale.induksiId);
        if (induksi) {
            grouped[key].count++;
            grouped[key].totalWeight += sale.beratJual;
            grouped[key].items.push({ ...sale, induksi });
        }
    }

    // Render
    for (const [key, data] of Object.entries(grouped)) {
        const buyerName = await getNameById('buyers', data.buyerId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(data.tanggalJual)}</td>
            <td>${buyerName}</td>
            <td>${data.count}</td>
            <td>${data.totalWeight.toFixed(1)} kg</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewSalesDetail('${key}')">👁️ Detail</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Setup event listeners
function setupPenjualanEventListeners() {
    // RFID input
    document.getElementById('penjualanRfid').addEventListener('change', lookupInduksiForSale);
    document.getElementById('penjualanRfid').addEventListener('input', debounce(lookupInduksiForSale, 500));

    // Add to list
    document.getElementById('penjualanSubmit').addEventListener('click', addToSalesList);

    // Clear
    document.getElementById('penjualanClear').addEventListener('click', clearPenjualanForm);

    // Print settings
    document.getElementById('penjualanPrintSettings').addEventListener('click', () => {
        openModal('printSettingsModal');
    });

    // Save print settings
    document.getElementById('savePrintSettings').addEventListener('click', savePrintSettings);

    // Logo preview
    document.getElementById('printLogo').addEventListener('change', handleLogoUpload);

    // Print invoice
    document.getElementById('penjualanPrintInvoice').addEventListener('click', generateInvoicePDF);

    // Export staff excel
    document.getElementById('penjualanExportStaff').addEventListener('click', exportStaffExcel);
}

// Lookup induksi for sale
async function lookupInduksiForSale() {
    const rfid = document.getElementById('penjualanRfid').value.trim();
    if (!rfid) return;

    const induksi = await getItemByIndex('induksi', 'rfid', rfid);
    if (induksi) {
        currentPenjualanInduksi = induksi;
        document.getElementById('penjualanEartag').value = induksi.eartag;

        const shipmentName = await getNameById('shipments', induksi.shipmentId);
        document.getElementById('penjualanShipment').value = shipmentName;
    } else {
        currentPenjualanInduksi = null;
        document.getElementById('penjualanEartag').value = '';
        document.getElementById('penjualanShipment').value = '';
    }
}

// Add to sales list
async function addToSalesList() {
    if (!currentPenjualanInduksi) {
        alert('Data induksi tidak ditemukan! Scan RFID terlebih dahulu.');
        return;
    }

    const beratJual = parseFloat(document.getElementById('penjualanBerat').value) || 0;
    if (!beratJual) {
        alert('Berat tidak boleh kosong!');
        return;
    }

    // Check if already in list
    if (currentSalesList.find(item => item.induksi.rfid === currentPenjualanInduksi.rfid)) {
        alert('Sapi ini sudah ada dalam list!');
        return;
    }

    const shipmentName = await getNameById('shipments', currentPenjualanInduksi.shipmentId);

    currentSalesList.push({
        induksi: currentPenjualanInduksi,
        beratJual,
        shipmentName
    });

    renderSalesList();

    // Clear for next entry
    document.getElementById('penjualanRfid').value = '';
    document.getElementById('penjualanEartag').value = '';
    document.getElementById('penjualanShipment').value = '';
    document.getElementById('penjualanBerat').value = '';
    currentPenjualanInduksi = null;
}

// Render sales list
function renderSalesList() {
    const tbody = document.getElementById('penjualanTableBody');
    tbody.innerHTML = '';

    currentSalesList.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.induksi.rfid}</td>
            <td>${item.induksi.eartag}</td>
            <td>${item.shipmentName}</td>
            <td>${item.beratJual.toFixed(1)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removeFromSalesList(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Remove from list
function removeFromSalesList(index) {
    currentSalesList.splice(index, 1);
    renderSalesList();
}

// Clear form
function clearPenjualanForm() {
    document.getElementById('penjualanRfid').value = '';
    document.getElementById('penjualanEartag').value = '';
    document.getElementById('penjualanShipment').value = '';
    document.getElementById('penjualanBerat').value = '';
    currentPenjualanInduksi = null;
    currentSalesList = [];
    renderSalesList();
}

// Handle logo upload
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('printLogoPreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Save print settings
async function savePrintSettings() {
    const logoPreview = document.getElementById('printLogoPreview');

    const settings = {
        id: 'default',
        header: document.getElementById('printHeader').value,
        address: document.getElementById('printAddress').value,
        logo: logoPreview.src || null,
        pageSize: document.getElementById('printPageSize').value
    };

    await updateItem('printSettings', settings);
    closeModal('printSettingsModal');
    showNotification('Print settings berhasil disimpan!', 'success');
}

// Load print settings
async function loadPrintSettings() {
    const settings = await getItem('printSettings', 'default');
    if (settings) {
        document.getElementById('printHeader').value = settings.header || '';
        document.getElementById('printAddress').value = settings.address || '';
        document.getElementById('printPageSize').value = settings.pageSize || 'a4';

        if (settings.logo) {
            const preview = document.getElementById('printLogoPreview');
            preview.src = settings.logo;
            preview.style.display = 'block';
        }
    }
}

// Generate Invoice PDF
async function generateInvoicePDF() {
    if (currentSalesList.length === 0) {
        alert('Tidak ada data untuk di-print!');
        return;
    }

    const buyerId = document.getElementById('penjualanPembeli').value;
    if (!buyerId) {
        alert('Pilih pembeli terlebih dahulu!');
        return;
    }

    const buyerName = await getNameById('buyers', parseInt(buyerId));
    const tanggalJual = document.getElementById('penjualanTanggal').value;
    const settings = await getItem('printSettings', 'default') || {};

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: settings.pageSize || 'a4'
    });

    let yPos = 20;

    // Logo
    if (settings.logo) {
        try {
            doc.addImage(settings.logo, 'PNG', 15, yPos, 30, 20);
            yPos += 5;
        } catch (e) {
            console.log('Error adding logo:', e);
        }
    }

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(settings.header || 'INVOICE PENJUALAN', settings.logo ? 50 : 15, yPos);
    yPos += 8;

    // Address
    if (settings.address) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(settings.address, settings.logo ? 50 : 15, yPos);
        yPos += 10;
    }

    yPos = Math.max(yPos, 45);

    // Divider
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 195, yPos);
    yPos += 10;

    // Invoice info
    doc.setFontSize(11);
    doc.text(`Tanggal: ${formatDate(tanggalJual)}`, 15, yPos);
    doc.text(`Pembeli: ${buyerName}`, 15, yPos + 6);
    yPos += 18;

    // Table
    const tableData = currentSalesList.map((item, index) => [
        index + 1,
        item.induksi.eartag,
        item.induksi.rfid,
        item.shipmentName,
        `${item.beratJual.toFixed(1)} kg`
    ]);

    // Total
    const totalWeight = currentSalesList.reduce((sum, item) => sum + item.beratJual, 0);
    tableData.push(['', '', '', 'TOTAL', `${totalWeight.toFixed(1)} kg`]);

    doc.autoTable({
        startY: yPos,
        head: [['No', 'Eartag', 'RFID', 'Shipment', 'Berat']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 15 },
            4: { halign: 'right' }
        }
    });

    // Save sales to database
    for (const item of currentSalesList) {
        const saleData = {
            induksiId: item.induksi.id,
            buyerId: parseInt(buyerId),
            tanggalJual,
            beratJual: item.beratJual
        };
        await addItem('sales', saleData);
    }

    // Save PDF
    doc.save(`Invoice_${buyerName}_${tanggalJual}.pdf`);

    // Clear and reload
    clearPenjualanForm();
    await loadSalesHistory();
    showNotification('Invoice berhasil dibuat!', 'success');
}

// Export Staff Excel
async function exportStaffExcel() {
    if (currentSalesList.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    const buyerId = document.getElementById('penjualanPembeli').value;
    const buyerName = buyerId ? await getNameById('buyers', parseInt(buyerId)) : 'Unknown';
    const tanggalJual = document.getElementById('penjualanTanggal').value;

    const exportData = [];

    for (const item of currentSalesList) {
        const induksi = item.induksi;

        // Get reweight data if exists
        const reweightData = await getItemsByIndex('reweight', 'induksiId', induksi.id);
        const lastReweight = reweightData.length > 0 ? reweightData[reweightData.length - 1] : null;

        // Calculate DOF Induksi
        const tanggalInduksi = new Date(induksi.tanggalInduksi);
        const tanggalJualDate = new Date(tanggalJual);
        const dofInduksi = Math.floor((tanggalJualDate - tanggalInduksi) / (1000 * 60 * 60 * 24));

        // Calculate ADG Induksi
        const adgInduksi = dofInduksi > 0 ? (item.beratJual - induksi.beratInduksi) / dofInduksi : 0;

        // Calculate DOF/ADG Reweight (if exists)
        let dofReweight = '';
        let adgReweight = '';

        if (lastReweight) {
            const tanggalReweight = new Date(lastReweight.tanggalReweight);
            dofReweight = Math.floor((tanggalJualDate - tanggalReweight) / (1000 * 60 * 60 * 24));
            adgReweight = dofReweight > 0 ? (item.beratJual - lastReweight.beratReweight) / dofReweight : 0;
        }

        const frameName = await getNameById('frames', induksi.frameId);
        const typeName = await getNameById('cattleTypes', induksi.cattleTypeId);

        exportData.push({
            'Pembeli': buyerName,
            'Tanggal Jual': tanggalJual,
            'RFID': induksi.rfid,
            'Eartag': induksi.eartag,
            'Shipment': item.shipmentName,
            'Berat Induksi': induksi.beratInduksi,
            'Berat Jual': item.beratJual,
            'DOF Induksi': dofInduksi,
            'ADG Induksi': adgInduksi.toFixed(3),
            'Berat Reweight': lastReweight ? lastReweight.beratReweight : '',
            'DOF Reweight': dofReweight,
            'ADG Reweight': adgReweight ? adgReweight.toFixed(3) : '',
            'Frame': frameName,
            'Jenis Sapi': typeName
        });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Export');
    XLSX.writeFile(wb, `Staff_Export_${tanggalJual}.xlsx`);
    showNotification('Export staff berhasil!', 'success');
}

// View sales detail (placeholder)
async function viewSalesDetail(key) {
    // Can be expanded to show detail modal
    alert('Fitur detail akan segera hadir!');
}
