using System.Text.Json.Serialization;

namespace PowerManager.NativeHost.Services.DisplayPower;

/// <summary>
/// Persisted to disk as a crash-recovery sentinel before modifying VIDEOIDLE.
/// If the process dies while VIDEOIDLE=1, startup recovery reads this file
/// and restores the original values.
/// </summary>
public record DisplayBlankRecoveryState
{
    [JsonPropertyName("version")]
    public int Version { get; init; } = 1;

    [JsonPropertyName("schemeGuid")]
    public string SchemeGuid { get; init; } = "";

    [JsonPropertyName("acSeconds")]
    public uint AcSeconds { get; init; }

    [JsonPropertyName("dcSeconds")]
    public uint DcSeconds { get; init; }

    [JsonPropertyName("processId")]
    public int ProcessId { get; init; }

    [JsonPropertyName("createdUtc")]
    public string CreatedUtc { get; init; } = "";

    [JsonPropertyName("applicationVersion")]
    public string ApplicationVersion { get; init; } = "";
}
