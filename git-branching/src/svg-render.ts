import { Line, Path, Shape, SVG, Svg, Text } from "@svgdotjs/svg.js";
import { Commit, Repo } from "./git";
import { Layout, Position } from "./layout.js";
import { GitRecorder } from "./git-recorder";

const LEFT_MARGIN = 2;
const RIGHT_MARGIN = 2;
const TOP_MARGIN = 2;
const HORIZONTAL_EXTRA_TOP_MARGIN = 10;
const BOTTOM_MARGIN = 2;
const SPACE_BETWEEN_COMMITS = 60;
const SPACE_BETWEEN_BRANCHES = 50;
const LINE_WIDTH = 8;
const COMMIT_RADIUS = 11;
const LABEL_INDENT = 8;
const TEXT_INDENT = 88;
const MAX_TEXT_WIDTH = 500;

type Font = {
  family?: string;
  size?: string;
  weight?:
    | "normal"
    | "bold"
    | "bolder"
    | "lighter"
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900;
};

const COMMIT_FONT: Font = {
  family: "Arial",
  size: "14pt",
};

const LABEL_FONT: Font = {
  family: "Arial",
  size: "12pt",
};

const COLORS = ["#0000ec", "#dede00", "purple"];

function getColor(position: Position): string {
  return COLORS[position.j % COLORS.length] || "";
}

export interface Config {
  readonly showHead?: boolean;
  readonly horizontal?: boolean;
}

const CONFIG_DEFAULTS: Config = {
  showHead: false,
  horizontal: false,
};

class DrawnCommit {
  label: Text | null = null;

  constructor(readonly commit: Shape) {}
}

export interface Coordinates {
  readonly x: number;
  readonly y: number;
}

export interface Point extends Coordinates {
  readonly color: string;
}

/** Handles all logic for mapping Location to Coordinates. */
class Rendering {
  private readonly horizontal: boolean;
  readonly canvasSize: Coordinates;
  readonly textAnchorX: number;

  constructor(
    private readonly layout: Layout,
    config: Config,
  ) {
    this.horizontal = config.horizontal || false;
    this.canvasSize = Rendering.toCoordinates(
      { i: layout.maxI, j: layout.maxJ },
      this.horizontal,
    );
    this.textAnchorX =
      this.canvasSize.x + COMMIT_RADIUS + TEXT_INDENT + LABEL_INDENT;
  }

  getCoordinates(commit: Commit): Point | undefined {
    const position = this.layout.getPosition(commit);
    if (!position) {
      return undefined;
    }
    const coordinates = Rendering.toCoordinates(position, this.horizontal);
    return { x: coordinates.x, y: coordinates.y, color: getColor(position) };
  }

  private static toCoordinates(
    position: Position,
    horizonal: boolean,
  ): Coordinates {
    // Note that for SVG, the top left is (0, 0).
    // Position.i increases from zero as commit time increases.
    // Position.j is zero for the first branch, and increases for each branch.
    let x = position.j * SPACE_BETWEEN_BRANCHES + COMMIT_RADIUS;
    let y = position.i * SPACE_BETWEEN_COMMITS + COMMIT_RADIUS;

    if (horizonal) {
      [x, y] = [y + HORIZONTAL_EXTRA_TOP_MARGIN, x];
    }
    return { x: x + LEFT_MARGIN, y: y + TOP_MARGIN };
  }
}

/** Contains all data that is cleared by SvgGitRenderer.reset(). */
class State {
  private _rendering: Rendering | null = null;
  readonly drawnCommits = new Map<string, DrawnCommit>();

  constructor(
    private readonly config: Config,
    readonly repo: Repo,
    readonly recorder: GitRecorder | null,
  ) {}

  prerender(draw: Svg): Rendering {
    if (this._rendering) {
      return this._rendering;
    }

    let layout: Layout;
    if (this.recorder) {
      layout = this.recorder.createLayout();
    } else {
      layout = Layout.create(this.repo);
    }
    const rendering = new Rendering(layout, this.config);
    draw.size(
      rendering.canvasSize.x +
        RIGHT_MARGIN +
        COMMIT_RADIUS +
        TEXT_INDENT +
        MAX_TEXT_WIDTH,
      rendering.canvasSize.y + BOTTOM_MARGIN + COMMIT_RADIUS,
    );
    this._rendering = rendering;
    return rendering;
  }
}

export class SvgGitRenderer {
  private readonly config: Config;
  private readonly draw: Svg;
  private state: State | null;

  constructor(
    container: HTMLElement,
    graph: Repo | GitRecorder,
    config: Config = {},
  ) {
    if (graph instanceof GitRecorder) {
      this.state = new State(config, graph.repo, graph);
    } else {
      this.state = new State(config, graph, null);
    }
    container.classList.add("svg-git");
    this.config = { ...CONFIG_DEFAULTS, ...config };
    this.draw = SVG();
    this.draw.addTo(container);
  }

  reset(graph: Repo | GitRecorder | null) {
    if (!graph) {
      this.state = null;
    } else if (graph instanceof GitRecorder) {
      this.state = new State(this.config, graph.repo, graph);
    } else {
      this.state = new State(this.config, graph, null);
    }
    this.draw.node.textContent = "";
  }

  render() {
    if (!this.state) {
      return;
    }
    const rendering = this.state.prerender(this.draw);

    // Draw circles for all new commits, and lines to their parent commit(s).
    for (const commit of this.state.repo.commits) {
      if (!this.state.drawnCommits.has(commit.sha1)) {
        const coordinates = rendering.getCoordinates(commit);
        if (!coordinates) {
          console.log("Could not find position for '%s'", commit.sha1);
        } else {
          // const label = commit.tags.map(tag => `⇠ ${tag}`).join(" ");
          const circle = this.draw.circle(COMMIT_RADIUS * 2);
          circle.node.classList.add("commit");
          circle.center(coordinates.x, coordinates.y).fill(coordinates.color);
          this.state.drawnCommits.set(commit.sha1, new DrawnCommit(circle));

          const msg = commit.msg ? `${commit.sha1} ${commit.msg}` : commit.sha1;
          if (this.config.horizontal) {
            circle.element("title").words(msg); // Add hover text
          } else {
            // Show commit sha1 and message to the right of the commit.
            const text = this.draw.text(msg).font(COMMIT_FONT);
            text.move(
              rendering.textAnchorX,
              circle.bbox().cy - text.bbox().height / 2,
            );
          }

          // Color of the line to the first parent commit is the same as this commit.
          // Color of the line to the other parents are the color of the parent.
          commit.parents.forEach((parentCommit, index) => {
            const parentCoordinates = rendering.getCoordinates(parentCommit);
            if (parentCoordinates) {
              const lineColor =
                index == 0 ? coordinates.color : parentCoordinates.color;
              const path = SvgGitRenderer.path(parentCoordinates, coordinates);
              path.stroke({ width: LINE_WIDTH, color: lineColor }).fill();

              const parentCommitShape = this.state!.drawnCommits.get(
                parentCommit.sha1,
              );
              if (parentCommitShape) {
                const parentNode = parentCommitShape.commit.node;
                parentNode.parentElement?.insertBefore(path.node, parentNode);
              }
            }
          });
        }
      }
    }

    // Update tags, branches and HEAD.
    const branchTips = new Map<Commit, string[]>();
    this.state.repo.branches.forEach((commit, branch) => {
      const branches = branchTips.get(commit);
      if (branches === undefined) {
        branchTips.set(commit, [branch]);
      } else {
        branches.push(branch);
      }
    });

    const head = this.config.showHead ? this.state.repo.head : null;
    for (const commit of this.state.repo.commits) {
      const commitShape = this.state.drawnCommits.get(commit.sha1);
      if (commitShape) {
        this.updateLabel(commit, commitShape, head, branchTips);
      }
    }
  }

  private updateLabel(
    commit: Commit,
    commitShape: DrawnCommit,
    head: Commit | null,
    branchTips: Map<Commit, string[]>,
  ) {
    let labels: string[] = [];
    if (!this.config.horizontal) {
      labels.concat(commit.tags);
    }
    if (this.config.horizontal) {
      const branches = branchTips.get(commit);
      if (branches) {
        labels = labels.concat(branches);
      }
    }
    if (commit == head) {
      labels = labels.concat(["HEAD"]);
    }

    if (labels.length) {
      // For vertical graphs (move the tables down so they are below the commands)
      // const label = "⬑ " + labels..join(" ⇠ ");
      const label = labels.map(tag => `⇠ ${tag}`).join(" ");
      if (commitShape.label) {
        commitShape.label.text(label);
      } else {
        commitShape.label = this.draw.plain(label).font(LABEL_FONT);
      }

      const commitBbox = commitShape.commit.bbox();
      commitShape.label.move(
        commitBbox.x2 + LABEL_INDENT,
        commitBbox.cy - commitShape.label.bbox().height / 2,
      );
    } else {
      if (commitShape.label) {
        commitShape.label.remove();
        commitShape.label = null;
      }
    }
  }

  private static path(start: Coordinates, end: Coordinates): Shape {
    if (start.x === end.x) {
      return new Line({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    }
    return new Path({
      d: `M${start.x},${start.y} C${start.x},${end.y} ${end.x},${start.y} ${end.x},${end.y}`,
    }).fill("none");
  }
}
