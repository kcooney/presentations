import * as random from "./random.js";

export class Git {
    singleStepMode = false;
    printCommands = true; // TODO: Pass this to commands.
    readonly repo: Repo;
    readonly commands: GitCommand[] = [];
    private paused = true;
    // Queue invariant: all nested lists are non-empty.
    private readonly queue: GitCommand[][] = [];
    private readonly recordRepo: Repo;

    constructor(seed: string) {
        this.repo = new Repo(seed);
        this.recordRepo = new Repo(seed);
    }

    pause() {
        this.paused = true;
    }

    commit(msg = "", reverse = false) {
        this.enqueue(new CommitCommand(msg, reverse));
        return this;
    }

    branch(name: string) {
        this.enqueue(new BranchCommand(name));
        return this;
    }

    checkout(branch: string, create = false) {
        this.enqueue(new CheckoutCommand(branch, create));
        return this;
    }

    merge(branch: string) {
        this.enqueue(new MergeCommand(branch));
        return this;
    }

    tag(name: string) {
        this.enqueue(new TagCommand(name));
        return this;
    }

    /** Runs the next set of commands; returns true if there are more commands. */
    run(): boolean {
        const commands = this.queue.shift();
        if (!commands) {
            return false; // run() called without any commands to play!
        }
        commands.forEach(command => command.execute(this.repo));
        this.commands.push(...commands);
        return this.queue.length > 0;
    }

    temporalTopologicalWalk(callback: (commit: Commit) => void): void {
        this.recordRepo.temporalTopologicalWalk(callback);
    }

    private enqueue(command: GitCommand) {
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

export abstract class GitCommand {
    private _sha1: string | null = null;

    get sha1(): string {
        if (this._sha1 === null) {
            throw Error("Cannot call commit() before execute()")
        }
        return this._sha1 || "";
    }

    execute(repo: Repo) {
        this.doExecute(repo);
        this._sha1 = repo.head.sha1;
    }

    protected abstract doExecute(_repo: Repo): void;

    command(): string {
        throw Error("Not implemented");
    }

    visit(_visitor: GitCommandVisitor): void {}
}

export class CommitCommand extends GitCommand {

    constructor(
        public readonly msg: string,
        public readonly reverse = false)
    {
        super();
    }

    override command(): string {
        if (this.msg) {
            return "git commit -m '" + this.msg + "'";
        }
        return "git commit";
    }

    protected doExecute(repo: Repo) {
        repo.commit(this.msg);
    }

    override visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitCommit(this);
    }
}

export class CheckoutCommand extends GitCommand {
    private _detachedHead: boolean | undefined;

    constructor(
        public readonly branch: string,
        public readonly create = false)
    {
        super();
    }

    detachedHead(): boolean {
        if (this._detachedHead === undefined) {
            throw Error("Cannot call detachedHead() before execute()")
        }
        return this._detachedHead;
    }

    protected doExecute(repo: Repo) {
        if (this.create) {
            repo.branch(this.branch);
        }
        repo.checkout(this.branch);
        this._detachedHead = !repo.currentBranch;
    }

    override command(): string {
        if (this.create) {
            return "git checkout -b " + this.branch;
        }
        return "git checkout " + this.branch;
    }

    override visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitCheckout(this);
    }
}

export class BranchCommand extends GitCommand {

    constructor(
        public readonly branch: string)
    {
        super();
    }

    override command(): string {
        return "git branch " + this.branch;
    }

    protected doExecute(repo: Repo) {
        repo.branch(this.branch);
    }

    override visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitBranch(this);
    }
}

export class MergeCommand extends GitCommand {

    constructor(
        public readonly branch: string)
    {
        super();
    }

    override command(): string {
        return "git merge " + this.branch;
    }

    protected doExecute(repo: Repo) {
        repo.merge(this.branch);
    }

    override visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitMerge(this);
    }
}

export class TagCommand  extends GitCommand {

    constructor(
        public readonly tagName: string)
    {
        super();
    }

    override command(): string {
        return "git tag " + this.tagName;
    }

    protected doExecute(repo: Repo) {
        repo.tag(this.tagName);
    }

    override visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitTag(this);
    }
}

export class GitCommandVisitor {

    visit(_command: GitCommand): void {}

    visitCommit(_command: CommitCommand): void {}

    visitCheckout(_command: CheckoutCommand): void {}

    visitBranch(_command: BranchCommand): void {}

    visitMerge(_command: MergeCommand): void {}

    visitTag(_command: TagCommand): void {}
}

export interface Commit {
    readonly msg: string;
    readonly sha1: string;
    readonly commitTime: number;

    get parents(): ReadonlyArray<Commit>;

    branchChildren(): Commit[];

    mergeChildren(): Commit[];
}

class InternalCommit implements Commit {
    private readonly _parents: InternalCommit[] = [];
    private readonly children: WeakRef<InternalCommit>[] = [];

    constructor(
        public readonly msg: string,
        public readonly sha1: string,
        public readonly commitTime: number) {}

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

type Branches = {
    [key: string]: InternalCommit;
};

export class Repo {
    private _head: InternalCommit;
    private readonly _commits: InternalCommit[];
    private readonly commitMap = new Map<string, InternalCommit>();
    private curBranch: string; // An empty string for "detached head"
    private readonly rand: random.Random;
    private branches: Branches; // TODO: Use Map; see https://howtodoinjava.com/typescript/maps/

    constructor(seed: string) {
        this._commits = []
        this.rand = new random.SplitMix32(random.hash32(seed));
        this.curBranch = "main";
        this.branches = {};
        this._head = this._commit("First commit");
    }

    get head(): Commit {
        return this._head;
    }

    get currentBranch(): string | undefined {
        return this.curBranch || undefined;
    }

    get commits(): Commit[] {
        return this._commits;
    }

    temporalTopologicalWalk(callback: (commit: Commit) => void): void {
        const visited = new Set<string>();

        function ordering(a: InternalCommit, b: InternalCommit): number {
            return a.commitTime - b.commitTime;
        }

        function dfs(commit: InternalCommit): void {
            if (!(visited.has(commit.sha1))) {
                visited.add(commit.sha1);

                const children = commit.allChildren();
                children.sort(ordering);
                children.forEach(dfs);

                callback(commit);
            }
        }

        const sorted  = [...this._commits];
        sorted.sort(ordering);
        sorted.forEach(dfs);
    }

    commit(msg: string) {
        const prevHead = this._head;
        const c = this._commit(msg);
        c.addParent(prevHead);
        return c;
    }

    tag(_name: string) {
    }

    private _commit(msg: string): InternalCommit {
        if (!this.curBranch) {
            throw Error('Cannot commit in "detached head" mode');
        }
        const t = this._commits.length + 1;
        const c = new InternalCommit(msg, this.rand.nextHex(), t);
        this._commits.push(c);
        this.commitMap.set(c.sha1, c);
        this.branches[this.curBranch] = c;
        this._head = c;
        return c;
    }

    branch(name: string) {
        if (!name) {
            throw Error("Branch names cannot be emtpy");
        }
        if (name in this.branches) {
            throw Error("Already a branch with name '" + name + "'");
        }
        this.branches[name] = this._head;
    }

    merge(ref: string) {
        if (!ref) {
            throw Error('Merge "" - not something we can merge');
        }
        let commit = this.branches[ref];
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
        let newHead = this.branches[ref];
        if (!newHead) {
            newHead = this.commitMap.get(ref);
            if (!newHead) {
                throw Error(`pathspec '${ref}' did not match any file(s) known to git`)
            }
            ref = "";
        }
        this._head = newHead;
        this.curBranch = ref;
    }
}
