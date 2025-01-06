import * as random from "./random.js";

export class Git {
    singleStepMode: boolean;
    readonly repo: Repo;
    readonly commands: GitCommand[] = [];
    private readonly queue: GitCommand[][] = [[]];
    private readonly recordRepo: Repo;

    constructor(seed: string) {
        this.singleStepMode = false;
        this.repo = new Repo(seed);
        this.recordRepo = new Repo(seed);
    }

    pause() {
        if (this.queue[this.queue.length - 1].length) {
            this.queue.push([]);
        }
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

    run(): boolean {
        const commands = this.queue.shift();
        if (!this.queue.length) {
            this.queue.push([]);
        }
        if (!commands) {
            return false;
        }
        commands.forEach(command => command.execute(this.repo));
        this.commands.push(...commands);
        return commands.length > 0;
    }

    private enqueue(command: GitCommand) {
        command.execute(this.recordRepo);
        this.queue[this.queue.length - 1].push(command);
        if (this.singleStepMode) {
            this.pause();
        }
    }
}

export abstract class GitCommand {
    private sha1: string | null;

    constructor() {
        this.sha1 = null;
    }

    commit(): string {
        if (this.sha1 === null) {
            throw Error("Cannot call commit() before execute()")
        }
        return this.sha1!;
    }

    execute(repo: Repo) {
        this.doExecute(repo);
        this.sha1 = repo.head.sha1;
    }

    protected abstract doExecute(_repo: Repo): void;

    command(): string {
        throw Error("Not implemented");
    }

    visit(_visitor: GitCommandVisitor) {}
}

export class CommitCommand extends GitCommand {

    constructor(
        public readonly msg: string,
        public readonly reverse = false)
    {
        super();
    }

    command(): string {
        if (this.msg) {
            return "git commit -m '" + this.msg + "'";
        }
        return "git commit";
    }

    protected doExecute(repo: Repo) {
        repo.commit(this.msg);
    }

    visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitCommit(this);
    }
}

export class CheckoutCommand extends GitCommand {

    constructor(
        public readonly branch: string,
        public readonly create = false)
    {
        super();
    }

    protected doExecute(repo: Repo) {
        if (this.create) {
            repo.branch(this.branch);
        }
        repo.checkout(this.branch);
    }

    command(): string {
        if (this.create) {
            return "git checkout -b " + this.branch;
        }
        return "git checkout " + this.branch;
    }

    visit(visitor: GitCommandVisitor) {
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

    command(): string {
        return "git branch " + this.branch;
    }

    protected doExecute(repo: Repo) {
        repo.branch(this.branch);
    }

    visit(visitor: GitCommandVisitor) {
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

    command(): string {
        return "git merge " + this.branch;
    }

    protected doExecute(repo: Repo) {
        repo.merge(this.branch);
    }

    visit(visitor: GitCommandVisitor) {
        visitor.visit(this);
        visitor.visitMerge(this);
    }
}

export class GitCommandVisitor {

    visit(_command: GitCommand) {}

    visitCommit(_command: CommitCommand) {}

    visitCheckout(_command: CheckoutCommand) {}

    visitBranch(_command: BranchCommand) {}

    visitMerge(_command: MergeCommand) {}
}

export interface Commit {
    readonly msg: string;
    readonly sha1: string;
    readonly commitTime: number;

    get parents(): Readonly<Array<Commit>>;
}

class InternalCommit implements Commit {
    private readonly _parents: InternalCommit[] = [];
    private readonly children: WeakRef<InternalCommit>[] = [];

    constructor(
        public readonly msg: string,
        public readonly sha1: string,
        public readonly commitTime: number) {}

    get parents(): Readonly<Array<Commit>> {
        return this._parents;
    }

    addParent(commit: InternalCommit) {
        this._parents.push(commit);
        commit.children.push(new WeakRef(this));
    }
}

type Branches = {
    [key: string]: InternalCommit;
};

export class Repo {
    private _head: InternalCommit;
    private commits: InternalCommit[];
    private curBranch: string;
    private readonly rand: random.Random;
    private branches: Branches;

    constructor(seed: string) {
        this.commits = []
        this.rand = new random.SplitMix32(random.hash32(seed));
        this.curBranch = "main";
        this.branches = {};
        this._head = this._commit("First commit")
    }

    get head(): Commit {
        return this._head;
    }

    commit(msg: string) {
        const prevHead = this._head;
        const c = this._commit(msg);
        c.addParent(prevHead);
        return c;
    }

    private _commit(msg: string) {
        const t = this.commits.length + 1;
        const c = new InternalCommit(msg, this.rand.nextHex(), t);
        this.commits.push(c);
        this.branches[this.curBranch] = c;
        this._head = c;
        return c;
    }

    branch(name: string) {
        if (name in this.branches) {
            throw Error("Already a branch with name '" + name + "'");
        }
        this.branches[name] = this._head;
    }

    merge(branch: string) {
        if (!(branch in this.branches)) {
            throw Error("No branch with name '" + branch + "'");
        }
        const c = this.commit("Merge " + branch);
        c.addParent(this.branches[branch]);
        return c;
    }

    checkout(id: string) {
        if (!(id in this.branches)) {
            throw Error("No branch with name '" + id + "'");
        }
        this._head = this.branches[id];
        this.curBranch = id;
    }
}
