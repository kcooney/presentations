import mermaid from "mermaid";
import {Slide, WithTransitions} from "./motion.js";
import * as git from "./git.js";

mermaid.initialize({ startOnLoad: false });

class MermaidGitCommandVisitor extends git.GitCommandVisitor {
    readonly actions: string[] = [];
    last_command: string | undefined;
    head: git.Commit;

    constructor(repo: git.Repo) {
        super();
        this.head = repo.head;
    }

    override visit(command: git.GitCommand) {
        this.last_command = command.command();
    }

    override visitCommit(command: git.CommitCommand) {
        const sha1 = command.commit();
        const id = command.msg ? command.msg : sha1;
        let action = 'commit id:"' + id + '"';
        if (this.head.sha1 == sha1) {
            action += " type:HIGHLIGHT";
        } else if (command.reverse) {
            action += " type:REVERSE";
        }
        this.actions.push(action);
    }

    override visitCheckout(command: git.CheckoutCommand) {
        if (command.create) {
            this.actions.push("branch " + command.branch);
        }
        this.actions.push("checkout " + command.branch);
    }

    override visitBranch(command: git.BranchCommand) {
        this.actions.push("branch " + command.branch);
    }

    override visitMerge(command: git.MergeCommand) {
        const sha1 = command.commit();
        let action = 'merge ' + command.branch + ' id: "' + sha1 + '"';
        if (this.head.sha1 == sha1) {
            action += ' type: HIGHLIGHT';
        }
        this.actions.push(action);
    }

    graphDefinition() {
        return ["gitGraph TB:"].concat(this.actions).join("\n   ") + "\n";
    }
}

export class MermaidSlide implements Slide, WithTransitions {
    private readonly gitContainer: HTMLElement;
    private readonly code: HTMLElement;
    private readonly mermaidElement: HTMLElement;
    private readonly seed: string;
    private git: git.Git
    
    constructor(section: HTMLElement) {
        this.seed = section.id;
        this.gitContainer = section.getElementsByClassName("git-container")[0] as HTMLElement;
        this.code = this.gitContainer.getElementsByTagName("code")[0] as HTMLElement;
        this.mermaidElement = this.gitContainer.getElementsByClassName("mermaid")[0] as HTMLElement;
        this.git = new git.Git(this.seed);
    }

    onShowSlide() {
        this.gitContainer.style.display = "block";
        this.resetSlide();
    }

    onHideSlide()  {
        this.gitContainer.style.display = "none";
    }

    protected record(_git: git.Git): void {}

    onResetSlide() {
        this.git = new git.Git(this.seed);
        this.resetSlide();
    }

    private resetSlide() {
        this.code.innerHTML = "$ git checkout main";
        this.git.singleStepMode = true;
        this.git.commit("Initial commit message");
        this.record(this.git);
        this.onTransition();
    }

    onTransition(): boolean {
        const hasMoreCommands = this.git.run();

        const visitor = new MermaidGitCommandVisitor(this.git.repo);
        this.git.commands.forEach(command => command.visit(visitor));

        const element = this.mermaidElement;
        if (visitor.last_command != null) {
            this.code.innerHTML += "<br />$ " + visitor.last_command;
        }
        const graphDefinition = visitor.graphDefinition();

        mermaid.render("graphDiv", graphDefinition)
            .then(renderResult => element.innerHTML = renderResult.svg)
            .catch(error => console.log('render', error));

        return hasMoreCommands;
    }
}
