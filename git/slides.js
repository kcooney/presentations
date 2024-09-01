/* global GitgraphJS */
/* global Reveal */

/* global graphology */
/* global Sigma */

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

class GraphologySlide extends Slide { // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    constructor() {
        super("graphology-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
        this.graph = new graphology.Graph({type: "directed"});
    }

    onShowSlide() {
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onHideSlide() {
        this.sigmaInstance.kill();
        super.onHideSlide();
    }

    onResetSlide() {
        super.onResetSlide();
        this.graph.clear();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.graph.addNode("1a1a9bf", {
            label: "1a1a9bf Initial commit",
            x: 0, y: 2, size: 15, color: "blue" });
        this.graph.addNode("5f68664", {
            label: "5f68664 Add shooter",
            x: 0, y: 1, size: 15, color: "blue" });
        this.graph.addEdge("5f68664", "1a1a9bf", { size: 5, color: "black", type: "arrow" });
        this.sigmaInstance = new Sigma(this.graph, this.section.getElementsByClassName("sigma-container")[0]);
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Add shooter'";
            this.graph.addNode("6e04e30", { label: "6e04e30 Add shooter", x: 0, y: 0, size: 10, color: "red" });
            this.graph.addEdge("5f68664", "6e04e30", { size: 5, color: "purple" });
            return true;
        case 2:
            return false; // No more transitions
        }
    }
}

class GitCommand {

    constructor(command) {
        this.git_command = command;
    }

    command() {
        return this.git_command;
    }

    actions(highlight = false) {} // eslint-disable-line no-unused-vars

    commit() {
        return null;
    }
}

class Commit extends GitCommand {

    constructor() {
        super("git commit");
        this.sha1 = sha1();
    }

    actions(highlight = false) {
        var action = 'commit id: "' + this.sha1 + '"';
        if (highlight) {
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

    command() {
        if (this.create) {
            return "git checkout -b " + this.branch;
        }
        return "git checkout " + this.branch;
    }

    actions(highlight = false) { // eslint-disable-line no-unused-vars
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

    actions() {
        return ["branch " + this.branch];
    }
}

class Merge extends GitCommand {

    constructor(branch) {
        super("git merge " + name);
        this.branch = branch;
    }

    actions(highlight = false) {
        var action = "merge " + this.branch;
        if (highlight) {
            action += " type: HIGHLIGHT";
        }
        return [action];
    }
}

class Git {
    constructor(code_element) {
        this.commands = [new Commit()];
        this.code = code_element;
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

    graphDefinition(steps = Number.MAX_SAFE_INTEGER) {
        if (steps >= this.commands.length) {
            steps = this.commands.length - 1;
        }
        var lastCommit = 0;
        for (let i = 0; i <= steps; i++) {
            if (this.commands[i].commit() != null) {
                lastCommit = i;
            }
        }
        var cur_commands = [];
        for (let i = 0; i <= steps; i++) {
            let actions = this.commands[i].actions(i == lastCommit);
            cur_commands.push(...actions);
        }
        if (steps > 0) {
            this.code.innerHTML += "<br />$ " + this.commands[steps].command();
        }
        return ["gitGraph TB:"].concat(cur_commands).join("\n");
    }
}

class MermaidSlide extends Slide { // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    static setMermaid(mermaid) {
        this.mermaid = mermaid;
    }

    static getMermaid() {
        return this.mermaid;
    }

    constructor() {
        super("mermaid-slide");
        this.mermaidElement = this.section.getElementsByClassName("mermaid")[0];
        this.code = this.section.getElementsByTagName("code")[0];
    }

    onShowSlide() {
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onResetSlide() {
        super.onResetSlide();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.git = new Git(this.code);
        this.git.commit().checkout("develop", true);
        this.git.commit().commit().checkout("main");
        this.git.merge("develop").commit().commit();
        this.onTransition();
    }

    onTransition() {
        var mermaid = MermaidSlide.getMermaid();
        var element = this.mermaidElement;
        var graphDefinition = this.git.graphDefinition(this.count);

        const drawDiagram = async function () {
            const { svg } = await mermaid.render("graphDiv", graphDefinition);
            element.innerHTML = svg;
        };

	drawDiagram().then(() => {});

        return this.count++ < this.git.commands.length - 1;
    }
}
