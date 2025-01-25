import Reveal from "reveal.js";
import { LEFT_ARROW_KEY, RIGHT_ARROW_KEY } from "./slide.js";

export function enableMotion(callback: (index: number) => boolean) {
  let index = 0;
  Reveal.addKeyBinding(RIGHT_ARROW_KEY, () => {
    // If left pressed, slide resets, and next left goes to prev slide.
    Reveal.addKeyBinding(LEFT_ARROW_KEY, () => {
      Reveal.addKeyBinding(LEFT_ARROW_KEY, "prev");
      index = 0;
      callback(index);
    });
    const hasMoreTransitions = callback(++index);
    if (!hasMoreTransitions) {
      Reveal.addKeyBinding(RIGHT_ARROW_KEY, "next");

      // Animate the right arrow (to indicate there are no more transitions).
      const controls = document.getElementsByTagName("aside")[0];
      const nav = controls?.querySelector(".navigate-right");
      nav?.classList.add("highlight");
    }
  });
}