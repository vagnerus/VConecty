// robot-control.js - Controlador Windows de Alta Performance via Worker C#
const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

class WindowsController {
    constructor() {
        this.worker = null;
        this.ensureWorker();
    }

    ensureWorker() {
        if (this.worker && !this.worker.killed) return;

        try {
            const workerPath = app.isPackaged
                ? path.join(process.resourcesPath, 'worker.exe')
                : path.join(__dirname, 'worker.exe');

            console.log('[ROBOT] Iniciando worker:', workerPath);

            this.worker = spawn(workerPath, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true
            });

            this.worker.stdout.on('data', (data) => console.log(`[WORKER OUT] ${data}`));
            this.worker.stderr.on('data', (data) => console.error(`[WORKER ERR] ${data}`));

            this.worker.on('error', (err) => console.error('[ROBOT] Erro no Worker:', err));
            this.worker.on('exit', (code) => {
                console.log('[ROBOT] Worker encerrou:', code);
                this.worker = null;
            });

            // Mecanismo de manter ativo? Apenas reinicia no próximo comando
        } catch (e) {
            console.error('[ROBOT] Falha ao iniciar worker:', e);
        }
    }

    async executeCommand(data) {
        this.ensureWorker();
        if (!this.worker) return { success: false, error: "Nenhum worker ativo" };

        try {
            let cmdStr = "";
            switch (data.type) {
                case 'mouse-move':
                    // M,x,y (Cliente envia normalizado 0-1)
                    // Worker espera 0-1 float para multiplicar pelo tamanho da tela
                    cmdStr = `M,${data.x},${data.y}\n`;
                    break;
                case 'mouse-down':
                    cmdStr = `D,${data.button || 'left'}\n`;
                    break;
                case 'mouse-up':
                    cmdStr = `U,${data.button || 'left'}\n`;
                    break;
                case 'mouse-relative':
                    // R,dx,dy
                    cmdStr = `R,${data.dx || 0},${data.dy || 0}\n`;
                    break;
                case 'key-down':
                case 'key-press':
                    // Mapeia key-down para envio direto
                    cmdStr = `K,${data.key}\n`;
                    break;
            }

            if (cmdStr) {
                console.log('[ROBOT] 📤 Enviando para worker:', cmdStr.trim());
                this.worker.stdin.write(cmdStr);
            }
            return { success: true };
        } catch (e) {
            console.error('[ROBOT] Erro ao validar comando:', e);
            return { success: false, error: e.message };
        }
    }
}

module.exports = new WindowsController();
