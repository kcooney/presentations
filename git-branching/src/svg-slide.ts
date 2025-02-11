import { enableMotion } from "./motion.js";
import { Slide, addSlide } from "./slide.js";
import { GitRecorder } from "./git-recorder.js";
import { Config, SvgGitRenderer } from "./svg-render.js";
import { failWith } from "./util.js";

export class GitSvgSlide implements Slide {
  private readonly gitContainer: HTMLElement;
  private readonly svgContainer: HTMLElement;
  private readonly code: HTMLElement;
  private readonly seed: string;
  private readonly renderer;
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
      return new (class extends GitSvgSlide {
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
    this.code =
      this.gitContainer.querySelector("code") ??
      failWith(() => `No code inside ${this.gitContainer}`);
    this.git = new GitRecorder(this.seed);
    this.renderer = new SvgGitRenderer(this.svgContainer, this.git, config);
  }

  onShowSlide() {
    this.gitContainer.style.display = "block";
    this.resetSlide();
    enableMotion(this.onTransition.bind(this));
    this.onTransition(-1);
  }

  onHideSlide() {
    this.gitContainer.style.display = "none";
    this.git = new GitRecorder(this.seed);
    this.renderer.reset(this.git);
  }

  protected record(_git: GitRecorder): void {}

  private resetSlide() {
    this.renderer.reset(this.git);
    this.git.singleStepMode = true;
    this.git.checkout("main");
    this.record(this.git);
  }

  private onTransition(index: number): boolean {
    if (index === 0) {
      this.git = new GitRecorder(this.seed);
      this.resetSlide();
    }

    const hasMoreCommands = this.git.replay();
    this.renderer.render();

    const commands = this.git.operations
      .map(command => command.command)
      .filter(command => command !== null);
    this.code.innerHTML = "$ " + commands.join("<br />$ ");
    return hasMoreCommands;
  }
}
