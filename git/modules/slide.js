import { Git } from "./git.js";
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

class GraphologySlide extends Slide { // eslint-disable-line no-unused-vars
    static { Slide.derived.add(this); }

    constructor() {
        super("graphology-slide");
        this.graph = new graphology.Graph({type: "directed", allowSelfLoops: false});
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

    onResetSlide() {
        super.onResetSlide();
        this.graph.clear();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
	this.graph.addNode("tr", {x: 100, y: 100, size: 0, hidden: true});
	this.graph.addNode("br", {x: 100, y: 0, size: 0, hidden: true});
        this.graph.addNode("1a1a9bf", {
            label: "1a1a9bf Initial commit",
            x: 0, y: 100, size: 15, color: "blue" });
        this.graph.addNode("5f68664", {
            label: "5f68664 Add motors",
            x: 0, y: 85, size: 15, color: "red" });
        this.graph.addEdge("5f68664", "1a1a9bf", { size: 5, color: "black", type: "arrow" });
        this.sigmaInstance = new Sigma(this.graph, this.section.getElementsByClassName("sigma-container")[0]);
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Add shooter'";
            this.graph.addNode("6e04e30", { label: "6e04e30 Add shooter", x: 0, y: 70, size: 15, color: "blue" });
            this.graph.addEdge("6e04e30", "5f68664", { size: 5, color: "black", type: "arrow" });
	    this.sigmaInstance.refresh();
            return true;
        case 2:
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
