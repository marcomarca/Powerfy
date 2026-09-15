using System.Runtime.InteropServices;
using System.Text;

namespace PowerManager.NativeHost.Win32;

public static class Kernel32Interop
{
    public const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    // --- Power Request Types ---
    public enum POWER_REQUEST_TYPE
    {
        PowerRequestDisplayRequired = 0,
        PowerRequestSystemRequired = 1,
        PowerRequestAwayModeRequired = 2,
        PowerRequestExecutionRequired = 3
    }

    public const int POWER_REQUEST_CONTEXT_VERSION = 0;
    public const int POWER_REQUEST_CONTEXT_SIMPLE_STRING = 0x00000001;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct POWER_REQUEST_CONTEXT
    {
        public uint Version;
        public uint Flags;

        [MarshalAs(UnmanagedType.LPWStr)]
        public string SimpleReasonString;
    }

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

    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [Flags]
    public enum EXECUTION_STATE : uint
    {
        ES_AWAYMODE_REQUIRED = 0x00000040,
        ES_CONTINUOUS = 0x80000000,
        ES_DISPLAY_REQUIRED = 0x00000002,
        ES_SYSTEM_REQUIRED = 0x00000001
    }

    // --- System power status ---

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS lpSystemPowerStatus);

    // --- Process APIs ---

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, uint processId);

    [DllImport("Kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool QueryFullProcessImageNameW(
        IntPtr hProcess,
        uint dwFlags,
        StringBuilder lpExeName,
        ref uint lpdwSize);

    // --- Thread execution state ---

    [DllImport("Kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern EXECUTION_STATE SetThreadExecutionState(EXECUTION_STATE esFlags);

    // --- Handle management ---

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    // --- Power Request APIs ---

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern IntPtr PowerCreateRequest(ref POWER_REQUEST_CONTEXT context);

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern bool PowerSetRequest(IntPtr powerRequestHandle, POWER_REQUEST_TYPE requestType);

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern bool PowerClearRequest(IntPtr powerRequestHandle, POWER_REQUEST_TYPE requestType);

    // --- Input diagnostics ---

    [DllImport("User32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    // --- Remote session detection ---

    public const int SM_REMOTESESSION = 0x1000;

    [DllImport("User32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
}

