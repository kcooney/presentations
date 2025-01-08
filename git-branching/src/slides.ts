import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import {addSlide} from "./motion.js";
import {Git} from "./git.js";
import {GraphologySlide} from "./graphology-slide.js";
import {MermaidSlide} from './mermaid-slide.js';

class CommittingSlide extends MermaidSlide {
    count = 0;

    override record(git: Git): void {
        git.commit("Add shooter").commit("Shoot faster");
        git.commit("Revert shoot faster", true);
        git.commit("Use gyro");
    }
}

class MermaidDemoSlide extends MermaidSlide {

    override record(git: Git): void {
        git.commit().checkout("develop", true);
        git.commit().commit().checkout("main");
        git.merge("develop").commit().commit();
    }
}


addSlide("mermaid-slide", (section) => new MermaidDemoSlide(section));
addSlide("graphology-slide", (section) => new GraphologySlide(section));
addSlide("committing-slide", (section) => new CommittingSlide(section));


Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: true,
    markdown: {
    },
});
