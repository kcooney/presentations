import { Circle, Line, Path, Shape, SVG, Svg, Text } from "@svgdotjs/svg.js";
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
  readonly showCommitSha1s?: boolean;
  readonly showCommitMsgs?: boolean;
  readonly showCommitTags?: boolean;
  readonly showBranchNames?: boolean;
}

const HORIZONTAL_CONFIG_DEFAULTS: Config = {
  showHead: false,
  showCommitSha1s: false,
  showCommitMsgs: false,
  showCommitTags: false,
  showBranchNames: true,
};
const HORIZONTAL_CONFIG_OVERRIDES: Config = {
  showCommitSha1s: false,
  showCommitMsgs: false,
};
const VERTICAL_CONFIG_DEFAULTS: Config = {
  showHead: false,
  showCommitSha1s: true,
  showCommitMsgs: true,
  showCommitTags: true,
};

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

export class SvgGitRenderer {
  private readonly drawnCommits = new Map<string, SvgCommit>();
  private rendering: Rendering | null = null;
  private readonly repo: Repo;
  private readonly recorder: GitRecorder | null;
  private readonly config: Config;
  private readonly draw: Svg;

  constructor(
    container: HTMLElement,
    graph: Repo | GitRecorder,
    config: Config = {},
  ) {
    if (graph instanceof GitRecorder) {
      this.repo = graph.repo;
      this.recorder = graph;
    } else {
      this.repo = graph;
      this.recorder = null;
    }
    container.classList.add("svg-git");
    const defaults = config.horizontal
      ? HORIZONTAL_CONFIG_DEFAULTS
      : VERTICAL_CONFIG_DEFAULTS;
    const overrides = config.horizontal ? HORIZONTAL_CONFIG_OVERRIDES : {};
    this.config = { ...defaults, ...config, ...overrides };
    this.draw = SVG();
    this.draw.addTo(container);
  }

  kill() {
    this.draw.node.textContent = "";
    this.draw.node.remove();
  }

  render() {
    if (this.rendering) {
      return;
    }
    const rendering = this.prerender();
    for (const commit of this.repo.commits) {
      this.commitCreated(commit, rendering);
    }
    this.repo.onCommitCreated(commit => this.commitCreated(commit, rendering));
    this.repo.onCommitRefsUpdated(this.commitRefsUpdated.bind(this));
  }

  private commitCreated(commit: Commit, rendering: Rendering) {
    if (this.drawnCommits.has(commit.sha1)) {
      console.log("Commit created twice for '%s'", commit.sha1);
      return;
    }

    const coordinates = rendering.getCoordinates(commit);
    if (!coordinates) {
      console.log("Could not find position for '%s'", commit.sha1);
    } else {
      // const label = commit.tags.map(tag => `⇠ ${tag}`).join(" ");
      const svgCommit = new SvgCommit(
        this.draw,
        this.config,
        coordinates,
        commit,
        rendering,
      );
      this.drawnCommits.set(commit.sha1, svgCommit);
      svgCommit.drawCommit();

      // Color of the line to the first parent commit is the same as this commit.
      // Color of the line to the other parents are the color of the parent.
      commit.parents.forEach((parentCommit, index) => {
        const parentSvgCommit = this.drawnCommits.get(parentCommit.sha1);
        if (parentSvgCommit) {
          const lineColor =
            index == 0 ? coordinates.color : parentSvgCommit.color;
          svgCommit.drawEdgeToParent(parentSvgCommit, lineColor);
        }
      });
    }
    this.commitRefsUpdated(commit);
  }

  private commitRefsUpdated(commit: Commit) {
    const svgCommit = this.drawnCommits.get(commit.sha1);
    if (!svgCommit) {
      console.log("Could not find SvgCommit for '%s'", commit.sha1);
      return;
    }

    const branches: string[] = [];
    for (const [branch, tip] of this.repo.branches) {
      if (tip === commit) {
        branches.push(branch);
      }
    }
    const head = this.config.showHead ? this.repo.head : null;
    svgCommit.drawRefs(head, branches);
  }

  prerender(): Rendering {
    if (this.rendering) {
      return this.rendering;
    }

    let layout: Layout;
    if (this.recorder) {
      layout = this.recorder.createLayout();
    } else {
      layout = Layout.create(this.repo);
    }
    const rendering = new Rendering(layout, this.config);
    this.draw.size(
      rendering.canvasSize.x +
        RIGHT_MARGIN +
        COMMIT_RADIUS +
        TEXT_INDENT +
        MAX_TEXT_WIDTH,
      rendering.canvasSize.y + BOTTOM_MARGIN + COMMIT_RADIUS,
    );
    this.rendering = rendering;
    return rendering;
  }
}

class SvgCommit {
  public readonly coordinates: Coordinates;
  public readonly color: string;
  private readonly message: string;
  private readonly textAnchorX: number;
  private readonly needDescriptionNode: boolean;
  private circle: Circle | null = null;
  private description: Text | null = null;
  private label: Text | null = null;

  constructor(
    private readonly draw: Svg,
    private readonly config: Config,
    coordinates: Point,
    private readonly commit: Commit,
    rendering: Rendering,
  ) {
    this.message =
      config.showCommitMsgs && commit.msg
        ? `${commit.sha1} ${commit.msg}`
        : commit.sha1;
    this.textAnchorX = rendering.textAnchorX;
    this.coordinates = coordinates;
    this.color = coordinates.color;
    this.needDescriptionNode =
      config.showCommitSha1s || config.showCommitMsgs || false;
  }

  drawCommit(): void {
    if (!this.circle) {
      const circle = (this.circle = this.draw.circle(COMMIT_RADIUS * 2));
      circle.node.classList.add("commit");
      circle.center(this.coordinates.x, this.coordinates.y).fill(this.color);
      if (!this.needDescriptionNode && this.message) {
        circle.element("title").words(this.message); // Add hover text
      }
    }

    if (!this.description && this.needDescriptionNode) {
      let msg = this.message;
      if (this.config.showCommitTags && this.commit.tags.length) {
        msg = " ⇠ " + this.commit.tags.join(" ⇠ ") + msg;
      }
      const desc = (this.description = this.draw.text(msg).font(COMMIT_FONT));
      desc.move(
        this.textAnchorX,
        this.circle.bbox().cy - desc.bbox().height / 2,
      );
    }
  }

  drawRefs(head: Commit | null, branches: string[]) {
    let labels: string[] = [];
    if (this.config.showCommitTags && !this.needDescriptionNode) {
      labels.concat(this.commit.tags);
    }
    if (this.config.showBranchNames) {
      labels = labels.concat(branches);
    }
    if (this.commit === head) {
      labels = labels.concat(["HEAD"]);
    }

    if (labels.length) {
      // For vertical graphs (move the tables down so they are below the commands)
      // const label = "⬑ " + labels.join(" ⇠ ");
      const label = labels.map(tag => `⇠ ${tag}`).join(" ");
      this.drawLabel(label);
    } else {
      this.removeLabel();
    }
  }

  private drawLabel(label: string): void {
    const commitBbox = this.circle?.bbox();
    if (!commitBbox) {
      return;
    }
    if (this.label) {
      this.label.text(label);
    } else {
      this.label = this.draw.plain(label).font(LABEL_FONT);
    }
    this.label.move(
      commitBbox.x2 + LABEL_INDENT,
      commitBbox.cy - this.label.bbox().height / 2,
    );
  }

  private removeLabel(): void {
    this.label?.remove();
    this.label = null;
  }

  drawEdgeToParent(parent: SvgCommit, lineColor: string): void {
    const parentNode = parent.circle?.node;
    if (!parentNode) {
      return;
    }
    const path = SvgCommit.path(parent.coordinates, this.coordinates);
    path.stroke({ width: LINE_WIDTH, color: lineColor }).fill();
    parentNode.parentElement?.insertBefore(path.node, parentNode);
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
