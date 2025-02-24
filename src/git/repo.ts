import * as random from "./random";

const PRIMARY_BRANCH = "main";

export interface Ref {
  readonly commit: Commit;
  readonly branch?: string;
}

class InternalRef implements Ref {
  constructor(
    readonly commit: InternalCommit,
    readonly branch?: string,
  ) {}
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

// See https://www.divotion.com/blog/creating-type-safe-events
type EventsDefinition = {
  commitRefsUpdated: Commit;
  commitCreated: Commit;
};
type GitEvents = keyof EventsDefinition;
type Unsubscribe = () => void;

function isCustomEvent(event: Event): event is CustomEvent {
  return "detail" in event;
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

export interface ReadonlyRepo {
  get head(): Commit;
  get currentBranch(): string | undefined;
  get commits(): ReadonlyArray<Commit>;
  get tags(): ReadonlyMap<string, Commit>;
  get branches(): ReadonlyMap<string, Commit>;
  getCommit(sha1: string): Commit | undefined;
  temporalTopologicalWalk(callback: (commit: Commit) => void): void;
  onCommitRefsUpdated(handlerFn: (payload: Commit) => void): void;
  onCommitCreated(handlerFn: (payload: Commit) => void): void;
}

/** Simulates a git repository. */
export class Repo implements ReadonlyRepo {
  private _head: InternalRef;
  private readonly _commits: InternalCommit[];
  private readonly commitMap = new Map<string, InternalCommit>();
  private readonly rand: random.Random;
  private readonly _branches = new Map<string, InternalCommit>();
  private readonly _tags = new Map<string, InternalCommit>();
  private eventBus: EventTarget | null = null;

  constructor(public readonly seed: string) {
    this._commits = [];
    this.rand = new random.SplitMix32(random.hash32(seed));
    const commit = new InternalCommit("", "", 0);
    this._head = new InternalRef(commit, PRIMARY_BRANCH);
    this._commit("First commit");
  }

  onCommitRefsUpdated(handlerFn: (payload: Commit) => void) {
    this.subscribe("commitRefsUpdated", handlerFn);
  }

  onCommitCreated(handlerFn: (payload: Commit) => void) {
    this.subscribe("commitCreated", handlerFn);
  }

  get head(): Commit {
    return this._head.commit;
  }

  get currentBranch(): string | undefined {
    return this._head.branch;
  }

  get commits(): ReadonlyArray<Commit> {
    return this._commits;
  }

  get tags(): ReadonlyMap<string, Commit> {
    return this._tags;
  }

  get branches(): ReadonlyMap<string, Commit> {
    return this._branches;
  }

  getCommit(sha1: string): Commit | undefined {
    return this.commitMap.get(sha1);
  }

  /** Depth-first search that visits commits from latest to earliest */
  temporalTopologicalWalk(callback: (commit: Commit) => void): void {
    const visited = new Set<string>();

    function ordering(a: InternalCommit, b: InternalCommit): number {
      return b.commitTime - a.commitTime;
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

  commit(msg: string, { amend = false } = {}): Commit {
    const prevHead = this._head;
    let parent = prevHead.commit;
    if (amend) {
      if (this._head.commit.parents.length == 0) {
        throw Error("Cannot ammend the first commit");
      }
      if (this._head.commit.parents.length > 1) {
        throw Error("Cannot ammend a merge commit");
      }
      parent = this._head.commit.parents[0] as InternalCommit;
    }
    const c = this._commit(msg);
    c.addParent(parent);
    this.publish("commitCreated", c);
    this.publish("commitRefsUpdated", prevHead.commit);
    return c;
  }

  revert(ref = "HEAD"): Commit {
    if (!ref) {
      throw Error('Revert "" - not something we can revert');
    }
    const commit = this.resolve(ref);
    if (!commit) {
      throw Error(`Revert ${ref} - not something we can revert`);
    }
    const msg = `Revert ${commit.msg}`;
    return this.commit(msg);
  }

  /** Adds a tag to the commit that HEAD points to. */
  tag(name: string): Commit {
    if (!name) {
      throw Error("Tag names cannot be emtpy");
    }
    if (this._tags.has(name)) {
      throw Error("Already a tag with name '" + name + "'");
    }
    this._tags.set(name, this._head.commit);
    this._head.commit.addTag(name);
    this.publish("commitRefsUpdated", this._head.commit);
    return this._head.commit;
  }

  private _commit(msg: string): InternalCommit {
    const branch = this._head.branch;
    if (!branch) {
      throw Error('Cannot commit in "detached head" mode');
    }
    const t = this._commits.length + 1;
    const c = new InternalCommit(msg, this.rand.nextHex(), t);
    this._commits.push(c);
    this.commitMap.set(c.sha1, c);
    this._branches.set(branch, c);
    this._head = new InternalRef(c, branch);
    return c;
  }

  /** Creates a branch. */
  branch(name: string) {
    if (!name) {
      throw Error("Branch names cannot be emtpy");
    }
    if (this._branches.has(name)) {
      throw Error("Already a branch with name '" + name + "'");
    }
    this._branches.set(name, this._head.commit);
    this.publish("commitRefsUpdated", this._head.commit);
  }

  /** Merges the given ref to the current branch. */
  merge(ref: string): Commit {
    if (!ref) {
      throw Error('Merge "" - not something we can merge');
    }
    const mergeFromCommit = this.resolve(ref);
    if (!mergeFromCommit) {
      throw Error(`Merge ${ref} - not something we can merge`);
    }
    if (mergeFromCommit == this._head.commit) {
      return this._head.commit;
    }
    const prevHead = this._head.commit;
    const c = this._commit("Merge " + ref);
    c.addParent(prevHead);
    c.addParent(mergeFromCommit);
    this.publish("commitCreated", c);
    this.publish("commitRefsUpdated", prevHead);
    return c;
  }

  checkout(ref: string): void {
    if (!ref) {
      throw Error("Empty string is not a valid pathspec");
    }
    let newBranch: string | undefined;
    let newHeadCommit = this._branches.get(ref);
    if (newHeadCommit) {
      newBranch = ref;
    } else {
      newHeadCommit = this.commitMap.get(ref);
      if (!newHeadCommit) {
        throw Error(`pathspec '${ref}' did not match any file(s) known to git`);
      }
      ref = "";
    }
    const oldHead = this._head;
    this._head = new InternalRef(newHeadCommit, newBranch);
    if (oldHead.commit !== newHeadCommit) {
      this.publish("commitRefsUpdated", oldHead.commit);
      this.publish("commitRefsUpdated", newHeadCommit);
    } else if (oldHead.branch !== this._head.branch) {
      if (oldHead.branch) {
        this.publish("commitRefsUpdated", oldHead.commit);
      }
      if (this._head.branch) {
        this.publish("commitRefsUpdated", this._head.commit);
      }
    }
  }

  private resolve(ref: string): InternalCommit | undefined {
    if (ref === "HEAD") {
      return this._head.commit;
    }
    let c = this._branches.get(ref);
    if (!c) {
      c = this.commitMap.get(ref);
      if (!c) {
        c = this._tags.get(ref);
      }
    }
    return c;
  }

  private subscribe<T extends GitEvents>(
    eventName: T,
    handlerFn: (payload: EventsDefinition[T]) => void,
  ): Unsubscribe {
    const eventHandler = (event: Event) => {
      if (isCustomEvent(event)) {
        const eventPayload: EventsDefinition[T] = event.detail;
        handlerFn(eventPayload);
      }
    };
    let eventBus = this.eventBus;
    if (!eventBus) {
      eventBus = this.eventBus = new Comment("my-event-bus");
    }
    eventBus.addEventListener(eventName, eventHandler);
    return () => {
      eventBus.removeEventListener(eventName, eventHandler);
    };
  }

  private publish<T extends GitEvents>(
    eventName: T,
    payload?: EventsDefinition[T],
  ): void {
    if (this.eventBus) {
      const event = payload
        ? new CustomEvent(eventName, { detail: payload })
        : new CustomEvent(eventName);
      this.eventBus.dispatchEvent(event);
    }
  }
}
