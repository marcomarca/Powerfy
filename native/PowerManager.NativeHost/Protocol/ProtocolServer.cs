using System.Text.Json;

namespace PowerManager.NativeHost.Protocol;

public class ProtocolServer
{
    private readonly object _stdoutLock = new();
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public void SendSuccess(string id, object? result)
    {
        var response = new NativeResponseSuccess
        {
            Id = id,
            Result = result
        };
        SendJson(response);
    }

    public void SendError(string id, string code, string message, int? nativeCode = null)
    {
        var response = new NativeResponseError
        {
            Id = id,
            Error = new ProtocolError
            {
                Code = code,
                Message = message,
                NativeCode = nativeCode
            }
        };
        SendJson(response);
    }

    public void SendEvent(string eventName, object? data)
    {
        var evt = new NativeEvent
        {
            Event = eventName,
            Data = data
        };
        SendJson(evt);
    }

    private void SendJson(object payload)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        lock (_stdoutLock)
        {
            Console.Out.WriteLine(json);
            Console.Out.Flush();
        }
    }

    public static void Log(string message)
    {
        Console.Error.WriteLine($"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff}] {message}");
        Console.Error.Flush();
    }
}
