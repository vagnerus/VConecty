using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;

namespace VConectY.Worker
{
    class Program
    {
        // P/Invoke declarations
        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        // Constants
        const int MOUSEEVENTF_LEFTDOWN = 0x02;
        const int MOUSEEVENTF_LEFTUP = 0x04;
        const int MOUSEEVENTF_RIGHTDOWN = 0x08;
        const int MOUSEEVENTF_RIGHTUP = 0x10;
        const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
        const int MOUSEEVENTF_MIDDLEUP = 0x40;
        const int MOUSEEVENTF_WHEEL = 0x800;

        const int KEYEVENTF_KEYUP = 0x0002;

        [STAThread]
        static void Main(string[] args)
        {
            Console.WriteLine("READY");
            
            while (true)
            {
                try
                {
                    string line = Console.ReadLine();
                    if (string.IsNullOrEmpty(line)) break; // End of stream

                    ProcessCommand(line);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("Error: " + ex.Message);
                }
            }
        }

        static void ProcessCommand(string line)
        {
            string[] parts = line.Split(' ');
            if (parts.Length == 0) return;

            string cmd = parts[0].ToUpper();

            switch (cmd)
            {
                case "M": // Move x y
                    if (parts.Length >= 3)
                    {
                        int x = int.Parse(parts[1]);
                        int y = int.Parse(parts[2]);
                        SetCursorPos(x, y);
                    }
                    break;

                case "MD": // Mouse Down button
                case "MU": // Mouse Up button
                    if (parts.Length >= 2)
                    {
                        string btn = parts[1].ToUpper();
                        int flags = 0;

                        if (cmd == "MD")
                        {
                            if (btn == "LEFT") flags = MOUSEEVENTF_LEFTDOWN;
                            if (btn == "RIGHT") flags = MOUSEEVENTF_RIGHTDOWN;
                            if (btn == "MIDDLE") flags = MOUSEEVENTF_MIDDLEDOWN;
                        }
                        else
                        {
                            if (btn == "LEFT") flags = MOUSEEVENTF_LEFTUP;
                            if (btn == "RIGHT") flags = MOUSEEVENTF_RIGHTUP;
                            if (btn == "MIDDLE") flags = MOUSEEVENTF_MIDDLEUP;
                        }

                        if (flags != 0)
                        {
                            mouse_event(flags, 0, 0, 0, 0);
                        }
                    }
                    break;
                
                case "W": // Wheel x y
                    if (parts.Length >= 3)
                    {
                        int deltaY = int.Parse(parts[2]);
                        if (deltaY != 0)
                        {
                            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, deltaY * 120, 0);
                        }
                    }
                    break;

                case "KD": // Key Down
                case "KU": // Key Up
                    if (parts.Length >= 2)
                    {
                        try
                        {
                            string keyName = parts[1];
                            // Basic mapping, SendKeys handles most
                            if (cmd == "KD")
                                SendKeys.SendWait("{" + keyName + "}"); 
                            // SendKeys is high level, for games/directx we might need keybd_event scan codes later
                            // But for desktop control SendKeys is usually fine for typing
                        }
                        catch
                        {
                            // Ignore invalid keys
                        }
                    }
                    break;
                
                case "T": // Type text
                    if (line.Length > 2)
                    {
                        string text = line.Substring(2); // Everything after "T "
                        SendKeys.SendWait(text);
                    }
                    break;
            }
        }
    }
}
