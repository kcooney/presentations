import * as random from "./random.js";

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

/** Simulates a git repository. */
export class Repo {
  private _head: InternalCommit;
  private readonly _commits: InternalCommit[];
  private readonly commitMap = new Map<string, InternalCommit>();
  private readonly rand: random.Random;
  private readonly _branches = new Map<string, InternalCommit>();
  private readonly _tags = new Map<string, InternalCommit>();
  private eventBus: EventTarget | null = null;
  private curBranch: string; // An empty string for "detached head"

  constructor(seed: string) {
    this._commits = [];
    this.rand = new random.SplitMix32(random.hash32(seed));
    this.curBranch = "main";
    this._head = this._commit("First commit");
  }

  onCommitRefsUpdated(handlerFn: (payload: Commit) => void) {
    this.subscribe("commitRefsUpdated", handlerFn);
  }

  onCommitCreated(handlerFn: (payload: Commit) => void) {
    this.subscribe("commitCreated", handlerFn);
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

  commit(msg: string, { amend = false } = {}) {
    const prevHead = this._head;
    let parent = prevHead;
    if (amend) {
      if (this._head.parents.length == 0) {
        throw Error("Cannot ammend the first commit");
      }
      if (this._head.parents.length > 1) {
        throw Error("Cannot ammend a merge commit");
      }
      parent = this._head.parents[0] as InternalCommit;
    }
    const c = this._commit(msg);
    c.addParent(parent);
    this.publish("commitCreated", c);
    this.publish("commitRefsUpdated", prevHead);
    return c;
  }

  /** Adds a tag to the commit that HEAD points to. */
  tag(name: string): Commit {
    if (!name) {
      throw Error("Tag names cannot be emtpy");
    }
    if (this._tags.has(name)) {
      throw Error("Already a tag with name '" + name + "'");
    }
    this._tags.set(name, this._head);
    this._head.addTag(name);
    this.publish("commitRefsUpdated", this._head);
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
    this._branches.set(this.curBranch, c);
    this._head = c;
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
    this._branches.set(name, this._head);
    this.publish("commitRefsUpdated", this._head);
  }

  /** Merges the given ref to the current branch. */
  merge(ref: string) {
    if (!ref) {
      throw Error('Merge "" - not something we can merge');
    }
    let commit = this._branches.get(ref);
    if (!commit) {
      commit = this.commitMap.get(ref);
      if (!commit) {
        throw Error(`Merge ${ref} - not something we can merge`);
      }
    }
    const c = this.commit("Merge " + ref);
    c.addParent(commit);
    this.publish("commitCreated", c);
    return c;
  }

  checkout(ref: string) {
    if (!ref) {
      throw Error("Empty string is not a valid pathspec");
    }
    let newHead = this._branches.get(ref);
    if (!newHead) {
      newHead = this.commitMap.get(ref);
      if (!newHead) {
        throw Error(`pathspec '${ref}' did not match any file(s) known to git`);
      }
      ref = "";
    }
    const oldHead = this._head;
    this._head = newHead;
    this.curBranch = ref;
    this.publish("commitRefsUpdated", oldHead);
    this.publish("commitRefsUpdated", this._head);
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
