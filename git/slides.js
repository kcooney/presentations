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
        this.button.addEventListener("click", event => this.onButtonClicked());
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

    onButtonClicked() {
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
            break;
        case 3:
            this.code.innerHTML += "<br />$ git commit -a -m 'Revert shoot faster'";
            this.main.commit("Revert shoot faster");
            moveHeadTag(this.main);
            this.button.disabled = true;
            break;
        }
    }
}

class BranchesSlide {
    count = 0;

    constructor(slideIndex) {
        this.section = document.getElementById("branches-slide");
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
        this.button.addEventListener("click", event => this.onButtonClicked());
        this.reset();
    }

    reset() {
        this.button.disabled = false;
        this.count = 0;
        this.gitgraph.clear();

        this.code.innerHTML = "$ git checkout main";
        this.main = this.gitgraph.branch("main");
        this.main.commit("Initial commit");

        this.code.innerHTML += "<br />$ git commit -a -m 'Add shooter'";
        this.main.commit("Add shooter");
        moveHeadTag(this.main);
    }

    onButtonClicked() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git checkout -b chicken/shoot-faster";
            this.feature = this.main.branch("chicken/shoot-faster");
            this.code.innerHTML += "<br />$ git commit -a -m 'Shoot faster'";
            this.feature.commit("Shoot faster");
            moveHeadTag(this.feature);
            break;
        case 2:
            this.main.commit("Add drive subsystem");
            this.button.disabled = true;
            break;
        }
    }
}
