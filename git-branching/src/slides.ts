import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import Graph from "graphology";
import Sigma from "sigma";
import {Slide, addSlide, enableMotion} from "./motion.js";
import {Repo} from "./git.js";

class GraphologySlide extends Slide {
    private readonly gitContainer: HTMLElement;
    private readonly sigmaContainer: HTMLElement;
    private readonly code: HTMLElement;
    private readonly graph: Graph;
    private readonly seed: string;
    private sigmaInstance: Sigma | undefined;
    private count: number = 0;
    private pos: number = 0;
    private repo: Repo | undefined;

    constructor(section: HTMLElement) {
       super();
       this.seed = section.id;
       this.gitContainer = section.getElementsByClassName("git-container")[0] as HTMLElement;
       this.sigmaContainer = section.getElementsByClassName("sigma-container")[0] as HTMLElement;
       this.code = this.gitContainer.getElementsByTagName("code")[0] as HTMLElement;
       this.graph = new Graph({type: "directed", allowSelfLoops: false});
    }

    onShowSlide() {
        this.gitContainer.style.display = "block";
        this.onResetSlide();
	    enableMotion(this, this.onTransition.bind(this));
    }

    onHideSlide()  {
        this.gitContainer.style.display = "none";
    }

    onResetSlide() {
        this.graph.clear();
        this.count = 0;

        this.code.innerHTML = "$ git checkout main";
        this.graph.addNode("tr", {x: 100, y: 100, size: 0, hidden: true});
        this.graph.addNode("bl", {x: 0, y: 0, size: 0, hidden: true});
        this.pos = 100;

        this.repo = new Repo(this.seed);
        this.addNode();
        this.repo.commit("Add motors");
        this.addNode();

        this.sigmaInstance = new Sigma(this.graph, this.sigmaContainer);
    }

    private addNode() {
        var head = this.repo!.head;
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

    onTransition(): boolean {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Add shooter'";
            this.repo!.commit("Add shooter");
            this.addNode();
            this.sigmaInstance!.refresh();
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.repo!.commit("Shooter faster");
            this.addNode();
            this.sigmaInstance!.refresh();
            return false; // No more transitions
        }
        return false;
    }
}

addSlide("graphology-slide", (section) => new GraphologySlide(section));

Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: true,
    markdown: {
    },
});
