using System.Text.Json;
using PowerManager.NativeHost.Protocol;

namespace PowerManager.NativeHost.Services.DisplayPower;

/// <summary>
/// Manages the crash-recovery sentinel file for VIDEOIDLE modifications.
/// Writes atomically (tmp → flush → rename) so a partial write never corrupts the sentinel.
/// </summary>
public static class DisplayBlankRecoveryStore
{
    private const string SentinelFileName = "display_blank_recovery.json";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    public static string GetSentinelDirectory()
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, "Powerfy");
    }

    public static string GetSentinelPath()
    {
        return Path.Combine(GetSentinelDirectory(), SentinelFileName);
    }

    /// <summary>
    /// Atomically writes the sentinel to disk before modifying VIDEOIDLE.
    /// </summary>
    public static void WriteSentinel(DisplayBlankRecoveryState state)
    {
        var dir = GetSentinelDirectory();
        Directory.CreateDirectory(dir);

        var finalPath = GetSentinelPath();
        var tmpPath = finalPath + ".tmp";

        var json = JsonSerializer.Serialize(state, JsonOptions);
        using (var fs = new FileStream(tmpPath, FileMode.Create, FileAccess.Write, FileShare.None))
        using (var writer = new StreamWriter(fs))
        {
            writer.Write(json);
            writer.Flush();
            fs.Flush(flushToDisk: true);
        }

        // Atomic rename (File.Move with overwrite)
        File.Move(tmpPath, finalPath, overwrite: true);
        ProtocolServer.Log($"Recovery sentinel written: {finalPath}");
    }

    /// <summary>
    /// Reads the sentinel if it exists. Returns null if missing or corrupt.
    /// </summary>
    public static DisplayBlankRecoveryState? ReadSentinel()
    {
        var path = GetSentinelPath();
        if (!File.Exists(path))
            return null;

        try
        {
            var json = File.ReadAllText(path);
            var state = JsonSerializer.Deserialize<DisplayBlankRecoveryState>(json);

            if (state == null || state.Version < 1 || string.IsNullOrWhiteSpace(state.SchemeGuid))
            {
                ProtocolServer.Log($"Recovery sentinel is invalid or corrupt: {path}");
                return null;
            }

            return state;
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"Failed to read recovery sentinel: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Deletes the sentinel file. Only call after verified restoration.
    /// </summary>
    public static void DeleteSentinel()
    {
        var path = GetSentinelPath();
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
                ProtocolServer.Log($"Recovery sentinel deleted: {path}");
            }
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"Failed to delete recovery sentinel: {ex.Message}");
        }
    }

    public static bool SentinelExists()
    {
        return File.Exists(GetSentinelPath());
    }
}
