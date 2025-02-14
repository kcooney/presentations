import { Commit, Repo } from "./git";
import { Layout } from "./layout";

/** Records a series of Git operations to be shown on the slide. */
export class GitRecorder {
  /* If true, `pause()` is implicitly called after all git operations. */
  singleStepMode = false;

  printCommands = true;
  readonly repo: Repo;
  readonly _operations: GitOperation[] = [];
  private paused = true;
  // Queue invariant: all nested lists are non-empty.
  private readonly queue: GitOperation[][] = [];
  private readonly recordRepo: Repo;
  private recording = true;

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

  commit({ msg = "", reverse = false, amend = false } = {}) {
    if (reverse && amend) {
      throw Error("Cannot pass both reverse=true and amend=true");
    }
    this.enqueue(
      new CommitOperation({
        msg: msg,
        reverse: reverse,
        amend: amend,
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
    this.recording = false;
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

  createLayout() {
    return Layout.create(this.recordRepo);
  }

  private enqueue(command: GitOperation) {
    if (!this.recording) {
      throw Error("Cannot record new actions after replay() is called");
    }
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
  public readonly amend: boolean;

  constructor({
    msg,
    reverse,
    amend,
    printCommand,
  }: {
    msg: string;
    reverse: boolean;
    amend: boolean;
    printCommand: boolean;
  }) {
    let cmd = amend ? "git commit --amend" : "git commit";
    if (msg) {
      cmd += ` -m '${msg}'`;
    }
    super({ printCommand: printCommand, command: cmd });
    this.reverse = reverse;
    this.amend = amend;
    this.msg = msg;
  }

  protected doExecute(repo: Repo) {
    repo.commit(this.msg, { amend: this.amend });
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
