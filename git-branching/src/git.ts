import * as random from "./random.js";

export interface CommitGraph {
  temporalTopologicalWalk(callback: (commit: Commit) => void): void;
}

/** Records a series of Git operations to be shown on the slide. */
export class GitRecorder implements CommitGraph {
  /* If true, `pause()` is implicitly called after all git operations. */
  singleStepMode = false;

  printCommands = true;
  readonly repo: Repo;
  readonly _operations: GitOperation[] = [];
  private paused = true;
  // Queue invariant: all nested lists are non-empty.
  private readonly queue: GitOperation[][] = [];
  private readonly recordRepo: Repo;

  constructor(seed: string) {
    this.repo = new Repo(seed);
    this.recordRepo = new Repo(seed);
  }

  get operations(): ReadonlyArray<GitOperation> {
    return this._operations;
  }

  pause() {
    this.paused = true;
  }

  commit({ msg = "", reverse = false } = {}) {
    this.enqueue(
      new CommitOperation({
        msg: msg,
        reverse: reverse,
        printCommand: this.printCommands,
      }),
    );
    return this;
  }

  branch(name: string) {
    this.enqueue(
      new BranchOperation(name, { printCommand: this.printCommands }),
    );
    return this;
  }

  checkout(branch: string, { createBranch = false } = {}) {
    this.enqueue(
      new CheckoutOperation(branch, {
        createBranch: createBranch,
        printCommand: this.printCommands,
      }),
    );
    return this;
  }

  merge(ref: string) {
    this.enqueue(new MergeOperation(ref, { printCommand: this.printCommands }));
    return this;
  }

  tag(name: string) {
    this.enqueue(new TagOperation(name, { printCommand: this.printCommands }));
    return this;
  }

  /** Runs the next set of commands; returns true if there are more commands. */
  replay(visitor: GitOperationVisitor | null = null): boolean {
    const commands = this.queue.shift();
    if (!commands) {
      return false; // run() called without any commands to play!
    }
    commands.forEach(command => {
      command.execute(this.repo);
      if (visitor) {
        command.visit(visitor);
      }
    });
    this._operations.push(...commands);
    return this.queue.length > 0;
  }

  temporalTopologicalWalk(callback: (commit: Commit) => void): void {
    this.recordRepo.temporalTopologicalWalk(callback);
  }

  private enqueue(command: GitOperation) {
    command.execute(this.recordRepo);
    if (this.paused) {
      this.queue.push([]);
      this.paused = false;
    }
    this.queue[this.queue.length - 1]!.push(command);
    if (this.singleStepMode) {
      this.pause();
    }
  }
}

export abstract class GitOperation {
  private _sha1: string | null = null;
  private readonly printCommand: boolean;
  private readonly _command: string;

  constructor({
    command,
    printCommand,
  }: {
    command: string;
    printCommand: boolean;
  }) {
    this.printCommand = printCommand;
    this._command = command;
  }

  /** The HEAD commit after the command ran. */
  get sha1(): string {
    if (this._sha1 === null) {
      throw Error("Cannot reference sha1 before execute()");
    }
    return this._sha1 || "";
  }

  execute(repo: Repo) {
    this.doExecute(repo);
    this._sha1 = repo.head.sha1;
  }

  protected abstract doExecute(_repo: Repo): void;

  /** Command representing this GitOperation (ex: `git branch`). */
  get command(): string | null {
    return this.printCommand ? this._command : null;
  }

  abstract visit(_visitor: GitOperationVisitor): void;
}

export class CommitOperation extends GitOperation {
  public readonly msg: string;
  public readonly reverse: boolean;

  constructor({
    msg,
    reverse = false,
    printCommand = true,
  }: {
    msg: string;
    reverse: boolean;
    printCommand: boolean;
  }) {
    const cmd = msg ? "git commit -m '" + msg + "'" : "git commit";
    super({ printCommand: printCommand, command: cmd });
    this.reverse = reverse;
    this.msg = msg;
  }

  protected doExecute(repo: Repo) {
    repo.commit(this.msg);
  }

  override visit(visitor: GitOperationVisitor) {
    visitor.visit(this);
    visitor.visitCommit(this);
  }
}

export class CheckoutOperation extends GitOperation {
  public readonly branch: string;
  public readonly createBranch: boolean;
  private _detachedHead: boolean | undefined;

  constructor(
    branch: string,
    { createBranch = false, printCommand = true } = {},
  ) {
    const cmd = createBranch
      ? "git checkout -b " + branch
      : "git checkout " + branch;
    super({ printCommand: printCommand, command: cmd });
    this.branch = branch;
    this.createBranch = createBranch;
  }

  detachedHead(): boolean {
    if (this._detachedHead === undefined) {
      throw Error("Cannot call detachedHead() before execute()");
    }
    return this._detachedHead;
  }

  protected doExecute(repo: Repo) {
    if (this.createBranch) {
      repo.branch(this.branch);
    }
    repo.checkout(this.branch);
    this._detachedHead = !repo.currentBranch;
  }

  override visit(visitor: GitOperationVisitor) {
    visitor.visit(this);
    visitor.visitCheckout(this);
  }
}

export class BranchOperation extends GitOperation {
  public readonly branch: string;

  constructor(branch: string, { printCommand = true } = {}) {
    const cmd = "git branch " + branch;
    super({ printCommand: printCommand, command: cmd });
    this.branch = branch;
  }

  protected doExecute(repo: Repo) {
    repo.branch(this.branch);
  }

  override visit(visitor: GitOperationVisitor) {
    visitor.visit(this);
    visitor.visitBranch(this);
  }
}

export class MergeOperation extends GitOperation {
  public readonly ref: string;

  constructor(ref: string, { printCommand = true } = {}) {
    const cmd = "git merge " + ref;
    super({ printCommand: printCommand, command: cmd });
    this.ref = ref;
  }

  protected doExecute(repo: Repo) {
    repo.merge(this.ref);
  }

  override visit(visitor: GitOperationVisitor) {
    visitor.visit(this);
    visitor.visitMerge(this);
  }
}

export class TagOperation extends GitOperation {
  public readonly tagName: string;
  private _commit: Commit | null = null;

  constructor(name: string, { printCommand = true } = {}) {
    const cmd = "git tag " + name;
    super({ printCommand: printCommand, command: cmd });
    this.tagName = name;
  }

  protected doExecute(repo: Repo) {
    this._commit = repo.tag(this.tagName);
  }

  get taggedCommit(): Commit {
    if (this._commit === null) {
      throw Error("Cannot reference taggedCommit before execute()");
    }
    return this._commit;
  }

  override visit(visitor: GitOperationVisitor) {
    visitor.visit(this);
    visitor.visitTag(this);
  }
}

/** Visitor interface for operations performed on a GitRecorder. */
export class GitOperationVisitor {
  /** Called for every command (before the GitOperation-subclass visit method is called). */
  visit(_op: GitOperation): void {}

  visitCommit(_op: CommitOperation): void {}

  visitCheckout(_op: CheckoutOperation): void {}

  visitBranch(_op: BranchOperation): void {}

  visitMerge(_op: MergeOperation): void {}

  visitTag(_op: TagOperation): void {}
}

export interface Commit {
  readonly msg: string;
  readonly sha1: string;
  readonly commitTime: number;

  get parents(): ReadonlyArray<Commit>;

  get tags(): ReadonlyArray<string>;

  branchChildren(): Commit[];

  mergeChildren(): Commit[];
}

class InternalCommit implements Commit {
  private readonly _parents: InternalCommit[] = [];
  private readonly children: WeakRef<InternalCommit>[] = [];
  private readonly _tags: string[] = [];

  constructor(
    public readonly msg: string,
    public readonly sha1: string,
    public readonly commitTime: number,
  ) {}

  private isMergeChildOf(parent: InternalCommit): boolean {
    return !!this._parents.length && this._parents[0] !== parent;
  }

  branchChildren(): Commit[] {
    return this.allChildren().filter(commit => !commit.isMergeChildOf(this));
  }

  mergeChildren(): Commit[] {
    return this.allChildren().filter(commit => commit.isMergeChildOf(this));
  }

  get parents(): Readonly<Array<Commit>> {
    return this._parents;
  }

  addParent(commit: InternalCommit) {
    this._parents.push(commit);
    commit.children.push(new WeakRef(this));
  }

  get tags(): Readonly<Array<string>> {
    return this._tags;
  }

  addTag(label: string) {
    this._tags.push(label);
  }

  private forEachChild(callback: (commit: InternalCommit) => void) {
    this.children.forEach(ref => {
      const maybeObj = ref.deref();
      if (maybeObj) {
        callback(maybeObj);
      }
    });
  }

  allChildren(): InternalCommit[] {
    const children: InternalCommit[] = [];
    this.forEachChild(child => children.push(child));
    return children;
  }
}

/** Simulates a git repository. */
export class Repo implements CommitGraph {
  private _head: InternalCommit;
  private readonly _commits: InternalCommit[];
  private readonly commitMap = new Map<string, InternalCommit>();
  private readonly rand: random.Random;
  private readonly branches = new Map<string, InternalCommit>();
  private readonly tags = new Map<string, InternalCommit>();
  private curBranch: string; // An empty string for "detached head"

  constructor(seed: string) {
    this._commits = [];
    this.rand = new random.SplitMix32(random.hash32(seed));
    this.curBranch = "main";
    this._head = this._commit("First commit");
  }

  get head(): Commit {
    return this._head;
  }

  get currentBranch(): string | undefined {
    return this.curBranch || undefined;
  }

  get commits(): ReadonlyArray<Commit> {
    return this._commits;
  }

  getCommit(sha1: string): Commit | undefined {
    return this.commitMap.get(sha1);
  }

  temporalTopologicalWalk(callback: (commit: Commit) => void): void {
    const visited = new Set<string>();

    function ordering(a: InternalCommit, b: InternalCommit): number {
      return a.commitTime - b.commitTime;
    }

    function dfs(commit: InternalCommit): void {
      if (!visited.has(commit.sha1)) {
        visited.add(commit.sha1);

        const children = commit.allChildren();
        children.sort(ordering);
        children.forEach(dfs);

        callback(commit);
      }
    }

    const sorted = [...this._commits];
    sorted.sort(ordering);
    sorted.forEach(dfs);
  }

  commit(msg: string) {
    const prevHead = this._head;
    const c = this._commit(msg);
    c.addParent(prevHead);
    return c;
  }

  /** Adds a tag to the commit that HEAD points to. */
  tag(name: string): Commit {
    if (!name) {
      throw Error("Tag names cannot be emtpy");
    }
    if (this.tags.has(name)) {
      throw Error("Already a tag with name '" + name + "'");
    }
    this.tags.set(name, this._head);
    this._head.addTag(name);
    return this._head;
  }

  private _commit(msg: string): InternalCommit {
    if (!this.curBranch) {
      throw Error('Cannot commit in "detached head" mode');
    }
    const t = this._commits.length + 1;
    const c = new InternalCommit(msg, this.rand.nextHex(), t);
    this._commits.push(c);
    this.commitMap.set(c.sha1, c);
    this.branches.set(this.curBranch, c);
    this._head = c;
    return c;
  }

  /** Creates a branch. */
  branch(name: string) {
    if (!name) {
      throw Error("Branch names cannot be emtpy");
    }
    if (this.branches.has(name)) {
      throw Error("Already a branch with name '" + name + "'");
    }
    this.branches.set(name, this._head);
  }

  /** Merges the given ref to the current branch. */
  merge(ref: string) {
    if (!ref) {
      throw Error('Merge "" - not something we can merge');
    }
    let commit = this.branches.get(ref);
    if (!commit) {
      commit = this.commitMap.get(ref);
      if (!commit) {
        throw Error(`Merge ${ref} - not something we can merge`);
      }
    }
    const c = this.commit("Merge " + ref);
    c.addParent(commit);
    return c;
  }

  checkout(ref: string) {
    if (!ref) {
      throw Error("Empty string is not a valid pathspec");
    }
    let newHead = this.branches.get(ref);
    if (!newHead) {
      newHead = this.commitMap.get(ref);
      if (!newHead) {
        throw Error(`pathspec '${ref}' did not match any file(s) known to git`);
      }
      ref = "";
    }
    this._head = newHead;
    this.curBranch = ref;
  }
}
