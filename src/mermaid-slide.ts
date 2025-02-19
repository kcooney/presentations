import mermaid from "mermaid";
import { enableMotion } from "./motion.js";
import { Slide, addSlide } from "./slide.js";
import { Commit, Repo } from "./git.js";
import * as git from "./git-recorder.js";
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

class MermaidGitOperationVisitor extends git.GitOperationVisitor {
  readonly actions: Action[] = [];
  readonly commands: string[] = [];
  head: Commit;
  readonly taggableActions = new Map<string, TaggableAction>();

  constructor(repo: Repo) {
    super();
    this.head = repo.head;
  }

  override visit(op: git.GitOperation) {
    if (op.command) {
      this.commands.push(op.command);
    }
  }

  override visitCommit(op: git.CommitOperation) {
    const sha1 = op.sha1;
    const id = op.msg ? op.msg : sha1;
    let line = `commit id:"${id}"`;
    if (this.head.sha1 == sha1) {
      line += " type:HIGHLIGHT";
    } else if (op.reverse) {
      line += " type:REVERSE";
    }
    const action = new TaggableAction(line);
    this.taggableActions.set(op.sha1, action);
    this.actions.push(action);
  }

  override visitTag(op: git.TagOperation): void {
    this.taggableActions.get(op.sha1)?.setTag(op.tagName);
  }

  override visitCheckout(op: git.CheckoutOperation) {
    if (!op.detachedHead()) {
      if (op.createBranch) {
        this.actions.push(new Action("branch " + op.branch));
      }
      this.actions.push(new Action("checkout " + op.branch));
    }
  }

  override visitBranch(op: git.BranchOperation) {
    this.actions.push(new Action("branch " + op.branch));
  }

  override visitMerge(op: git.MergeOperation) {
    const sha1 = op.sha1;
    let line = `merge ${op.ref} id: "${sha1}"`;
    if (this.head.sha1 == sha1) {
      line += " type: HIGHLIGHT";
    }
    const action = new TaggableAction(line);
    this.taggableActions.set(op.sha1, action);
    this.actions.push(action);
  }

  graphDefinition() {
    const lines = this.actions.map(action => action.line());
    return ["gitGraph TB:"].concat(lines).join("\n   ") + "\n";
  }
}

export class MermaidGitSlide implements Slide {
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
  static add(
    sectionId: string,
    recorder: (git: git.GitRecorder) => void,
  ): void {
    addSlide(sectionId, section => {
      return new (class extends MermaidGitSlide {
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
    const hasMoreOperations = this.git.replay();

    const visitor = new MermaidGitOperationVisitor(this.git.repo);
    this.git.operations.forEach(op => op.visit(visitor));

    const element = this.mermaidElement;
    this.code.innerHTML = "$ " + visitor.commands.join("<br />$ ");
    const graphDefinition = visitor.graphDefinition();

    mermaid
      .render("graphDiv", graphDefinition)
      .then(renderResult => (element.innerHTML = renderResult.svg))
      .catch(error => console.log("render error: %s", error));

    return hasMoreOperations;
  }
}
