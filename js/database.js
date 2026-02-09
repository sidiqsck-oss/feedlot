// ===== IndexedDB Database Module =====

const DB_NAME = 'CattleManagementDB';
const DB_VERSION = 1;

let db = null;

// Initialize database
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Shipments store
            if (!database.objectStoreNames.contains('shipments')) {
                const shipmentStore = database.createObjectStore('shipments', { keyPath: 'id', autoIncrement: true });
                shipmentStore.createIndex('name', 'name', { unique: true });
            }

            // Frames store
            if (!database.objectStoreNames.contains('frames')) {
                const frameStore = database.createObjectStore('frames', { keyPath: 'id', autoIncrement: true });
                frameStore.createIndex('name', 'name', { unique: true });
            }

            // Properties store
            if (!database.objectStoreNames.contains('properties')) {
                const propertyStore = database.createObjectStore('properties', { keyPath: 'id', autoIncrement: true });
                propertyStore.createIndex('name', 'name', { unique: true });
            }

            // Cattle Types store
            if (!database.objectStoreNames.contains('cattleTypes')) {
                const cattleTypeStore = database.createObjectStore('cattleTypes', { keyPath: 'id', autoIncrement: true });
                cattleTypeStore.createIndex('name', 'name', { unique: true });
            }

            // Buyers store
            if (!database.objectStoreNames.contains('buyers')) {
                const buyerStore = database.createObjectStore('buyers', { keyPath: 'id', autoIncrement: true });
                buyerStore.createIndex('name', 'name', { unique: true });
            }

            // Induksi store
            if (!database.objectStoreNames.contains('induksi')) {
                const induksiStore = database.createObjectStore('induksi', { keyPath: 'id', autoIncrement: true });
                induksiStore.createIndex('rfid', 'rfid', { unique: true });
                induksiStore.createIndex('shipmentId', 'shipmentId', { unique: false });
                induksiStore.createIndex('pen', 'pen', { unique: false });
            }

            // Reweight store
            if (!database.objectStoreNames.contains('reweight')) {
                const reweightStore = database.createObjectStore('reweight', { keyPath: 'id', autoIncrement: true });
                reweightStore.createIndex('induksiId', 'induksiId', { unique: false });
                reweightStore.createIndex('penAwal', 'penAwal', { unique: false });
                reweightStore.createIndex('penAkhir', 'penAkhir', { unique: false });
            }

            // Sales store
            if (!database.objectStoreNames.contains('sales')) {
                const salesStore = database.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                salesStore.createIndex('buyerId', 'buyerId', { unique: false });
                salesStore.createIndex('tanggalJual', 'tanggalJual', { unique: false });
            }

            // Print Settings store
            if (!database.objectStoreNames.contains('printSettings')) {
                database.createObjectStore('printSettings', { keyPath: 'id' });
            }
        };
    });
}

// Generic CRUD operations
async function addItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteItem(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getItem(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getItemsByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getItemByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.get(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Helper function to get name by ID
async function getNameById(storeName, id) {
    const item = await getItem(storeName, id);
    return item ? item.name : '';
}
