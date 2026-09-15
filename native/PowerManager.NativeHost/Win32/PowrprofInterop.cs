using System.Runtime.InteropServices;

namespace PowerManager.NativeHost.Win32;

public static class PowrprofInterop
{
    public const uint ACCESS_SCHEME = 16;

    public static readonly Guid GUID_ACTIVE_POWERSCHEME = new("310f5671-4b59-4e0c-b6d7-03076f83800e");
    public static readonly Guid GUID_ACDC_POWER_SOURCE = new("5d3e4a32-e539-4f2b-b0bb-24e9504c97c3");
    public static readonly Guid GUID_BATTERY_PERCENTAGE_REMAINING = new("a7ad8041-b45a-4cae-9f93-b78c7553631d");
    public static readonly Guid GUID_CONSOLE_DISPLAY_STATE = new("6fe69556-704a-47a0-8f24-c1019c6160c5");
    public static readonly Guid GUID_LIDSWITCH_STATE_CHANGE = new("ba3e0f4d-b817-4095-a2d1-23d73b223e16");
    public static readonly Guid GUID_DEVICE_POWER_POLICY_VIDEO_BRIGHTNESS = new("adde3451-b00f-4e78-8020-e20d9b09c87a");

    [DllImport("Powrprof.dll", SetLastError = true)]
    public static extern uint PowerEnumerate(
        IntPtr rootPowerKey,
        IntPtr schemeGuid,
        IntPtr subGroupOfPowerSettingGuid,
        uint accessFlags,
        uint index,
        IntPtr buffer,
        ref uint bufferSize);

    [DllImport("Powrprof.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern uint PowerReadFriendlyName(
        IntPtr rootPowerKey,
        ref Guid schemeGuid,
        IntPtr subGroupOfPowerSettingGuid,
        IntPtr powerSettingGuid,
        IntPtr buffer,
        ref uint bufferSize);

    [DllImport("Powrprof.dll", SetLastError = true)]
    public static extern uint PowerGetActiveScheme(
        IntPtr userRootPowerKey,
        out IntPtr pActivePolicyGuid);

    [DllImport("Powrprof.dll", SetLastError = true)]
    public static extern uint PowerSetActiveScheme(
        IntPtr userRootPowerKey,
        ref Guid schemeGuid);

    [DllImport("User32.dll", SetLastError = true)]
    public static extern IntPtr RegisterPowerSettingNotification(
        IntPtr hRecipient,
        ref Guid powerSettingGuid,
        uint flags);

    [DllImport("User32.dll", SetLastError = true)]
    public static extern bool UnregisterPowerSettingNotification(IntPtr handle);

    [DllImport("Kernel32.dll", SetLastError = true)]
    public static extern IntPtr LocalFree(IntPtr hMem);
}
