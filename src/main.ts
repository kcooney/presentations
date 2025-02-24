import Reveal from "reveal.js";
import Markdown from "reveal.js/plugin/markdown/markdown.esm.js";
import { PRIMARY_BRANCH } from "./git/repo";
import { GitRecorder } from "./git/recorder";
import { GitSvgSlide } from "./svg-slide";

function simpleDesk() {
  Reveal.initialize({
    plugins: [Markdown /*, RevealMenu*/],
    width: 1160,
    center: false,
    keyboard: true,
    markdown: {},
    // menu: {
    //    path: "reveal.js-menu/"
    // }
  });
}

function gitBranchingDesk() {
  function svgDemoRecorder(git: GitRecorder) {
    git.commit().checkout("develop", { createBranch: true }).commit();
    git.singleStepMode = false;
    git.commit();
    // added below
    git
      .commit()
      .checkout("deploy", { createBranch: true })
      .commit({ msg: "deploy to dev" });
    git.checkout("develop");
    // added above
    git.commit().pause();
    git.tag("origin/develop").pause();
    git.checkout(PRIMARY_BRANCH).pause();
    git.merge("develop").pause();
    git.commit({ msg: "fix buil" }).pause();
    git.commit({ msg: "fix build", amend: true });
  }

  GitSvgSlide.add(
    "svg-demo-slide",
    { showHead: true, showCommitTags: true },
    svgDemoRecorder,
  );

  GitSvgSlide.add(
    "svg-horizontal-demo-slide",
    { showHead: true, horizontal: true, showBranchNames: true },
    svgDemoRecorder,
  );

  GitSvgSlide.add(
    "committing-slide",
    { showHead: false, showBranchNames: false },
    git => {
      git.commit({ msg: "Add shooter" }).commit({ msg: "Shoot faster" });
    },
  );

  GitSvgSlide.add(
    "reverting-and-amending-slide",
    {
      showHead: false,
      showBranchNames: false,
      singleStepMode: false,
      printCommands: false,
    },
    git => {
      git.singleStepMode = true;
      git.commit({ msg: "Add shooter" });
      git.printCommands = true;
      git.commit({ msg: "Shoot faster" });
      git.revert();
      git.commit({ msg: "Use giro" });
      git.commit({ msg: "Use gyro", amend: true });
    },
  );

  GitSvgSlide.add("branches-slide", { showBranchNames: true }, git => {
    git.commit({ msg: "Add shooter" }).commit({ msg: "Shoot faster" });
    git
      .checkout("chicken/on-the-bus", { createBranch: true })
      .commit({ msg: "Add drive subsystem" });
    git
      .commit({ msg: "Let me drive the bus!" })
      .commit({ msg: "Fix shooter angle" });

    // Simulate someone else commiting on 'main'
    git.singleStepMode = false;
    git.printCommands = false;
    git.checkout(PRIMARY_BRANCH).commit({ msg: "Add climb" });
  });

  GitSvgSlide.add("tagging-slide", { showCommitTags: true }, git => {
    git.commit({ msg: "Add shooter" });
    git.tag("v1.0");
    git.commit({ msg: "Shoot faster" });
  });

  GitSvgSlide.add(
    "head-slide",
    { showHead: true, branchOrder: [PRIMARY_BRANCH, "drive"] },
    git => {
      git.commit({ msg: "Add shooter" });
      const addShooterCommit = git.head.sha1;
      git.commit({ msg: "Shoot faster" });
      git
        .checkout("drive", { createBranch: true })
        .commit({ msg: "Drive subsystem" });
      git.singleStepMode = false;
      git.printCommands = false;
      git
        .checkout(PRIMARY_BRANCH)
        .commit({ msg: "Add intake" })
        .checkout("drive")
        .pause();
      git.commit({ msg: "Tune drive" }).pause();
      git.commit({ msg: "Tune drive" }).pause();
      git.printCommands = true;
      git.singleStepMode = true;
      git
        .checkout(addShooterCommit)
        .checkout("bug-fix", { createBranch: true })
        .commit({ msg: "Fix shooter angle" });
      git.commit({ msg: "One more fix" });
    },
  );

  const urlParams = new URLSearchParams(window.location.search);
  const showHiddenSlides = urlParams.has("showHidden");

  Reveal.initialize({
    plugins: [Markdown],
    width: 1160,
    center: false,
    keyboard: true,
    showHiddenSlides: showHiddenSlides,
    markdown: {},
  });
}

const deck = document.querySelector(".reveal");
if (deck) {
  switch (deck.id) {
    case "git-branching":
      gitBranchingDesk();
      break;
    case "simple":
      simpleDesk();
      break;
    default:
      console.log(`Unknown desk: id="${deck.id}"`);
      Reveal.initialize({
        plugins: [Markdown],
        width: 1160,
        center: false,
        keyboard: true,
        markdown: {},
      });
  }
}
