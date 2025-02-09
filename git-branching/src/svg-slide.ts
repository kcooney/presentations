import { ArrayXY, Line, SVG, Svg } from "@svgdotjs/svg.js";
import { enableMotion } from "./motion.js";
import { Slide, addSlide } from "./slide.js";
import {
  Commit,
  GitRecorder,
  GitOperationVisitor,
  TagOperation,
} from "./git.js";
import { Layout, Position } from "./layout.js";
import { failWith } from "./util.js";

const LEFT_MARGIN = 13;
const TOP_MARGIN = 13;
const SPACE_BETWEEN_COMMITS = 4;
const SPACE_BETWEEN_BRANCHES = 5;
const LINE_WIDTH = 7;
const COMMIT_RADIUS = 11;

const SCALE = 10;

const COLORS = ["#0000ec", "#dede00", "purple"];

type Config = {
  showHead: boolean;
};

function getColor(position: Position): string {
  return COLORS[position.j % COLORS.length] || "";
}

export class SvgSlide implements Slide {
  private readonly gitContainer: HTMLElement;
  private readonly svgContainer: HTMLElement;
  private readonly draw: Svg;
  private readonly code: HTMLElement;
  private readonly seed: string;
  private readonly showHead: boolean;
  private readonly maxY = 8 * 3;
  private readonly drawnCommits = new Map<string, SVGElement>();
  private layout: Layout | undefined;
  private git: GitRecorder;

  /**
   * Adds a SVG-based slide to the deck.
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
      return new (class extends SvgSlide {
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
    this.svgContainer =
      section.querySelector(".git-diagram") ??
      failWith('No element with class "git-diagram"');
    this.draw = SVG();
    this.draw.addTo(this.svgContainer);
    this.code =
      this.gitContainer.querySelector("code") ??
      failWith(() => `No code inside ${this.gitContainer}`);
    this.git = new GitRecorder(this.seed);
    this.showHead = config.showHead;
  }

  onShowSlide() {
    this.gitContainer.style.display = "block";
    this.resetSlide();
    enableMotion(this.onTransition.bind(this));
    this.onTransition(-1);
  }

  onHideSlide() {
    this.draw.node.textContent = "";
    this.drawnCommits.clear();
    this.gitContainer.style.display = "none";
    this.git = new GitRecorder(this.seed);
  }

  protected record(_git: GitRecorder): void {}

  private resetSlide() {
    this.draw.node.textContent = "";
    this.drawnCommits.clear();

    this.git.singleStepMode = true;
    this.git.checkout("main");
    this.record(this.git);
    this.layout = Layout.create(this.git);

    const [x, y] = this.toArrayXY({ i: this.layout.maxI, j: this.layout.maxJ });
    this.draw.size(x + LEFT_MARGIN * 2, y + TOP_MARGIN * 2);
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
      if (!this.drawnCommits.has(commit.sha1)) {
        const position = layout.getPosition(commit);
        if (!position) {
          console.log("Could not find position for '%s'", commit.sha1);
        } else {
          const color = getColor(position);
          // const label = commit.tags.map(tag => `⇠ ${tag}`).join(" ");

          const [x, y] = this.toArrayXY(position);
          console.log(
            "commit: '%s', i=%d; j=%d; pos=(%d, %d)",
            commit.msg,
            position.i,
            position.j,
            x,
            y,
          );
          const circleElement = this.draw.circle(COMMIT_RADIUS * 2);
          circleElement.center(x, y).fill(color);
          this.drawnCommits.set(commit.sha1, circleElement.node);

          // Color of the line to the first parent commit is the same as this commit.
          // Color of the line to the other parents are the color of the parent.
          const firstParentSha1 = commit.parents[0]?.sha1 || "";
          commit.parents.forEach(parentCommit => {
            const parentPos = layout.getPosition(parentCommit);
            if (parentPos) {
              const lineColor =
                parentCommit.sha1 === firstParentSha1
                  ? color
                  : getColor(parentPos);
              const [x2, y2] = this.toArrayXY(parentPos);
              const line = new Line({ x1: x, y1: y, x2: x2, y2: y2 });
              line.stroke({ width: LINE_WIDTH, color: lineColor });
              line.addTo(this.draw);

              const parentCommitNode = this.drawnCommits.get(parentCommit.sha1);
              parentCommitNode?.parentElement?.insertBefore(
                line.node,
                parentCommitNode,
              );
            }
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
    if (!commit && addHead) {
      throw new Error("");
    }
  }

  private toArrayXY(position: Position): ArrayXY {
    // Note that for SVG, the top left is (0, 0).
    // Position.i increases from zero as commit time increases.
    // Position.j is zero for the first branch, and increases for each branch.
    return [
      position.j * SPACE_BETWEEN_BRANCHES * SCALE + LEFT_MARGIN,
      position.i * SPACE_BETWEEN_COMMITS * SCALE + TOP_MARGIN,
    ];
  }
}
