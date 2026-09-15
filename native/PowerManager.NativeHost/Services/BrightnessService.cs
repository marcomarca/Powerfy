using System.Management;
using PowerManager.NativeHost.Protocol;

namespace PowerManager.NativeHost.Services;

public interface IBrightnessService : IDisposable
{
    List<BrightnessDisplayDto> ListDisplays();
    (bool Success, int Value) GetBrightness(string? displayId = null);
    (bool Success, int Value) SetBrightness(int targetValue, string? displayId = null);
}

public class BrightnessService : IBrightnessService
{
    private readonly ProtocolServer? _protocolServer;
    private ManagementEventWatcher? _watcher;
    private int _lastReportedBrightness = -1;

    public BrightnessService(ProtocolServer? protocolServer = null)
    {
        _protocolServer = protocolServer;
        StartEventWatcher();
    }

    private void StartEventWatcher()
    {
        if (_protocolServer == null) return;

        try
        {
            var scope = new ManagementScope(@"root\wmi");
            var query = new WqlEventQuery("SELECT * FROM WmiMonitorBrightnessEvent");
            _watcher = new ManagementEventWatcher(scope, query);
            _watcher.EventArrived += OnBrightnessEventArrived;
            _watcher.Start();
            ProtocolServer.Log("WMI MonitorBrightnessEvent watcher started successfully.");
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"WMI MonitorBrightnessEvent watcher could not be started: {ex.Message}");
        }
    }

    private void OnBrightnessEventArrived(object sender, EventArrivedEventArgs e)
    {
        try
        {
            var brightnessObj = e.NewEvent.Properties["Brightness"]?.Value;
            if (brightnessObj != null)
            {
                var currentVal = Convert.ToInt32(brightnessObj);
                if (currentVal != _lastReportedBrightness)
                {
                    _lastReportedBrightness = currentVal;
                    _protocolServer?.SendEvent("brightness.changed", new
                    {
                        displayId = "internal_0",
                        value = currentVal
                    });
                }
            }
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"Error processing WMI brightness event: {ex.Message}");
        }
    }
    public List<BrightnessDisplayDto> ListDisplays()
    {
        var displays = new List<BrightnessDisplayDto>();

        try
        {
            using var searcher = new ManagementObjectSearcher(@"root\wmi", "SELECT * FROM WmiMonitorBrightness");
            using var collection = searcher.Get();

            int index = 0;
            foreach (ManagementObject mo in collection)
            {
                var current = Convert.ToInt32(mo["CurrentBrightness"] ?? 100);
                var levelsObj = mo["Level"] as byte[];
                var supportedLevels = levelsObj != null
                    ? levelsObj.Select(b => (int)b).Distinct().OrderBy(b => b).ToArray()
                    : Enumerable.Range(0, 101).ToArray();

                var id = $"internal_{index}";
                displays.Add(new BrightnessDisplayDto(
                    id,
                    $"Pantalla interna {index + 1}",
                    "internal",
                    supportedLevels,
                    current,
                    index == 0
                ));
                index++;
            }
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"WMI Brightness query not available: {ex.Message}");
        }

        return displays;
    }

    public (bool Success, int Value) GetBrightness(string? displayId = null)
    {
        var displays = ListDisplays();
        if (displays.Count == 0)
        {
            return (false, 100);
        }

        var display = string.IsNullOrEmpty(displayId)
            ? displays.FirstOrDefault()
            : displays.FirstOrDefault(d => string.Equals(d.Id, displayId, StringComparison.OrdinalIgnoreCase)) ?? displays.FirstOrDefault();

        return (true, display?.Current ?? 100);
    }

    public (bool Success, int Value) SetBrightness(int targetValue, string? displayId = null)
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(@"root\wmi", "SELECT * FROM WmiMonitorBrightnessMethods");
            using var collection = searcher.Get();

            var displays = ListDisplays();
            var matchedDisplay = displays.FirstOrDefault();
            var targetClamped = Math.Clamp(targetValue, 0, 100);

            // Find nearest supported discrete level if available
            if (matchedDisplay != null && matchedDisplay.SupportedLevels.Length > 0)
            {
                targetClamped = matchedDisplay.SupportedLevels
                    .OrderBy(lvl => Math.Abs(lvl - targetClamped))
                    .First();
            }

            foreach (ManagementObject mo in collection)
            {
                using var inParams = mo.GetMethodParameters("WmiSetBrightness");
                inParams["Timeout"] = 1;
                inParams["Brightness"] = (byte)targetClamped;
                mo.InvokeMethod("WmiSetBrightness", inParams, null);
                return (true, targetClamped);
            }
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"WmiSetBrightness failed: {ex.Message}");
        }

        return (false, targetValue);
    }

    public void Dispose()
    {
        if (_watcher != null)
        {
            try
            {
                _watcher.Stop();
                _watcher.Dispose();
            }
            catch
            {
                // Ignore disposal errors
            }
            _watcher = null;
        }
    }
}
