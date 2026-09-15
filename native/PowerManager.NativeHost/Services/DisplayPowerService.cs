using System.Diagnostics;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Services.DisplayPower;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services;

public interface IDisplayPowerService
{
    Task<DisplayBlankResult> TurnOffDisplayKeepingSystemAwakeAsync(CancellationToken cancellationToken = default);
    Task CancelDisplayOffSessionAsync();
    bool IsDisplayOffSessionActive { get; }
    DisplayOffSessionState SessionState { get; }

    /// <summary>
    /// Called by NotificationWindow when GUID_CONSOLE_DISPLAY_STATE changes.
    /// </summary>
    void OnDisplayStateChanged(int state);

    /// <summary>
    /// Recovers stale VIDEOIDLE sentinel left by a crashed session. Must run at startup.
    /// </summary>
    Task RecoverStaleDisplayTimeoutAsync();
}

/// <summary>
/// Coordinates native display-off using the VIDEOIDLE idle-timeout path.
/// Algorithm inspired by the open-source itsnateai/displayoff project (MIT License).
///
/// Sequence:
/// 1. Check RDP → bail if remote session
/// 2. Acquire KeepAwakeLease (SystemRequired + ExecutionRequired)
/// 3. Wait 500ms for input settle
/// 4. Save original VIDEOIDLE AC/DC + write sentinel
/// 5. Set VIDEOIDLE = 1s → apply scheme
/// 6. Wait ~5s for Windows to trigger native display off
/// 7. Restore original VIDEOIDLE → verify → delete sentinel
/// 8. KeepAwakeLease stays alive until display ON is observed
/// </summary>
public class DisplayPowerService : IDisplayPowerService
{
    // Configurable timing constants
    private const int TriggerSettleDelayMs = 500;
    private const uint TemporaryDisplayTimeoutSeconds = 1;
    private const int BlankObservationWindowMs = 5500;

    private readonly SemaphoreSlim _guard = new(1, 1);
    private readonly object _stateLock = new();

    private DisplayOffSessionState _sessionState = DisplayOffSessionState.Idle;
    private KeepAwakeLease? _keepAwakeLease;
    private bool _offObserved;
    private CancellationTokenSource? _sessionCts;

    public bool IsDisplayOffSessionActive
    {
        get
        {
            lock (_stateLock)
                return _sessionState != DisplayOffSessionState.Idle && _sessionState != DisplayOffSessionState.Failed;
        }
    }

    public DisplayOffSessionState SessionState
    {
        get
        {
            lock (_stateLock)
                return _sessionState;
        }
    }

    private void SetState(DisplayOffSessionState newState)
    {
        lock (_stateLock)
        {
            ProtocolServer.Log($"DisplayOff state: {_sessionState} → {newState}");
            _sessionState = newState;
        }
    }

    /// <summary>
    /// Called from NotificationWindow's WndProc when GUID_CONSOLE_DISPLAY_STATE fires.
    /// state: 0=Off, 1=On, 2=Dimmed
    /// </summary>
    public void OnDisplayStateChanged(int state)
    {
        lock (_stateLock)
        {
            if (_sessionState == DisplayOffSessionState.Idle) return;

            if (state == 0) // OFF
            {
                if (_sessionState == DisplayOffSessionState.WaitingForBlank ||
                    _sessionState == DisplayOffSessionState.Starting)
                {
                    _offObserved = true;
                    _sessionState = DisplayOffSessionState.DisplayOff;
                    ProtocolServer.Log("Display OFF observed — session confirmed active.");
                }
            }
            else if (state == 1) // ON
            {
                if (_offObserved && _sessionState == DisplayOffSessionState.DisplayOff)
                {
                    ProtocolServer.Log("Display ON observed after OFF — releasing KeepAwakeLease.");
                    _sessionState = DisplayOffSessionState.Completing;
                    ReleaseKeepAwakeLease();
                    _sessionState = DisplayOffSessionState.Idle;
                }
                // ON without prior OFF for this session → ignore (spurious initial notification)
            }
            // DIM (state == 2): not treated as OFF; keep waiting
        }
    }

    public async Task<DisplayBlankResult> TurnOffDisplayKeepingSystemAwakeAsync(
        CancellationToken cancellationToken = default)
    {
        // RDP check
        if (Kernel32Interop.GetSystemMetrics(Kernel32Interop.SM_REMOTESESSION) != 0)
        {
            ProtocolServer.Log("Display off rejected: running in a remote session.");
            return DisplayBlankResult.Fail(DisplayBlankStatus.RemoteSession,
                "Cannot turn off physical displays during a remote session.");
        }

        // Concurrency guard (non-blocking)
        if (!await _guard.WaitAsync(0, cancellationToken))
        {
            return DisplayBlankResult.Fail(DisplayBlankStatus.AlreadyInProgress,
                "A display-off operation is already in progress.");
        }

        _sessionCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var ct = _sessionCts.Token;

        Guid originalSchemeGuid = Guid.Empty;
        uint originalAc = 0, originalDc = 0;
        bool videoIdleModified = false;

        try
        {
            SetState(DisplayOffSessionState.Starting);
            _offObserved = false;

            // --- Step 1: Acquire KeepAwakeLease ---
            _keepAwakeLease = new KeepAwakeLease();
            if (!_keepAwakeLease.Acquire())
            {
                SetState(DisplayOffSessionState.Failed);
                return DisplayBlankResult.Fail(DisplayBlankStatus.PowerRequestFailed,
                    "Failed to acquire system power request (KeepAwakeLease).");
            }

            // --- Step 2: Settle input (avoid immediate wake from triggering input) ---
            ProtocolServer.Log($"Settling input for {TriggerSettleDelayMs}ms...");
            LogLastInputAge();
            await Task.Delay(TriggerSettleDelayMs, ct);

            // --- Step 3: Read and save current VIDEOIDLE ---
            var (schemeOk, schemeGuid) = PowerSchemeVideoIdleManager.GetActiveSchemeGuid();
            if (!schemeOk)
            {
                SetState(DisplayOffSessionState.Failed);
                return DisplayBlankResult.Fail(DisplayBlankStatus.CannotReadPowerScheme,
                    "Cannot determine active power scheme.");
            }
            originalSchemeGuid = schemeGuid;

            var (readOk, acSec, dcSec, readErr) = PowerSchemeVideoIdleManager.ReadVideoIdle(originalSchemeGuid);
            if (!readOk)
            {
                SetState(DisplayOffSessionState.Failed);
                return DisplayBlankResult.Fail(DisplayBlankStatus.CannotReadPowerScheme,
                    "Cannot read VIDEOIDLE from active power scheme.", (int?)readErr);
            }
            originalAc = acSec;
            originalDc = dcSec;

            ProtocolServer.Log($"Original VIDEOIDLE: AC={originalAc}s, DC={originalDc}s, scheme={originalSchemeGuid:D}");

            // --- Step 4: Write crash recovery sentinel ---
            DisplayBlankRecoveryStore.WriteSentinel(new DisplayBlankRecoveryState
            {
                Version = 1,
                SchemeGuid = originalSchemeGuid.ToString("D"),
                AcSeconds = originalAc,
                DcSeconds = originalDc,
                ProcessId = Environment.ProcessId,
                CreatedUtc = DateTime.UtcNow.ToString("O"),
                ApplicationVersion = "1.0.0"
            });

            // --- Step 5: Set VIDEOIDLE = 1 second ---
            SetState(DisplayOffSessionState.WaitingForBlank);

            var (writeOk, writeErr) = PowerSchemeVideoIdleManager.WriteVideoIdle(
                originalSchemeGuid, TemporaryDisplayTimeoutSeconds, TemporaryDisplayTimeoutSeconds, originalAc);
            if (!writeOk)
            {
                SetState(DisplayOffSessionState.Failed);
                return DisplayBlankResult.Fail(DisplayBlankStatus.CannotWriteVideoIdle,
                    "Cannot write VIDEOIDLE=1 to power scheme.", (int?)writeErr);
            }
            videoIdleModified = true;

            // --- Step 6: Apply scheme to make change effective ---
            var (applyOk, applyErr) = PowerSchemeVideoIdleManager.ApplyScheme(originalSchemeGuid);
            if (!applyOk)
            {
                ProtocolServer.Log($"ApplyScheme failed with error {applyErr} — continuing anyway.");
            }

            ProtocolServer.Log("VIDEOIDLE set to 1s. Waiting for Windows to blank display...");

            // --- Step 7: Wait for display OFF notification or timeout ---
            var observationDeadline = DateTime.UtcNow.AddMilliseconds(BlankObservationWindowMs);
            while (DateTime.UtcNow < observationDeadline)
            {
                ct.ThrowIfCancellationRequested();

                lock (_stateLock)
                {
                    if (_offObserved) break;
                }

                await Task.Delay(200, ct);
            }

            // --- Step 8: Restore original VIDEOIDLE (ALWAYS in finally, but also here for normal flow) ---
            // Restore happens in the finally block below

            lock (_stateLock)
            {
                if (!_offObserved)
                {
                    ProtocolServer.Log("Display OFF was NOT observed within the observation window.");
                    return DisplayBlankResult.Fail(DisplayBlankStatus.DisplayDidNotTurnOff,
                        $"Display did not turn off within {BlankObservationWindowMs}ms. " +
                        "VIDEOIDLE has been restored. The native idle path may not be effective on this system.");
                }
            }

            ProtocolServer.Log("Display successfully turned off via native idle path.");
            return DisplayBlankResult.Ok();
        }
        catch (OperationCanceledException)
        {
            ProtocolServer.Log("Display-off operation was cancelled.");
            return DisplayBlankResult.Fail(DisplayBlankStatus.Cancelled, "Operation was cancelled.");
        }
        catch (Exception ex)
        {
            ProtocolServer.Log($"Display-off operation failed: {ex.Message}");
            return DisplayBlankResult.Fail(DisplayBlankStatus.UnknownFailure, ex.Message);
        }
        finally
        {
            // ALWAYS restore VIDEOIDLE
            if (videoIdleModified && originalSchemeGuid != Guid.Empty)
            {
                ProtocolServer.Log("Restoring original VIDEOIDLE values...");
                var (restoreOk, _) = PowerSchemeVideoIdleManager.WriteVideoIdle(
                    originalSchemeGuid, originalAc, originalDc);

                // Re-apply scheme only if it's still active
                PowerSchemeVideoIdleManager.ApplyScheme(originalSchemeGuid, onlyIfStillActive: true);

                if (restoreOk)
                {
                    // Verify
                    if (PowerSchemeVideoIdleManager.VerifyVideoIdle(originalSchemeGuid, originalAc, originalDc))
                    {
                        DisplayBlankRecoveryStore.DeleteSentinel();
                    }
                    else
                    {
                        ProtocolServer.Log("WARNING: VIDEOIDLE restore verification failed. Sentinel NOT deleted.");
                    }
                }
                else
                {
                    ProtocolServer.Log("WARNING: VIDEOIDLE restore failed. Sentinel NOT deleted for next startup recovery.");
                }
            }

            // If display never turned off or was cancelled, release KeepAwakeLease immediately
            bool shouldReleaseLease;
            lock (_stateLock)
            {
                shouldReleaseLease = !_offObserved || _sessionState == DisplayOffSessionState.Failed;
                if (shouldReleaseLease && _sessionState != DisplayOffSessionState.Idle)
                    _sessionState = DisplayOffSessionState.Idle;
            }

            if (shouldReleaseLease)
            {
                ReleaseKeepAwakeLease();
            }
            // If display IS off, KeepAwakeLease stays alive until OnDisplayStateChanged(ON)

            _sessionCts?.Dispose();
            _sessionCts = null;
            _guard.Release();
        }
    }

    public async Task CancelDisplayOffSessionAsync()
    {
        _sessionCts?.Cancel();

        // If display is off and lease is active, release it
        lock (_stateLock)
        {
            if (_sessionState == DisplayOffSessionState.DisplayOff)
            {
                _sessionState = DisplayOffSessionState.Idle;
            }
        }
        ReleaseKeepAwakeLease();

        await Task.CompletedTask;
    }

    public async Task RecoverStaleDisplayTimeoutAsync()
    {
        if (!DisplayBlankRecoveryStore.SentinelExists())
            return;

        var state = DisplayBlankRecoveryStore.ReadSentinel();
        if (state == null)
        {
            ProtocolServer.Log("Stale sentinel found but could not be read. Deleting to avoid loop.");
            DisplayBlankRecoveryStore.DeleteSentinel();
            return;
        }

        ProtocolServer.Log($"Recovery sentinel found: scheme={state.SchemeGuid}, AC={state.AcSeconds}s, DC={state.DcSeconds}s, " +
            $"pid={state.ProcessId}, created={state.CreatedUtc}");

        if (!Guid.TryParse(state.SchemeGuid, out var schemeGuid))
        {
            ProtocolServer.Log("Recovery sentinel has invalid scheme GUID. Deleting.");
            DisplayBlankRecoveryStore.DeleteSentinel();
            return;
        }

        // Restore VIDEOIDLE on the original scheme
        var (writeOk, _) = PowerSchemeVideoIdleManager.WriteVideoIdle(schemeGuid, state.AcSeconds, state.DcSeconds);
        if (!writeOk)
        {
            ProtocolServer.Log("Recovery: VIDEOIDLE restore FAILED. Sentinel preserved for next startup.");
            return;
        }

        // Re-apply scheme (only if still active)
        PowerSchemeVideoIdleManager.ApplyScheme(schemeGuid, onlyIfStillActive: true);

        // Verify
        if (PowerSchemeVideoIdleManager.VerifyVideoIdle(schemeGuid, state.AcSeconds, state.DcSeconds))
        {
            DisplayBlankRecoveryStore.DeleteSentinel();
            ProtocolServer.Log("Recovery: VIDEOIDLE successfully restored and verified.");
        }
        else
        {
            ProtocolServer.Log("Recovery: VIDEOIDLE verification failed after restore. Sentinel preserved.");
        }

        await Task.CompletedTask;
    }

    private void ReleaseKeepAwakeLease()
    {
        if (_keepAwakeLease != null)
        {
            _keepAwakeLease.Dispose();
            _keepAwakeLease = null;
        }

        // Also clear SetThreadExecutionState as safety belt
        Kernel32Interop.SetThreadExecutionState(Kernel32Interop.EXECUTION_STATE.ES_CONTINUOUS);
    }

    private static void LogLastInputAge()
    {
        var info = new Kernel32Interop.LASTINPUTINFO
        {
            cbSize = (uint)System.Runtime.InteropServices.Marshal.SizeOf<Kernel32Interop.LASTINPUTINFO>()
        };

        if (Kernel32Interop.GetLastInputInfo(ref info))
        {
            var idleMs = (uint)Environment.TickCount - info.dwTime;
            ProtocolServer.Log($"Last input age: {idleMs}ms");
        }
    }

    // Legacy method for backward compatibility with existing protocol dispatch
    public bool TurnOffDisplay()
    {
        var result = TurnOffDisplayKeepingSystemAwakeAsync().GetAwaiter().GetResult();
        return result.IsSuccess;
    }
}
