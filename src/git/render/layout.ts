import { Commit, ReadonlyRepo, PRIMARY_BRANCH } from "../repo";

export interface Position {
  readonly i: number;
  readonly j: number;
}

class CommitWrapper implements Position {
  readonly branchChildren: Commit[];

  constructor(
    public readonly commit: Commit,
    public i = 0,
    public j = 0,
  ) {
    this.branchChildren = commit.branchChildren();
  }
}

export class Layout {
  private constructor(
    private readonly positionBySha1: Map<string, Position>,
    public readonly maxI: number,
    public readonly maxJ: number,
  ) {}

  static create(
    repo: ReadonlyRepo,
    branchOrder?: ReadonlyArray<string>,
  ): Layout {
    // Inspired by https://pvigier.github.io/2019/05/06/commit-graph-drawing-algorithms.html

    // First do a temporal topological sort, getting the i coordinates.
    const commitWrappers: CommitWrapper[] = [];
    const commitWrapperBySha1 = new Map<string, CommitWrapper>();
    repo.temporalTopologicalWalk(commit => {
      const wrapper = new CommitWrapper(commit);
      commitWrappers.push(wrapper);
      commitWrapperBySha1.set(commit.sha1, wrapper);
    });
    const maxI = commitWrappers.length - 1;
    commitWrappers.forEach((commitWrapper, i) => {
      commitWrapper.i = maxI - i;
    });

    // Next, get the j coordinates, using branchOrder if provided.
    const activeBranches: Commit[] = [];
    for (const branch of branchOrder ?? [PRIMARY_BRANCH]) {
      const commit = repo.getCommit(branch);
      if (commit) {
        activeBranches.push(commit);
      }
    }

    let maxJ = 0;
    for (const wrapper of commitWrappers) {
      let child = wrapper.branchChildren.pop();
      if (child) {
        let index = activeBranches.findIndex(w => w === child);
        if (index >= 0) {
          activeBranches[index] = wrapper.commit;
        }
        // Remove chidren from activeBranches.
        child = wrapper.branchChildren.pop();
        while (child) {
          index = activeBranches.findIndex(w => w === child);
          if (index >= 0) {
            activeBranches.splice(index, 1);
          }
          child = wrapper.branchChildren.pop();
        }
      } else {
        if (!activeBranches.some(w => w === wrapper.commit)) {
          activeBranches.push(wrapper.commit);
        }
      }
      wrapper.j = activeBranches.findIndex(w => w === wrapper.commit);
      maxJ = Math.max(wrapper.j, maxJ);
    }

    return new Layout(commitWrapperBySha1, maxI, maxJ);
  }

  getPosition(commit: Commit): Position | undefined {
    return this.positionBySha1.get(commit.sha1);
  }
}
