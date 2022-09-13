import { htmlToJsx } from "./html-to-jsx";

/** Template literal for auto formatting */
function html(
  strings: TemplateStringsArray,
  ...expressions: unknown[]
): string {
  let result = strings[0] ?? "";

  for (let i = 1, l = strings.length; i < l; i++) {
    result += expressions[i - 1];
    result += strings[i];
  }

  return result;
}

test("works for regular HTML", () => {
  const htmlToConvert = html`<h1>Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe("<h1>Hello World!</h1>");
});

test("works with comments", () => {
  const htmlToConvert = html`
    <h1>
      <!-- This is a comment. -->
      Hello World!
    </h1>
  `;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1>
      {/* This is a comment. */}
      Hello World!
    </h1>`);
});

test("works with only text", () => {
  const htmlToConvert = html`Hello World!`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`"Hello World!"`);
});

test("works with only comment", () => {
  const htmlToConvert = html`<!-- Hello World! -->`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`{/* Hello World! */}`);
});

test("works with singular elements", () => {
  const htmlToConvert = html`<h1>Hello<br />World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1>Hello<br />World!</h1>`);
});

test("self-closes empty elements", () => {
  const htmlToConvert = html`<div></div>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<div />`);
});

test("converts class to className", () => {
  const htmlToConvert = html`<h1 class="heading-1">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 className="heading-1">Hello World!</h1>`);
});

test("converts for to htmlFor", () => {
  const htmlToConvert = html`<h1 for="heading-1">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 htmlFor="heading-1">Hello World!</h1>`);
});

test("converts style tag including px values to numbers", () => {
  const htmlToConvert = html`<h1 style="padding: 10px; background-color: red;">
    Hello World!
  </h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX)
    .toBe(`<h1 style={{ padding: 10, backgroundColor: "red" }}>
    Hello World!
  </h1>`);
});

test("works with adjacent elements", () => {
  const htmlToConvert = html`
    <h1>Hello</h1>
    My
    <h2>World!</h2>
  `;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<><h1>Hello</h1>
    My
    <h2>World!</h2></>`);
});

test("converts tabindex to number", () => {
  const htmlToConvert = html`<h1 tabindex="0">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 tabIndex={0}>Hello World!</h1>`);
});

test("converts contenteditable to boolean", () => {
  const htmlToConvert = html`<h1 contenteditable>Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 contentEditable>Hello World!</h1>`);
});

test("converts value to boolean but leaves true in", () => {
  const htmlToConvert = html`<h1 value="true">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 value={true}>Hello World!</h1>`);
});

test("converts disabled to boolean but leaves true in", () => {
  const htmlToConvert = html`<h1 disabled="true">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 disabled={true}>Hello World!</h1>`);
});

test("converts playsinline to boolean", () => {
  const htmlToConvert = html`<h1 playsinline="playsinline">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 playsInline>Hello World!</h1>`);
});

test("converts checked to boolean but leaves true in", () => {
  const htmlToConvert = html`<h1 checked="true">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 checked={true}>Hello World!</h1>`);
});

test("converts cols to number", () => {
  const htmlToConvert = html`<h1 cols="12">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 cols={12}>Hello World!</h1>`);
});

test("converts svg attributes", () => {
  const htmlToConvert = html`<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    class="w-6 h-6"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
    />
  </svg>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX)
    .toBe(`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>`);
});

test("handles onclick and converts function", () => {
  const htmlToConvert = html`<button onclick="handleButtonClick()">
    Button
  </button>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(
    `<button onClick={handleButtonClick}>
    Button
  </button>`
  );
});

test("handles onclick with more complex statement", () => {
  const htmlToConvert = html`<button onclick="window.scrollY = 0">
    Button
  </button>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(
    `<button onClick={event => { window.scrollY = 0; }}>
    Button
  </button>`
  );
});

test("handles onclick with invalid code inside", () => {
  const htmlToConvert = html`<button onclick="this is invalid code.">
    Button
  </button>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(
    `<button onClick={event => { // TODO: Fix event handler code
\`this is invalid code.\`; }}>
    Button
  </button>`
  );
});

test("handles lowercased attributes", () => {
  const htmlToConvert = html`<menu contextmenu="share"></menu>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<menu contextMenu="share" />`);
});

test("handles two adjacent comments", () => {
  const htmlToConvert = html`<!-- Hello --><!-- World! -->`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<>{/* Hello */}{/* World! */}</>`);
});

test("adds template literals to the inside of style elements", () => {
  const htmlToConvert = html`<style>
    body {
      background: red;
    }
  </style>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<style>{\`
    body {
      background: red;
    }
  \`}</style>`);
});

test("handles inner script elements", () => {
  const htmlToConvert = html`<div>
    <script>
      console.log("Hello World!");
    </script>
  </div>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<div>
    <script>{\`
      console.log("Hello World!");
    \`}</script>
  </div>`);
});

test("number attributes that are not a number remain untouched", () => {
  const htmlToConvert = html`<h1 tabindex="wronginput">Hello World!</h1>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<h1 tabIndex="wronginput">Hello World!</h1>`);
});

test("svg boolean attributes get converted", () => {
  const htmlToConvert = html`<path focusable="true"></path>`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<path focusable />`);
});

test("false boolean attributes get converted to boolean expression", () => {
  const htmlToConvert = `<input checked="false">`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(`<input checked={false} />`);
});

test("boolean attributes with non-boolean values are left untouched", () => {
  const htmlToConvert = html`<a href="example.com" download="installer.exe"
    >Download</a
  >`;

  const convertedJSX = htmlToJsx(htmlToConvert);

  expect(convertedJSX).toBe(
    `<a href="example.com" download="installer.exe">Download</a>`
  );
});
