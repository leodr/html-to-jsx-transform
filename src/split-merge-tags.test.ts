import assert from "node:assert";
import { test } from "node:test";
import { splitMergeTags } from "./split-merge-tags.ts";

test("splitMergeTags returns a single part for a string containing no merge tags", () => {
  assert.deepEqual(splitMergeTags("This is some text"), [
    {
      type: "string",
      value: "This is some text",
    },
  ]);
});

test("splitMergeTags handles an empty string", () => {
  assert.deepEqual(splitMergeTags(""), []);
});

test("splitMergeTags handles merge tags aligned to boundaries", () => {
  assert.deepEqual(splitMergeTags("{% something here%}"), [
    {
      type: "merge",
      value: "{% something here%}",
    },
  ]);
});

test("splitMergeTags handles merge tags not at boundaries", () => {
  assert.deepEqual(splitMergeTags("some text {% email %} around a merge tag"), [
    { type: "string", value: "some text " },
    { type: "merge", value: "{% email %}" },
    { type: "string", value: " around a merge tag" },
  ]);
});

test("splitMergeTags handles merge tags at one boundary", () => {
  assert.deepEqual(splitMergeTags("{% email %} around a merge tag"), [
    { type: "merge", value: "{% email %}" },
    { type: "string", value: " around a merge tag" },
  ]);
  assert.deepEqual(splitMergeTags("some text {% email %}"), [
    { type: "string", value: "some text " },
    { type: "merge", value: "{% email %}" },
  ]);
});

test("splitMergeTags handles multiple merge tags in a string", () => {
  assert.deepEqual(
    splitMergeTags("this is my { email } and this is my {{phoneNumber }}"),
    [
      { type: "string", value: "this is my " },
      { type: "merge", value: "{ email }" },
      { type: "string", value: " and this is my " },
      { type: "merge", value: "{{phoneNumber }}" },
    ],
  );
});

test("splitMergeTags handles escaped merge tag characters", () => {
  assert.deepEqual(
    splitMergeTags(
      "this is my { '\\{' + email } and this is my {{phoneNumber }}",
    ),
    [
      { type: "string", value: "this is my " },
      { type: "merge", value: "{ '\\{' + email }" },
      { type: "string", value: " and this is my " },
      { type: "merge", value: "{{phoneNumber }}" },
    ],
  );
});

test("splitMergeTags handles escaped merge tag characters", () => {
  assert.deepEqual(
    splitMergeTags(
      "this is my { '\\{' + email } and this is my {{phoneNumber }}",
    ),
    [
      { type: "string", value: "this is my " },
      { type: "merge", value: "{ '\\{' + email }" },
      { type: "string", value: " and this is my " },
      { type: "merge", value: "{{phoneNumber }}" },
    ],
  );
});
