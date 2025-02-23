import * as svgjs from "@svgdotjs/svg.js";
import { Commit, ReadonlyRepo, Repo } from "../repo";
import { Layout, Position } from "./layout";
import { GitPlayback } from "../recorder";
import * as svg from "../../util/svg";

const LEFT_MARGIN = 2;
const RIGHT_MARGIN = 2;
const TOP_MARGIN = 4;
const HORIZONTAL_EXTRA_TOP_MARGIN = 10;
const BOTTOM_MARGIN = 4;
const SPACE_BETWEEN_COMMITS = 60;
const SPACE_BETWEEN_BRANCHES = 50;
const LINE_WIDTH = 8;
const COMMIT_RADIUS = 11;
const LABEL_INDENT = 8;
const TEXT_INDENT = 188;
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

export interface ReadonlyXY {
  readonly x: number;
  readonly y: number;
}

const COMMIT_FONT: Font = {
  family: "Arial",
  size: "14pt",
};

const LABEL_FONT: Font = {
  family: "Arial",
  size: "12pt",
};

const BRANCH_FONT: Font = {
  family: "Arial",
  size: "12pt",
  weight: "normal",
};
const CURRENT_BRANCH_FONT: Font = { ...BRANCH_FONT, weight: "bold" };

const COLORS = ["#0000ec", "#dede00", "purple"];

function getColor(position: Position): string {
  return COLORS[position.j % COLORS.length] || "";
}

interface BranchLabelStyle {
  borderRadius: number;
  bgColor: string;
  strokeColor?: string;
  textPadding: ReadonlyXY;
  margin: number;
}

interface BranchStyle {
  label: BranchLabelStyle;
}

interface CommitMsgStyle {
  margin: number;
}

interface CommitStyle {
  msg: CommitMsgStyle;
}

/** ConfigOptions contains all configuration needed to render. */
interface ConfigOptions {
  readonly branch: BranchStyle;
  readonly commit: CommitStyle;
  readonly singleStepMode: boolean; // defaults to true
  readonly printCommands: boolean; // defaults to true
  readonly showHead: boolean; // defaults to false
  readonly horizontal: boolean; // defaults to false
  readonly showCommitSha1s: boolean; // defaults to false
  readonly showCommitMsgs: boolean; // defaults to false
  readonly showCommitTags: boolean; // defaults to false
  readonly showBranchNames: boolean; // defaults to false
}

/** Config contains all possible configuration values; all fields are optional. */
export type Config = Partial<ConfigOptions>;

/** Default values for all configuration options. */
const DEFAULTS: ConfigOptions = {
  horizontal: false,
  commit: {
    msg: {
      margin: 6,
    },
  },
  branch: {
    label: {
      borderRadius: 10,
      bgColor: "White",
      textPadding: { x: 10, y: 5 },
      margin: 3,
    },
  },
  showHead: false,
  showCommitSha1s: false,
  showCommitMsgs: false,
  showCommitTags: false,
  showBranchNames: false,
  singleStepMode: true,
  printCommands: true,
};
const HORIZONTAL_CONFIG_DEFAULTS: Config = {
  showHead: false,
  showCommitSha1s: false,
  showCommitMsgs: false,
  showCommitTags: false,
  showBranchNames: false,
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
  showBranchNames: true,
};

export interface Point extends ReadonlyXY {
  readonly color: string;
}

/** Handles all logic for mapping Location to coordinates. */
class Rendering {
  private readonly horizontal: boolean;
  readonly canvasSize: ReadonlyXY;
  readonly textAnchorX: number;

  constructor(
    private readonly layout: Layout,
    options: ConfigOptions,
  ) {
    this.horizontal = options.horizontal;
    this.canvasSize = Rendering.toXY(
      { i: layout.maxI, j: layout.maxJ },
      this.horizontal,
    );
    this.textAnchorX =
      this.canvasSize.x + COMMIT_RADIUS + TEXT_INDENT + LABEL_INDENT;
  }

  getPosition(commit: Commit): Position | undefined {
    return this.layout.getPosition(commit);
  }

  toXY(position: Position): ReadonlyXY {
    return Rendering.toXY(position, this.horizontal);
  }

  private static toXY(position: Position, horizonal: boolean): ReadonlyXY {
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

class Layers {
  readonly commit: svgjs.G;
  readonly branchLabel: svgjs.G;

  constructor(draw: svgjs.Svg) {
    this.commit = draw.group();
    this.branchLabel = draw.group();
  }
}

export class SvgGitRenderer {
  private readonly drawnCommits = new Map<string, SvgCommit>();
  private readonly branchLabels = new Map<string, SvgBranchLabel>();
  private rendering: Rendering | null = null;
  private readonly repo: ReadonlyRepo;
  private readonly layoutRepo: ReadonlyRepo;
  private readonly options: ConfigOptions;
  private readonly draw: svgjs.Svg;
  private readonly layers: Layers;

  constructor(
    container: HTMLElement,
    graph: Repo | GitPlayback,
    config: Config = {},
  ) {
    if (graph instanceof GitPlayback) {
      this.repo = graph.repo;
      this.layoutRepo = graph.recordRepo;
    } else {
      this.layoutRepo = this.repo = graph;
    }
    container.classList.add("svg-git");
    const defaults = config.horizontal
      ? HORIZONTAL_CONFIG_DEFAULTS
      : VERTICAL_CONFIG_DEFAULTS;
    const overrides = config.horizontal ? HORIZONTAL_CONFIG_OVERRIDES : {};
    this.options = { ...DEFAULTS, ...defaults, ...config, ...overrides };
    this.draw = svgjs.SVG();
    this.draw.addTo(container);
    this.layers = new Layers(this.draw);
  }

  dispose() {
    if (this.draw.node.parentNode) {
      this.draw.node.textContent = "";
      this.draw.remove();
    }
  }

  render() {
    if (this.rendering) {
      return;
    }
    const rendering = this.prerender();
    for (const commit of this.repo.commits) {
      this.commitCreated(commit, rendering);
    }
    if (this.layoutRepo !== this.repo) {
      this.repo.onCommitCreated(commit =>
        this.commitCreated(commit, rendering),
      );
      this.repo.onCommitRefsUpdated(this.commitRefsUpdated.bind(this));
    }
  }

  private commitCreated(commit: Commit, rendering: Rendering) {
    if (this.drawnCommits.has(commit.sha1)) {
      console.log("Commit created twice for '%s'", commit.sha1);
      return;
    }

    const position = rendering.getPosition(commit);
    if (!position) {
      console.log("Could not find position for '%s'", commit.sha1);
    } else {
      const coordinates = rendering.toXY(position);
      const color = getColor(position);
      const svgCommit = new SvgCommit(
        this.layers,
        this.options,
        coordinates,
        color,
        commit,
        rendering,
      );
      this.drawnCommits.set(commit.sha1, svgCommit);

      // Color of the line to the first parent commit is the same as this commit.
      // Color of the line to the other parents are the color of the parent.
      commit.parents.forEach((parentCommit, index) => {
        const parentSvgCommit = this.drawnCommits.get(parentCommit.sha1);
        if (parentSvgCommit) {
          const lineColor = index == 0 ? color : parentSvgCommit.color;
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

    const branchLabels: SvgBranchLabel[] = [];
    if (this.options.showBranchNames) {
      const curBranch = this.repo.currentBranch;
      for (const [branch, tip] of this.repo.branches) {
        if (tip === commit) {
          let branchLabel = this.branchLabels.get(branch);
          if (!branchLabel) {
            branchLabel = new SvgBranchLabel(
              this.layers,
              this.options.branch.label,
              {
                branchName: branch,
                color: svgCommit.color,
              },
            );
            this.branchLabels.set(branch, branchLabel);
          }
          branchLabel.setIsCurrent(branch === curBranch);
          branchLabels.push(branchLabel);
        }
      }
    }
    const head = this.options.showHead ? this.repo.head : null;
    svgCommit.drawRefs(head, branchLabels);
  }

  private prerender(): Rendering {
    if (this.rendering) {
      return this.rendering;
    }

    const layout = Layout.create(this.layoutRepo);
    const rendering = new Rendering(layout, this.options);
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
  public readonly color: string;
  private readonly coordinates: ReadonlyXY;
  private readonly textAnchorX: number;
  private readonly circle: svgjs.Circle;
  private readonly description: SvgCommitText | null = null;
  private readonly message;
  private svgRefs: SvgCommitText | null = null;

  constructor(
    private readonly layers: Layers,
    private readonly options: ConfigOptions,
    coordinates: ReadonlyXY,
    color: string,
    private readonly commit: Commit,
    rendering: Rendering,
  ) {
    this.textAnchorX = rendering.textAnchorX;
    this.message =
      options.showCommitMsgs && commit.msg
        ? `${commit.sha1} ${commit.msg}`
        : commit.sha1;
    this.coordinates = coordinates;
    this.color = color;

    this.circle = this.layers.commit.circle(COMMIT_RADIUS * 2);
    this.circle.node.classList.add("commit");
    this.circle.center(this.coordinates.x, this.coordinates.y).fill(this.color);

    if (options.showCommitSha1s || options.showCommitMsgs) {
      let msg = this.message;
      if (this.options.showCommitTags && this.commit.tags.length) {
        msg = " ⇠ " + this.commit.tags.join(" ⇠ ") + msg;
      }
      this.description = new SvgCommitText(
        this.layers,
        this.options.commit,
        msg,
      );
      this.description.element.font(COMMIT_FONT);
      this.description.move({
        x: rendering.textAnchorX,
        cy: this.coordinates.y,
      });
    } else {
      this.circle.element("title").words(this.message); // Add hover text
    }
  }

  drawEdgeToParent(parent: SvgCommit, lineColor: string): void {
    const parentNode = parent.circle.node;
    const path = SvgCommit.path(parent.coordinates, this.coordinates);
    path.stroke({ width: LINE_WIDTH, color: lineColor }).fill();
    parentNode.parentElement?.insertBefore(path.node, parentNode);
  }

  drawRefs(head: Commit | null, branchLabels: SvgBranchLabel[]) {
    let refs: string[] = [];
    if (this.options.showCommitTags && this.commit.tags.length) {
      if (this.description) {
        const msg = this.message + " ⇠ " + this.commit.tags.join(" ⇠ ");
        this.description.element.text(msg);
      } else {
        refs.concat(this.commit.tags);
      }
    }

    const elements: svg.Component<svgjs.Element>[] = [];

    if (this.options.showBranchNames) {
      elements.push(...branchLabels);
    }
    if (this.commit === head) {
      refs = refs.concat(["HEAD"]);
    }

    if (refs.length) {
      // For vertical graphs (move the refs down so they are below the commands)
      const refText = refs.map(tag => `⇠ ${tag}`).join(" ");
      elements.push(this.makeSvgRefs(refText));
    } else {
      this.removeSvgRefs();
    }

    const commitBbox = this.circle.bbox();
    let x = this.options.horizontal
      ? commitBbox.x2 + LABEL_INDENT
      : this.textAnchorX;
    const cy = commitBbox.cy;

    if (this.description) {
      elements.push(this.description);
    }

    for (const [index, component] of elements.entries()) {
      if (index > 0) {
        x += component.margin;
      }
      component.move({ x: x, cy: cy });
      x += svg.roundPixels(component.width + component.margin);
    }
  }

  private makeSvgRefs(text: string) {
    if (this.svgRefs) {
      this.svgRefs.element.text(text);
    } else {
      this.svgRefs = new SvgCommitText(this.layers, this.options.commit, text);
      this.svgRefs.element.font(LABEL_FONT);
    }
    return this.svgRefs;
  }

  private removeSvgRefs(): void {
    this.svgRefs?.element.remove();
    this.svgRefs = null;
  }

  private static path(start: ReadonlyXY, end: ReadonlyXY): svgjs.Shape {
    if (start.x === end.x) {
      return new svgjs.Line({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    }
    if (end.x > start.x && end.y > start.y) {
      return new svgjs.Path({
        d: `M${start.x},${start.y} C${end.x},${start.y} ${end.x},${start.y} ${end.x},${end.y}`,
      }).fill("none");
    }
    return new svgjs.Path({
      d: `M${start.x},${start.y} C${start.x},${end.y} ${end.x},${start.y} ${end.x},${end.y}`,
    }).fill("none");
  }
}

class SvgCommitText extends svg.Component<svgjs.Text> {
  constructor(layers: Layers, style: CommitStyle, text: string) {
    super(layers.commit.plain(text), { margin: style.msg.margin });
  }
}

class SvgBranchLabel extends svg.Component<svgjs.G> {
  readonly branchName: string;
  private readonly text: svgjs.Text;
  private readonly rect: svgjs.Rect;
  private isCurrent = false;

  constructor(
    layers: Layers,
    private readonly style: BranchLabelStyle,
    { color, branchName }: { color: string; branchName: string },
  ) {
    super(layers.branchLabel.group(), { margin: style.margin });
    this.branchName = branchName;

    const padding = style.textPadding;
    const text = new svgjs.Text().plain(branchName);
    text.font(BRANCH_FONT);
    text.move(padding.x, padding.y);
    this.text = text;

    const rect = new svgjs.Rect();
    rect.attr("stroke", style.strokeColor ?? color);
    rect.fill(style.bgColor);
    rect.radius(style.borderRadius);
    this.rect = rect;
    this.resize();

    this.element.add(rect).add(text);
  }

  private resize() {
    const { height, width } = this.text.bbox();
    const padding = this.style.textPadding;
    const rectHeight = svg.roundPixels(height + 2 * padding.y, { up: true });
    const rectWidth = svg.roundPixels(width + 2 * padding.x, { up: true });
    this.rect.size(rectWidth, rectHeight);
  }

  setIsCurrent(value: boolean) {
    if (value != this.isCurrent) {
      this.isCurrent = value;
      this.text.font(value ? CURRENT_BRANCH_FONT : BRANCH_FONT);
      this.resize();
    }
  }
}
