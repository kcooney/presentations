import Graph from "graphology";
import Sigma from "sigma";
import {Slide, enableMotion} from "./motion.js";
import {Repo} from "./git.js";

export class GraphologySlide implements Slide {
    private readonly gitContainer: HTMLElement;
    private readonly sigmaContainer: HTMLElement;
    private readonly code: HTMLElement;
    private readonly graph: Graph;
    private readonly seed: string;
    private sigmaInstance: Sigma | undefined;
    private pos: number = 0;
    private repo: Repo;

    constructor(section: HTMLElement) {
       this.seed = section.id;
       this.gitContainer = section.getElementsByClassName("git-container")[0] as HTMLElement;
       this.sigmaContainer = section.getElementsByClassName("sigma-container")[0] as HTMLElement;
       this.code = this.gitContainer.getElementsByTagName("code")[0] as HTMLElement;
       this.graph = new Graph({type: "directed", allowSelfLoops: false});
       this.repo = new Repo(this.seed);
    }

    onShowSlide() {
        this.gitContainer.style.display = "block";
        this.resetSlide();
        enableMotion(this.onTransition.bind(this));
    }

    onHideSlide()  {
        this.sigmaInstance?.kill();
        this.gitContainer.style.display = "none";
        this.repo = new Repo(this.seed);
    }

    private resetSlide() {
        this.sigmaInstance?.kill();
        this.graph.clear();

        this.code.innerHTML = "$ git checkout main";
        this.graph.addNode("tr", {x: 100, y: 100, size: 0, hidden: true});
        this.graph.addNode("bl", {x: 0, y: 0, size: 0, hidden: true});
        this.pos = 100;

        this.addNode();
        this.repo.commit("Add motors");
        this.addNode();

        this.sigmaInstance = new Sigma(this.graph, this.sigmaContainer);
    }

    private addNode() {
        const head = this.repo.head;
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

    private onTransition(index: number): boolean {
        let hasMoreTransitions = true;
        switch (index) {
        case 0:
            this.repo = new Repo(this.seed);
            this.resetSlide();
            break;
        case 1:
            this.code.innerHTML += "<br />$ git commit -m 'Add shooter'";
            this.repo.commit("Add shooter");
            this.addNode();
            this.sigmaInstance?.refresh();
            break;
        case 2:
            this.code.innerHTML += "<br />$ git commit -m 'Shoot faster'";
            this.repo.commit("Shooter faster");
            this.addNode();
            this.sigmaInstance?.refresh();
            hasMoreTransitions = false;
            break;
        }
        return hasMoreTransitions;
    }
}
