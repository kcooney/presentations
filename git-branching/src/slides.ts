import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import {Git} from "./git.js";
import {GraphologySlide} from "./graphology-slide.js";
import {MermaidSlide} from './mermaid-slide.js';

function addSlide(sectionId: string, recorder: (git: Git) => void): void {
    MermaidSlide.add(sectionId, recorder);
}

MermaidSlide.add("mermaid-demo-slide", (git) => {
    git.commit().checkout("develop", {createBranch: true}).commit();
    git.singleStepMode = false;
    git.commit().commit().pause();
    git.checkout("main").pause();
    git.merge("develop").pause();
    git.commit().pause()
    git.commit();
});

GraphologySlide.add("graphology-demo-slide", {showHead: true}, (git) => {
    git.commit().checkout("develop", {createBranch: true}).commit();
    git.singleStepMode = false;
    git.commit().commit().pause();
    git.tag("origin/develop").pause();
    git.checkout("main").pause();
    git.merge("develop").pause();
    git.commit().pause()
    git.commit();
});

addSlide("committing-slide", git => {
    git.commit({msg: "Add shooter"}).commit({msg: "Shoot faster"});
    git.commit({msg: "Revert shoot faster", reverse:true});
    git.commit({msg: "Use gyro"});
});

addSlide("branches-slide", git => {
    git.commit({msg: "Add shooter"}).commit({msg: "Shoot faster"});
    git.checkout("chicken/on-the-bus", {createBranch: true}).commit({msg: "Add drive subsystem"});

    git.singleStepMode = false;
    git.printCommands = false;
    git.checkout("main").commit({msg: "Add intake"});
    git.checkout("chicken/on-the-bus").pause()
    git.printCommands = true;
    git.commit({msg: "Let me drive the bus!"}).commit({msg: "Fix shooter angle"}).pause();
});

addSlide("tagging-slide", git => {
    git.commit({msg: "Add shooter"});
    git.tag("v1.0");
    git.commit({msg: "Shoot faster"});
});

addSlide("head-slide", git => {
    git.commit({msg: "Add shooter"});
    const addShooterCommit = git.repo.head.sha1;
    git.commit({msg: "Shoot faster"});
    git.singleStepMode = false;
    git.checkout("chicken/on-the-bus", {createBranch: true}).commit({msg: "Add drive subsystem"}).pause();
    git.printCommands = false;
    git.checkout("main").commit({msg: "Add intake"}).checkout("chicken/on-the-bus").pause();
    git.printCommands = true;
    git.singleStepMode = true;
    git.checkout(addShooterCommit).checkout("monkey/bug-fix", {createBranch: true}).commit({msg: "Fix shooter angle"});
    git.commit({msg: "One more fix"});
});

Reveal.initialize({
    plugins: [ Markdown ],
    width: 1160,
    center: false,
    keyboard: true,
    showHiddenSlides: true,
    markdown: {},
});
