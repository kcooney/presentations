import { describe, expect, test } from "@jest/globals";
import * as git from "../src/git";

describe("Repo", () => {
  test("constructor with valid seed", () => {
    const repo = new git.Repo("seed");
    expect(repo.head.msg).toBe("First commit");
    expect(repo.head.parents).toStrictEqual([]);
    expect(repo["commits"]).toContain(repo.head);
    expect(repo["commits"].length).toBe(1);
    expect(repo["curBranch"]).toBe("main");
  });
});
