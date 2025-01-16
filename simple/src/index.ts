import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import RevealMenu from 'reveal.js-menu';
import 'reveal.js-menu';

Reveal.initialize( {
  plugins: [ Markdown, RevealMenu ],
  width: 1160,
  center: false,
  keyboard: true,
  markdown: {},
  menu: {
     path: "reveal.js-menu/"
  }
});
