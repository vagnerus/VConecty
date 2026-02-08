using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

// Worker Nativo Robusto para VConectY (Entrada de Alta Performance)
public class Worker {
    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    static extern int GetSystemMetrics(int nIndex);

    const int SM_CXSCREEN = 0;
    const int SM_CYSCREEN = 1;

    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
    private const int MOUSEEVENTF_LEFTUP = 0x04;
    private const int MOUSEEVENTF_RIGHTDOWN = 0x08;
    private const int MOUSEEVENTF_RIGHTUP = 0x10;
    private const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
    private const int MOUSEEVENTF_MIDDLEUP = 0x40;
    private const int MOUSEEVENTF_MOVE = 0x0001;
    private const int MOUSEEVENTF_WHEEL = 0x0800;

    public static void Main() {
        try {
            Console.WriteLine("WORKER PRONTO (V18)");
            
            // Obter Resolução da Tela via User32
            int screenW = GetSystemMetrics(SM_CXSCREEN);
            int screenH = GetSystemMetrics(SM_CYSCREEN);
            Console.WriteLine("TELA: " + screenW + "x" + screenH);

            string line;
            while ((line = Console.ReadLine()) != null) {
                try {
                    string[] parts = line.Split(',');
                    if (parts.Length == 0) continue;

                    char cmd = parts[0][0];

                    switch (cmd) {
                        case 'M': // Mover: M,x(0-1),y(0-1)
                            if (parts.Length >= 3) {
                                float x = float.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture);
                                float y = float.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                                int absX = (int)(x * screenW);
                                int absY = (int)(y * screenH);
                                Console.WriteLine("MOVER: " + absX + "," + absY);
                                SetCursorPos(absX, absY);
                                Console.WriteLine("MOVIDO OK");
                            }
                            break;

                        case 'R': // Mover Relativo: R,dx,dy
                            if (parts.Length >= 3) {
                                int dx = int.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture);
                                int dy = int.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                                mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, 0);
                                Console.WriteLine("MOV_REL: " + dx + "," + dy);
                            }
                            break;

                        case 'C': // Clicar: C,esquerda
                        case 'D': // Baixar: D,esquerda
                        case 'U': // Levantar: U,esquerda
                            if (parts.Length >= 2) {
                                string btn = parts[1].ToLower();
                                int down = 0, up = 0;
                                if (btn == "left") { down = MOUSEEVENTF_LEFTDOWN; up = MOUSEEVENTF_LEFTUP; }
                                else if (btn == "right") { down = MOUSEEVENTF_RIGHTDOWN; up = MOUSEEVENTF_RIGHTUP; }
                                else if (btn == "middle") { down = MOUSEEVENTF_MIDDLEDOWN; up = MOUSEEVENTF_MIDDLEUP; }

                                if (cmd == 'C') mouse_event(down | up, 0, 0, 0, 0);
                                else if (cmd == 'D') mouse_event(down, 0, 0, 0, 0);
                                else if (cmd == 'U') mouse_event(up, 0, 0, 0, 0);
                            }
                            break;
                        
                        case 'S': // Rolar: S,x,y
                             if (parts.Length >= 3) {
                                int sy = (int)float.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture);
                                if (sy != 0) mouse_event(MOUSEEVENTF_WHEEL, 0, 0, sy * 120, 0); 
                             }
                             break;

                        case 'K': // Tecla: K,tecla
                             if (parts.Length >= 2) {
                                 try {
                                     string key = parts[1];
                                     // Mapeamento Básico
                                     if(key == "Enter") key = "{ENTER}";
                                     else if(key == "Backspace") key = "{BACKSPACE}";
                                     else if(key == "ArrowUp") key = "{UP}";
                                     else if(key == "ArrowDown") key = "{DOWN}";
                                     else if(key == "ArrowLeft") key = "{LEFT}";
                                     else if(key == "ArrowRight") key = "{RIGHT}";
                                     else if(key == "Escape") key = "{ESC}";
                                     else if(key == "Tab") key = "{TAB}";
                                     else if(key == "Delete") key = "{DEL}";
                                     else if(key == " ") key = " ";
                                     else if(key.Length == 1) key = key.ToLower(); // SendKeys lida com maiúsculas/minúsculas
                                     
                                     // SendKeys.SendWait(key);
                                     SendKeys.SendWait(key);
                                 } catch (Exception k) {
                                     Console.WriteLine("ERRO TECLA: " + k.Message);
                                 }
                             }
                             break;
                    }
                } catch (Exception e) {
                    Console.WriteLine("ERRO: " + e.Message);
                }
            }
        } catch (Exception fatal) {
            Console.WriteLine("FATAL: " + fatal.Message);
        }
    }
}
