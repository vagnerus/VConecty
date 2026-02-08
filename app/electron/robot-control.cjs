// robot-control.js - Windows native control without robotjs
const { exec } = require('child_process');
const { screen } = require('electron');

class WindowsController {
    async executeCommand(data) {
        const display = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = display.bounds;

        switch (data.type) {
            case 'mouse-move':
                return this.moveMouse(data.x * screenWidth, data.y * screenHeight);
            case 'mouse-click':
                return this.mouseClick(data.button || 'left');
            case 'key-press':
                return this.keyPress(data.key, data.modifiers);
        }
    }

    async moveMouse(x, y) {
        const script = `
            Add-Type -AssemblyName System.Windows.Forms;
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.floor(x)}, ${Math.floor(y)})
        `.replace(/\s+/g, ' ');

        return this.runPowerShell(script);
    }

    async mouseClick(button) {
        const eventFlag = button === 'left' ? 0x06 : 0x18; // LEFTDOWN | LEFTUP or RIGHTDOWN | RIGHTUP
        const script = `
            Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
}
"@;
            [WinAPI]::mouse_event(${eventFlag}, 0, 0, 0, 0)
        `.replace(/\s+/g, ' ');

        return this.runPowerShell(script);
    }

    async keyPress(key, modifiers = []) {
        let keyStr = key;
        if (modifiers.length > 0) {
            const mods = modifiers.map(m => {
                if (m === 'control') return '^';
                if (m === 'shift') return '+';
                if (m === 'alt') return '%';
                return '';
            }).join('');
            keyStr = mods + key;
        }

        const script = `
            Add-Type -AssemblyName System.Windows.Forms;
            [System.Windows.Forms.SendKeys]::SendWait('${keyStr}')
        `.replace(/\s+/g, ' ');

        return this.runPowerShell(script);
    }

    runPowerShell(script) {
        return new Promise((resolve) => {
            exec(`powershell -Command "${script}"`, (error) => {
                resolve({ success: !error, error: error?.message });
            });
        });
    }
}

module.exports = new WindowsController();
