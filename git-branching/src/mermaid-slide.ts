import mermaid from "mermaid";
import {Slide, enableMotion} from "./motion.js";
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

    visit(command: git.GitCommand) {
        this.last_command = command.command();
    }

    visitCommit(command: git.CommitCommand) {
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

    visitCheckout(command: git.CheckoutCommand) {
        if (command.create) {
            this.actions.push("branch " + command.branch);
        }
        this.actions.push("checkout " + command.branch);
    }

    visitBranch(command: git.BranchCommand) {
        this.actions.push("branch " + command.branch);
    }

    visitMerge(command: git.MergeCommand) {
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

export class MermaidSlide extends Slide {
    private readonly gitContainer: HTMLElement;
    private readonly code: HTMLElement;
    private readonly mermaidElement: HTMLElement;
    private readonly seed: string;
    private git: git.Git | undefined;
    
    constructor(section: HTMLElement) {
        super();
        this.seed = section.id;
        this.gitContainer = section.getElementsByClassName("git-container")[0] as HTMLElement;
        this.code = this.gitContainer.getElementsByTagName("code")[0] as HTMLElement;
        this.mermaidElement = this.gitContainer.getElementsByClassName("mermaid")[0] as HTMLElement;
    }

    onShowSlide() {
        this.gitContainer.style.display = "block";
        this.onResetSlide();
        enableMotion(this, this.onTransition.bind(this));
    }

    onHideSlide()  {
        this.gitContainer.style.display = "none";
    }

    protected record(_git: git.Git) {}

    onResetSlide() {
        this.code.innerHTML = "$ git checkout main";
        this.git = new git.Git(this.seed);
        this.git.singleStepMode = true;
        this.git.commit("Initial commit message");
        this.record(this.git);
        this.onTransition();
    }

    onTransition(): boolean {
        if (!this.git || !this.git.run()) {
            return false;
        }

        const visitor = new MermaidGitCommandVisitor(this.git.repo);
        this.git.commands.forEach(command => command.visit(visitor));

        const element = this.mermaidElement;
        if (visitor.last_command != null) {
            this.code.innerHTML += "<br />$ " + visitor.last_command;
        }
        const graphDefinition = visitor.graphDefinition();

        const drawDiagram = async function () {
            const { svg } = await mermaid.render("graphDiv", graphDefinition);
            element.innerHTML = svg;
        };

        drawDiagram().then(() => {});

        return true;
    }
}
