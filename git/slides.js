/* global GitgraphJS */

import { Git } from "./modules/git.js";
import { Slide, MermaidSlide } from "./modules/slide.js";

/* eslint no-unused-vars: "warn" */

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
