import "@hazae41/disposable-stack-polyfill";
import { enableMotion } from "./slides/motion";
import { Slide, addSlide } from "./slides/slide";
import { GitPlayback, GitRecorder } from "./git/recorder";
import { Config, SvgGitRenderer } from "./git/render/svg-render";
import { failWith } from "./util/misc";

export class GitSvgSlide implements Slide {
  private readonly config: Config;
  private readonly gitContainer: HTMLElement;
  private readonly svgContainer: HTMLElement;
  private readonly code: HTMLElement;
  private readonly seed: string;
  private state;

  /**
   * Adds a SVG-based slide to the deck.
   *
   * @param sectionId DOM ID for the section element of the slide.
   * @param recorder Callback to call to get the set of commands to show on the slide.
   */
  static add(
    sectionId: string,
    config: Config,
    recorder: (git: GitRecorder) => void,
  ): void {
    addSlide(sectionId, section => {
      return new GitSvgSlide(section, config, recorder);
    });
  }

  private constructor(
    section: HTMLElement,
    config: Config,
    private readonly recorder: (git: GitRecorder) => void,
  ) {
    this.config = config;
    this.seed = section.id;
    this.gitContainer =
      section.querySelector(".git-container") ??
      failWith('No element with class "git-container"');
    this.svgContainer =
      section.querySelector(".git-diagram") ??
      failWith('No element with class "git-diagram"');
    this.code =
      this.gitContainer.querySelector("code") ??
      failWith(() => `No code inside ${this.gitContainer}`);
    this.state = new GitSvgSlide.State(this);
  }

  onShowSlide(): void {
    this.gitContainer.style.display = "block";
    this.prepareSlide();
    enableMotion(this.onTransition.bind(this));
    this.onTransition(-1);
  }

  onHideSlide(): void {
    this.gitContainer.style.display = "none";
    this.resetSlide();
  }

  private resetSlide(): void {
    this.state.dispose();
    this.state = new GitSvgSlide.State(this);
  }

  private prepareSlide(): void {
    this.state.record();
  }

  private onTransition(index: number): boolean {
    if (index === 0) {
      this.resetSlide();
      this.prepareSlide();
      return this.state.playInitial();
    }
    if (index === -1) {
      return this.state.playInitial();
    }
    return this.state.stepTransition();
  }

  static readonly State = class {
    private readonly disposableStack = new DisposableStack();
    private readonly git: GitRecorder;
    private playback: GitPlayback | null = null;
    private renderer: SvgGitRenderer | null = null;
    private _hasMoreCommands = true;

    constructor(private readonly slide: GitSvgSlide) {
      const config = slide.config;
      this.git = new GitRecorder(slide.seed, {
        singleStepMode: config.singleStepMode ?? true,
        printCommands: config.printCommands ?? true,
      });
    }

    record(): void {
      this.slide.recorder(this.git);
    }

    private initRenderer(): [GitPlayback, SvgGitRenderer] {
      let playback = this.playback;
      let renderer = this.renderer;
      if (!playback || !renderer) {
        playback = this.playback = this.git.replay();
        renderer = this.renderer = new SvgGitRenderer(
          this.slide.svgContainer,
          playback,
          this.slide.config,
        );
        renderer.render();
        this.disposableStack.defer(() => renderer?.dispose());
      }
      return [playback, renderer];
    }

    playInitial(): boolean {
      const [playback] = this.initRenderer();
      this._hasMoreCommands = playback.play();
      this.updateCode(playback.operations);
      return this._hasMoreCommands;
    }

    stepTransition(): boolean {
      const [playback, renderer] = this.initRenderer();
      if (!playback.hasMoreCommands) {
        return false;
      }

      const animate = this.slide.config.animate ?? true;
      if (animate) {
        renderer.startTransition();
      }
      this._hasMoreCommands = playback.play();
      this.updateCode(playback.operations);
      if (animate) {
        renderer.endTransition();
      }

      return this._hasMoreCommands;
    }

    play(): void {
      this.stepTransition();
    }

    private updateCode(
      operations: ReadonlyArray<{ command: string | null }>,
    ): void {
      const commands = operations
        .map(command => command.command)
        .filter(command => command !== null);
      this.slide.code.innerHTML = "$ " + commands.join("<br />$ ");
    }

    get hasMoreCommands(): boolean {
      return this._hasMoreCommands;
    }

    dispose(): void {
      this.disposableStack.dispose();
    }
  };
}
