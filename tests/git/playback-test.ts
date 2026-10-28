import { describe, expect, test } from "@jest/globals";
import { GitRecorder, PlaybackStep } from "../../src/git/recorder";

describe("GitPlayback and PlaybackStep", () => {
  test("step execution, executedCommands, and hasMoreCommands", () => {
    const recorder = new GitRecorder("seed", { singleStepMode: true });
    recorder.commit({ msg: "Commit 1" }).commit({ msg: "Commit 2" });

    const playback = recorder.replay();
    expect(playback.hasMoreCommands).toBe(true);
    expect(playback.executedSteps).toEqual([]);
    expect(playback.executedCommands).toEqual([]);

    // Play first step
    const hasMore1 = playback.play();
    expect(hasMore1).toBe(true);
    expect(playback.hasMoreCommands).toBe(true);
    expect(playback.executedSteps.length).toBe(1);
    expect(playback.executedSteps[0]).toBeInstanceOf(PlaybackStep);
    expect(playback.executedCommands.length).toBe(1);
    expect(playback.executedCommands[0]).toContain("Commit 1");

    // Play second step
    const hasMore2 = playback.play();
    expect(hasMore2).toBe(false);
    expect(playback.hasMoreCommands).toBe(false);
    expect(playback.executedSteps.length).toBe(2);
    expect(playback.executedCommands.length).toBe(2);
    expect(playback.executedCommands[1]).toContain("Commit 2");
    expect(playback.operations.length).toBe(2);
  });
});
