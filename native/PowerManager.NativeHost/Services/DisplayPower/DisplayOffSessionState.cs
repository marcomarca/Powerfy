namespace PowerManager.NativeHost.Services.DisplayPower;

/// <summary>
/// State machine for the display-off session lifecycle.
/// Transitions: Idle → Starting → WaitingForBlank → DisplayOff → Completing → Idle
/// </summary>
public enum DisplayOffSessionState
{
    Idle,
    Starting,
    WaitingForBlank,
    DisplayOff,
    Completing,
    Failed
}
