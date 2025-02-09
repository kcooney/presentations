import { Commit, CommitGraph } from "./git.js";

export interface Position {
  readonly i: number;
  readonly j: number;
}

class CommitWrapper implements Position {
  branchChildren: CommitWrapper[] = [];

  constructor(
    public readonly commit: Commit,
    public i = 0,
    public j = 0,
  ) {}
}

export class Layout {
  private constructor(
    private readonly positionBySha1: Map<string, Position>,
    public readonly maxI: number,
    public readonly maxJ: number,
  ) {}

  static create(git: CommitGraph): Layout {
    // Inspired by https://pvigier.github.io/2019/05/06/commit-graph-drawing-algorithms.html

    // First do a temporal topological sort, getting the i coordinates.
    const commitWrappers: CommitWrapper[] = [];
    const commitWrapperBySha1 = new Map<string, CommitWrapper>();
    git.temporalTopologicalWalk(commit => {
      const wrapper = new CommitWrapper(commit);
      commitWrappers.push(wrapper);
      commitWrapperBySha1.set(commit.sha1, wrapper);
    });
    const maxI = commitWrappers.length - 1;
    commitWrappers.forEach((commitWrapper, i) => {
      commitWrapper.i = maxI - i;
    });

    // Next wrap all of the children.
    commitWrappers.forEach(wrapper => {
      wrapper.commit.branchChildren().forEach(commit => {
        const child = commitWrapperBySha1.get(commit.sha1);
        if (child) {
          wrapper.branchChildren.push(child);
        }
      });
    });

    // Next, get the j coordinates.
    const activeBranches: CommitWrapper[] = [];
    let maxJ = 0;
    for (const wrapper of commitWrappers) {
      let child = wrapper.branchChildren.pop();
      if (child) {
        let index = activeBranches.findIndex(w => w === child);
        if (index >= 0) {
          activeBranches[index] = wrapper;
        }
        // Remove chidren from activeBranches
        child = wrapper.branchChildren.pop();
        while (child) {
          index = activeBranches.findIndex(w => w === child);
          if (index > -1) {
            activeBranches.splice(index, 1);
          }
          child = wrapper.branchChildren.pop();
        }
      } else {
        activeBranches.push(wrapper);
      }
      wrapper.j = activeBranches.findIndex(w => w === wrapper);
      maxJ = Math.max(wrapper.j, maxJ);
    }

    return new Layout(commitWrapperBySha1, maxI, maxJ);
  }

  getPosition(commit: Commit): Position | undefined {
    return this.positionBySha1.get(commit.sha1);
  }
}
