function assert(condition, message) {
    if (!condition) {
        throw Error(message || "Assertion failed");
    }
}

const rightArrowKey = 39;
const leftArrowKey = 37;

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

    initialize() {}

    onShowSlide() {}

    enableTransitions(callback) {
	Reveal.addKeyBinding(rightArrowKey, () => {
	    Reveal.addKeyBinding(leftArrowKey, () => {
		Reveal.addKeyBinding(leftArrowKey, 'prev');
		this.onShowSlide();
	    });
	    if (!callback()) {
		Reveal.addKeyBinding(39, 'next');
	    }
        })
    }
}

Reveal.on('slidechanged', event => {
    Reveal.addKeyBinding(rightArrowKey, 'next');
    Reveal.addKeyBinding(leftArrowKey, 'prev');
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});
Reveal.on('ready', event => {
    for (var slideIndex in slides) {
	slides[slideIndex].initialize();
    }
    if (event.currentSlide.id in slides) {
	slides[event.currentSlide.id].onShowSlide();
    }
});

class CommittingSlide extends Slide {
    count = 0;

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
	this.enableTransitions(this.onTransition.bind(this));
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
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git commit -a -m 'Shoot faster'";
            this.main.commit("Shoot faster");
            moveHeadTag(this.main);
            return true;
        case 3:
            this.code.innerHTML += "<br />$ git commit -a -m 'Revert shoot faster'";
            this.main.commit("Revert shoot faster");
            moveHeadTag(this.main);
	    return false; // No more transitions
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
            return true;
        case 2:
            this.main.commit("Add drive subsystem");
	    Reveal.addKeyBinding(39, 'next');
            return false;
        }
    }
}
