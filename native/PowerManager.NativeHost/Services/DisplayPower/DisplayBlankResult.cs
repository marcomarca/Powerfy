namespace PowerManager.NativeHost.Services.DisplayPower;

public enum DisplayBlankStatus
{
    Success,
    AlreadyInProgress,
    RemoteSession,
    PowerRequestFailed,
    CannotReadPowerScheme,
    CannotWriteVideoIdle,
    RestoreFailed,
    RestoreVerificationFailed,
    DisplayDidNotTurnOff,
    Cancelled,
    UnknownFailure
}

public record DisplayBlankResult(
    DisplayBlankStatus Status,
    int? Win32ErrorCode = null,
    string? Message = null)
{
    public bool IsSuccess => Status == DisplayBlankStatus.Success;

    public static DisplayBlankResult Ok() =>
        new(DisplayBlankStatus.Success, Message: "Display turned off successfully.");

    public static DisplayBlankResult Fail(DisplayBlankStatus status, string message, int? win32Error = null) =>
        new(status, win32Error, message);
}
