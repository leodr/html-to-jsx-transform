import {
  booleanLiteral,
  identifier,
  jsxAttribute,
  jsxExpressionContainer,
  jsxIdentifier,
  numericLiteral,
  objectExpression,
  ObjectProperty,
  objectProperty,
  stringLiteral,
} from "@babel/types";
import parse from "style-to-object";

import type { Attribute } from "parse5/dist/common/token";

export function convertAttributes(attributes: Attribute[]) {
  return attributes.map(({ name, value }) => {
    if (name === "style") {
      return jsxAttribute(
        jsxIdentifier("style"),
        jsxExpressionContainer(convertStyleString(value))
      );
    }

    for (const [originalName, renamed] of renamedAttributes) {
      if (originalName === name) {
        return jsxAttribute(jsxIdentifier(renamed), stringLiteral(value));
      }
    }

    for (const attribute of coercedToBooleanAttributes) {
      if (name === attribute.toLowerCase()) {
        return coerceBooleanizeAttribute(attribute, value, ["value"]);
      }
    }

    for (const attribute of svgCoercedToBooleanAttributes) {
      if (name === attribute) {
        return coerceBooleanizeAttribute(attribute, value);
      }
    }

    for (const attribute of booleanAttributes) {
      if (name === attribute.toLowerCase()) {
        return coerceBooleanizeAttribute(attribute, value, [
          "disabled",
          "checked",
          "selected",
        ]);
      }
    }

    for (const attribute of numberAttributes) {
      if (name === attribute.toLowerCase()) {
        const numberValue = Number(value);

        if (Number.isFinite(numberValue)) {
          return jsxAttribute(
            jsxIdentifier(attribute),
            jsxExpressionContainer(numericLiteral(Number(value)))
          );
        } else {
          return jsxAttribute(jsxIdentifier(attribute), stringLiteral(value));
        }
      }
    }

    for (const [attribute, isNumeric] of svgCamelizedAttributes) {
      if (name === attribute) {
        const camelizedName = name.replace(CAMELIZE, capitalize);

        if (isNumeric) {
          const numberValue = Number(value);

          if (Number.isFinite(numberValue)) {
            return jsxAttribute(
              jsxIdentifier(camelizedName),
              jsxExpressionContainer(numericLiteral(Number(value)))
            );
          }
        }

        return jsxAttribute(jsxIdentifier(camelizedName), stringLiteral(value));
      }
    }

    return jsxAttribute(jsxIdentifier(name), stringLiteral(value));
  });
}

function convertStyleString(style: string) {
  const properties: Array<ObjectProperty> = [];

  parse(style, (name, value) => {
    const pxValueMatch = value.match(/^(\d+)px$/);

    const propertyName = kebabToCamel(name);

    if (pxValueMatch !== null) {
      properties.push(
        objectProperty(
          identifier(propertyName),
          numericLiteral(Number(pxValueMatch[1]))
        )
      );
    } else {
      properties.push(
        objectProperty(identifier(propertyName), stringLiteral(value))
      );
    }
  });

  return objectExpression(properties);
}

// The following element listings are taken from the facebook/react repository.
// https://github.com/facebook/react/blob/main/packages/react-dom/src/shared/DOMProperty.js

// A few React string attributes have a different name.
// This is a mapping from React prop names to the attribute names.
const renamedAttributes = new Map([
  ["accept-charset", "acceptCharset"],
  ["class", "className"],
  ["for", "htmlFor"],
  ["http-equiv", "httpEquiv"],
]);

// These are "enumerated" HTML attributes that accept "true" and "false".
// In React, we let users pass `true` and `false` even though technically
// these aren't boolean attributes (they are coerced to strings).
const coercedToBooleanAttributes = [
  "contentEditable",
  "draggable",
  "spellCheck",
  "value",

  // These accept other values than true and false which are just left as is.
  // true and false will get converted to booleans.
  "capture",
  "download",
];

// These are "enumerated" SVG attributes that accept "true" and "false".
// In React, we let users pass `true` and `false` even though technically
// these aren't boolean attributes (they are coerced to strings).
// Since these are SVG attributes, their attribute names are case-sensitive.
const svgCoercedToBooleanAttributes = [
  "autoReverse",
  "externalResourcesRequired",
  "focusable",
  "preserveAlpha",
];

// These are HTML boolean attributes.
const booleanAttributes = [
  "allowFullScreen",
  "async",
  "autoFocus",
  "autoPlay",
  "controls",
  "default",
  "defer",
  "disabled",
  "disablePictureInPicture",
  "disableRemotePlayback",
  "formNoValidate",
  "hidden",
  "loop",
  "noModule",
  "noValidate",
  "open",
  "playsInline",
  "readOnly",
  "required",
  "reversed",
  "scoped",
  "seamless",
  "itemScope",
  "checked",
  "multiple",
  "muted",
  "selected",
];

// These are HTML attributes that must be positive numbers.
const numberAttributes = [
  "cols",
  "rows",
  "size",
  "span",
  "rowSpan",
  "start",
  "tabIndex",
];

const CAMELIZE = /[\-\:]([a-z])/g;
const capitalize = (token: string) => token[1]!.toUpperCase();

// These properties are SVG and have to be camelized.
// The second value in the array determines should be converted to a number if
// possible.
const svgCamelizedAttributes = [
  ["accent-height", false],
  ["alignment-baseline", false],
  ["arabic-form", false],
  ["baseline-shift", false],
  ["cap-height", true],
  ["clip-path", false],
  ["clip-rule", false],
  ["color-interpolation", false],
  ["color-interpolation-filters", false],
  ["color-profile", false],
  ["color-rendering", false],
  ["dominant-baseline", false],
  ["enable-background", false],
  ["fill-opacity", false],
  ["fill-rule", false],
  ["flood-color", false],
  ["flood-opacity", false],
  ["font-family", false],
  ["font-size", true],
  ["font-size-adjust", true],
  ["font-stretch", false],
  ["font-style", false],
  ["font-variant", false],
  ["font-weight", true],
  ["glyph-name", false],
  ["glyph-orientation-horizontal", false],
  ["glyph-orientation-vertical", false],
  ["horiz-adv-x", true],
  ["horiz-origin-x", true],
  ["image-rendering", false],
  ["letter-spacing", true],
  ["lighting-color", false],
  ["marker-end", false],
  ["marker-mid", false],
  ["marker-start", false],
  ["overline-position", true],
  ["overline-thickness", true],
  ["paint-order", false],
  ["panose-1", false],
  ["pointer-events", false],
  ["rendering-intent", false],
  ["shape-rendering", false],
  ["stop-color", false],
  ["stop-opacity", false],
  ["strikethrough-position", true],
  ["strikethrough-thickness", true],
  ["stroke-dasharray", false],
  ["stroke-dashoffset", true],
  ["stroke-linecap", false],
  ["stroke-linejoin", false],
  ["stroke-miterlimit", true],
  ["stroke-opacity", false],
  ["stroke-width", true],
  ["text-anchor", false],
  ["text-decoration", false],
  ["text-rendering", false],
  ["underline-position", true],
  ["underline-thickness", true],
  ["unicode-bidi", false],
  ["unicode-range", false],
  ["units-per-em", true],
  ["v-alphabetic", true],
  ["v-hanging", true],
  ["v-ideographic", true],
  ["v-mathematical", true],
  ["vector-effect", false],
  ["vert-adv-y", true],
  ["vert-origin-x", true],
  ["vert-origin-y", true],
  ["word-spacing", true],
  ["writing-mode", false],
  ["xmlns:xlink", false],
  ["x-height", true],
];

const lowercasedAttributes = ["crossOrigin", "formAction"];

function kebabToCamel(string: string) {
  let parts = string.split("-");
  return parts
    .map((item, index) =>
      index === 0
        ? item.toLowerCase()
        : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
    )
    .join("");
}

function coerceBooleanizeAttribute(
  name: string,
  value: string,
  trueLiterals?: string[]
) {
  if (value === "" || value === "true" || value === name.toLowerCase()) {
    if (trueLiterals?.includes(name)) {
      return jsxAttribute(
        jsxIdentifier(name),
        jsxExpressionContainer(booleanLiteral(true))
      );
    }
    return jsxAttribute(jsxIdentifier(name), null);
  } else if (value === "false") {
    return jsxAttribute(
      jsxIdentifier(name),
      jsxExpressionContainer(booleanLiteral(false))
    );
  }

  return jsxAttribute(jsxIdentifier(name), stringLiteral(value));
}
