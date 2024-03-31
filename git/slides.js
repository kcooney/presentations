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

    initialize() {
        this.gitgraph = createGraph(
            this.section.getElementsByClassName("graph-container")[0]);
    }

    prepareSlide() {
	this.onShowSlide();
	this.moveHeadTag();
    }

    onShowSlide() {}

    enableTransitions(callback) {
	Reveal.addKeyBinding(rightArrowKey, () => {
	    Reveal.addKeyBinding(leftArrowKey, () => {
		Reveal.addKeyBinding(leftArrowKey, 'prev');
		this.prepareSlide();
	    });
	    if (!callback()) {
		Reveal.addKeyBinding(39, 'next');
	    }
	    this.moveHeadTag();
        });
    }

    moveHeadTag() {
	const head = this.gitgraph._graph.refs.getCommit("HEAD");
	if (head) {
	    this.gitgraph.tag({name: "HEAD", ref: head, style: headStyle});
	}
    }
}

Reveal.on('slidechanged', event => {
    Reveal.addKeyBinding(rightArrowKey, 'next');
    Reveal.addKeyBinding(leftArrowKey, 'prev');
    if (event.currentSlide.id in slides) {
	slides[event.currentSlide.id].prepareSlide();
    }
});
Reveal.on('ready', event => {
    for (var slideIndex in slides) {
	slides[slideIndex].initialize();
    }
    if (event.currentSlide.id in slides) {
	slides[event.currentSlide.id].prepareSlide();
    }
});

class CommittingSlide extends Slide {
    count = 0;

    constructor() {
	super("committing-slide");
        const gctr = this.section.getElementsByClassName("git-container")[0];
        this.code = gctr.getElementsByTagName("code")[0];
    }

    onShowSlide() {
	this.enableTransitions(this.onTransition.bind(this));
        this.count = 0;
        this.gitgraph.clear();

        this.code.innerHTML = "$ git checkout main";
        this.main = this.gitgraph.branch("main").checkout();
        this.gitgraph.commit("Initial commit");
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git commit -a -m 'Add shooter'";
            this.gitgraph.commit("Add shooter");
            return true;
        case 2:
            this.code.innerHTML += "<br />$ git commit -a -m 'Shoot faster'";
            this.gitgraph.commit("Shoot faster");
            return true;
        case 3:
            this.code.innerHTML += "<br />$ git commit -a -m 'Revert shoot faster'";
            this.gitgraph.commit("Revert shoot faster");
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

    onShowSlide() {
	this.enableTransitions(this.onTransition.bind(this));
        this.count = 0;
        this.gitgraph.clear();

        this.code.innerHTML = "$ git checkout main";
        this.main = this.gitgraph.branch("main").checkout();
        this.gitgraph.commit("Initial commit");

        this.code.innerHTML += "<br />$ git commit -a -m 'Add shooter'";
        this.gitgraph.commit("Add shooter");
    }

    onTransition() {
        switch (++this.count) {
        case 1:
            this.code.innerHTML += "<br />$ git checkout -b chicken/shoot-faster";
            this.feature = this.main.branch("chicken/shoot-faster").checkout();
            this.code.innerHTML += "<br />$ git commit -a -m 'Shoot faster'";
            this.gitgraph.commit("Shoot faster");
            return true;
        case 2:
            this.main.commit("Add drive subsystem").checkout();
            return false;
        }
    }
}
