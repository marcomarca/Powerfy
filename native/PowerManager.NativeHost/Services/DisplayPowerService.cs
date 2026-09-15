using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services;

public interface IDisplayPowerService
{
    bool TurnOffDisplay();
}

public class DisplayPowerService : IDisplayPowerService
{
    public bool TurnOffDisplay()
    {
        try
        {
            // Keep system execution state alive (prevent sleep)
            Kernel32Interop.SetThreadExecutionState(
                Kernel32Interop.EXECUTION_STATE.ES_CONTINUOUS |
                Kernel32Interop.EXECUTION_STATE.ES_SYSTEM_REQUIRED |
                Kernel32Interop.EXECUTION_STATE.ES_AWAYMODE_REQUIRED
            );

            // Brief pause so user releases mouse button, preventing immediate wake bounce
            Thread.Sleep(350);

            // lParam = 2: power off the display
            var result = User32Interop.SendMessageTimeout(
                User32Interop.HWND_BROADCAST,
                User32Interop.WM_SYSCOMMAND,
                User32Interop.SC_MONITORPOWER,
                (IntPtr)2,
                User32Interop.SMTO_ABORTIFHUNG,
                3000,
                out _
            );

            return result != IntPtr.Zero;
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"TurnOffDisplay failed: {ex.Message}");
            return false;
        }
    }
}
