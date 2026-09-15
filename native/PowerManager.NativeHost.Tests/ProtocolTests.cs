using System.Text.Json;
using PowerManager.NativeHost.Protocol;
using Xunit;

namespace PowerManager.NativeHost.Tests;

public class ProtocolTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public void SuccessResponse_SerializesCorrectly()
    {
        var response = new NativeResponseSuccess
        {
            Id = "req_1",
            Result = new { protocolVersion = 1, hostVersion = "1.0.0" }
        };

        var json = JsonSerializer.Serialize(response, JsonOptions);
        Assert.Contains("\"type\":\"response\"", json);
        Assert.Contains("\"id\":\"req_1\"", json);
        Assert.Contains("\"ok\":true", json);
        Assert.Contains("\"protocolVersion\":1", json);
    }

    [Fact]
    public void ErrorResponse_SerializesCorrectly()
    {
        var response = new NativeResponseError
        {
            Id = "req_2",
            Error = new ProtocolError
            {
                Code = "SCHEME_NOT_FOUND",
                Message = "Scheme GUID does not exist",
                NativeCode = 2
            }
        };

        var json = JsonSerializer.Serialize(response, JsonOptions);
        Assert.Contains("\"type\":\"response\"", json);
        Assert.Contains("\"id\":\"req_2\"", json);
        Assert.Contains("\"ok\":false", json);
        Assert.Contains("\"code\":\"SCHEME_NOT_FOUND\"", json);
        Assert.Contains("\"nativeCode\":2", json);
    }

    [Fact]
    public void Event_SerializesCorrectly()
    {
        var evt = new NativeEvent
        {
            Event = "power.activeSchemeChanged",
            Data = new { schemeId = "381b4222-f694-41f0-9685-ff5bb260df2e" }
        };

        var json = JsonSerializer.Serialize(evt, JsonOptions);
        Assert.Contains("\"type\":\"event\"", json);
        Assert.Contains("\"event\":\"power.activeSchemeChanged\"", json);
        Assert.Contains("\"schemeId\":\"381b4222-f694-41f0-9685-ff5bb260df2e\"", json);
    }
}
