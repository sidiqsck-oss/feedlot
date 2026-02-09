// ===== Web Serial API Module =====

let scannerPort = null;
let scannerReader = null;
let scalePort = null;
let scaleReader = null;

let scannerBuffer = '';
let scaleBuffer = '';

// Check if Web Serial API is available
function isWebSerialSupported() {
    return 'serial' in navigator;
}

// Connect to Scanner RS232
async function connectScanner() {
    if (!isWebSerialSupported()) {
        alert('Web Serial API tidak didukung di browser ini. Gunakan Chrome atau Edge terbaru.');
        return false;
    }

    try {
        scannerPort = await navigator.serial.requestPort();
        await scannerPort.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
        });

        updateScannerStatus(true);
        readFromScanner();
        return true;
    } catch (error) {
        console.error('Error connecting scanner:', error);
        return false;
    }
}

// Read from Scanner
async function readFromScanner() {
    if (!scannerPort || !scannerPort.readable) return;

    scannerReader = scannerPort.readable.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { value, done } = await scannerReader.read();
            if (done) break;

            const text = decoder.decode(value);
            scannerBuffer += text;

            // Check for complete RFID (usually ends with newline or carriage return)
            const lines = scannerBuffer.split(/[\r\n]+/);
            if (lines.length > 1) {
                const rfid = lines[0].trim();
                if (rfid.length >= 10 && rfid.length <= 20) {
                    handleScannerData(rfid);
                }
                scannerBuffer = lines.slice(1).join('');
            }
        }
    } catch (error) {
        console.error('Error reading from scanner:', error);
    }
}

// Handle scanner data
function handleScannerData(rfid) {
    // Dispatch custom event with RFID data
    window.dispatchEvent(new CustomEvent('rfidScanned', { detail: { rfid } }));

    // Auto-copy to active RFID input
    const activeRfidInput = document.querySelector('.module.active input[id$="Rfid"]');
    if (activeRfidInput) {
        activeRfidInput.value = rfid;
        activeRfidInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeRfidInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Disconnect Scanner
async function disconnectScanner() {
    try {
        if (scannerReader) {
            await scannerReader.cancel();
            scannerReader.releaseLock();
            scannerReader = null;
        }
        if (scannerPort) {
            await scannerPort.close();
            scannerPort = null;
        }
        scannerBuffer = '';
        updateScannerStatus(false);
        return true;
    } catch (error) {
        console.error('Error disconnecting scanner:', error);
        return false;
    }
}

// Connect to Scale
async function connectScale() {
    if (!isWebSerialSupported()) {
        alert('Web Serial API tidak didukung di browser ini. Gunakan Chrome atau Edge terbaru.');
        return false;
    }

    try {
        scalePort = await navigator.serial.requestPort();
        await scalePort.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
        });

        updateScaleStatus(true);
        readFromScale();
        return true;
    } catch (error) {
        console.error('Error connecting scale:', error);
        return false;
    }
}

// Read from Scale
async function readFromScale() {
    if (!scalePort || !scalePort.readable) return;

    scaleReader = scalePort.readable.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { value, done } = await scaleReader.read();
            if (done) break;

            const text = decoder.decode(value);
            scaleBuffer += text;

            // Parse weight data (format varies by scale manufacturer)
            const lines = scaleBuffer.split(/[\r\n]+/);
            if (lines.length > 1) {
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    const weight = parseWeight(line);
                    if (weight !== null) {
                        handleScaleData(weight);
                    }
                }
                scaleBuffer = lines[lines.length - 1];
            }
        }
    } catch (error) {
        console.error('Error reading from scale:', error);
    }
}

// Parse weight from scale data
function parseWeight(data) {
    // Common patterns for digital scales
    // Pattern 1: "ST,GS,    125.5kg" or similar
    // Pattern 2: "   125.5 kg"
    // Pattern 3: Just number "125.5"

    const patterns = [
        /([+-]?\d+\.?\d*)\s*kg/i,
        /GS[,\s]+([+-]?\d+\.?\d*)/i,
        /^[+-]?\d+\.?\d*$/
    ];

    for (const pattern of patterns) {
        const match = data.match(pattern);
        if (match) {
            const weight = parseFloat(match[1] || match[0]);
            if (!isNaN(weight) && weight >= 0 && weight < 2000) {
                return weight;
            }
        }
    }
    return null;
}

// Handle scale data
function handleScaleData(weight) {
    // Update weight display
    const weightValue = document.getElementById('weightValue');
    if (weightValue) {
        weightValue.textContent = weight.toFixed(1);
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('weightUpdated', { detail: { weight } }));

    // Auto-fill active weight input
    const activeWeightInput = document.querySelector('.module.active input[id$="Berat"]:not([readonly])');
    if (activeWeightInput) {
        activeWeightInput.value = weight.toFixed(1);
        activeWeightInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Disconnect Scale
async function disconnectScale() {
    try {
        if (scaleReader) {
            await scaleReader.cancel();
            scaleReader.releaseLock();
            scaleReader = null;
        }
        if (scalePort) {
            await scalePort.close();
            scalePort = null;
        }
        scaleBuffer = '';
        updateScaleStatus(false);
        document.getElementById('weightValue').textContent = '0.0';
        return true;
    } catch (error) {
        console.error('Error disconnecting scale:', error);
        return false;
    }
}

// Update UI status
function updateScannerStatus(connected) {
    const statusDot = document.getElementById('scannerStatusDot');
    const statusText = document.getElementById('scannerStatusText');
    const connectBtn = document.getElementById('connectScanner');
    const disconnectBtn = document.getElementById('disconnectScanner');

    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    }
}

function updateScaleStatus(connected) {
    const statusDot = document.getElementById('scaleStatusDot');
    const statusText = document.getElementById('scaleStatusText');
    const connectBtn = document.getElementById('connectScale');
    const disconnectBtn = document.getElementById('disconnectScale');
    const weightStatus = document.getElementById('weightStatus');

    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        weightStatus.textContent = 'Connected';
        weightStatus.classList.add('connected');
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        weightStatus.textContent = 'Disconnected';
        weightStatus.classList.remove('connected');
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    }
}

// Simulate weight for testing (can be removed in production)
function simulateWeight(weight) {
    handleScaleData(weight);
}

function simulateRFID(rfid) {
    handleScannerData(rfid);
}
