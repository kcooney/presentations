import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import {Slide} from "./motion.js";

class GraphologySlide extends Slide {

    constructor() {
       super("graphology-slide");
    }
}


const graphologySlide = new GraphologySlide();

Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: true,
    markdown: {
    },
});
