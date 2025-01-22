import Graph from "graphology";
import Sigma from "sigma";
import {createNodeCompoundProgram, drawDiscNodeHover, NodeCircleProgram} from "sigma/rendering";
import {Settings} from "sigma/settings";
import {NodeDisplayData, PartialButFor} from "sigma/types"
import {Slide, addSlide, enableMotion, failWith} from "./motion.js";
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
    private readonly showHead: boolean;
    private readonly commitWrapperBySha1 = new Map<string, CommitWrapper>();
    private readonly maxY = 8 * 3;
    private sigmaInstance: Sigma | undefined;
    private git: Git;
    private maxI = 0;
    private maxJ = 0;

    static add(sectionId: string, { showHead = false } = {}, recorder: (git: Git) => void): void {
        addSlide(sectionId, section => {
            return new class extends GraphologySlide {
                protected override record(git: Git): void {
                    recorder(git);
                }
            }(section, {showHead: showHead});
        });
    }

    private constructor(section: HTMLElement, { showHead }: { showHead: boolean }) {
        this.seed = section.id;
        this.gitContainer = section.querySelector(".git-container") ?? failWith('No element with class "git-container"');
        this.sigmaContainer = section.querySelector(".git-diagram") ?? failWith('No element with class "git-diagram"');
        this.sigmaContainer.classList.add("sigma-container");
        this.code = this.gitContainer.querySelector("code") ?? failWith(() => `No code inside ${this.gitContainer}`);
        this.graph = new Graph({type: "directed", allowSelfLoops: false});
        this.git = new Git(this.seed);
        this.showHead = showHead;
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

    protected record(_git: Git): void {}

    private resetSlide() {
        this.sigmaInstance?.kill();
        this.graph.clear();

        this.git.singleStepMode = true;
        this.git.checkout("main");
        this.record(this.git);
        
        this.calculateCommitPositions();
        this.sigmaInstance = new Sigma(this.graph, this.sigmaContainer, {
            autoCenter: false,
            nodeProgramClasses: {
                "commit": NodeCommitProgram,
            },
        });
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
        const prevHead = this.git.repo.head;
        const hasMoreCommands = this.git.run();

        const shiftUp = Math.max(0, this.maxY - (this.maxI * SPACE_BETWEEN_COMMITS));
        for (const commit of this.git.repo.commits) {
            if (!this.graph.hasNode(commit.sha1)) {
                const wrapper = this.commitWrapperBySha1.get(commit.sha1);
                if (!wrapper) {
                    console.log("Could not find wrapper for '%s'", commit.sha1);
                } else {
                    const color = COLORS[wrapper.j % COLORS.length]
                    this.graph.addNode(commit.sha1, {
                        type: "commit",
                        hover: commit.msg ? commit.sha1 + " " + commit.msg : commit.sha1,
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
        if (prevHead !== this.git.repo.head) {
            this.graph.removeNodeAttribute(prevHead.sha1, "label");
            this.graph.setNodeAttribute(prevHead.sha1, "forceLabel", false);
        }
        if (this.showHead) {
            this.graph.setNodeAttribute(this.git.repo.head.sha1, "label", "⇠ HEAD");
            this.graph.setNodeAttribute(this.git.repo.head.sha1, "forceLabel", true);
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
        for (const wrapper of commitWrappers) {
            let child = wrapper.branchChildren.pop();
            if (child) {
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
                activeBranches.push(wrapper);
            }
            wrapper.j = activeBranches.findIndex((w) => w === wrapper);
            this.maxJ = Math.max(wrapper.j, this.maxJ);
        }
    }
}

const NodeCommitProgram = createNodeCompoundProgram([NodeCircleProgram], undefined, drawCommitNodeHover);

function drawCommitNodeHover(
    context: CanvasRenderingContext2D,
    data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
    settings: Settings,
): void {
    if ("hover" in data && typeof data.hover === "string") {
        const label = data.label;
        if (label) {
            data.label = data.hover + " " + data.label;
        } else {
            data.label = data.hover;
        }
        try {
            drawDiscNodeHover(context, data, settings);
        } finally {
            data.label = label;
        }
    }
}
