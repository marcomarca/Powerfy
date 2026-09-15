using System.Runtime.InteropServices;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services.DisplayPower;

/// <summary>
/// Manages reading/writing VIDEOIDLE (display idle timeout) for a specific power scheme.
/// Uses PowrProf.dll PowerRead/WriteACValueIndex and PowerRead/WriteDCValueIndex.
/// </summary>
public static class PowerSchemeVideoIdleManager
{
    private static Guid _videoSubgroup = PowrprofInterop.GUID_VIDEO_SUBGROUP;
    private static Guid _videoIdleTimeout = PowrprofInterop.GUID_VIDEO_IDLE_TIMEOUT;

    /// <summary>
    /// Gets the currently active power scheme GUID.
    /// </summary>
    public static (bool Success, Guid SchemeGuid) GetActiveSchemeGuid()
    {
        var result = PowrprofInterop.PowerGetActiveScheme(IntPtr.Zero, out var pGuid);
        if (result != PowrprofInterop.ERROR_SUCCESS || pGuid == IntPtr.Zero)
        {
            ProtocolServer.Log($"PowerGetActiveScheme failed with error {result}");
            return (false, Guid.Empty);
        }

        try
        {
            var guid = Marshal.PtrToStructure<Guid>(pGuid);
            return (true, guid);
        }
        finally
        {
            PowrprofInterop.LocalFree(pGuid);
        }
    }

    /// <summary>
    /// Reads the current VIDEOIDLE AC and DC timeout values (in seconds) for the given scheme.
    /// </summary>
    public static (bool Success, uint AcSeconds, uint DcSeconds, uint? Win32Error) ReadVideoIdle(Guid schemeGuid)
    {
        var res = PowrprofInterop.PowerReadACValueIndex(
            IntPtr.Zero, ref schemeGuid, ref _videoSubgroup, ref _videoIdleTimeout, out var acValue);

        if (res != PowrprofInterop.ERROR_SUCCESS)
        {
            ProtocolServer.Log($"PowerReadACValueIndex failed with error {res}");
            return (false, 0, 0, res);
        }

        res = PowrprofInterop.PowerReadDCValueIndex(
            IntPtr.Zero, ref schemeGuid, ref _videoSubgroup, ref _videoIdleTimeout, out var dcValue);

        if (res != PowrprofInterop.ERROR_SUCCESS)
        {
            ProtocolServer.Log($"PowerReadDCValueIndex failed with error {res}");
            return (false, 0, 0, res);
        }

        ProtocolServer.Log($"VIDEOIDLE read: scheme={schemeGuid:D}, AC={acValue}s, DC={dcValue}s");
        return (true, acValue, dcValue, null);
    }

    /// <summary>
    /// Writes VIDEOIDLE AC and DC timeout values for the given scheme.
    /// If AC write succeeds but DC fails, AC is restored to its previous value.
    /// </summary>
    public static (bool Success, uint? Win32Error) WriteVideoIdle(
        Guid schemeGuid, uint acSeconds, uint dcSeconds, uint? originalAcToRestore = null)
    {
        // Write AC
        var res = PowrprofInterop.PowerWriteACValueIndex(
            IntPtr.Zero, ref schemeGuid, ref _videoSubgroup, ref _videoIdleTimeout, acSeconds);

        if (res != PowrprofInterop.ERROR_SUCCESS)
        {
            ProtocolServer.Log($"PowerWriteACValueIndex({acSeconds}) failed with error {res}");
            return (false, res);
        }

        // Write DC
        res = PowrprofInterop.PowerWriteDCValueIndex(
            IntPtr.Zero, ref schemeGuid, ref _videoSubgroup, ref _videoIdleTimeout, dcSeconds);

        if (res != PowrprofInterop.ERROR_SUCCESS)
        {
            ProtocolServer.Log($"PowerWriteDCValueIndex({dcSeconds}) failed with error {res}. Rolling back AC.");
            // Rollback AC if DC failed
            if (originalAcToRestore.HasValue)
            {
                PowrprofInterop.PowerWriteACValueIndex(
                    IntPtr.Zero, ref schemeGuid, ref _videoSubgroup, ref _videoIdleTimeout, originalAcToRestore.Value);
            }
            return (false, res);
        }

        ProtocolServer.Log($"VIDEOIDLE written: scheme={schemeGuid:D}, AC={acSeconds}s, DC={dcSeconds}s");
        return (true, null);
    }

    /// <summary>
    /// Applies (re-activates) a power scheme to make VIDEOIDLE changes take effect.
    /// Only applies if the given scheme is still the active one.
    /// </summary>
    public static (bool Success, uint? Win32Error) ApplyScheme(Guid schemeGuid, bool onlyIfStillActive = false)
    {
        if (onlyIfStillActive)
        {
            var (ok, currentGuid) = GetActiveSchemeGuid();
            if (!ok || currentGuid != schemeGuid)
            {
                ProtocolServer.Log($"Scheme {schemeGuid:D} is no longer active (current={currentGuid:D}). Not re-applying.");
                return (true, null); // Not an error; scheme was legitimately changed
            }
        }

        var res = PowrprofInterop.PowerSetActiveScheme(IntPtr.Zero, ref schemeGuid);
        if (res != PowrprofInterop.ERROR_SUCCESS)
        {
            ProtocolServer.Log($"PowerSetActiveScheme({schemeGuid:D}) failed with error {res}");
            return (false, res);
        }

        ProtocolServer.Log($"Power scheme applied: {schemeGuid:D}");
        return (true, null);
    }

    /// <summary>
    /// Verifies that VIDEOIDLE values match expected values after a restore operation.
    /// </summary>
    public static bool VerifyVideoIdle(Guid schemeGuid, uint expectedAc, uint expectedDc)
    {
        var (ok, actualAc, actualDc, _) = ReadVideoIdle(schemeGuid);
        if (!ok) return false;

        if (actualAc != expectedAc || actualDc != expectedDc)
        {
            ProtocolServer.Log(
                $"VIDEOIDLE verification FAILED: expected AC={expectedAc}/DC={expectedDc}, " +
                $"got AC={actualAc}/DC={actualDc}");
            return false;
        }

        ProtocolServer.Log($"VIDEOIDLE verification passed: AC={actualAc}s, DC={actualDc}s");
        return true;
    }
}
