/* eslint no-unused-vars: "warn" */
import * as random from "./random.js";

function sha1(rand = Math.random) {
    let result = '';
    const characters = '0123456789abcdef';
    const charactersLength = characters.length;
    for (let i = 0; i < 7; i++) {
        result += characters.charAt(Math.floor(rand() * charactersLength));
    }
    return result;
}

export class Git {
    constructor(seed) {
        this.singleStepMode = false;
        this.repo = new Repo(seed);
        this.commands = [];
        this.queue_ = [[]];
        this.recordRepo_ = new Repo(seed);
    }

    pause() {
        if (this.queue_[this.queue_.length - 1].length) {
            this.queue_.push([]);
        }
    }

    commit(msg, reverse = false) {
        this.enqueue_(new CommitCommand(msg, reverse));
        return this;
    }

    branch(name) {
        this.enqueue_(new BranchCommand(name));
        return this;
    }

    checkout(branch, create = false) {
        this.enqueue_(new CheckoutCommand(branch, create));
        return this;
    }

    merge(branch) {
        this.enqueue_(new MergeCommand(branch));
        return this;
    }

    run() {
        let commands = this.queue_.shift();
        if (!this.queue_.length) {
            this.queue_.push([]);
        }
        commands.forEach(command => command.execute(this.repo));
        this.commands.push(...commands);
        return commands.length > 0;
    }

    execute(steps = Number.MAX_SAFE_INTEGER) {
        steps = Math.min(steps, this.commands.length);
        let repo = new Repo();
        for (let i = 0; i < steps; i++) {
            let command = this.commands[i];
            command.execute(repo);
        }
        return repo;
    }

    enqueue_(command) {
        command.execute(this.recordRepo_);
        this.queue_[this.queue_.length - 1].push(command);
        if (this.singleStepMode) {
            this.pause();
        }
    }
}

class GitCommand {

    /**
     * @param {string} command Git command line that this command represents.
     */
    constructor() {
        /** @protected {?string} */
        this.sha1_ = null;
    }

    sha1() {
        if (this.sha1_ == null) {
            throw Error("Cannot call sha1() before execute()")
        }
        return this.sha1_;
    }

    /**
     * @param {!Repo} repo
     */
    execute(repo) {
        this.execute_(repo);
        this.sha1_ = repo.head.sha1;
    }

    /**
     * @param {!Repo} repo
     */
    execute_(repo) {} // eslint-disable-line no-unused-vars

    command() {
        throw Error("Not implemented");
    }

    /**
     * @param {!GitCommandVisitor} visitor
     */
    visit(visitor) {} // eslint-disable-line no-unused-vars

    commit() {
        return null;
    }
}

class CommitCommand extends GitCommand {

    constructor(msg, reverse = false) {
        super();
        this.msg = msg;
        this.reverse = reverse;
    }

    command() {
        if (this.msg) {
            return "git commit -m '" + this.msg + "'";
        }
        return "git commit";
    }

    execute_(repo) {
        repo.commit(this.msg);
    }

    /**
     * @param {!GitCommandVisitor} visitor
     * @override
     */
    visit(visitor) {
        visitor.visit(this);
        visitor.visitCommit(this);
    }

    commit() {
        return this.sha1;
    }
}

class CheckoutCommand extends GitCommand {

    constructor(branch, create = false) {
        super("");
        this.branch = branch;
        this.create = create;
    }

    execute_(repo) {
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

    visit(visitor) {
        visitor.visit(this);
        visitor.visitCheckout(this);
    }
}

class BranchCommand extends GitCommand {

    constructor(name) {
        super();
        this.branch = name;
    }

    command() {
        return "git branch " + this.branch;
    }

    execute_(repo) {
        repo.branch(this.branch);
    }

    visit(visitor) {
        visitor.visit(this);
        visitor.visitBranch(this);
    }
}

class MergeCommand extends GitCommand {

    constructor(branch) {
        super();
        this.branch = branch;
    }

    command() {
        return "git merge " + this.branch;
    }

    execute_(repo) {
        repo.merge(this.branch);
    }

    visit(visitor) {
        visitor.visit(this);
        visitor.visitMerge(this);
    }
}

export class GitCommandVisitor {

    /**
     * @param {!GitCommand} command
     */
    visit(command) {} // eslint-disable-line no-unused-vars

    /**
     * @param {!CommitCommand} command
     */
    visitCommit(command) {} // eslint-disable-line no-unused-vars

    /**
     * @param {!CheckoutCommand} command
     */
    visitCheckout(command) {} // eslint-disable-line no-unused-vars

    /**
     * @param {!BranchCommand} command
     */
    visitBranch(command) {} // eslint-disable-line no-unused-vars

    /**
     * @param {!MergeCommand} command
     */
    visitMerge(command) {} // eslint-disable-line no-unused-vars
}

class Commit {
    constructor(msg, sha1, commitTime) {
        this.msg = msg;
        this.sha1 = sha1;
        this.parents = [];
        this.children = [];
        this.commitTime = commitTime;
    }

    addParent(commit) {
        this.parents.push(commit);
        commit.children.push(new WeakRef(this));
    }
}

export class Repo {
    constructor(seed) {
        if (typeof seed != "string") {
            throw Error("Must pass a string into Repo()");
        }

        let rand = random.splitmix32(random.hash32(seed));
        this.randSha1_ = () => {
            return sha1(rand);
        };

        this.nextTick_ = 1;
        this.fakeTime_ = () => {
            return this.nextTick++;
        };

        this.head = new Commit("First commit", this.randSha1_(), this.fakeTime_());
        this.cur_branch = "main";
        this.branches = {
            "main": this.head,
        };
    }

    commit(msg) {
        let c = new Commit(msg, this.randSha1_(), this.fakeTime_());
        c.addParent(this.head);
        this.head = c;
        this.branches[this.cur_branch] = this.head;
        return c;
    }

    branch(name) {
        if (name in this.branches) {
            throw Error("Already a branch with name '" + name + "'");
        }
        this.branches[name] = this.head;
    }

    merge(branch) {
        if (!(branch in this.branches)) {
            throw Error("No branch with name '" + branch + "'");
        }
        let c = this.commit("Merge " + branch);
        c.addParent(this.branches[branch]);
        return c;
    }

    checkout(id) {
        if (!(id in this.branches)) {
            throw Error("No branch with name '" + id + "'");
        }
        this.head = this.branches[id];
        this.cur_branch = id;
    }
}
