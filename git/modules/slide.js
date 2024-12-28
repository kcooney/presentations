import { Git, GitCommandVisitor, Repo } from "./git.js";
import Reveal from '../reveal-js/dist/reveal.esm.js';
import Markdown from '../reveal-js/plugin/markdown/markdown.esm.js';

// Mermaid; https://mermaid.js.org/
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

// Sigma.js; https://www.npmjs.com/package/sigma
import Sigma from 'https://cdn.jsdelivr.net/npm/sigma@3.0.0-beta.36/+esm'

// Graphology; https://graphology.github.io/
import 'https://cdn.jsdelivr.net/npm/graphology@0.25.4/dist/graphology.umd.min.js'

mermaid.initialize({ startOnLoad: false });

const rightArrowKey = 39;
const leftArrowKey = 37;
const slides = {}

export class Slide {
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

class MermaidGitCommandVisitor extends GitCommandVisitor {

    /**
     * @param {string} head The sha1 of the head commit.
     */
    constructor(head) {
        super();
        this.head = head;
        this.actions = [];
        /** {?string} */
        this.last_command = null;
    }

    visit(command) {
        this.last_command = command.command();
    }

    visitCommit(command) {
        var sha1 = command.sha1();
        var id = sha1;
        if (command.msg) {
            id = command.msg;
        }
        var action = 'commit id:"' + id + '"';
        if (this.head.sha1 == sha1) {
            action += " type:HIGHLIGHT";
        } else if (this.reverse) {
            action += " type:REVERSE";
        }
        this.actions.push(action);
    }

    visitCheckout(command) {
        if (command.create) {
            this.actions.push("branch " + command.branch);
        }
        this.actions.push("checkout " + command.branch);
    }

    visitBranch(command) {
        this.actions.push("branch " + command.branch);
    }

    visitMerge(command) {
        var sha1 = command.sha1();
        var action = 'merge ' + command.branch + ' id: "' + sha1 + '"';
        if (this.head.sha1 == sha1) {
            action += ' type: HIGHLIGHT';
        }
        this.actions.push(action);
    }

    graphDefinition() {
        return ["gitGraph TB:"].concat(this.actions).join("\n   ") + "\n";
    }
}

export class MermaidSlide extends Slide {
    constructor(sectionId) {
        super(sectionId);
    }

    onShowSlide() {
        var container = this.section.getElementsByClassName("git-container")[0];
        container.style.display = "block";

        this.code = container.getElementsByTagName("code")[0];
        this.mermaidElement = container.getElementsByClassName("mermaid")[0];
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    record() {}

    onResetSlide() {
        this.count = 0;
        this.code.innerHTML = "$ git checkout main";
        this.git = new Git(this.code);
        this.record();
        this.onTransition();
    }

    onTransition() {
        var element = this.mermaidElement;
        var repo = this.git.execute(this.count);
        var visitor = new MermaidGitCommandVisitor(repo.head);
        this.git.visit(visitor, this.count);
        if (visitor.last_command != null) {
            var code = this.section.getElementsByTagName("code")[0];
            code.innerHTML += "<br />$ " + visitor.last_command;
        }
        var graphDefinition = visitor.graphDefinition();

        const drawDiagram = async function () {
            const { svg } = await mermaid.render("graphDiv", graphDefinition);
            element.innerHTML = svg;
        };

        drawDiagram().then(() => {});

        return this.count++ < this.git.commands.length - 1;
    }
}

class GraphologySlide extends Slide { // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    constructor() {
        super("graphology-slide");
        this.graph = new graphology.Graph({type: "directed", allowSelfLoops: false}); // eslint-disable-line no-undef
    }

    onShowSlide() {
        var container = this.section.getElementsByClassName("git-container")[0];        container.style.display = "block";

        this.code = container.getElementsByTagName("code")[0];
        super.onShowSlide();
        this.enableTransitions(this.onTransition.bind(this));
    }

    onHideSlide() {
        this.sigmaInstance.kill();
        super.onHideSlide();
    }

    addNode() {
        var head = this.repo.head;
        this.graph.addNode(head.sha1, {
            label: head.sha1 + " " + head.msg,
            forceLabel: true,
            x: 8, y: this.pos,
            size: 15,
            color: "blue" });
        this.pos -= 15;
        if (head.parents.length > 0) {
            this.graph.addEdge(head.sha1, head.parents[0].sha1, {
                size: 5, color: "black", type: "arrow" });
        }
    }

    onResetSlide() {
        super.onResetSlide();
        this.graph.clear();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.graph.addNode("tr", {x: 100, y: 100, size: 0, hidden: true});
        this.graph.addNode("bl", {x: 0, y: 0, size: 0, hidden: true});
        this.pos = 100;

        this.repo = new Repo();
        this.addNode();
        this.repo.commit("Add motors");
        this.addNode();

        this.sigmaInstance = new Sigma(this.graph, this.section.getElementsByClassName("sigma-container")[0]);
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Add shooter'";
            this.repo.commit("Add shooter");
            this.addNode();
            this.sigmaInstance.refresh();
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.repo.commit("Shooter faster");
            this.addNode();
            this.sigmaInstance.refresh();
            return false; // No more transitions
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

Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: {
        13: 'next',
    },
    markdown: {
    },
});
