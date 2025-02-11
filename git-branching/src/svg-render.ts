import { ArrayXY, Line, Path, Shape, SVG, Svg } from "@svgdotjs/svg.js";
import { Commit, Repo } from "./git";
import { Layout, Position } from "./layout.js";
import { GitRecorder } from "./git-recorder";

const LEFT_MARGIN = 2;
const RIGHT_MARGIN = 2;
const TOP_MARGIN = 2;
const BOTTOM_MARGIN = 2;
const SPACE_BETWEEN_COMMITS = 60;
const SPACE_BETWEEN_BRANCHES = 50;
const LINE_WIDTH = 8;
const COMMIT_RADIUS = 11;
const TEXT_INDENT = 8;
const MAX_TEXT_WIDTH = 500;

const COLORS = ["#0000ec", "#dede00", "purple"];

function getColor(position: Position): string {
  return COLORS[position.j % COLORS.length] || "";
}

export type Config = {
  showHead: boolean;
};

export class SvgGitRenderer {
  private readonly drawnCommits = new Map<string, SVGElement>();
  private readonly config: Config;
  private readonly draw: Svg;
  private repo: Repo | null;
  private recorder: GitRecorder | null;
  private layout: Layout | null = null;
  private head: Commit | null = null;
  private textAnchorX = 0;

  constructor(
    container: HTMLElement,
    graph: Repo | GitRecorder,
    config: Config = { showHead: false },
  ) {
    if (graph instanceof GitRecorder) {
        this.recorder = graph;
        this.repo = graph.repo;
    } else {
        this.recorder = null;
        this.repo = graph;
    }
    this.config = config;
    this.draw = SVG();
    this.draw.addTo(container);
  }

  reset(graph: Repo | GitRecorder | null) {
    if (graph instanceof GitRecorder) {
        this.recorder = graph;
        this.repo = graph.repo;
    } else {
        this.recorder = null;
        this.repo = graph;
    }
    this.draw.node.textContent = "";
    this.drawnCommits.clear();
    this.layout = null;
    this.head = null;
  }

  render() {
    if (!this.repo) {
      return;
    }
    let layout = this.layout;
    if (!layout) {
      if (this.recorder) {
        layout = this.recorder.createLayout();
      } else {
        layout = Layout.create(this.repo);
      }
      this.prerender(layout);
    }
    for (const commit of this.repo.commits) {
      if (!this.drawnCommits.has(commit.sha1)) {
        const position = layout.getPosition(commit);
        if (!position) {
          console.log("Could not find position for '%s'", commit.sha1);
        } else {
          const color = getColor(position);
          // const label = commit.tags.map(tag => `⇠ ${tag}`).join(" ");

          const commitXY = this.toArrayXY(position);
          const circleElement = this.draw.circle(COMMIT_RADIUS * 2);
          circleElement.center(...commitXY).fill(color);
          this.drawnCommits.set(commit.sha1, circleElement.node);

          const msg = commit.msg ? `${commit.sha1} ${commit.msg}` : commit.sha1;
          const text = this.draw.text(msg).font({
            family: "Arial",
            size: "14pt",
          });
          text.amove(
            this.textAnchorX,
            commitXY[1] + text.bbox().height / 2 - 3,
          );

          // Color of the line to the first parent commit is the same as this commit.
          // Color of the line to the other parents are the color of the parent.
          commit.parents.forEach((parentCommit, index) => {
            const parentPos = layout.getPosition(parentCommit);
            if (parentPos) {
              const lineColor = index == 0 ? color : getColor(parentPos);
              const path = SvgGitRenderer.path(
                this.toArrayXY(parentPos),
                commitXY,
              );
              path.stroke({ width: LINE_WIDTH, color: lineColor }).fill();

              const parentCommitNode = this.drawnCommits.get(parentCommit.sha1);
              parentCommitNode?.parentElement?.insertBefore(
                path.node,
                parentCommitNode,
              );
            }
          });
        }
      }
    }
    for (const commit of this.repo.tags.values()) {
      this.updateLabels(commit);
    }
    if (!!this.head && this.head !== this.repo.head) {
      this.updateLabels(this.head);
    }
    if (this.config.showHead) {
      this.updateLabels(this.repo.head, { addHead: true });
    }
  }

  private prerender(layout: Layout) {
    const [x, y] = this.toArrayXY({ i: layout.maxI, j: layout.maxJ });
    this.textAnchorX = x + COMMIT_RADIUS + TEXT_INDENT;
    this.draw.size(
      x + RIGHT_MARGIN + COMMIT_RADIUS + TEXT_INDENT + MAX_TEXT_WIDTH,
      y + BOTTOM_MARGIN + COMMIT_RADIUS,
    );
  }

  private updateLabels(commit: Commit, { addHead = false } = {}) {
    if (!commit && addHead) {
      return;
    }
  }

  private static path(start: ArrayXY, end: ArrayXY): Shape {
    const [x1, y1] = start;
    const [x2, y2] = end;
    if (x1 == x2) {
      return new Line({ x1: x1, y1: y1, x2: x2, y2: y2 });
    }
    return new Path({
      d: `M${x1},${y1} C${x1},${y2} ${x2},${y1} ${x2},${y2}`,
    }).fill("none");
  }

  private toArrayXY(position: Position): ArrayXY {
    // Note that for SVG, the top left is (0, 0).
    // Position.i increases from zero as commit time increases.
    // Position.j is zero for the first branch, and increases for each branch.
    return [
      position.j * SPACE_BETWEEN_BRANCHES + LEFT_MARGIN + COMMIT_RADIUS,
      position.i * SPACE_BETWEEN_COMMITS + TOP_MARGIN + COMMIT_RADIUS,
    ];
  }
}
