using System.Runtime.InteropServices;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services.DisplayPower;

/// <summary>
/// RAII wrapper for Win32 PowerCreateRequest / PowerSetRequest.
/// Acquires SystemRequired + ExecutionRequired to keep the system awake
/// while the display is physically off. NEVER requests DisplayRequired.
/// </summary>
public sealed class KeepAwakeLease : IDisposable
{
    private IntPtr _handle = IntPtr.Zero;
    private bool _systemRequired;
    private bool _executionRequired;
    private bool _disposed;

    public bool IsActive => _handle != IntPtr.Zero && _handle != new IntPtr(-1) && !_disposed;

    /// <summary>
    /// Acquires the power requests. Returns false if any step fails.
    /// On partial failure, cleans up already-acquired requests.
    /// </summary>
    public bool Acquire()
    {
        if (_disposed) return false;

        var ctx = new Kernel32Interop.POWER_REQUEST_CONTEXT
        {
            Version = (uint)Kernel32Interop.POWER_REQUEST_CONTEXT_VERSION,
            Flags = (uint)Kernel32Interop.POWER_REQUEST_CONTEXT_SIMPLE_STRING,
            SimpleReasonString = "Powerfy: display off while keeping system active"
        };

        _handle = Kernel32Interop.PowerCreateRequest(ref ctx);
        if (_handle == IntPtr.Zero || _handle == new IntPtr(-1))
        {
            var err = Marshal.GetLastWin32Error();
            ProtocolServer.Log($"PowerCreateRequest failed, Win32 error={err}");
            _handle = IntPtr.Zero;
            return false;
        }

        // Acquire SystemRequired
        if (!Kernel32Interop.PowerSetRequest(_handle, Kernel32Interop.POWER_REQUEST_TYPE.PowerRequestSystemRequired))
        {
            var err = Marshal.GetLastWin32Error();
            ProtocolServer.Log($"PowerSetRequest(SystemRequired) failed, Win32 error={err}");
            Kernel32Interop.CloseHandle(_handle);
            _handle = IntPtr.Zero;
            return false;
        }
        _systemRequired = true;
        ProtocolServer.Log("KeepAwakeLease: SystemRequired acquired.");

        // Acquire ExecutionRequired
        if (!Kernel32Interop.PowerSetRequest(_handle, Kernel32Interop.POWER_REQUEST_TYPE.PowerRequestExecutionRequired))
        {
            var err = Marshal.GetLastWin32Error();
            ProtocolServer.Log($"PowerSetRequest(ExecutionRequired) failed, Win32 error={err}. Cleaning up SystemRequired.");
            // Clean up SystemRequired since ExecutionRequired failed
            Kernel32Interop.PowerClearRequest(_handle, Kernel32Interop.POWER_REQUEST_TYPE.PowerRequestSystemRequired);
            _systemRequired = false;
            Kernel32Interop.CloseHandle(_handle);
            _handle = IntPtr.Zero;
            return false;
        }
        _executionRequired = true;
        ProtocolServer.Log("KeepAwakeLease: ExecutionRequired acquired.");

        return true;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        if (_handle == IntPtr.Zero || _handle == new IntPtr(-1))
            return;

        if (_executionRequired)
        {
            Kernel32Interop.PowerClearRequest(_handle, Kernel32Interop.POWER_REQUEST_TYPE.PowerRequestExecutionRequired);
            ProtocolServer.Log("KeepAwakeLease: ExecutionRequired released.");
            _executionRequired = false;
        }

        if (_systemRequired)
        {
            Kernel32Interop.PowerClearRequest(_handle, Kernel32Interop.POWER_REQUEST_TYPE.PowerRequestSystemRequired);
            ProtocolServer.Log("KeepAwakeLease: SystemRequired released.");
            _systemRequired = false;
        }

        Kernel32Interop.CloseHandle(_handle);
        _handle = IntPtr.Zero;
        ProtocolServer.Log("KeepAwakeLease: Handle closed.");
    }
}
