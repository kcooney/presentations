/* eslint no-unused-vars: "warn" */

import { Git } from "./git.js";
import Reveal from '../reveal-js/dist/reveal.esm.js';
import Markdown from '../reveal-js/plugin/markdown/markdown.esm.js';  // eslint-disable-line no-unused-vars

// Mermaid; https://mermaid.js.org/
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({ startOnLoad: true });

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
    keyboard: {
        13: 'next',
    },
    markdown: {
    },
});
