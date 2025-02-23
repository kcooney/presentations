import { describe, expect, test } from "@jest/globals";
import { Repo } from "../../src/git/repo";

describe("Repo", () => {
  test("constructor with valid seed", () => {
    const repo = new Repo("seed");
    expect(repo.head.msg).toBe("First commit");
    expect(repo.head.parents).toStrictEqual([]);
    expect(repo["commits"]).toContain(repo.head);
    expect(repo["commits"].length).toBe(1);
    expect(repo["curBranch"]).toBe("main");
  });
});
