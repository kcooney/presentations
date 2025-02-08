import mermaid from "mermaid";
import { enableMotion } from "./motion.js";
import { Slide, addSlide } from "./slide.js";
import * as git from "./git.js";
import { failWith } from "./util.js";

mermaid.initialize({ startOnLoad: false });

class Action {
  constructor(private readonly action: string) {}

  line(): string {
    return this.action;
  }
}

class TaggableAction extends Action {
  private tag: string | null = null;

  setTag(tagName: string) {
    this.tag = tagName;
  }

  override line(): string {
    let action = super.line();
    if (this.tag) {
      action += ` tag: "${this.tag}"`;
    }
    return action;
  }
}

class MermaidGitCommandVisitor extends git.GitCommandVisitor {
  readonly actions: Action[] = [];
  readonly commands: string[] = [];
  head: git.Commit;
  readonly taggableActions = new Map<string, TaggableAction>();

  constructor(repo: git.Repo) {
    super();
    this.head = repo.head;
  }

  override visit(command: git.GitCommand) {
    if (command.command) {
      this.commands.push(command.command);
    }
  }

  override visitCommit(command: git.CommitCommand) {
    const sha1 = command.sha1;
    const id = command.msg ? command.msg : sha1;
    let line = `commit id:"${id}"`;
    if (this.head.sha1 == sha1) {
      line += " type:HIGHLIGHT";
    } else if (command.reverse) {
      line += " type:REVERSE";
    }
    const action = new TaggableAction(line);
    this.taggableActions.set(command.sha1, action);
    this.actions.push(action);
  }

  override visitTag(command: git.TagCommand): void {
    this.taggableActions.get(command.sha1)?.setTag(command.tagName);
  }

  override visitCheckout(command: git.CheckoutCommand) {
    if (!command.detachedHead()) {
      if (command.createBranch) {
        this.actions.push(new Action("branch " + command.branch));
      }
      this.actions.push(new Action("checkout " + command.branch));
    }
  }

  override visitBranch(command: git.BranchCommand) {
    this.actions.push(new Action("branch " + command.branch));
  }

  override visitMerge(command: git.MergeCommand) {
    const sha1 = command.sha1;
    let line = `merge ${command.branch} id: "${sha1}"`;
    if (this.head.sha1 == sha1) {
      line += " type: HIGHLIGHT";
    }
    const action = new TaggableAction(line);
    this.taggableActions.set(command.sha1, action);
    this.actions.push(action);
  }

  graphDefinition() {
    const lines = this.actions.map(action => action.line());
    return ["gitGraph TB:"].concat(lines).join("\n   ") + "\n";
  }
}

export class MermaidSlide implements Slide {
  private readonly gitContainer: HTMLElement;
  private readonly code: HTMLElement;
  private readonly mermaidElement: HTMLElement;
  private readonly seed: string;
  private git: git.GitRecorder;

  /**
   * Adds a Mermaid-based slide to the deck.
   *
   * @param sectionId DOM ID for the section element of the slide.
   * @param recorder Callback to call to get the set of commands to show on the slide.
   */
  static add(sectionId: string, recorder: (git: git.GitRecorder) => void): void {
    addSlide(sectionId, section => {
      return new (class extends MermaidSlide {
        protected override record(git: git.GitRecorder): void {
          recorder(git);
        }
      })(section);
    });
  }

  private constructor(section: HTMLElement) {
    this.seed = section.id;
    this.gitContainer =
      section.querySelector(".git-container") ??
      failWith(
        () => `No element with class "git-container" inside ${section.id}`,
      );
    this.code =
      section.querySelector("code") ??
      failWith(() => `No "code" element inside ${section.id}`);
    this.mermaidElement =
      section.querySelector(".git-diagram") ??
      failWith(
        () => `No element with class "git-diagram" inside ${section.id}`,
      );
    this.mermaidElement.classList.add("mermaid");
    this.git = new git.GitRecorder(this.seed);
  }

  onShowSlide() {
    this.gitContainer.style.display = "block";
    this.resetSlide();
    enableMotion(this.onTransition.bind(this));
    this.onTransition(-1);
  }

  onHideSlide() {
    this.gitContainer.style.display = "none";
    this.git = new git.GitRecorder(this.seed);
  }

  protected record(_git: git.GitRecorder): void {}

  private resetSlide() {
    this.git.checkout("main");
    this.git.singleStepMode = true;
    this.git.commit({ msg: "Initial commit message" });
    this.record(this.git);
  }

  private onTransition(index: number): boolean {
    if (index === 0) {
      this.git = new git.GitRecorder(this.seed);
      this.resetSlide();
    }
    const hasMoreCommands = this.git.replay();

    const visitor = new MermaidGitCommandVisitor(this.git.repo);
    this.git.commands.forEach(command => command.visit(visitor));

    const element = this.mermaidElement;
    this.code.innerHTML = "$ " + visitor.commands.join("<br />$ ");
    const graphDefinition = visitor.graphDefinition();

    mermaid
      .render("graphDiv", graphDefinition)
      .then(renderResult => (element.innerHTML = renderResult.svg))
      .catch(error => console.log("render error: %s", error));

    return hasMoreCommands;
  }
}
