using System.Runtime.InteropServices;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services;

public class NotificationWindow : IDisposable
{
    private readonly ProtocolServer _protocolServer;
    private readonly IPowerSchemeService _powerSchemeService;
    private readonly IBatteryService _batteryService;
    private readonly IBrightnessService _brightnessService;
    private readonly IDisplayPowerService? _displayPowerService;
    private readonly Thread _messageLoopThread;
    private IntPtr _hwnd = IntPtr.Zero;
    private readonly List<IntPtr> _registeredNotifications = [];
    private User32Interop.WndProc? _wndProcDelegate;
    private readonly ManualResetEvent _windowCreatedEvent = new(false);

    public NotificationWindow(
        ProtocolServer protocolServer,
        IPowerSchemeService powerSchemeService,
        IBatteryService batteryService,
        IBrightnessService brightnessService,
        IDisplayPowerService? displayPowerService = null)
    {
        _protocolServer = protocolServer;
        _powerSchemeService = powerSchemeService;
        _batteryService = batteryService;
        _brightnessService = brightnessService;
        _displayPowerService = displayPowerService;

        _messageLoopThread = new Thread(RunMessageLoop)
        {
            IsBackground = true,
            Name = "PowerManagerWin32MessagePump"
        };
        _messageLoopThread.Start();
        _windowCreatedEvent.WaitOne(3000);
    }

    private void RunMessageLoop()
    {
        var className = $"PowerManagerNotifyWindow_{Guid.NewGuid():N}";
        _wndProcDelegate = WndProc;

        var wndClass = new User32Interop.WNDCLASSEX
        {
            cbSize = (uint)Marshal.SizeOf<User32Interop.WNDCLASSEX>(),
            lpfnWndProc = _wndProcDelegate,
            lpszClassName = className,
            hInstance = IntPtr.Zero
        };

        if (User32Interop.RegisterClassEx(ref wndClass) == 0)
        {
            ProtocolServer.Log("Failed to register notification window class.");
            _windowCreatedEvent.Set();
            return;
        }

        _hwnd = User32Interop.CreateWindowEx(
            0,
            className,
            "PowerManagerMessageWindow",
            0,
            0, 0, 0, 0,
            IntPtr.Zero,
            IntPtr.Zero,
            IntPtr.Zero,
            IntPtr.Zero
        );

        if (_hwnd == IntPtr.Zero)
        {
            ProtocolServer.Log("Failed to create notification window.");
            _windowCreatedEvent.Set();
            return;
        }

        RegisterNotification(PowrprofInterop.GUID_ACTIVE_POWERSCHEME);
        RegisterNotification(PowrprofInterop.GUID_ACDC_POWER_SOURCE);
        RegisterNotification(PowrprofInterop.GUID_BATTERY_PERCENTAGE_REMAINING);
        RegisterNotification(PowrprofInterop.GUID_CONSOLE_DISPLAY_STATE);
        RegisterNotification(PowrprofInterop.GUID_LIDSWITCH_STATE_CHANGE);
        RegisterNotification(PowrprofInterop.GUID_DEVICE_POWER_POLICY_VIDEO_BRIGHTNESS);

        _windowCreatedEvent.Set();

        while (User32Interop.GetMessage(out var msg, IntPtr.Zero, 0, 0) > 0)
        {
            User32Interop.TranslateMessage(ref msg);
            User32Interop.DispatchMessage(ref msg);
        }
    }

    private void RegisterNotification(Guid guid)
    {
        var handle = PowrprofInterop.RegisterPowerSettingNotification(_hwnd, ref guid, 0);
        if (handle != IntPtr.Zero)
        {
            _registeredNotifications.Add(handle);
        }
    }

    private IntPtr WndProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam)
    {
        if (msg == User32Interop.WM_POWERBROADCAST)
        {
            var eventType = wParam.ToInt32();
            if (eventType == User32Interop.PBT_POWERSETTINGCHANGE && lParam != IntPtr.Zero)
            {
                var setting = Marshal.PtrToStructure<User32Interop.POWERBROADCAST_SETTING>(lParam);
                var pData = lParam + Marshal.SizeOf<User32Interop.POWERBROADCAST_SETTING>();

                if (setting.PowerSetting == PowrprofInterop.GUID_ACTIVE_POWERSCHEME)
                {
                    if (setting.DataLength >= 16)
                    {
                        var newSchemeGuid = Marshal.PtrToStructure<Guid>(pData);
                        var activeScheme = _powerSchemeService.GetActiveScheme();
                        _protocolServer.SendEvent("power.activeSchemeChanged", new
                        {
                            schemeId = newSchemeGuid.ToString("D").ToLowerInvariant(),
                            name = activeScheme?.Name
                        });
                    }
                }
                else if (setting.PowerSetting == PowrprofInterop.GUID_ACDC_POWER_SOURCE)
                {
                    if (setting.DataLength >= 4)
                    {
                        var acdc = Marshal.ReadInt32(pData);
                        _protocolServer.SendEvent("power.sourceChanged", new { isOnAc = acdc == 0 });
                        _protocolServer.SendEvent("battery.changed", _batteryService.GetBatteryState());
                    }
                }
                else if (setting.PowerSetting == PowrprofInterop.GUID_BATTERY_PERCENTAGE_REMAINING)
                {
                    _protocolServer.SendEvent("battery.changed", _batteryService.GetBatteryState());
                }
                else if (setting.PowerSetting == PowrprofInterop.GUID_CONSOLE_DISPLAY_STATE)
                {
                    if (setting.DataLength >= 4)
                    {
                        var displayStateVal = Marshal.ReadInt32(pData);
                        var stateStr = displayStateVal switch
                        {
                            0 => "off",
                            1 => "on",
                            2 => "dimmed",
                            _ => "unknown"
                        };
                        _protocolServer.SendEvent("display.stateChanged", new { state = stateStr });

                        // Forward to DisplayPowerService for state machine processing
                        _displayPowerService?.OnDisplayStateChanged(displayStateVal);
                    }
                }
                else if (setting.PowerSetting == PowrprofInterop.GUID_LIDSWITCH_STATE_CHANGE)
                {
                    if (setting.DataLength >= 4)
                    {
                        var lidStateVal = Marshal.ReadInt32(pData);
                        var stateStr = lidStateVal == 0 ? "closed" : "open";
                        _protocolServer.SendEvent("lid.stateChanged", new { state = stateStr });
                    }
                }
                else if (setting.PowerSetting == PowrprofInterop.GUID_DEVICE_POWER_POLICY_VIDEO_BRIGHTNESS)
                {
                    var (success, val) = _brightnessService.GetBrightness();
                    if (success)
                    {
                        _protocolServer.SendEvent("brightness.changed", new
                        {
                            displayId = "internal_0",
                            value = val
                        });
                    }
                }
            }
            else if (eventType == User32Interop.PBT_APMSUSPEND)
            {
                _protocolServer.SendEvent("system.suspend", new { });
            }
            else if (eventType == User32Interop.PBT_APMRESUMEAUTOMATIC || eventType == User32Interop.PBT_APMRESUMESUSPEND)
            {
                _protocolServer.SendEvent("system.resume", new { });
            }

            return (IntPtr)1;
        }

        return User32Interop.DefWindowProc(hWnd, msg, wParam, lParam);
    }

    public void Dispose()
    {
        foreach (var handle in _registeredNotifications)
        {
            PowrprofInterop.UnregisterPowerSettingNotification(handle);
        }
        _registeredNotifications.Clear();

        if (_hwnd != IntPtr.Zero)
        {
            User32Interop.DestroyWindow(_hwnd);
            _hwnd = IntPtr.Zero;
        }
    }
}
