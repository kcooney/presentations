import Reveal from "reveal.js";

declare function RevealMenu(): Reveal.Plugin;
export default RevealMenu;

export interface CustomPanel {
  element: string;
  icon: string;
  src?: string;
  content?: string;
}

export interface Theme {
  name: string;
  theme: string;
  highlightTheme?: string;
}

interface MenuConfig {
  /**
   * Specifies the path to use to load CSS files.
   */
  path?: string;

  /**
   * Specifies which side of the presentation the menu will be shown.
   *
   * @defaultValue `left`
   */
  side?: "left" | "right";

  /**
   * Specifies the width of the menu.
   *
   * Can be one of the following:
   * 'normal', 'wide', 'third', 'half', 'full', or
   * any valid css length value
   */
  width?: string;

  /**
   * Add slide numbers to the titles in the slide list.
   * Use 'true' or format string (same as reveal.js slide numbers).
   *
   * @defaultValue `false`
   */
  numbers?: boolean | string;

  /**
   * Specifies which slide elements will be used for generating
   *  the slide titles in the menu. The default selects the first
   * heading element found in the slide, but you can specify any
   * valid css selector and the text from the first matching
   * element will be used.
   *
   * Note: that a section data-menu-title attribute or an element
   * with a menu-title class will take precedence over this option
   *
   * @defaultValue 'h1, h2, h3, h4, h5'
   */
  titleSelector?: string;

  /**
   * If slides do not have a matching title, attempt to use the
   * start of the text content as the title instead.
   *
   * @defaultValue 'false'
   */
  useTextContentForMissingTitles?: boolean;

  /**
   * Hide slides from the menu that do not have a title.
   * Set to 'true' to only list slides with titles.
   *
   * @defaultValue `false`
   */
  hideMissingTitles?: boolean;

  /**
   * Adds markers to the slide titles to indicate the
   * progress through the presentation. Set to 'false'
   * to hide the markers.
   *
   * @defaultValue `true`
   */
  markers?: boolean;

  /**
   * Specify custom panels to be included in the menu, by
   * providing an array of objects with 'title', 'icon'
   * properties, and either a 'src' or 'content' property.
   */
  custom?: CustomPanel[];

  /**
   * Specifies the themes that will be available in the themes
   * menu panel. Set to 'true' to show the themes menu panel
   * with the default themes list. Alternatively, provide an
   * array to specify the themes to make available in the
   * themes menu panel, for example...
   *
   * [
   *     { name: 'Black', theme: 'dist/theme/black.css' },
   *     { name: 'White', theme: 'dist/theme/white.css' },
   *     { name: 'League', theme: 'dist/theme/league.css' },
   *     {
   *       name: 'Dark',
   *       theme: 'lib/reveal.js/dist/theme/black.css',
   *       highlightTheme: 'lib/reveal.js/plugin/highlight/monokai.css'
   *     },
   *     {
   *       name: 'Code: Zenburn',
   *       highlightTheme: 'lib/reveal.js/plugin/highlight/zenburn.css'
   *     }
   * ]
   *
   * Note: specifying highlightTheme without a theme will
   * change the code highlight theme while leaving the
   * presentation theme unchanged.
   *
   * @defaultValue `false`
   */
  themes?: boolean | Theme[];

  // Specifies the path to the default theme files. If your
  // presentation uses a different path to the standard reveal
  // layout then you need to provide this option, but only
  // when 'themes' is set to 'true'. If you provide your own
  // list of themes or 'themes' is set to 'false' the
  // 'themesPath' option is ignored.
  themesPath?: string;

  // Specifies if the transitions menu panel will be shown.
  // Set to 'true' to show the transitions menu panel with
  // the default transitions list. Alternatively, provide an
  // array to specify the transitions to make available in
  // the transitions panel, for example...
  // ['None', 'Fade', 'Slide']
  transitions?: boolean | string[];

  // Adds a menu button to the slides to open the menu panel.
  // Set to 'false' to hide the button.
  openButton?: boolean;

  // If 'true' allows the slide number in the presentation to
  // open the menu panel. The reveal.js slideNumber option must
  // be displayed for this to take effect
  openSlideNumber?: boolean;

  // If true allows the user to open and navigate the menu using
  // the keyboard. Standard keyboard interaction with reveal
  // will be disabled while the menu is open.
  keyboard?: boolean;

  // Normally the menu will close on user actions such as
  // selecting a menu item, or clicking the presentation area.
  // If 'true', the sticky option will leave the menu open
  // until it is explicitly closed, that is, using the close
  // button or pressing the ESC or m key (when the keyboard
  // interaction option is enabled).
  sticky?: boolean;

  // If 'true' standard menu items will be automatically opened
  // when navigating using the keyboard. Note: this only takes
  // effect when both the 'keyboard' and 'sticky' options are enabled.
  autoOpen?: boolean;

  // If 'true' the menu will not be created until it is explicitly
  // requested by calling RevealMenu.init(). Note this will delay
  // the creation of all menu panels, including custom panels, and
  // the menu button.
  delayInit?: boolean;

  // If 'true' the menu will be shown when the menu is initialised.
  openOnInit?: boolean;

  // By default the menu will load it's own font-awesome library
  // icons. If your presentation needs to load a different
  // font-awesome library the 'loadIcons' option can be set to false
  // and the menu will not attempt to load the font-awesome library.
  loadIcons?: boolean;
}

declare module "reveal.js" {
  export interface Options {
    menu?: MenuConfig;
  }
}
