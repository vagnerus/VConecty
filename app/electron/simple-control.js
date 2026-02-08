const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class SimpleWindowsControl {
    constructor() {
        this.platform = process.platform;
        this.worker = null;

        // Handle path for Dev vs Production (packaged)
        // In production (unpackaged output), resourcesPath is set. In dev, use __dirname.
        if (process.resourcesPath && !process.env.ELECTRON_IS_DEV) {
            this.workerPath = path.join(process.resourcesPath, 'MouseWorker.exe');
        } else {
            this.workerPath = path.join(__dirname, 'MouseWorker.exe');
        }

        console.log('[CONTROL] Worker path:', this.workerPath);

        if (this.platform === 'win32') {
            this.startWorker();
        } else {
            console.warn('[CONTROL] Mouse control only supported on Windows');
        }
    }

    startWorker() {
        if (!fs.existsSync(this.workerPath)) {
            console.error('[CONTROL] MouseWorker.exe not found at:', this.workerPath);
            return;
        }

        console.log('[CONTROL] Starting MouseWorker...');
        this.worker = spawn(this.workerPath);

        this.worker.stdin.setDefaultEncoding('utf-8');

        this.worker.stdout.on('data', (data) => {
            console.log(`[WORKER] ${data}`);
        });

        this.worker.stderr.on('data', (data) => {
            console.error(`[WORKER ERR] ${data}`);
        });

        this.worker.on('close', (code) => {
            console.log(`[WORKER] process exited with code ${code}`);
            this.worker = null;
        });

        // Initial handshake
        this.worker.stdin.write("\n");
    }

    sendCommand(cmd) {
        if (!this.worker) {
            // Try restart if dead
            if (this.platform === 'win32') this.startWorker();
        }

        if (this.worker && this.worker.stdin.writable) {
            try {
                this.worker.stdin.write(cmd + "\n");
            } catch (e) {
                console.error('[CONTROL] Write error:', e);
            }
        }
    }

    moveMouse(x, y) {
        // x, y are absolute coordinates
        this.sendCommand(`M ${Math.floor(x)} ${Math.floor(y)}`);
    }

    mouseClick(button = 'left') {
        const btn = button.toUpperCase();
        this.sendCommand(`MD ${btn}`);
        this.sendCommand(`MU ${btn}`);
    }

    mouseDown(button = 'left') {
        const btn = button.toUpperCase();
        this.sendCommand(`MD ${btn}`);
    }

    mouseUp(button = 'left') {
        const btn = button.toUpperCase();
        this.sendCommand(`MU ${btn}`);
    }

    scroll(deltaX, deltaY) {
        this.sendCommand(`W 0 ${Math.floor(deltaY)}`);
    }

    typeText(text) {
        this.sendCommand(`T ${text}`);
    }

    sendKey(key) {
        this.sendCommand(`KD ${key}`);
        setTimeout(() => {
            this.sendCommand(`KU ${key}`);
        }, 50);
    }
}

module.exports = SimpleWindowsControl;
