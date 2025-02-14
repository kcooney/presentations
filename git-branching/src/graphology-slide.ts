import Graph from "graphology";
import Sigma from "sigma";
import {
  createNodeCompoundProgram,
  drawDiscNodeHover,
  NodeCircleProgram,
} from "sigma/rendering";
import { Settings } from "sigma/settings";
import { NodeDisplayData, PartialButFor } from "sigma/types";
import { enableMotion } from "./motion.js";
import { Slide, addSlide } from "./slide.js";
import { Commit } from "./git.js";
import {
  GitRecorder,
  GitOperationVisitor,
  TagOperation,
} from "./git-recorder.js";
import { Layout } from "./layout.js";
import { failWith } from "./util.js";

const SPACE_BETWEEN_COMMITS = 3;
const SPACE_BETWEEN_BRANCHES = 4;
const LABEL_SIZE = 10;
const COMMIT_NODE_SIZE = 15;
const SHOW_INVISIBLES = false;
const COLORS = ["#0000ec", "#dede00", "purple"];

interface Config {
  showHead?: boolean;
}

export class GraphologyGitSlide implements Slide {
  private readonly gitContainer: HTMLElement;
  private readonly sigmaContainer: HTMLElement;
  private readonly code: HTMLElement;
  private readonly graph: Graph;
  private readonly seed: string;
  private readonly showHead: boolean;
  private layout: Layout | undefined;
  private sigmaInstance: Sigma | undefined;
  private git: GitRecorder;

  /**
   * Adds a Graphology-based slide to the deck.
   *
   * @param sectionId DOM ID for the section element of the slide.
   * @param recorder Callback to call to get the set of commands to show on the slide.
   */
  static add(
    sectionId: string,
    config: Config = { showHead: false },
    recorder: (git: GitRecorder) => void,
  ): void {
    addSlide(sectionId, section => {
      return new (class extends GraphologyGitSlide {
        protected override record(git: GitRecorder): void {
          recorder(git);
        }
      })(section, config);
    });
  }

  private constructor(section: HTMLElement, config: Config) {
    this.seed = section.id;
    this.gitContainer =
      section.querySelector(".git-container") ??
      failWith('No element with class "git-container"');
    this.sigmaContainer =
      section.querySelector(".git-diagram") ??
      failWith('No element with class "git-diagram"');
    this.sigmaContainer.classList.add("sigma-container");
    this.code =
      this.gitContainer.querySelector("code") ??
      failWith(() => `No code inside ${this.gitContainer}`);
    this.graph = new Graph({ type: "directed", allowSelfLoops: false });
    this.git = new GitRecorder(this.seed);
    this.showHead = config.showHead || false;
  }

  onShowSlide() {
    this.gitContainer.style.display = "block";
    this.resetSlide();
    enableMotion(this.onTransition.bind(this));
    this.onTransition(-1);
  }

  onHideSlide() {
    this.sigmaInstance?.kill();
    this.gitContainer.style.display = "none";
    this.git = new GitRecorder(this.seed);
  }

  protected record(_git: GitRecorder): void {}

  private resetSlide() {
    this.sigmaInstance?.kill();
    this.graph.clear();

    this.git.singleStepMode = true;
    this.git.checkout("main");
    this.record(this.git);
    this.layout = this.git.createLayout();

    this.sigmaInstance = new Sigma(this.graph, this.sigmaContainer, {
      autoCenter: false,
      nodeProgramClasses: {
        commit: NodeCommitProgram,
      },
    });
    const size = SHOW_INVISIBLES ? 3 : 0;
    this.graph.addNode("tr", {
      x: this.layout.maxJ * SPACE_BETWEEN_BRANCHES + LABEL_SIZE,
      y: this.layout.maxI * SPACE_BETWEEN_COMMITS,
      size: size,
      hidden: !SHOW_INVISIBLES,
    });
    this.graph.addNode("bl", {
      x: 0,
      y: 0,
      size: size,
      hidden: !SHOW_INVISIBLES,
    });
    if (SHOW_INVISIBLES) {
      this.graph.addEdge("tr", "bl", { size: 2, color: "gray", type: "line" });
    }
  }

  private onTransition(index: number): boolean {
    if (index === 0) {
      this.git = new GitRecorder(this.seed);
      this.layout = undefined;
      this.resetSlide();
    }

    const prevHead = this.git.repo.head;
    const updateLabels = this.updateLabels.bind(this);
    const hasMoreCommands = this.git.replay(
      new (class extends GitOperationVisitor {
        override visitTag(op: TagOperation): void {
          updateLabels(op.taggedCommit);
        }
      })(),
    );

    const layout = this.layout!;
    for (const commit of this.git.repo.commits) {
      if (!this.graph.hasNode(commit.sha1)) {
        const position = layout.getPosition(commit);
        if (!position) {
          console.log("Could not find position for '%s'", commit.sha1);
        } else {
          const color = COLORS[position.j % COLORS.length];
          const label = commit.tags.map(tag => `⇠ ${tag}`).join(" ");
          // Note that for Sigma, the bottom left is (0, 0).
          // Position.i increases from zero as commit time increases.
          // Position.j is zero for the first branch, and increases for each branch.
          this.graph.addNode(commit.sha1, {
            type: "commit",
            label: label || null,
            forceLabel: !!label,
            hover: commit.msg ? commit.sha1 + " " + commit.msg : commit.sha1,
            y: (layout.maxI - position.i) * SPACE_BETWEEN_COMMITS,
            x: position.j * SPACE_BETWEEN_BRANCHES,
            size: COMMIT_NODE_SIZE,
            color: color,
          });
          commit.parents.forEach(parentCommit => {
            this.graph.addEdge(commit.sha1, parentCommit.sha1, {
              size: 5,
              color: "black",
              type: "arrow",
            });
          });
        }
      }
    }
    if (prevHead !== this.git.repo.head) {
      this.updateLabels(prevHead);
    }
    if (this.showHead) {
      this.updateLabels(this.git.repo.head, { addHead: true });
    }

    const commands = this.git.operations
      .map(command => command.command)
      .filter(command => command !== null);
    this.code.innerHTML = "$ " + commands.join("<br />$ ");
    return hasMoreCommands;
  }

  private updateLabels(commit: Commit, { addHead = false } = {}) {
    const sha1 = commit.sha1;
    let labels = commit.tags;
    if (addHead) {
      labels = labels.concat(["HEAD"]);
    }
    if (labels.length) {
      const label = labels.map(tag => `⇠ ${tag}`).join(" ");
      this.graph.setNodeAttribute(sha1, "label", label);
      this.graph.setNodeAttribute(sha1, "forceLabel", true);
    } else {
      this.graph.removeNodeAttribute(sha1, "label");
      this.graph.setNodeAttribute(sha1, "forceLabel", false);
    }
  }
}

const NodeCommitProgram = createNodeCompoundProgram(
  [NodeCircleProgram],
  undefined,
  drawCommitNodeHover,
);

function drawCommitNodeHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: Settings,
): void {
  if ("hover" in data && typeof data.hover === "string") {
    const label = data.label;
    data.label = data.hover;
    try {
      drawDiscNodeHover(context, data, settings);
    } finally {
      data.label = label;
    }
  }
}
