/* eslint no-unused-vars: "warn" */
import * as random from "./random.js";

function sha1(rand: () => number): string {
    let result = '';
    const characters = '0123456789abcdef';
    const charactersLength = characters.length;
    for (let i = 0; i < 7; i++) {
        result += characters.charAt(Math.floor(rand() * charactersLength));
    }
    return result;
}

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
        let commands = this.queue.shift();
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

    protected abstract doExecute(repo: Repo): void;

    command() {
        throw Error("Not implemented");
    }

    visit(visitor: GitCommandVisitor) {} // eslint-disable-line no-unused-vars
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

    visit(command: GitCommand) {} // eslint-disable-line no-unused-vars

    visitCommit(command: CommitCommand) {} // eslint-disable-line no-unused-vars

    visitCheckout(command: CheckoutCommand) {} // eslint-disable-line no-unused-vars

    visitBranch(command: BranchCommand) {} // eslint-disable-line no-unused-vars

    visitMerge(command: MergeCommand) {} // eslint-disable-line no-unused-vars
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

export class Repo {
    private _head: Commit;
    private curBranch: string;
    private readonly randSha1: () => string;
    private nextTick: number;
    private readonly fakeTime: () => number;
    private branches;

    constructor(seed: string) {
        let rand = random.splitmix32(random.hash32(seed));
        this.randSha1 = () => {
            return sha1(rand);
        };

        this.nextTick = 1;
        this.fakeTime = () => {
            return this.nextTick++;
        };

        this._head = new Commit("First commit", this.randSha1(), this.fakeTime());
        this.curBranch = "main";
        this.branches = {
            "main": this.head,
        };
    }

    get head() {
        return this._head;
    }

    commit(msg) {
        let c = new Commit(msg, this.randSha1(), this.fakeTime());
        c.addParent(this.head);
        this._head = c;
        this.branches[this.curBranch] = this.head;
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
        let c = this.commit("Merge " + branch);
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
