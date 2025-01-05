import Reveal from 'reveal.js';

const RIGHT_ARROW_KEY = 39;
const LEFT_ARROW_KEY = 37;

type Slides = {
  [key: string] : Slide;
};
const slides: Slides = {};

interface ReadyEvent extends Event {
    currentSlide: HTMLElement
    indexh: number
    indexy: number
}

interface SlideChangedEvent extends Event {
    previousSlide: HTMLElement
    currentSlide: HTMLElement
    indexh: number
    indexy: number
}

declare global {
    interface ElementEventMap {
        "ready": ReadyEvent;
        "slidechanged": SlideChangedEvent;
    }
}

export class Slide {

    constructor(
        protected readonly sectionId: string)
    {
        slides[sectionId] = this;
    }

    sectionElement() {
        document.getElementById(this.sectionId);
    }

    onShowSlide() {
        this.onResetSlide();
    }

    onResetSlide() {}

    onHideSlide() {}
};

export function enableMotion(slide: Slide, callback: () => boolean) {
    Reveal.addKeyBinding(RIGHT_ARROW_KEY, () => {
        // If left pressed, slide resets, and next left goes to prev slide.
        Reveal.addKeyBinding(LEFT_ARROW_KEY, () => {
            Reveal.addKeyBinding(LEFT_ARROW_KEY, 'prev');   
            slide.onResetSlide();
        });
        if (!callback()) {
            Reveal.addKeyBinding(RIGHT_ARROW_KEY, 'next');
        }
    });
};

Reveal.on("slidechanged", (event: SlideChangedEvent) => {
    Reveal.addKeyBinding(RIGHT_ARROW_KEY, "next");
    Reveal.addKeyBinding(LEFT_ARROW_KEY, "prev");
    if (event.previousSlide.id in slides) {
        slides[event.previousSlide.id].onHideSlide();
    }
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});

Reveal.on("ready", (event: ReadyEvent) => {
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});
