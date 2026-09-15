using PowerManager.NativeHost.Protocol;
using Xunit;

namespace PowerManager.NativeHost.Tests;

public class ProcessMatchingTests
{
    [Fact]
    public void ProcessTargetDto_StoresPathAndName()
    {
        var target1 = new ProcessTargetDto("path", @"C:\Games\Game.exe");
        var target2 = new ProcessTargetDto("name", "discord.exe");

        Assert.Equal("path", target1.Match);
        Assert.Equal(@"C:\Games\Game.exe", target1.Value);
        Assert.Equal("name", target2.Match);
        Assert.Equal("discord.exe", target2.Value);
    }

    [Fact]
    public void ProcessMatchStateDto_TracksPidsAndRunningState()
    {
        var target = new ProcessTargetDto("name", "game.exe");
        var state = new ProcessMatchStateDto(target, true, [1024, 2048], @"C:\Games\Game.exe");

        Assert.True(state.IsRunning);
        Assert.Equal(2, state.Pids.Length);
        Assert.Equal(@"C:\Games\Game.exe", state.MatchedPath);
    }
}
