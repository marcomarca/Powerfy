using System.Text.Json.Serialization;

namespace PowerManager.NativeHost.Protocol;

public record NativeRequest
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "request";

    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("method")]
    public string Method { get; init; } = "";

    [JsonPropertyName("params")]
    public object? Params { get; init; }
}

public record NativeResponseSuccess
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "response";

    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("ok")]
    public bool Ok { get; init; } = true;

    [JsonPropertyName("result")]
    public object? Result { get; init; }
}

public record NativeResponseError
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "response";

    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("ok")]
    public bool Ok { get; init; } = false;

    [JsonPropertyName("error")]
    public ProtocolError Error { get; init; } = new();
}

public record ProtocolError
{
    [JsonPropertyName("code")]
    public string Code { get; init; } = "UNKNOWN";

    [JsonPropertyName("message")]
    public string Message { get; init; } = "";

    [JsonPropertyName("nativeCode")]
    public int? NativeCode { get; init; }
}

public record NativeEvent
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "event";

    [JsonPropertyName("event")]
    public string Event { get; init; } = "";

    [JsonPropertyName("data")]
    public object? Data { get; init; }
}

public record SchemeDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("isActive")] bool IsActive
);

public record BatteryStateDto(
    [property: JsonPropertyName("present")] bool Present,
    [property: JsonPropertyName("percentage")] int? Percentage,
    [property: JsonPropertyName("isCharging")] bool IsCharging,
    [property: JsonPropertyName("isOnAc")] bool IsOnAc,
    [property: JsonPropertyName("isFullyCharged")] bool IsFullyCharged,
    [property: JsonPropertyName("secondsRemaining")] int? SecondsRemaining
);

public record BrightnessDisplayDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("supportedLevels")] int[] SupportedLevels,
    [property: JsonPropertyName("current")] int Current,
    [property: JsonPropertyName("isPrimary")] bool IsPrimary
);

public record SystemCapabilitiesDto(
    [property: JsonPropertyName("hasBattery")] bool HasBattery,
    [property: JsonPropertyName("supportsInternalBrightness")] bool SupportsInternalBrightness,
    [property: JsonPropertyName("supportsLidState")] bool SupportsLidState,
    [property: JsonPropertyName("supportsDisplayState")] bool SupportsDisplayState,
    [property: JsonPropertyName("supportsPowerSchemeNotifications")] bool SupportsPowerSchemeNotifications
);

public record ProcessTargetDto(
    [property: JsonPropertyName("match")] string Match,
    [property: JsonPropertyName("value")] string Value
);

public record ProcessMatchStateDto(
    [property: JsonPropertyName("target")] ProcessTargetDto Target,
    [property: JsonPropertyName("isRunning")] bool IsRunning,
    [property: JsonPropertyName("pids")] int[] Pids,
    [property: JsonPropertyName("matchedPath")] string? MatchedPath
);
