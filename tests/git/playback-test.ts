import { describe, expect, test } from "@jest/globals";
import { GitRecorder } from "../../src/git/recorder";

describe("GitPlayback", () => {
  test("peekNextOperations and hasMoreCommands", () => {
    const recorder = new GitRecorder("seed", { singleStepMode: true });
    recorder.commit({ msg: "Commit 1" }).commit({ msg: "Commit 2" });

    const playback = recorder.replay();
    expect(playback.hasMoreCommands).toBe(true);
    expect(playback.hasMoreCommandsAfterNext).toBe(true);

    const next1 = playback.peekNextOperations();
    expect(next1).not.toBeNull();
    expect(next1!.length).toBe(1);
    expect(next1?.[0]?.command).toContain("Commit 1");

    // Play first step
    const hasMore1 = playback.play();
    expect(hasMore1).toBe(true);
    expect(playback.hasMoreCommands).toBe(true);
    expect(playback.hasMoreCommandsAfterNext).toBe(false);

    const next2 = playback.peekNextOperations();
    expect(next2).not.toBeNull();
    expect(next2!.length).toBe(1);
    expect(next2?.[0]?.command).toContain("Commit 2");

    // Play second step
    const hasMore2 = playback.play();
    expect(hasMore2).toBe(false);
    expect(playback.hasMoreCommands).toBe(false);
    expect(playback.hasMoreCommandsAfterNext).toBe(false);
    expect(playback.peekNextOperations()).toBeNull();
  });
});
