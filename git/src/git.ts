import * as random from "./random.js";

export class Git {
    singleStepMode: boolean;
    readonly repo: Repo;
    readonly commands: GitCommand[];
    private readonly queue: GitCommand[][];
    private readonly recordRepo: Repo;

    constructor(seed: string) {
        this.singleStepMode = false;
        this.repo = new Repo(seed);
        this.commands = [];
        this.queue = [[]];
        this.recordRepo = new Repo(seed);
    }

    pause() {
        if (this.queue[this.queue.length - 1].length) {
            this.queue.push([]);
        }
    }

    commit(msg: string, reverse = false) {
        this.enqueue(new CommitCommand(msg, reverse));
        return this;
    }

    branch(name: string) {
        this.enqueue(new BranchCommand(name));
        return this;
    }

    checkout(branch, create = false) {
        this.enqueue(new CheckoutCommand(branch, create));
        return this;
    }

    merge(branch) {
        this.enqueue(new MergeCommand(branch));
        return this;
    }

    run() {
        const commands = this.queue.shift();
        if (!this.queue.length) {
            this.queue.push([]);
        }
        commands.forEach(command => command.execute(this.repo));
        this.commands.push(...commands);
        return commands.length > 0;
    }

    private enqueue(command) {
        command.execute(this.recordRepo);
        this.queue[this.queue.length - 1].push(command);
        if (this.singleStepMode) {
            this.pause();
        }
    }
}

abstract class GitCommand {
    private sha1: string;

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

    command() {
        throw Error("Not implemented");
    }

    visit(_visitor: GitCommandVisitor) {}
}

class CommitCommand extends GitCommand {

    constructor(
        private readonly msg: string,
	private readonly reverse = false)
    {
        super();
    }

    command() {
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

class CheckoutCommand extends GitCommand {

    constructor(
        private readonly branch: string,
	private readonly create = false)
    {
        super();
    }

    protected doExecute(repo: Repo) {
        if (this.create) {
            repo.branch(this.branch);
        }
        repo.checkout(this.branch);
    }

    command() {
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

class BranchCommand extends GitCommand {

    constructor(
        private readonly branch: string)
    {
        super();
    }

    command() {
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

class MergeCommand extends GitCommand {

    constructor(
        private readonly branch: string)
    {
        super();
    }

    command() {
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

class Commit {
    private readonly parents: Commit[];
    private readonly children: WeakRef<Commit>[];

    constructor(
        private readonly msg: string,
	public readonly sha1: string,
	private readonly commitTime: number)
    {
        this.parents = [];
        this.children = [];
    }

    addParent(commit) {
        this.parents.push(commit);
        commit.children.push(new WeakRef(this));
    }
}

type Branches = {
    [key: string]: Commit;
};

export class Repo {
    private _head: Commit;
    private commits: Commit[];
    private curBranch: string;
    private readonly rand: random.Random;
    private branches: Branches;

    constructor(seed: string) {
        this.commits = []
        this.rand = new random.SplitMix32(random.hash32(seed));
        this.curBranch = "main";
        this.branches = {};
        this._commit("First commit")
    }

    get head() {
        return this._head;
    }

    commit(msg) {
        const prevHead = this._head;
        const c = this._commit(msg);
        c.addParent(prevHead);
	return c;
    }

    private _commit(msg) {
        const t = this.commits.length + 1;
        const c = new Commit(msg, this.rand.nextHex(), t);
        this._head = c;
        this.commits.push(c);
        this.branches[this.curBranch] = c;
        return c;
    }

    branch(name: string) {
        if (name in this.branches) {
            throw Error("Already a branch with name '" + name + "'");
        }
        this.branches[name] = this.head;
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
