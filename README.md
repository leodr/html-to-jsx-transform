<h1 align="center">html-to-jsx-transform</h1>
<p align="center">
    <strong>A library for converting an HTML string into a JSX string using ASTs.</strong>
</p>
<p align="center">
    <a href="https://github.com/leodr/html-to-jsx-transform/blob/main/LICENSE">
        <img alt="MIT License" src="https://img.shields.io/github/license/leodr/html-to-jsx-transform?color=%23A855F7&labelColor=%2327272A&style=for-the-badge">
    </a>
    <a href="https://www.npmjs.com/package/html-to-jsx-transform">
        <img alt="David" src="https://img.shields.io/npm/v/html-to-jsx-transform?color=%236366F1&labelColor=%2327272A&style=for-the-badge">
    </a>
    <a href="https://github.com/leodr/html-to-jsx-transform/issues">
        <img alt="Open GitHub issues" src="https://img.shields.io/github/issues/leodr/html-to-jsx-transform?color=%2310B981&labelColor=%2327272A&style=for-the-badge">
    </a>
</p>
<p align="center">
    <a href="#-documentation"><b>Documentation</b></a>
    <span>  •  </span>
    <a href="#-development"><b>Development</b></a>
    <span>  •  </span>
    <a href="#-contribute"><b>Contribute</b></a>
</p>

---

`html-to-jsx-transform` transforms a string of HTML into JSX. It works by
turning it into an AST using [`parse5`](https://parse5.js.org/index.html),
converting every node to its equivalent JSX node to create a Babel AST and then
stringifying that using
[`@babel/generator`](https://babeljs.io/docs/en/babel-generator).

The library is tested for a variety of different scenarios, if you happen to
find a flaw please open an issue so we can add it to the test suite.

<br />

## ❯ Documentation

- [`htmlToJsx`](#htmlToJsx)

<br>

### `htmlToJsx`

Takes a string of HTML and synchronously returns a string with the equivalent
JSX source code.

#### Example

```ts
import { htmlToJsx } from "html-to-jsx-transform";

const jsx = htmlToJsx('<h1 tabindex="0">Hello World!</h1>');

// jsx === '<h1 tabIndex={0}>Hello World!</h1>';
```

#### Behavior

##### Elements

- `style` and `script` elements get template literal bodies wrapped in curly
  braces
- Adjacent elements are wrapped in a Fragment (`<>...</>`)

##### Attributes

- `style` attributes are parsed into objects
- Attributes are renamed and casing is adjusted (including SVG)
- Event handlers are converted into arrow functions
- Boolean and numeric attributes are converted into boolean or number values

<br>

## ❯ Development

This library is best developed by writing test cases first. Tests can be
executed by running `npm test`.

### Releasing a new version on NPM

To release a new version on npm, run `npm version (patch|minor|major)` to
increase the version. This will create a Git tag for you.

Then run `npm publish`, the `prepublishOnly` hook will test and build the
package and then publish it.

<br>

## ❯ Contribute

If you think you have any ideas that could benefit the project, feel free to
create an issue or pull request!

<br>

---

<p align="center">
    <sub>
        Project by Leo Driesch, released under <a href="https://github.com/leodr/html-to-jsx-transform/blob/main/LICENSE">MIT license</a>.
    </sub>
</p>
<p align="center">
    <a href="https://twitter.com/leodriesch">
        <img alt="Leo Driesch on Twitter" src="./readme-assets/twitter.svg">
    </a>
    &nbsp;&nbsp;
    <a href="https://github.com/leodr">
        <img alt="Leo Driesch on GitHub" src="./readme-assets/github.svg">
    </a>
</p>
