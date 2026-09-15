using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services;

public interface IBatteryService
{
    BatteryStateDto GetBatteryState();
}

public class BatteryService : IBatteryService
{
    public BatteryStateDto GetBatteryState()
    {
        if (!Kernel32Interop.GetSystemPowerStatus(out var status))
        {
            return new BatteryStateDto(false, null, false, true, false, null);
        }

        var hasBattery = status.BatteryFlag != 128 && status.BatteryLifePercent != 255;
        var percentage = status.BatteryLifePercent <= 100 ? (int?)status.BatteryLifePercent : null;
        var isOnAc = status.ACLineStatus == 1;
        var isCharging = (status.BatteryFlag & 8) != 0;
        var isFullyCharged = isOnAc && percentage >= 99 && !isCharging;
        var secondsRemaining = status.BatteryLifeTime != uint.MaxValue && status.BatteryLifeTime > 0
            ? (int?)status.BatteryLifeTime
            : null;

        return new BatteryStateDto(
            hasBattery,
            percentage,
            isCharging,
            isOnAc,
            isFullyCharged,
            secondsRemaining
        );
    }
}
