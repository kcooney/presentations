/* global GitgraphJS */
/* global Reveal */

/* eslint no-unused-vars: "warn" */

function sha1() {
    const characters = "0123456789abcdef";
    const charactersLength = characters.length;
    let result = "";
    for (let i = 0; i < 7; i += 1) {
        let j = Math.floor(Math.random() * charactersLength);
        result += characters.charAt(j);
    }
    return result;
}

const rightArrowKey = 39;
const leftArrowKey = 37;

const baseTemplate = GitgraphJS.TemplateName.BlackArrow;
const withoutAuthor = GitgraphJS.templateExtend(baseTemplate, {
    commit: {
        message: {
            displayAuthor: false,
        },
    },
});

const headStyle = {
    color: "cyan",
    bgColor: "black",
    strokeColor: "black",
};

function createGraph(graphContainer) {
    return GitgraphJS.createGitgraph(graphContainer, {
        orientation: GitgraphJS.Orientation.VerticalReverse,
        template: withoutAuthor,
        reverseArrow: true,
        responsive: false,
    });
}

const slides = {}

class Slide {
    static derived = new Set();

    constructor(sectionId) {
        this.sectionId = sectionId;
        this.section = document.getElementById(sectionId);
        slides[sectionId] = this;
    }

    onShowSlide() {
        this.onResetSlide();
    }

    onResetSlide() {}

    onHideSlide() {}

    enableTransitions(callback) {
        Reveal.addKeyBinding(rightArrowKey, () => {
            // If left pressed, slide resets, and next left goes to prev slide.
            Reveal.addKeyBinding(leftArrowKey, () => {
                Reveal.addKeyBinding(leftArrowKey, "prev");
                this.onResetSlide();
            });
            if (!callback()) {
                Reveal.addKeyBinding(rightArrowKey, "next");
            }
        });
    }
}

class GitGraphSlide extends Slide {
    constructor(sectionId) {
        super(sectionId);
        this.gitgraph = createGraph(
            this.section.getElementsByClassName("graph-container")[0]);
    }

    onResetSlide() {
        this.gitgraph.clear();
        this.main = this.gitgraph.branch("main").checkout();
        this.gitgraph.commit("Initial commit");
        this.moveHeadTag();
    }

    enableTransitions(callback) {
        super.enableTransitions(() => {
            const result = callback();
            this.moveHeadTag();
            return result;
        });
    }

    getHead() {
        return this.gitgraph._graph.refs.getCommit("HEAD");
    }

    moveHeadTag() {
        const head = this.getHead();
        if (head) {
            this.gitgraph.tag({name: "HEAD", ref: head, style: headStyle});
        }
    }
}

Reveal.on("slidechanged", (event) => {
    Reveal.addKeyBinding(rightArrowKey, "next");
    Reveal.addKeyBinding(leftArrowKey, "prev");
    if (event.previousSlide.id in slides) {
        slides[event.previousSlide.id].onHideSlide();
    }
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});
Reveal.on("ready", (event) => {
    Slide.derived.forEach((clz) => Reflect.construct(clz, []));
    Slide.derived.clear();
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});

class CommittingSlide extends GitGraphSlide {  // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    count = 0;

    constructor() {
        super("committing-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    onShowSlide() {
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onResetSlide() {
        super.onResetSlide();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Add shooter'";
            this.gitgraph.commit("Add shooter");
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.gitgraph.commit("Shoot faster");
            return true;
        case 3:
            this.code.innerHTML += "<br />$ git commit -m 'Revert shoot faster'";
            this.gitgraph.commit("Revert shoot faster");
            return false; // No more transitions
        }
    }
}

class BranchesSlide extends GitGraphSlide {  // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    count = 0;

    constructor() {
        super("branches-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    onShowSlide() {
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onResetSlide() {
        super.onResetSlide();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.gitgraph.commit("Add shooter");
        this.moveHeadTag();
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.gitgraph.commit("Shoot faster");
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git checkout -b chicken/on-the-bus";
            this.main.checkout();
            this.feature = this.main.branch("chicken/on-the-bus");
            this.feature.checkout();
            this.code.innerHTML += "<br />$ git commit -m 'Add drive subsystem'";
            this.gitgraph.commit("Add drive subsystem");
            return true;
        case 3:
            this.main.commit("Add intake");
            this.feature.checkout();
            return false;
        }
    }
}

class TaggingSlide extends GitGraphSlide { // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    count = 0;

    constructor() {
        super("tagging-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    onShowSlide() {
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onResetSlide() {
        super.onResetSlide();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.gitgraph.commit("Add shooter");
        this.moveHeadTag();
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git tag v1.0";
            this.gitgraph.tag("v1.0");
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.gitgraph.commit("Shoot faster");
            return false;
        }
    }
}

class HeadSlide extends GitGraphSlide { // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    count = 0;

    constructor() {
        super("head-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    onShowSlide() {
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onResetSlide() {
        super.onResetSlide();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.gitgraph.commit("Add shooter");
        this.moveHeadTag();
        this.addShooterCommit = this.getHead();
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.gitgraph.commit("Shoot faster");
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git checkout -b chicken/on-the-bus";
            this.main.checkout();
            this.feature = this.main.branch("chicken/on-the-bus");
            this.feature.checkout();
            this.code.innerHTML += "<br />$ git commit -m 'Add drive subsystem'";
            this.gitgraph.commit("Add drive subsystem");
            return true;
        case 3:
            this.main.commit("Add intake");
            this.feature.checkout();
            return true;
        case 4:
            this.code.innerHTML += "<br />$ git checkout main";
            this.main.checkout();
            return true;
        case 5:
            this.code.innerHTML += "<br />$ git checkout " + this.addShooterCommit.substring(0, 7);
            this.gitgraph._graph.refs.set("HEAD", this.addShooterCommit);
            return true;
        case 6:
            // Doesn't work (bug in GitgraphJS?
            this.code.innerHTML += "<br />$ git checkout -b monkey/bug-fix";
            this.code.innerHTML += "<br />$ git commit -m 'Fix shooter angle'";
            this.bugFix = this.gitgraph.branch("monkey/bug-fix")
            this.bugFix.commit("Fix shooter angle").checkout();
            return true;
        case 7:
            this.bugFix.commit("One more fix");
            return false;
        }
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

class Git {
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

class MermaidSlide extends Slide {
    static setMermaid(mermaid) {
        this.mermaid = mermaid;
    }

    static getMermaid() {
        return this.mermaid;
    }

    constructor(sectionId) {
        super(sectionId);
    }

    onShowSlide() {
        this.code = this.section.getElementsByTagName("code")[0];
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    record() {}

    onResetSlide() {
        this.mermaidElement = this.section.getElementsByClassName("mermaid")[0];
        this.count = 0;
        this.code.innerHTML = "$ git checkout main";
        this.git = new Git(this.code);
        this.record();
        this.onTransition();
    }

    onTransition() {
        var mermaid = MermaidSlide.getMermaid();
        var element = this.mermaidElement;
        var code = this.section.getElementsByTagName("code")[0];
        this.git.run(code, this.count);
        var graphDefinition = this.git.graphDefinition();

        const drawDiagram = async function () {
            const { svg } = await mermaid.render("graphDiv", graphDefinition);
            element.innerHTML = svg;
        };

        drawDiagram().then(() => {});

        return this.count++ < this.git.commands.length - 1;
    }
}

class MermaidDemoSlide extends MermaidSlide {  // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    constructor() {
        super("mermaid-slide");
    }

    record() {
        this.git.commit().checkout("develop", true);
        this.git.commit().commit().checkout("main");
        this.git.merge("develop").commit().commit();
    }
}
