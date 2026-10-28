# `src`

TypeScript source codebase for interactive, animated Git presentations powered by [Reveal.js](https://revealjs.com) and [SVG.js](https://svgjs.dev).

## Subdirectories

- [`git/`](./git/README.md) - Simulated Git repository (`Repo`), commit model, command recorder (`GitRecorder`), and step playback (`GitPlayback`).
  - [`git/render/`](./git/render/README.md) - Graph layout calculation (`Layout`) and SVG rendering (`SvgGitRenderer`).
- [`slides/`](./slides/README.md) - Reveal.js slide lifecycle hooks (`Slide`, `addSlide`) and in-slide motion controls (`enableMotion`).
- [`util/`](./util/README.md) - SVG layout helpers (`Component`, `move`) and general utility functions (`failWith`).

---

## Top-Level Source Files

### [`svg-slide.ts`](./svg-slide.ts)

The central bridge that binds a simulated Git scenario to a Reveal.js slide presentation.

#### `class GitSvgSlide implements Slide`

Coordinates recording, SVG rendering, keyboard stepping, and terminal command display for a slide.

- **Static Method**:
  ```typescript
  static add(
    sectionId: string,
    config: Config,
    recorder: (git: GitRecorder) => void
  ): void
  ```
  Primary entry point for adding animated Git slides. Binds to an HTML section containing:
  - `.git-container`: Wrapper block for the interactive diagram.
  - `.git-diagram`: Container element where SVG elements are rendered.
  - `<code>`: Element where executed Git terminal commands (`$ git ...`) are printed.
- **Slide Lifecycle**:
  - `onShowSlide()`: Prepares the slide state, records operations, enables keyboard motion, and executes the initial step.
  - `onHideSlide()`: Hides container and resets playback state.
- **State & Disposal**:
  - Uses `DisposableStack` to cleanly dispose of SVG rendering nodes and event listeners when slides reset or unload.

---

### [`main.ts`](./main.ts)

Application entry point and slide deck definitions:

- Detects the active presentation deck from the `.reveal` DOM container ID (e.g., `git-branching`, `simple`).
- Defines presentation decks and configures interactive slides via `GitSvgSlide.add()`:
  - Basic branching and merging demos
  - Amending commits and revert workflows
  - Feature branches and origin tracking
  - Tagging and detached HEAD demonstration
- Initializes Reveal.js with plugins (Markdown), keyboard controls, and dimensions.
