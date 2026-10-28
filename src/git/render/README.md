# `src/git/render`

Commit graph layout computation and SVG rendering for simulated Git repositories.

## Files

- [`layout.ts`](./layout.ts) - 2D grid positioning algorithm for commits based on topological sort and branch ordering.
- [`svg-render.ts`](./svg-render.ts) - SVG renderer visualizing commits, branches, tags, HEAD, and connecting curves.

---

## Major Interfaces & Classes

### `interface Position`

Discrete 2D grid coordinates for a commit in the graph.

```typescript
export interface Position {
  readonly i: number; // Time index from temporal topological sort (0 to maxI)
  readonly j: number; // Lane/branch index (0 for primary branch, increasing for forks)
}
```

### `class Layout`

Calculates and caches the 2D layout coordinates for all commits in a repository. Inspired by [Commit Graph Drawing Algorithms](https://pvigier.github.io/2019/05/06/commit-graph-drawing-algorithms.html).

- **Static Methods**:
  - `Layout.create(repo: ReadonlyRepo, branchOrder?: ReadonlyArray<string>): Layout`: Performs a temporal topological walk to assign `i` coordinates and assigns `j` coordinates tracking active branches, prioritizing `branchOrder` (or `main`).
- **Properties**:
  - `maxI: number`: Maximum time coordinate index.
  - `maxJ: number`: Maximum lane index.
- **Methods**:
  - `getPosition(commit: Commit): Position | undefined`: Looks up the computed `Position` for a commit.

---

### `type Config`

Configuration options customizing graph appearance and behavior:

- `horizontal?: boolean`: If `true`, renders horizontally (left-to-right) instead of vertically (top-to-bottom).
- `showHead?: boolean`: Displays the `HEAD` reference pointer.
- `showCommitSha1s?: boolean`: Shows commit SHA-1 identifiers.
- `showCommitMsgs?: boolean`: Shows commit log messages.
- `showCommitTags?: boolean`: Displays commit tags (`⇠ tag`).
- `showBranchNames?: boolean`: Displays branch labels at the tips of branches.
- `branchOrder?: ReadonlyArray<string>`: Desired lane ordering for branches.
- `singleStepMode?: boolean`: Default `true`.
- `printCommands?: boolean`: Default `true`.
- `animate?: boolean`: Whether step transitions fade in changes to the SVG DOM (default `false`).
- `animationDelay?: number`: Delay in milliseconds before SVG DOM changes fade in after text is revealed (default `300`).
- `animationDuration?: number`: Duration in milliseconds of the SVG DOM fade-in animation (default `500`).
- `branch?: BranchStyle`: Styling options for branch badges (colors, padding, border radius, margins).
- `commit?: CommitStyle`: Styling options for commit messages and margins.

---

### `class SvgGitRenderer`

Main rendering engine built on [SVG.js](https://svgjs.dev). Renders the commit graph and reactively updates when replaying recorded Git commands.

- **Constructor**:
  - `constructor(container: HTMLElement, graph: Repo | GitPlayback, config: Config = {})`
  - Accepts a DOM container element, a `Repo` or `GitPlayback` instance, and optional `Config`.
- **Methods**:
  - `render(): void`: Generates layout coordinates via `Layout.create()`, sizes the SVG canvas, draws initial commits/edges/labels, and subscribes to repo events (`commitCreated`, `commitRefsUpdated`) for dynamic playback animation.
  - `dispose(): void`: Cleans up SVG elements and DOM nodes when slide transitions away.

---

### Supporting Interfaces & Types

- `ReadonlyXY`: 2D point `{ readonly x: number; readonly y: number; }`.
- `Point`: Extends `ReadonlyXY` with `readonly color: string`.
- Internal helper classes:
  - `Rendering`: Converts discrete `Position` indices (`i`, `j`) into absolute SVG pixel coordinates.
  - `Layers`: Manages SVG group layers for commit elements and branch labels.
  - `SvgCommit`: Encapsulates SVG circle, edge lines/curves to parent commits, and text annotations.
  - `SvgBranchLabel`: Encapsulates styled badges for branch references, highlighting the currently checked-out branch.
