import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import {addSlide} from "./motion.js";
import {Git} from "./git.js";
import {GraphologySlide} from "./graphology-slide.js";
import {MermaidSlide} from './mermaid-slide.js';

class CommittingSlide extends MermaidSlide {
    count = 0;

    override record(git: Git): void {
        git.commit({msg: "Add shooter"}).commit({msg: "Shoot faster"});
        git.commit({msg: "Revert shoot faster", reverse:true});
        git.commit({msg: "Use gyro"});
    }
}

class MermaidDemoSlide extends MermaidSlide {

    override record(git: Git): void {
        git.commit().checkout("develop", true).commit();
        git.singleStepMode = false;
        git.commit().commit().pause();
        git.checkout("main").pause();
        git.merge("develop").pause();
        git.commit().pause()
        git.commit();
    }
}

class BranchesSlide extends MermaidSlide {

    override record(git: Git): void {
        git.commit({msg: "Add shooter"}).commit({msg: "Shoot faster"});
        git.checkout("chicken/on-the-bus", true).commit({msg: "Add drive subsystem"});

        git.singleStepMode = false;
        git.printCommands = false;
        git.checkout("main").commit({msg: "Add intake"});
        git.checkout("chicken/on-the-bus").pause()
        git.printCommands = true;
        git.commit({msg: "Let me drive the bus!"}).commit({msg: "Fix shooter angle"}).pause();
    }
}

class TaggingSlide extends MermaidSlide {

    override record(git: Git): void {
        git.commit({msg: "Add shooter"});
        git.tag("v1.0");
        git.commit({msg: "Shoot faster"});
    }
}

class HeadSlide extends MermaidSlide {

    override record(git: Git): void {
        git.commit({msg: "Add shooter"});
        const addShooterCommit = git.repo.head.sha1;
        git.commit({msg: "Shoot faster"});
        git.singleStepMode = false;
        git.checkout("chicken/on-the-bus", true).commit({msg: "Add drive subsystem"}).pause();
        git.printCommands = false;
        git.checkout("main").commit({msg: "Add intake"}).checkout("chicken/on-the-bus").pause();
        git.printCommands = true;
        git.singleStepMode = true;
        git.checkout(addShooterCommit).checkout("monkey/bug-fix", true).commit({msg: "Fix shooter angle"});
        git.commit({msg: "One more fix"});

    }
}

addSlide("mermaid-slide", (section) => new MermaidDemoSlide(section));
addSlide("graphology-slide", (section) => new GraphologySlide(section));
addSlide("committing-slide", (section) => new CommittingSlide(section));
addSlide("branches-slide", (section) => new BranchesSlide(section));
addSlide("tagging-slide", (section) => new TaggingSlide(section));
addSlide("head-slide", (section) => new HeadSlide(section));


Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: true,
    markdown: {
    },
});
