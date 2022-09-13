import { parse as babelParse } from "@babel/parser";
import {
  addComment,
  arrowFunctionExpression,
  blockStatement,
  booleanLiteral,
  Expression,
  expressionStatement,
  identifier,
  jsxAttribute,
  jsxExpressionContainer,
  jsxIdentifier,
  numericLiteral,
  objectExpression,
  ObjectProperty,
  objectProperty,
  stringLiteral,
  templateElement,
  templateLiteral,
} from "@babel/types";
import parse from "style-to-object";

import type { Attribute } from "parse5/dist/common/token";

export function convertAttributes(attributes: Attribute[]) {
  return attributes.map(({ name, value }) => {
    if (name === "style") {
      return createJSXAttribute("style", convertStyleString(value));
    }

    for (const [originalName, renamed] of renamedAttributes) {
      if (originalName === name) {
        return createJSXAttribute(renamed, value);
      }
    }

    for (const attribute of eventAttributes) {
      if (name === attribute.toLowerCase()) {
        const functionCallMatch = value.match(EMPTY_FUNCTION_CALL);

        if (functionCallMatch !== null) {
          return createJSXAttribute(
            attribute,
            identifier(functionCallMatch[1]!)
          );
        }

        try {
          const innerCode = babelParse(value);

          return createJSXAttribute(
            attribute,
            arrowFunctionExpression(
              [identifier("event")],
              blockStatement(innerCode.program.body)
            )
          );
        } catch {
          const codeTemplateLiteral = expressionStatement(
            templateLiteral([templateElement({ raw: value })], [])
          );
          addComment(
            codeTemplateLiteral,
            "leading",
            " TODO: Fix event handler code",
            true
          );

          return createJSXAttribute(
            attribute,
            arrowFunctionExpression(
              [identifier("event")],
              blockStatement([codeTemplateLiteral])
            )
          );
        }
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
          return createJSXAttribute(attribute, numberValue);
        } else {
          return createJSXAttribute(attribute, value);
        }
      }
    }

    for (const [attribute, isNumeric] of svgCamelizedAttributes) {
      if (name === attribute) {
        const camelizedName = kebabToCamel(name);

        if (isNumeric) {
          const numberValue = Number(value);

          if (Number.isFinite(numberValue)) {
            return createJSXAttribute(camelizedName, numberValue);
          }
        }

        return createJSXAttribute(camelizedName, value);
      }
    }

    for (const attribute of lowercasedAttributes) {
      if (name === attribute.toLowerCase()) {
        return createJSXAttribute(attribute, value);
      }
    }

    return createJSXAttribute(name, value);
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

const CAMELIZE = /[\-\:]([a-z])/g;
const capitalize = (token: string) => token[1]!.toUpperCase();

function kebabToCamel(string: string) {
  return string.replace(CAMELIZE, capitalize);
}

// Matches function calls in an event handler attribute, e.g.
// onclick="myFunction()".
const EMPTY_FUNCTION_CALL = /^\s*([\p{L}_\$][\p{L}_\$]*)\(\)\s*$/u;

/**
 * @param trueLiterals A list of values that should preserve the
 *   jsxExpressionContainer when true, e.g. checked={true} insted of just
 *   checked.
 */
function coerceBooleanizeAttribute(
  name: string,
  value: string,
  trueLiterals?: string[]
) {
  if (value === "" || value === "true" || value === name.toLowerCase()) {
    if (trueLiterals?.includes(name)) {
      return createJSXAttribute(name, booleanLiteral(true));
    }

    return createJSXAttribute(name, null);
  } else if (value === "false") {
    return createJSXAttribute(name, booleanLiteral(false));
  }

  return createJSXAttribute(name, value);
}

function createJSXAttribute(
  name: string,
  value: string | number | Expression | null
) {
  if (value === null) {
    return jsxAttribute(jsxIdentifier(name), null);
  }

  switch (typeof value) {
    case "string":
      return jsxAttribute(jsxIdentifier(name), stringLiteral(value));
    case "number":
      return jsxAttribute(
        jsxIdentifier(name),
        jsxExpressionContainer(numericLiteral(value))
      );
    default:
      return jsxAttribute(jsxIdentifier(name), jsxExpressionContainer(value));
  }
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
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "disablePictureInPicture",
  "disableRemotePlayback",
  "formNoValidate",
  "hidden",
  "itemScope",
  "loop",
  "multiple",
  "muted",
  "noModule",
  "noValidate",
  "open",
  "playsInline",
  "readOnly",
  "required",
  "reversed",
  "scoped",
  "seamless",
  "selected",
];

// These are HTML attributes that must be positive numbers.
const numberAttributes = [
  "cellPadding",
  "cellSpacing",
  "cols",
  "marginHeight",
  "marginWidth",
  "maxLength",
  "minLength",
  "rows",
  "rowSpan",
  "size",
  "span",
  "start",
  "tabIndex",
];

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
  ["color-interpolation-filters", false],
  ["color-interpolation", false],
  ["color-profile", false],
  ["color-rendering", false],
  ["dominant-baseline", false],
  ["enable-background", false],
  ["fill-opacity", false],
  ["fill-rule", false],
  ["flood-color", false],
  ["flood-opacity", false],
  ["font-family", false],
  ["font-size-adjust", true],
  ["font-size", true],
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
  ["x-height", true],
  ["xmlns:xlink", false],
];

// Supported event attributes in React, taken from
// https://reactjs.org/docs/events.html
const eventAttributes = [
  "onAbort",
  "onAnimationEnd",
  "onAnimationIteration",
  "onAnimationStart",
  "onBlur",
  "onCanPlay",
  "onCanPlayThrough",
  "onChange",
  "onClick",
  "onCompositionEnd",
  "onCompositionStart",
  "onCompositionUpdate",
  "onContextMenu",
  "onCopy",
  "onCut",
  "onDoubleClick",
  "onDrag",
  "onDragEnd",
  "onDragEnter",
  "onDragExit",
  "onDragLeave",
  "onDragOver",
  "onDragStart",
  "onDrop",
  "onDurationChange",
  "onEmptied",
  "onEncrypted",
  "onEnded",
  "onError",
  "onError",
  "onFocus",
  "onGotPointerCapture",
  "onInput",
  "onInvalid",
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onLoad",
  "onLoadedData",
  "onLoadedMetadata",
  "onLoadStart",
  "onLostPointerCapture",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onPaste",
  "onPause",
  "onPlay",
  "onPlaying",
  "onPointerCancel",
  "onPointerDown",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerMove",
  "onPointerOut",
  "onPointerOver",
  "onPointerUp",
  "onProgress",
  "onRateChange",
  "onReset",
  "onScroll",
  "onSeeked",
  "onSeeking",
  "onSelect",
  "onStalled",
  "onSubmit",
  "onSuspend",
  "onTimeUpdate",
  "onToggle",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onTransitionEnd",
  "onVolumeChange",
  "onWaiting",
  "onWheel",
];

// List of attributes that are lower-cased in HTML but have to be camel-cased in
// JSX code. Taken from https://reactjs.org/docs/dom-elements.html
const lowercasedAttributes = [
  "accessKey",
  "autoComplete",
  "charSet",
  "classID",
  "colSpan",
  "contextMenu",
  "controlsList",
  "crossOrigin",
  "dateTime",
  "encType",
  "formAction",
  "formEncType",
  "formMethod",
  "formTarget",
  "frameBorder",
  "hrefLang",
  "inputMode",
  "keyParams",
  "keyType",
  "mediaGroup",
  "radioGroup",
  "srcDoc",
  "srcLang",
  "srcSet",
  "useMap",
];