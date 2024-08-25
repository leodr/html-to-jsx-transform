import { splitMergeTags } from "./split-merge-tags";

test("splitMergeTags returns a single part for a string containing no merge tags", () => {
  expect(splitMergeTags("This is some text")).toEqual([
    {
      type: "string",
      value: "This is some text",
    },
  ]);
});

test("splitMergeTags handles an empty string", () => {
  expect(splitMergeTags("")).toEqual([]);
});

test("splitMergeTags handles merge tags aligned to boundaries", () => {
  expect(splitMergeTags("{% something here%}")).toEqual([
    {
      type: "merge",
      value: "{% something here%}",
    },
  ]);
});

test("splitMergeTags handles merge tags not at boundaries", () => {
  expect(splitMergeTags("some text {% email %} around a merge tag")).toEqual([
    { type: "string", value: "some text " },
    { type: "merge", value: "{% email %}" },
    { type: "string", value: " around a merge tag" },
  ]);
});

test("splitMergeTags handles merge tags at one boundary", () => {
  expect(splitMergeTags("{% email %} around a merge tag")).toEqual([
    { type: "merge", value: "{% email %}" },
    { type: "string", value: " around a merge tag" },
  ]);
  expect(splitMergeTags("some text {% email %}")).toEqual([
    { type: "string", value: "some text " },
    { type: "merge", value: "{% email %}" },
  ]);
});

test("splitMergeTags handles multiple merge tags in a string", () => {
  expect(
    splitMergeTags("this is my { email } and this is my {{phoneNumber }}"),
  ).toEqual([
    { type: "string", value: "this is my " },
    { type: "merge", value: "{ email }" },
    { type: "string", value: " and this is my " },
    { type: "merge", value: "{{phoneNumber }}" },
  ]);
});

test("splitMergeTags handles escaped merge tag characters", () => {
  expect(
    splitMergeTags(
      "this is my { '\\{' + email } and this is my {{phoneNumber }}",
    ),
  ).toEqual([
    { type: "string", value: "this is my " },
    { type: "merge", value: "{ '\\{' + email }" },
    { type: "string", value: " and this is my " },
    { type: "merge", value: "{{phoneNumber }}" },
  ]);
});

test("splitMergeTags handles escaped merge tag characters", () => {
  expect(
    splitMergeTags(
      "this is my { '\\{' + email } and this is my {{phoneNumber }}",
    ),
  ).toEqual([
    { type: "string", value: "this is my " },
    { type: "merge", value: "{ '\\{' + email }" },
    { type: "string", value: " and this is my " },
    { type: "merge", value: "{{phoneNumber }}" },
  ]);
});
