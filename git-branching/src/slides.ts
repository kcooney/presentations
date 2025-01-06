import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import {addSlide} from "./motion.js";
import {GraphologySlide} from "./graphology-slide.js";

addSlide("graphology-slide", (section) => new GraphologySlide(section));

Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: true,
    markdown: {
    },
});
