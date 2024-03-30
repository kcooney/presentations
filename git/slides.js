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

const slides = {}

class Slide {
    constructor(sectionId) {
	this.sectionId = sectionId;
        this.section = document.getElementById(sectionId);
	slides[sectionId] = this;
    }

    initialize() {};
    onShowSlide() {}
}

Reveal.on('slidechanged', event => {
    Reveal.addKeyBinding(39, 'next');
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});
Reveal.on('ready', event => {
    for (var slideIndex in slides) {
	slides[slideIndex].initialize();
    }
    if (0 in slides) {
	slides[0].onShowSlide();
    }
});

class CommittingSlide extends Slide {
    count = 0;
    addedKeyBinding = false;

    constructor() {
	super("committing-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    initialize() {
        this.gitgraph = createGraph(
            this.section.getElementsByClassName("graph-container")[0]);
    }

    onShowSlide() {
	Reveal.addKeyBinding(39, this.onTransition.bind(this));
	this.addedKeyBinding = true;
        this.count = 0;
        this.gitgraph.clear();

        this.code.innerHTML = "$ git checkout main";
        this.main = this.gitgraph.branch("main");
        this.main.commit("Initial commit");
        moveHeadTag(this.main);
    }

    onTransition() {
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
	    Reveal.addKeyBinding(39, 'next');
            break;
        }
    }
}

class BranchesSlide extends Slide {
    count = 0;

    constructor() {
	super('branches-slide');
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    initialize() {
        this.gitgraph = createGraph(
            this.section.getElementsByClassName("graph-container")[0]);
    }

    onShowSlide() {
	Reveal.addKeyBinding(39, this.onTransition.bind(this));
        this.count = 0;
        this.gitgraph.clear();

        this.code.innerHTML = "$ git checkout main";
        this.main = this.gitgraph.branch("main");
        this.main.commit("Initial commit");

        this.code.innerHTML += "<br />$ git commit -a -m 'Add shooter'";
        this.main.commit("Add shooter");
        moveHeadTag(this.main);
    }

    onTransition() {
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
	    Reveal.addKeyBinding(39, 'next');
            break;
        }
    }
}
