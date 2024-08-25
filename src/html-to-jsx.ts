import generate from "@babel/generator";
import {
  addComment,
  blockStatement,
  expressionStatement,
  ExpressionStatement,
  jsxClosingElement,
  jsxClosingFragment,
  jsxElement,
  JSXElement,
  jsxEmptyExpression,
  jsxExpressionContainer,
  JSXExpressionContainer,
  jsxFragment,
  jsxIdentifier,
  jsxOpeningElement,
  jsxOpeningFragment,
  jsxText,
  JSXText,
  program,
  stringLiteral,
  templateElement,
  templateLiteral,
} from "@babel/types";
import { parseFragment } from "parse5";
import type { Attribute } from "parse5/dist/common/token";
import type {
  ChildNode,
  CommentNode,
  DocumentType,
  TextNode,
} from "parse5/dist/tree-adapters/default";
import { encode } from "html-entities";
import { convertAttributes } from "./convert-attributes";
import { splitMergeTags, TextPart } from "./split-merge-tags";

export function htmlToJsx(html: string): string {
  const htmlAst = parseFragment(html.trim());

  let babelAst: ExpressionStatement;
  if (htmlAst.childNodes.length === 1) {
    babelAst = htmlToBabelAst(htmlAst.childNodes[0]!, true);
  } else {
    babelAst = expressionStatement(
      jsxFragment(
        jsxOpeningFragment(),
        jsxClosingFragment(),
        htmlAst.childNodes.flatMap((childNode) =>
          htmlToBabelAst(childNode, false),
        ),
      ),
    );
  }

  const babelOutput = generate(program([babelAst]), { concise: true });

  let babelCode = babelOutput.code.trim();

  if (typeof babelCode !== "string") {
    throw Error("Babel Output was not a string.");
  }

  // Remove trailing semicolon from Babel string
  if (babelCode.endsWith(";")) {
    babelCode = babelCode.slice(0, -1);
  }

  return babelCode;
}

function htmlToBabelAst(node: ChildNode, isTopLevel: true): ExpressionStatement;
function htmlToBabelAst(
  node: ChildNode,
  isTopLevel: false,
): (JSXExpressionContainer | JSXText | JSXElement)[];
function htmlToBabelAst(node: ChildNode, isTopLevel: boolean) {
  if (isTopLevel) {
    if (isCommentNode(node)) {
      const block = blockStatement([]);
      addComment(block, "inner", node.data, false);

      return block;
    } else if (isTextNode(node)) {
      const parts = splitMergeTags(node.value);
      return mapTextPartsToTopLevel(parts);
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      if (node.nodeName === "style" || node.nodeName === "script") {
        return expressionStatement(
          createCodeElement(node.nodeName, node.attrs, node.childNodes),
        );
      }

      return expressionStatement(
        createJSXElement(node.nodeName, node.attrs, node.childNodes),
      );
    }
  } else {
    if (isCommentNode(node)) {
      const emptyExpression = jsxEmptyExpression();
      addComment(emptyExpression, "inner", node.data, false);

      return [jsxExpressionContainer(emptyExpression)] as (
        | JSXExpressionContainer
        | JSXText
        | JSXElement
      )[];
    } else if (isTextNode(node)) {
      const parts = splitMergeTags(node.value);
      return mapTextPartsToJSX(parts);
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      if (node.nodeName === "style" || node.nodeName === "script") {
        return [createCodeElement(node.nodeName, node.attrs, node.childNodes)];
      }

      return [createJSXElement(node.nodeName, node.attrs, node.childNodes)];
    }
  }
}

function encodeText(text: string) {
  return encode(text, { mode: "nonAsciiPrintable", level: "html5" });
}

function createJSXElement(
  tagName: string,
  attributes: Attribute[],
  childNodes: ChildNode[],
) {
  const hasChildNodes = childNodes.length > 0;

  return jsxElement(
    jsxOpeningElement(
      jsxIdentifier(tagName),
      convertAttributes(attributes),
      !hasChildNodes,
    ),
    jsxClosingElement(jsxIdentifier(tagName)),
    childNodes.flatMap((node) => htmlToBabelAst(node, false)),
  );
}

function createCodeElement(
  tagName: string,
  attributes: Attribute[],
  childNodes: ChildNode[],
) {
  const innerText = childNodes
    .filter(isTextNode)
    .map((childNode) => childNode.value)
    .join("");

  const hasContent = innerText.trim() !== "";

  const content = hasContent
    ? [
        jsxExpressionContainer(
          templateLiteral([templateElement({ raw: innerText })], []),
        ),
      ]
    : [];

  return jsxElement(
    jsxOpeningElement(
      jsxIdentifier(tagName),
      convertAttributes(attributes),
      !hasContent,
    ),
    hasContent ? jsxClosingElement(jsxIdentifier(tagName)) : null,
    content,
  );
}

/**
 * Represent the given string as a JSX comment
 *
 * @param value the string to mark up
 * @returns a JSX `<script>` tag containing the specified string
 */
function createMergeTagComment<T extends Parameters<typeof addComment>[0]>(
  node: T,
  value: string,
) {
  return addComment(node, "inner", `$merge: ${value}`, false);
}

function mapTextPartsToJSX(parts: TextPart[]) {
  return parts.map((part) =>
    part.type === "string"
      ? jsxText(encodeText(part.value))
      : jsxExpressionContainer(
          createMergeTagComment(jsxEmptyExpression(), part.value),
        ),
  );
}

function mapTextPartsToTopLevel(parts: TextPart[]) {
  // If its a single part, use a string literal or direct script tag instead
  if (parts.length === 1 && parts[0])
    return parts[0]?.type === "string"
      ? expressionStatement(stringLiteral(parts[0].value))
      : createMergeTagComment(blockStatement([]), parts[0].value);

  return expressionStatement(
    jsxFragment(
      jsxOpeningFragment(),
      jsxClosingFragment(),
      mapTextPartsToJSX(parts),
    ),
  );
}

function isCommentNode(node: ChildNode): node is CommentNode {
  return node.nodeName === "#comment";
}

function isTextNode(node: ChildNode): node is TextNode {
  return node.nodeName === "#text";
}

function isDocumentType(node: ChildNode): node is DocumentType {
  return (
    node.nodeName === "#document" || node.nodeName === "#document-fragment"
  );
}
