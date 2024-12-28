/* eslint no-unused-vars: "warn" */

function sha1() {
    let result = '';
    const characters = '0123456789abcdef';
    const charactersLength = characters.length;
    for (let i = 0; i < 7; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export class Git {
    constructor(code_element) {
        this.commands = [new CommitCommand("Initial commit message")];
        this.code = code_element;
        this.actions = [];
    }

    commit(msg, reverse = false) {
        this.commands.push(new CommitCommand(msg, reverse));
        return this;
    }

    branch(name) {
        this.commands.push(new BranchCommand(name));
        return this;
    }

    checkout(branch, create = false) {
        this.commands.push(new CheckoutCommand(branch, create));
        return this;
    }

    merge(branch) {
        this.commands.push(new MergeCommand(branch));
        return this;
    }

    execute(steps = Number.MAX_SAFE_INTEGER) {
        var max = Math.min(steps, this.commands.length - 1);
        // We always execute the first step (the initial commit).
        var repo = new Repo();
        for (let i = 0; i <= max; i++) {
            var command = this.commands[i];
            command.execute(repo);
        }
        return repo;
    }

    visit(visitor, steps = Number.MAX_SAFE_INTEGER) {
        var max = Math.min(steps, this.commands.length - 1);
        for (let i = 0; i <= max; i++) {
            var command = this.commands[i];
            visitor.visit(command);
            command.visit(visitor);
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
    constructor(msg) {
        this.msg = msg;
        this.sha1 = sha1();
        this.parents = [];
        this.children = [];
    }

    addParent(commit) {
        this.parents.push(commit);
        commit.children.push(new WeakRef(this));
    }
}

export class Repo {
    constructor() {
        this.head = new Commit("First commit");
        this.cur_branch = "main";
        this.branches = {
            "main": this.head,
        };
    }

    commit(msg) {
        var c = new Commit(msg);
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
        var c = this.commit("Merge " + branch);
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
