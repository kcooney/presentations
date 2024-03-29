function assert(condition, message) {
    if (!condition) {
        throw Error(message || "Assertion failed");
    }
}

const baseTemplate = GitgraphJS.TemplateName.BlackArrow
const withoutAuthor = GitgraphJS.templateExtend(baseTemplate, {
    commit: {
        message: {
            displayAuthor: false,
        },
    },
});

const headStyle = {
    color: "cyan",
    bgColor: "black",
    strokeColor: "black",
};

function moveHeadTag(commit) {
    commit.tag({name: "HEAD", style: headStyle});
}

function createGraph(graphContainer) {
    return GitgraphJS.createGitgraph(graphContainer, {
        orientation: GitgraphJS.Orientation.VerticalReverse,
        template: withoutAuthor,
        reverseArrow: true,
        responsive: false,
    });
}

class CommittingSlide {
    count = 0;

    constructor(slideIndex) {
        this.section = document.getElementById("committing-slide");
        this.button = this.section.getElementsByTagName("button")[0];
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];

        Reveal.on('slidechanged', event => {
            if (event.indexh == slideIndex) {
                this.reset();
            }
	});
	    
        Reveal.on('ready', event => this.initialize());
    }

    initialize() {
        this.gitgraph = createGraph(
            this.section.getElementsByClassName("graph-container")[0]);
        this.button.addEventListener("click", this.onButtonClicked);
        this.reset();
    }

    reset() {
        this.button.disabled = false;
        this.count = 0;        
        this.gitgraph.clear();
	this.code.innerHTML = "$ git checkout main";

        this.main = this.gitgraph.branch("main");
        this.main.commit("Initial commit");
        moveHeadTag(this.main);
    }

    onButtonClicked = event => {
        switch (++this.count) {
          case 1:
              this.code.innerHTML += "<br />$ git commit -a -m 'Add shooter'";
              this.main.commit("Add shooter");
              moveHeadTag(this.main);
              break;
           case 2:
              this.code.innerHTML += "<br />$ git commit -a -m 'Shoot faster'";
              this.main.commit("Shoot faster");
              moveHeadTag(this.main);
              this.button.disabled = true;
              break;                
           case 3:
              this.code.innerHTML += "<br />$ git checout -b feature1<br />$ git commit -a 'Use limelight";
              const feature1 = this.main.branch("feature1");
              feature1.commit("Experimental limelight code");
              moveHeadTag(feature1);
              this.button.disabled = true;
              break;
        }
    }
}

function slide2() {
    const graphContainer = document.getElementById("slide1-graph-container");
    gitgraph = createGraph(graphContainer);

    // Simulate git commands with Gitgraph API.
    const main = gitgraph.branch("main");
    main.commit("Initial commit");

    const develop = main.branch("develop");
    develop.commit("Add TypeScript");

    const aFeature = develop.branch("a-feature");
    aFeature
        .commit("Make it work")
        .commit("Make it fast");

    develop.merge(aFeature);
    develop.commit("Prepare v1");

    main.merge(develop);
    moveHeadTag(main)

    const btn = document.getElementById("slide1-button");
    const gctr = document.getElementsByClassName("git-container")[0]
    const code = gctr.getElementsByTagName("code")[0]
    function slide1AddCommit() {
        code.innerHTML += "<br />$ git commit"
        main.commit("More");
        moveHeadTag(main);
        btn.disabled = true;      
    }
    btn.addEventListener("click", slide1AddCommit);
}
