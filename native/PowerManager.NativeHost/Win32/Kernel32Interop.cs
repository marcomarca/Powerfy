using System.Runtime.InteropServices;
using System.Text;

namespace PowerManager.NativeHost.Win32;

public static class Kernel32Interop
{
    public const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    [StructLayout(LayoutKind.Sequential)]
    public struct SYSTEM_POWER_STATUS
    {
        public byte ACLineStatus;
        public byte BatteryFlag;
        public byte BatteryLifePercent;
        public byte SystemStatusFlag;
        public uint BatteryLifeTime;
        public uint BatteryFullLifeTime;
    }

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS lpSystemPowerStatus);

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, uint processId);

    [DllImport("Kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool QueryFullProcessImageNameW(
        IntPtr hProcess,
        uint dwFlags,
        StringBuilder lpExeName,
        ref uint lpdwSize);

    [Flags]
    public enum EXECUTION_STATE : uint
    {
        ES_AWAYMODE_REQUIRED = 0x00000040,
        ES_CONTINUOUS = 0x80000000,
        ES_DISPLAY_REQUIRED = 0x00000002,
        ES_SYSTEM_REQUIRED = 0x00000001
    }

    [DllImport("Kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern EXECUTION_STATE SetThreadExecutionState(EXECUTION_STATE esFlags);

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);
}
