using System.Text;
using System.Text.Json;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Services;

namespace PowerManager.NativeHost;

public class Program
{
    public static void Main(string[] args)
    {
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = Encoding.UTF8;

        var protocolServer = new ProtocolServer();
        ProtocolServer.Log("PowerManager.NativeHost starting up...");

        var powerSchemeService = new PowerSchemeService();
        var batteryService = new BatteryService();
        using var brightnessService = new BrightnessService(protocolServer);
        var displayPowerService = new DisplayPowerService();
        using var processWatcherService = new ProcessWatcherService(protocolServer);
        using var notificationWindow = new NotificationWindow(protocolServer, powerSchemeService, batteryService, brightnessService);

        ProtocolServer.Log("PowerManager.NativeHost initialized successfully.");

        string? line;
        while ((line = Console.In.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            try
            {
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;

                var id = root.TryGetProperty("id", out var idElem) ? idElem.GetString() ?? "" : "";
                var method = root.TryGetProperty("method", out var methodElem) ? methodElem.GetString() ?? "" : "";
                var paramsElem = root.TryGetProperty("params", out var pElem) ? (JsonElement?)pElem : null;

                DispatchMethod(
                    id,
                    method,
                    paramsElem,
                    protocolServer,
                    powerSchemeService,
                    batteryService,
                    brightnessService,
                    displayPowerService,
                    processWatcherService
                );
            }
            catch (Exception ex)
            {
                ProtocolServer.Log($"Error processing request: {ex.Message}");
            }
        }

        ProtocolServer.Log("PowerManager.NativeHost shutting down cleanly.");
    }

    private static void DispatchMethod(
        string id,
        string method,
        JsonElement? paramsElem,
        ProtocolServer protocolServer,
        IPowerSchemeService powerSchemeService,
        IBatteryService batteryService,
        IBrightnessService brightnessService,
        IDisplayPowerService displayPowerService,
        IProcessWatcherService processWatcherService)
    {
        switch (method)
        {
            case "system.hello":
                var clientVersion = paramsElem?.TryGetProperty("protocolVersion", out var v) == true ? v.GetInt32() : 1;
                protocolServer.SendSuccess(id, new
                {
                    protocolVersion = 1,
                    hostVersion = "1.0.0"
                });
                break;

            case "system.getCapabilities":
                var batteryState = batteryService.GetBatteryState();
                var displays = brightnessService.ListDisplays();
                protocolServer.SendSuccess(id, new SystemCapabilitiesDto(
                    HasBattery: batteryState.Present,
                    SupportsInternalBrightness: displays.Count > 0,
                    SupportsLidState: true,
                    SupportsDisplayState: true,
                    SupportsPowerSchemeNotifications: true
                ));
                break;

            case "power.listSchemes":
                var schemes = powerSchemeService.ListSchemes();
                protocolServer.SendSuccess(id, schemes);
                break;

            case "power.getActiveScheme":
                var active = powerSchemeService.GetActiveScheme();
                protocolServer.SendSuccess(id, active);
                break;

            case "power.setActiveScheme":
                var targetSchemeId = paramsElem?.TryGetProperty("schemeId", out var sElem) == true ? sElem.GetString() : null;
                if (string.IsNullOrEmpty(targetSchemeId))
                {
                    protocolServer.SendError(id, "INVALID_PARAMS", "schemeId parameter is required");
                    return;
                }

                var (success, schemeId, errorMsg) = powerSchemeService.SetActiveScheme(targetSchemeId);
                if (success)
                {
                    protocolServer.SendSuccess(id, new { success = true, schemeId });
                }
                else
                {
                    protocolServer.SendError(id, "SET_SCHEME_FAILED", errorMsg ?? "Failed to set active scheme");
                }
                break;

            case "battery.getState":
                var currentBattery = batteryService.GetBatteryState();
                protocolServer.SendSuccess(id, currentBattery);
                break;

            case "brightness.listDisplays":
                var currentDisplays = brightnessService.ListDisplays();
                protocolServer.SendSuccess(id, currentDisplays);
                break;

            case "brightness.get":
                var getDisplayId = paramsElem?.TryGetProperty("displayId", out var dElem) == true ? dElem.GetString() : null;
                var (bGetSuccess, bValue) = brightnessService.GetBrightness(getDisplayId);
                protocolServer.SendSuccess(id, new { displayId = getDisplayId ?? "internal_0", value = bValue });
                break;

            case "brightness.set":
                var setDisplayId = paramsElem?.TryGetProperty("displayId", out var sDisplayElem) == true ? sDisplayElem.GetString() : null;
                var val = paramsElem?.TryGetProperty("value", out var vElem) == true ? vElem.GetInt32() : 100;
                var (bSetSuccess, newBrightness) = brightnessService.SetBrightness(val, setDisplayId);
                protocolServer.SendSuccess(id, new { displayId = setDisplayId ?? "internal_0", value = newBrightness });
                break;

            case "display.turnOff":
                var turnedOff = displayPowerService.TurnOffDisplay();
                protocolServer.SendSuccess(id, new { success = turnedOff });
                break;

            case "process.setWatchTargets":
                var targetList = new List<ProcessTargetDto>();
                if (paramsElem?.TryGetProperty("targets", out var targetsArr) == true && targetsArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in targetsArr.EnumerateArray())
                    {
                        var match = item.TryGetProperty("match", out var m) ? m.GetString() ?? "path" : "path";
                        var value = item.TryGetProperty("value", out var valProp) ? valProp.GetString() ?? "" : "";
                        targetList.Add(new ProcessTargetDto(match, value));
                    }
                }
                processWatcherService.SetTargets(targetList);
                protocolServer.SendSuccess(id, new { targetsCount = targetList.Count });
                break;

            case "process.reconcile":
                var matchStates = processWatcherService.Reconcile();
                protocolServer.SendSuccess(id, matchStates);
                break;

            case "diagnostics.ping":
                protocolServer.SendSuccess(id, new { pong = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
                break;

            default:
                protocolServer.SendError(id, "METHOD_NOT_FOUND", $"Method '{method}' is not implemented.");
                break;
        }
    }
}
