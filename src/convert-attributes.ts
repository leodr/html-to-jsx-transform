import { parse as parseJS } from "@babel/parser";
import type { Expression, ObjectProperty } from "@babel/types";
import t from "@babel/types";
import parseStyleString from "style-to-object";
import {
  coerceToBooleanAttributes,
  eventHandlerAttributes,
  lowercasedAttributes,
  numberAttributes,
  renamedAttributes,
  styleDontStripPx,
  svgCamelizedAttributes,
  svgCoerceToBooleanAttributes,
} from "./attributes.ts";

const {
  addComment,
  arrowFunctionExpression,
  blockStatement,
  booleanLiteral,
  expressionStatement,
  identifier,
  jsxAttribute,
  jsxExpressionContainer,
  jsxIdentifier,
  numericLiteral,
  objectExpression,
  objectProperty,
  stringLiteral,
  templateElement,
  templateLiteral,
} = t;

import type { Token } from "parse5";

export function convertAttributes(attributes: Token.Attribute[]) {
  return attributes.map(({ name: attributeName, value: attributeValue }) => {
    if (attributeName === "style") {
      return createJSXAttribute(
        "style",
        convertStyleToObjectExpression(attributeValue),
      );
    }

    for (const [htmlName, jsxName] of renamedAttributes) {
      if (htmlName === attributeName) {
        return createJSXAttribute(jsxName, attributeValue);
      }
    }

    for (const jsxAttribute of eventHandlerAttributes) {
      if (attributeName === jsxAttribute.toLowerCase()) {
        return functionizeAttribute(jsxAttribute, attributeValue);
      }
    }

    for (const jsxAttribute of svgCoerceToBooleanAttributes) {
      if (attributeName === jsxAttribute) {
        return booleanizeAttribute(jsxAttribute, attributeValue);
      }
    }

    for (const jsxAttribute of coerceToBooleanAttributes) {
      if (attributeName === jsxAttribute.toLowerCase()) {
        return booleanizeAttribute(
          jsxAttribute,
          attributeValue,
          new Set(["checked", "disabled", "selected", "value"]),
        );
      }
    }

    for (const jsxAttribute of numberAttributes) {
      if (attributeName === jsxAttribute.toLowerCase()) {
        const numberValue = Number(attributeValue);

        if (Number.isFinite(numberValue)) {
          return createJSXAttribute(jsxAttribute, numberValue);
        } else {
          return createJSXAttribute(jsxAttribute, attributeValue);
        }
      }
    }

    for (const [jsxAttribute, isNumeric] of svgCamelizedAttributes) {
      if (attributeName === jsxAttribute) {
        const camelizedName = camelize(attributeName);

        if (isNumeric) {
          const numberValue = Number(attributeValue);

          if (Number.isFinite(numberValue)) {
            return createJSXAttribute(camelizedName, numberValue);
          }
        }

        return createJSXAttribute(camelizedName, attributeValue);
      }
    }

    for (const jsxAttribute of lowercasedAttributes) {
      if (attributeName === jsxAttribute.toLowerCase()) {
        return createJSXAttribute(jsxAttribute, attributeValue);
      }
    }

    return createJSXAttribute(attributeName, attributeValue);
  });
}

// Matches a px value, e.g. `40px`
const MATCH_PX_VALUE = /^(\d+)px$/;

function convertStyleToObjectExpression(style: string) {
  const properties: Array<ObjectProperty> = [];

  parseStyleString(style, (name, value) => {
    // Don't remove `px` where this changes the meaning of the attribute value
    const canStripPx = !styleDontStripPx.includes(name.toLowerCase());
    const pxValueMatch = value.match(MATCH_PX_VALUE);
    properties.push(
      objectProperty(
        identifier(camelize(name)),
        pxValueMatch !== null && canStripPx
          ? numericLiteral(Number(pxValueMatch[1]))
          : stringLiteral(value),
      ),
    );
  });

  return objectExpression(properties);
}

const CAMELIZE = /[\-\:]([a-z])/g;
const capitalize = (token: string) => token[1]!.toUpperCase();

const IS_CSS_VARIBLE = /^--\w+/;

/**
 * Converts kebab-case or colon:case to camelCase
 */
function camelize(string: string) {
  // Skip the attribute if it is a css variable.
  // It looks something like this: style="--bgColor: red"
  if (IS_CSS_VARIBLE.test(string)) return `"${string}"`;
  return string.replace(CAMELIZE, capitalize);
}

/**
 * @param trueLiterals A list of values that should preserve the
 *   jsxExpressionContainer when true, e.g. checked={true} insted of just
 *   checked.
 */
function booleanizeAttribute(
  name: string,
  value: string,
  trueLiterals?: Set<string>,
) {
  if (name === "value" && value === "") {
    return createJSXAttribute(name, value);
  }

  if (value === "" || value === "true" || value === name.toLowerCase()) {
    if (trueLiterals?.has(name)) {
      return createJSXAttribute(name, booleanLiteral(true));
    }

    return createJSXAttribute(name, null);
  } else if (value === "false") {
    return createJSXAttribute(name, booleanLiteral(false));
  }

  return createJSXAttribute(name, value);
}

// Matches function calls in an event handler attribute, e.g.
// onclick="myFunction()".
const EMPTY_FUNCTION_CALL = /^\s*([\p{L}_\$][\p{L}_\$]*)\(\)\s*$/u;

function functionizeAttribute(attributeName: string, attributeValue: string) {
  const functionCallMatch = attributeValue.match(EMPTY_FUNCTION_CALL);

  if (functionCallMatch !== null) {
    return createJSXAttribute(attributeName, identifier(functionCallMatch[1]!));
  }

  try {
    const innerCode = parseJS(attributeValue);

    return createJSXAttribute(
      attributeName,
      arrowFunctionExpression(
        [identifier("event")],
        blockStatement(innerCode.program.body),
      ),
    );
  } catch {
    const codeTemplateLiteral = expressionStatement(
      templateLiteral([templateElement({ raw: attributeValue })], []),
    );
    addComment(
      codeTemplateLiteral,
      "leading",
      " TODO: Fix event handler code",
      true,
    );

    return createJSXAttribute(
      attributeName,
      arrowFunctionExpression(
        [identifier("event")],
        blockStatement([codeTemplateLiteral]),
      ),
    );
  }
}

function createJSXAttribute(
  name: string,
  value: string | number | Expression | null,
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
        jsxExpressionContainer(numericLiteral(value)),
      );
    default:
      return jsxAttribute(jsxIdentifier(name), jsxExpressionContainer(value));
  }
}
