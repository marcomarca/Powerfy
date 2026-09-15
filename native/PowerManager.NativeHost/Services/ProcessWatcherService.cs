using System.Diagnostics;
using System.Management;
using System.Text;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services;

public interface IProcessWatcherService : IDisposable
{
    void SetTargets(List<ProcessTargetDto> targets);
    Dictionary<string, ProcessMatchStateDto> Reconcile();
}

public class ProcessWatcherService : IProcessWatcherService
{
    private readonly ProtocolServer _protocolServer;
    private readonly object _lock = new();
    private List<ProcessTargetDto> _targets = [];
    private readonly Dictionary<int, (string Path, string Name)> _knownProcesses = new();
    private ManagementEventWatcher? _startWatcher;
    private ManagementEventWatcher? _stopWatcher;

    public ProcessWatcherService(ProtocolServer protocolServer)
    {
        _protocolServer = protocolServer;
        StartWmiWatchers();
    }

    public void SetTargets(List<ProcessTargetDto> targets)
    {
        lock (_lock)
        {
            _targets = targets ?? [];
        }
        Reconcile();
    }

    public Dictionary<string, ProcessMatchStateDto> Reconcile()
    {
        lock (_lock)
        {
            _knownProcesses.Clear();
            var systemProcesses = Process.GetProcesses();

            foreach (var proc in systemProcesses)
            {
                try
                {
                    var pid = proc.Id;
                    var name = proc.ProcessName;
                    if (!name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        name += ".exe";
                    }

                    var path = GetProcessFullPath(pid);
                    _knownProcesses[pid] = (path ?? "", name);
                }
                catch
                {
                    // Ignore inaccessible processes
                }
                finally
                {
                    proc.Dispose();
                }
            }

            var result = ComputeMatchStates();
            _protocolServer.SendEvent("process.runningStateChanged", result);
            return result;
        }
    }

    private Dictionary<string, ProcessMatchStateDto> ComputeMatchStates()
    {
        var states = new Dictionary<string, ProcessMatchStateDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var target in _targets)
        {
            var key = $"{target.Match}:{NormalizePath(target.Value)}";
            var matchingPids = new List<int>();
            string? matchedPath = null;

            var targetVal = NormalizePath(target.Value);
            foreach (var (pid, (procPath, procName)) in _knownProcesses)
            {
                if (target.Match.Equals("path", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrEmpty(procPath) && NormalizePath(procPath) == targetVal)
                    {
                        matchingPids.Add(pid);
                        matchedPath = procPath;
                    }
                }
                else if (target.Match.Equals("name", StringComparison.OrdinalIgnoreCase))
                {
                    var targetName = targetVal.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)
                        ? targetVal
                        : $"{targetVal}.exe";

                    if (NormalizePath(procName) == targetName)
                    {
                        matchingPids.Add(pid);
                        matchedPath = procPath;
                    }
                }
            }

            states[key] = new ProcessMatchStateDto(
                target,
                matchingPids.Count > 0,
                matchingPids.ToArray(),
                matchedPath
            );
        }

        return states;
    }

    private void StartWmiWatchers()
    {
        try
        {
            _startWatcher = new ManagementEventWatcher(new WqlEventQuery("Win32_ProcessStartTrace"));
            _startWatcher.EventArrived += OnProcessStarted;
            _startWatcher.Start();

            _stopWatcher = new ManagementEventWatcher(new WqlEventQuery("Win32_ProcessStopTrace"));
            _stopWatcher.EventArrived += OnProcessStopped;
            _stopWatcher.Start();
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"WMI Process Trace watchers could not be started: {ex.Message}");
        }
    }

    private void OnProcessStarted(object sender, EventArrivedEventArgs e)
    {
        try
        {
            var pid = Convert.ToInt32(e.NewEvent.Properties["ProcessID"]?.Value ?? 0);
            var procName = e.NewEvent.Properties["ProcessName"]?.Value?.ToString() ?? "";
            var fullPath = GetProcessFullPath(pid) ?? "";

            lock (_lock)
            {
                _knownProcesses[pid] = (fullPath, procName);
                var states = ComputeMatchStates();
                _protocolServer.SendEvent("process.started", new { pid, path = fullPath, name = procName });
                _protocolServer.SendEvent("process.runningStateChanged", states);
            }
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"OnProcessStarted error: {ex.Message}");
        }
    }

    private void OnProcessStopped(object sender, EventArrivedEventArgs e)
    {
        try
        {
            var pid = Convert.ToInt32(e.NewEvent.Properties["ProcessID"]?.Value ?? 0);
            var procName = e.NewEvent.Properties["ProcessName"]?.Value?.ToString() ?? "";
            string? path = null;

            lock (_lock)
            {
                if (_knownProcesses.TryGetValue(pid, out var info))
                {
                    path = info.Path;
                    _knownProcesses.Remove(pid);
                }

                var states = ComputeMatchStates();
                _protocolServer.SendEvent("process.stopped", new { pid, path, name = procName });
                _protocolServer.SendEvent("process.runningStateChanged", states);
            }
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"OnProcessStopped error: {ex.Message}");
        }
    }

    private static string? GetProcessFullPath(int pid)
    {
        if (pid <= 4) return null;

        var hProcess = Kernel32Interop.OpenProcess(Kernel32Interop.PROCESS_QUERY_LIMITED_INFORMATION, false, (uint)pid);
        if (hProcess == IntPtr.Zero) return null;

        try
        {
            var buffer = new StringBuilder(1024);
            uint size = (uint)buffer.Capacity;
            if (Kernel32Interop.QueryFullProcessImageNameW(hProcess, 0, buffer, ref size))
            {
                return buffer.ToString();
            }
        }
        finally
        {
            Kernel32Interop.CloseHandle(hProcess);
        }

        return null;
    }

    private static string NormalizePath(string p)
    {
        return p.Replace('/', '\\').ToLowerInvariant().Trim();
    }

    public void Dispose()
    {
        try
        {
            _startWatcher?.Stop();
            _startWatcher?.Dispose();
            _stopWatcher?.Stop();
            _stopWatcher?.Dispose();
        }
        catch
        {
            // Ignore
        }
    }
}
