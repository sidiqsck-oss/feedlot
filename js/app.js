// ===== Main Application =====

// Current add modal type
let currentAddType = '';

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    // Initialize database
    await initDatabase();

    // Initialize modules
    await initInduksiModule();
    await initReweightModule();
    await initPenjualanModule();

    // Setup navigation
    setupNavigation();

    // Setup settings
    setupSettings();

    // Setup add modal
    setupAddModal();

    console.log('Application initialized');
});

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const module = btn.dataset.module;
            switchModule(module);
        });
    });
}

// Switch module
function switchModule(moduleName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.module === moduleName) {
            btn.classList.add('active');
        }
    });

    // Update modules
    document.querySelectorAll('.module').forEach(mod => {
        mod.classList.remove('active');
    });
    document.getElementById(`${moduleName}Module`).classList.add('active');

    // Refresh module data
    if (moduleName === 'induksi') {
        loadInduksiTable(document.getElementById('induksiTableFilter').value);
        loadInduksiSummary(document.getElementById('induksiSummaryFilter').value);
    } else if (moduleName === 'reweight') {
        loadReweightTable(document.getElementById('reweightTableFilter').value);
        loadReweightSummaries();
    } else if (moduleName === 'penjualan') {
        loadSalesHistory();
    }
}

// Setup settings
function setupSettings() {
    document.getElementById('settingsBtn').addEventListener('click', () => {
        openModal('settingsModal');
    });

    document.getElementById('connectScanner').addEventListener('click', async () => {
        await connectScanner();
    });

    document.getElementById('disconnectScanner').addEventListener('click', async () => {
        await disconnectScanner();
    });

    document.getElementById('connectScale').addEventListener('click', async () => {
        await connectScale();
    });

    document.getElementById('disconnectScale').addEventListener('click', async () => {
        await disconnectScale();
    });

    // Supabase sync handlers
    const supPushBtn = document.getElementById('supabasePush');
    const supPullBtn = document.getElementById('supabasePull');
    const supStatusDot = document.getElementById('supabaseStatusDot');
    const supStatusText = document.getElementById('supabaseStatusText');

    function setSupStatus(colorText) {
        if (!supStatusDot || !supStatusText) return;
        if (colorText === 'ok') {
            supStatusDot.style.background = '#10b981';
            supStatusText.textContent = 'Configured';
        } else if (colorText === 'busy') {
            supStatusDot.style.background = '#f59e0b';
            supStatusText.textContent = 'Syncing...';
        } else {
            supStatusDot.style.background = '#6b7280';
            supStatusText.textContent = 'Not Configured';
        }
    }

    if (window.supabaseClient) setSupStatus('ok');

    async function pushAllStores() {
        if (!window.syncStoreToSupabase) {
            showNotification('Supabase not configured', 'error');
            return;
        }
        const stores = ['induksi','reweight','sales','buyers','shipments','frames','properties','cattleTypes'];
        setSupStatus('busy');
        for (const s of stores) {
            try {
                await window.syncStoreToSupabase(s);
                showNotification(`Pushed ${s}`, 'success');
            } catch (err) {
                console.error('Push error', s, err);
                showNotification(`Push failed: ${s}`, 'error');
            }
        }
        setSupStatus(window.supabaseClient ? 'ok' : '');
    }

    async function pullAllStores() {
        if (!window.pullStoreFromSupabase) {
            showNotification('Supabase not configured', 'error');
            return;
        }
        const stores = ['induksi','reweight','sales','buyers','shipments','frames','properties','cattleTypes'];
        // Confirm before pulling since it overwrites local data
        const confirmed = await confirmDialog('Pull akan menimpa data lokal. Lanjutkan?', 'Konfirmasi Pull');
        if (!confirmed) {
            showNotification('Pull dibatalkan', 'info');
            return;
        }
        setSupStatus('busy');
        for (const s of stores) {
            try {
                await window.pullStoreFromSupabase(s);
                showNotification(`Pulled ${s}`, 'success');
            } catch (err) {
                console.error('Pull error', s, err);
                showNotification(`Pull failed: ${s}`, 'error');
            }
        }
        setSupStatus(window.supabaseClient ? 'ok' : '');
    }

    if (supPushBtn) supPushBtn.addEventListener('click', pushAllStores);
    if (supPullBtn) supPullBtn.addEventListener('click', pullAllStores);
}

// Setup add modal
function setupAddModal() {
    document.getElementById('addModalSubmit').addEventListener('click', submitAddModal);

    document.getElementById('addModalInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAddModal();
        }
    });
}

// Show add modal
function showAddModal(type) {
    currentAddType = type;
    const modal = document.getElementById('addModal');
    const title = document.getElementById('addModalTitle');
    const label = document.getElementById('addModalLabel');
    const input = document.getElementById('addModalInput');

    const titles = {
        'shipment': 'Tambah Shipment',
        'frame': 'Tambah Frame',
        'property': 'Tambah Kode Property',
        'cattleType': 'Tambah Jenis Sapi',
        'buyer': 'Tambah Pembeli'
    };

    title.textContent = titles[type] || 'Tambah Item';
    label.textContent = 'Nama';
    input.value = '';
    input.placeholder = `Masukkan nama ${type}`;

    openModal('addModal');
    input.focus();
}

// Submit add modal
async function submitAddModal() {
    const input = document.getElementById('addModalInput');
    const name = input.value.trim();

    if (!name) {
        alert('Nama tidak boleh kosong!');
        return;
    }

    const storeMap = {
        'shipment': 'shipments',
        'frame': 'frames',
        'property': 'properties',
        'cattleType': 'cattleTypes',
        'buyer': 'buyers'
    };

    const storeName = storeMap[currentAddType];
    if (!storeName) return;

    try {
        await addItem(storeName, { name });
        closeModal('addModal');

        // Refresh dropdowns
        if (currentAddType === 'shipment') {
            await loadShipmentDropdowns();
            await loadReweightDropdowns();
        } else if (currentAddType === 'frame') {
            await loadFrameDropdown();
        } else if (currentAddType === 'property') {
            await loadPropertyDropdown();
        } else if (currentAddType === 'cattleType') {
            await loadCattleTypeDropdown();
        } else if (currentAddType === 'buyer') {
            await loadBuyerDropdown();
        }

        showNotification(`${name} berhasil ditambahkan!`, 'success');
    } catch (error) {
        if (error.name === 'ConstraintError') {
            alert('Nama sudah ada!');
        } else {
            console.error('Error adding item:', error);
            alert('Gagal menambahkan item!');
        }
    }
}

// Modal helpers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Confirmation dialog helper (returns Promise<boolean>)
function confirmDialog(message, title = 'Konfirmasi') {
    return new Promise((resolve) => {
        const modalId = 'confirmModal';
        const msgEl = document.getElementById('confirmModalMessage');
        const titleEl = document.getElementById('confirmModalTitle');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        const closeBtn = document.getElementById('confirmCloseBtn');

        if (!msgEl || !okBtn || !cancelBtn) {
            // Fallback to native confirm
            const res = window.confirm(message);
            resolve(res);
            return;
        }

        msgEl.textContent = message;
        titleEl.textContent = title;

        function cleanup() {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn && closeBtn.removeEventListener('click', onCancel);
            closeModal(modalId);
        }

        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        if (closeBtn) closeBtn.addEventListener('click', onCancel);

        openModal(modalId);
    });
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
    }
});

// Notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;

    // Add styles if not exists
    if (!document.getElementById('notificationStyles')) {
        const styles = document.createElement('style');
        styles.id = 'notificationStyles';
        styles.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                display: flex;
                align-items: center;
                gap: 1rem;
                animation: slideIn 0.3s ease;
                z-index: 1000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .notification-success { background: linear-gradient(135deg, #10b981, #059669); }
            .notification-error { background: linear-gradient(135deg, #ef4444, #dc2626); }
            .notification-info { background: linear-gradient(135deg, #6366f1, #4f46e5); }
            .notification button {
                background: transparent;
                border: none;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Ctrl+1/2/3 for module switching
    if (e.ctrlKey) {
        if (e.key === '1') {
            e.preventDefault();
            switchModule('induksi');
        } else if (e.key === '2') {
            e.preventDefault();
            switchModule('reweight');
        } else if (e.key === '3') {
            e.preventDefault();
            switchModule('penjualan');
        }
    }
});
