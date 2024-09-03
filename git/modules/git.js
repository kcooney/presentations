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
        this.commands = [new Commit()];
        this.code = code_element;
        this.actions = [];
    }

    commit() {
        this.commands.push(new Commit());
        return this;
    }

    branch(name) {
        this.commands.push(new Branch(name));
        return this;
    }

    checkout(branch, create = false) {
        this.commands.push(new Checkout(branch, create));
        return this;
    }

    merge(branch) {
        this.commands.push(new Merge(branch));
        return this;
    }

    run(code_element, steps = Number.MAX_SAFE_INTEGER) {
        if (steps >= this.commands.length) {
            steps = this.commands.length - 1;
        }
        if (steps > 0) {
            let cur_command = this.commands[steps];
            code_element.innerHTML += "<br />$ " + cur_command.command();
        }

        this.actions = [];
        var repo = new Repo();
        for (let i = 0; i <= steps; i++) {
            this.commands[i].execute(repo);
        }
        for (let i = 0; i <= steps; i++) {
            let actions = this.commands[i].actions(repo);
            this.actions.push(...actions);
        }
    }

    graphDefinition() {
        return ["gitGraph TB:"].concat(this.actions).join("\n");
    }
}

class GitCommand {

    constructor(command) {
        this.git_command = command;
    }

    execute(repo) {} // eslint-disable-line no-unused-vars

    command() {
        return this.git_command;
    }

    actions(repo) {} // eslint-disable-line no-unused-vars

    commit() {
        return null;
    }
}

class Commit extends GitCommand {

    constructor() {
        super("git commit");
        this.sha1 = sha1();
    }

    execute(repo) {
        repo.commit(this.sha1);
    }

    actions(repo) {
        var action = 'commit id: "' + this.sha1 + '"';
        if (repo.head == this.sha1) {
            action += " type: HIGHLIGHT";
        }
        return [action];
    }

    commit() {
        return this.sha1;
    }
}

class Checkout extends GitCommand {

    constructor(branch, create = false) {
        super("");
        this.branch = branch;
        this.create = create;
    }

    execute(repo) {
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

    actions(repo) { // eslint-disable-line no-unused-vars
        var a = [];
        if (this.create) {
            a.push("branch " + this.branch);
        }
        a.push("checkout " + this.branch);
        return a;
    }
}

class Branch extends GitCommand {

    constructor(name) {
        super("git branch " + name);
        this.branch = name;
    }

    execute(repo) {
        repo.branch(this.branch);
    }

    actions(repo) { // eslint-disable-line no-unused-vars
        return ["branch " + this.branch];
    }
}

class Merge extends GitCommand {

    constructor(branch) {
        super("git merge " + name);
        this.branch = branch;
        this.sha1 = sha1();
    }

    execute(repo) {
        repo.merge(this.branch, this.sha1);
    }

    actions(repo) {
        var action = 'merge ' + this.branch + ' id: "' + this.sha1 + '"';
        if (repo.head == this.sha1) {
            action += ' type: HIGHLIGHT';
        }
        return [action];
    }
}

class Repo {
    constructor() {
        this.head = sha1();
        this.cur_branch = "main";
        this.branches = {
            "main": this.head,
        };
    }

    commit(id) {
        this.head = id;
        this.branches[this.cur_branch] = this.head;
    }

    branch(name) {
        if (name in this.branches) {
            throw Error("Already a branch with name '" + name + "'");
        }
        this.branches[name] = this.head;
    }

    merge(branch, id) {
        if (!(branch in this.branches)) {
            throw Error("No branch with name '" + branch + "'");
        }
        this.branches[this.cur_branch] = id;
    }

    checkout(id) {
        if (!(id in this.branches)) {
            throw Error("No branch with name '" + id + "'");
        }
        this.head = this.branches[id];
        this.cur_branch = id;
    }
}
