import Graph from "graphology";
import Sigma from "sigma";
import {Slide, enableMotion} from "./motion.js";
import {Commit, Git} from "./git.js";

const SPACE_BETWEEN_COMMITS = 3;
const SPACE_BETWEEN_BRANCHES = 4;
const LABEL_SIZE = 10;
const SHOW_INVISIBLES = false;
const COLORS = ["#0000ec", "#dede00", "purple"];

class CommitWrapper {
    branchChildren: CommitWrapper[] = [];

    constructor(
        public readonly commit: Commit,
        public i: number,
        public j = 0) {}
}

export class GraphologySlide implements Slide {
    private readonly gitContainer: HTMLElement;
    private readonly sigmaContainer: HTMLElement;
    private readonly code: HTMLElement;
    private readonly graph: Graph;
    private readonly seed: string;
    private readonly commitWrapperBySha1 = new Map<string, CommitWrapper>();
    private readonly maxY = 8 * 3;
    private sigmaInstance: Sigma | undefined;
    private git: Git;
    private maxI = 0;
    private maxJ = 0;

    constructor(section: HTMLElement) {
       this.seed = section.id;
       this.gitContainer = section.getElementsByClassName("git-container")[0] as HTMLElement;
       this.sigmaContainer = section.getElementsByClassName("sigma-container")[0] as HTMLElement;
       this.code = this.gitContainer.getElementsByTagName("code")[0] as HTMLElement;
       this.graph = new Graph({type: "directed", allowSelfLoops: false});
       this.git = new Git(this.seed);
    }

    onShowSlide() {
        this.gitContainer.style.display = "block";
        this.resetSlide();
        enableMotion(this.onTransition.bind(this));
        this.onTransition(-1);
    }

    onHideSlide()  {
        this.sigmaInstance?.kill();
        this.gitContainer.style.display = "none";
        this.git = new Git(this.seed);
    }

    protected record(git: Git): void {
        git.commit().checkout("develop", {createBranch: true}).commit();
        git.singleStepMode = false;
        git.commit().commit().pause();
        git.checkout("main").pause();
        git.merge("develop").pause();
        git.commit().pause()
        git.commit();
    }

    private resetSlide() {
        this.sigmaInstance?.kill();
        this.graph.clear();

        this.git.singleStepMode = true;
        this.git.checkout("main");
        this.record(this.git);
        
        this.calculateCommitPositions();
        this.sigmaInstance = new Sigma(this.graph, this.sigmaContainer, {
            autoCenter: false,
        });
        console.log("maxI=%d; maxJ=%d", this.maxI, this.maxJ);
        const size = SHOW_INVISIBLES ? 3 : 0;
        this.graph.addNode("tr", {
            x: this.maxJ * SPACE_BETWEEN_BRANCHES + LABEL_SIZE,
            y: this.maxY, // this.maxI * SPACE_BETWEEN_COMMITS,
            size: size, hidden: !SHOW_INVISIBLES});
        this.graph.addNode("bl", {x: 0, y: 0, size: size, hidden: !SHOW_INVISIBLES});
        if (SHOW_INVISIBLES) {
            this.graph.addEdge("tr", "bl", { size: 2, color: "gray", type: "line" });
        }
    }

    private onTransition(index: number): boolean {
        if (index === 0) {
            this.git = new Git(this.seed);
            this.resetSlide();
        }
        const hasMoreCommands = this.git.run();

        const shiftUp = Math.max(0, this.maxY - (this.maxI * SPACE_BETWEEN_COMMITS));
        for (const commit of this.git.repo.commits) {
            if (!this.graph.hasNode(commit.sha1)) {
                const wrapper = this.commitWrapperBySha1.get(commit.sha1);
                if (!wrapper) {
                    console.log("Could not find wrapper for '%s'", commit.sha1);
                } else {
                    console.log("%s %s - i=%d; j=%d", commit.sha1, commit.msg, wrapper.i, wrapper.j);
                    const color = COLORS[wrapper.j % COLORS.length]
                    this.graph.addNode(commit.sha1, {
                        label: commit.sha1 + " " + commit.msg,
                        forceLabel: true,
                        y: wrapper.i * SPACE_BETWEEN_COMMITS + shiftUp,
                        x: wrapper.j * SPACE_BETWEEN_BRANCHES,
                        size: 15,
                        color: color });
                    commit.parents.forEach(parentCommit => {
                        this.graph.addEdge(commit.sha1, parentCommit.sha1, {
                            size: 5, color: "black", type: "arrow" });
                    });
                }
            }
        }
        const commands = this.git.commands.map(command => command.command());
        this.code.innerHTML = "$ " + commands.join("<br />$ ");
        return hasMoreCommands;
    }

    private calculateCommitPositions(): void {
        // Inspired by https://pvigier.github.io/2019/05/06/commit-graph-drawing-algorithms.html

        // First do a temporal topological sort, getting the i coordinates.
        let i = 0;
        const commitWrappers: CommitWrapper[] = [];
        this.commitWrapperBySha1.clear();
        this.git.temporalTopologicalWalk(commit => {
            const wrapper = new CommitWrapper(commit, i++);
            commitWrappers.push(wrapper);
            this.commitWrapperBySha1.set(commit.sha1, wrapper);
        });
        this.maxI = i - 1;

        // Next wrap all of the children.
        commitWrappers.forEach(wrapper => {
            wrapper.commit.branchChildren().forEach(commit => {
                const child = this.commitWrapperBySha1.get(commit.sha1);
                if (child) {
                    wrapper.branchChildren.push(child);
                }
            });
        });

        // Finaly get the j coordinates.
        const activeBranches: CommitWrapper[] = [];
        this.maxJ = 0;
        console.log("Calculating j coordinates");
        for (const wrapper of commitWrappers) {
            console.log("wrapper: %s %s: i=%d", wrapper.commit.sha1, wrapper.commit.msg, wrapper.i);
            let child = wrapper.branchChildren.pop();
            if (child) {
                console.log("%s's first child: %s %s", wrapper.commit.sha1, child.commit.sha1, child.commit.msg);
                let index = activeBranches.findIndex((w) => w === child);
                if (index >= 0) {
                    activeBranches[index] = wrapper;
                }
                // Remove chidren from activeBranches
                child = wrapper.branchChildren.pop();
                while (child) {
                    index = activeBranches.findIndex((w) => w === child);
                    if (index > -1) {
                        activeBranches.splice(index, 1);
                    }
                    child = wrapper.branchChildren.pop();
                }
            } else {
                console.log("%s: no children", wrapper.commit.sha1);
                activeBranches.push(wrapper);
            }
            wrapper.j = activeBranches.findIndex((w) => w === wrapper);
            this.maxJ = Math.max(wrapper.j, this.maxJ);
        }
        console.log("Done calculating j coordinates");
    }
}
