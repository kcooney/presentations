# FRC 2813 Git Presentations

This repo contains slides and code for presentations I am working on for the Gear Heads ([FRC 2813](https://team2813.com/)).

## Dependencies

- [TypeScript]
- [reveal.js] HTML presentation framework
- [SVG.js] SVG wrapper library
- [Jest] JavaScript testing framework
- [ESLint]
- [esbuild] bundler
- [prettier] code formatter

## References and Resources

- [Pro Git] online Git book
- [The TypeScript Handbook]
- The commit layout algorithm was inspired by [Commit Graph Drawing Algorithms](https://pvigier.github.io/2019/05/06/commit-graph-drawing-algorithms.html)
- The SVG rendering code was highly influenced by [GitGraph.js]

## FAQ

### Why Another Git Graph Library?

There are numerous JavaScript/TypeScript libraries for rendering Git graphs (including [GitGraph.js] and [Mermaid]). I could not find one that had the features I needed (and some had bugs). What I created supports the following:

- Rendering branch names at the tip of the branches (vs the top of the branches)
- Rendering `HEAD`
- Supporting `git amend`
- Allowing the graph to be rendered incrementally while not moving commits
  around
- Supporting showing command-line arguments for each transition

[esbuild]: https://esbuild.github.io/
[ESLint]: https://eslint.org/
[GitGraph.js]: https://github.com/nicoespeon/gitgraph.js/
[Jest]: https://jestjs.io/
[Mermaid]: https://mermaid.js.org/syntax/gitgraph.html
[prettier]: https://prettier.io/
[Pro Git]: https://git-scm.com/book/en/v2/
[reveal.js]: https://revealjs.com
[SVG.js]: https://svgjs.dev/
[The TypeScript Handbook]: https://www.typescriptlang.org/docs/handbook/intro.html
[TypeScript]: https://www.typescriptlang.org/
