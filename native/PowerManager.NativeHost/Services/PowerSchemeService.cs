using System.Runtime.InteropServices;
using PowerManager.NativeHost.Protocol;
using PowerManager.NativeHost.Win32;

namespace PowerManager.NativeHost.Services;

public interface IPowerSchemeService
{
    List<SchemeDto> ListSchemes();
    SchemeDto? GetActiveScheme();
    (bool Success, string SchemeId, string? ErrorMessage) SetActiveScheme(string schemeId);
}

public class PowerSchemeService : IPowerSchemeService
{
    public List<SchemeDto> ListSchemes()
    {
        var schemes = new List<SchemeDto>();
        var activeScheme = GetActiveScheme();
        var activeId = activeScheme?.Id;

        uint index = 0;
        uint bufferSize = 16;
        var buffer = Marshal.AllocHGlobal(16);

        try
        {
            while (true)
            {
                bufferSize = 16;
                var result = PowrprofInterop.PowerEnumerate(
                    IntPtr.Zero,
                    IntPtr.Zero,
                    IntPtr.Zero,
                    PowrprofInterop.ACCESS_SCHEME,
                    index,
                    buffer,
                    ref bufferSize);

                if (result != 0)
                {
                    break; // No more schemes (e.g. ERROR_NO_MORE_ITEMS = 259)
                }

                var schemeGuid = Marshal.PtrToStructure<Guid>(buffer);
                var friendlyName = ReadFriendlyName(schemeGuid);
                var id = schemeGuid.ToString("D").ToLowerInvariant();

                schemes.Add(new SchemeDto(
                    id,
                    string.IsNullOrWhiteSpace(friendlyName) ? $"Esquema {id[..8]}" : friendlyName,
                    string.Equals(id, activeId, StringComparison.OrdinalIgnoreCase)
                ));

                index++;
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }

        return schemes;
    }

    public SchemeDto? GetActiveScheme()
    {
        var result = PowrprofInterop.PowerGetActiveScheme(IntPtr.Zero, out var pGuid);
        if (result != 0 || pGuid == IntPtr.Zero)
        {
            return null;
        }

        try
        {
            var schemeGuid = Marshal.PtrToStructure<Guid>(pGuid);
            var id = schemeGuid.ToString("D").ToLowerInvariant();
            var friendlyName = ReadFriendlyName(schemeGuid);

            return new SchemeDto(
                id,
                string.IsNullOrWhiteSpace(friendlyName) ? $"Esquema {id[..8]}" : friendlyName,
                true
            );
        }
        finally
        {
            PowrprofInterop.LocalFree(pGuid);
        }
    }

    public (bool Success, string SchemeId, string? ErrorMessage) SetActiveScheme(string schemeId)
    {
        if (!Guid.TryParse(schemeId, out var targetGuid))
        {
            return (false, schemeId, $"Invalid scheme GUID: {schemeId}");
        }

        var result = PowrprofInterop.PowerSetActiveScheme(IntPtr.Zero, ref targetGuid);
        if (result != 0)
        {
            return (false, schemeId, $"PowerSetActiveScheme failed with error code {result}");
        }

        // Verify that active scheme was indeed changed
        var active = GetActiveScheme();
        if (active != null && string.Equals(active.Id, schemeId, StringComparison.OrdinalIgnoreCase))
        {
            return (true, schemeId, null);
        }

        return (false, schemeId, $"Power scheme activation verification failed. Active is {active?.Id}");
    }

    private static string ReadFriendlyName(Guid schemeGuid)
    {
        uint bufferSize = 0;
        var res = PowrprofInterop.PowerReadFriendlyName(
            IntPtr.Zero,
            ref schemeGuid,
            IntPtr.Zero,
            IntPtr.Zero,
            IntPtr.Zero,
            ref bufferSize);

        if (bufferSize == 0)
        {
            return "";
        }

        var pName = Marshal.AllocHGlobal((int)bufferSize);
        try
        {
            res = PowrprofInterop.PowerReadFriendlyName(
                IntPtr.Zero,
                ref schemeGuid,
                IntPtr.Zero,
                IntPtr.Zero,
                pName,
                ref bufferSize);

            if (res == 0)
            {
                return Marshal.PtrToStringUni(pName) ?? "";
            }
        }
        finally
        {
            Marshal.FreeHGlobal(pName);
        }

        return "";
    }
}
