import { generate } from "@babel/generator";
import type {
  ExpressionStatement,
  JSXElement,
  JSXExpressionContainer,
  JSXText,
} from "@babel/types";
import bt from "@babel/types";
import { encode } from "html-entities";
import type { DefaultTreeAdapterTypes as pt, Token } from "parse5";
import { parseFragment } from "parse5";
import { convertAttributes } from "./convert-attributes.ts";
import { splitMergeTags, type TextPart } from "./split-merge-tags.ts";

export function htmlToJsx(html: string): string {
  const htmlAst = parseFragment(html.trim());

  let babelAst: ExpressionStatement;
  if (htmlAst.childNodes.length === 1) {
    babelAst = htmlToBabelAst(htmlAst.childNodes[0]!, true);
  } else {
    babelAst = bt.expressionStatement(
      bt.jsxFragment(
        bt.jsxOpeningFragment(),
        bt.jsxClosingFragment(),
        htmlAst.childNodes.flatMap((childNode) =>
          htmlToBabelAst(childNode, false),
        ),
      ),
    );
  }

  const babelOutput = generate(bt.program([babelAst]), { concise: true });

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

function htmlToBabelAst(
  node: pt.ChildNode,
  isTopLevel: true,
): ExpressionStatement;
function htmlToBabelAst(
  node: pt.ChildNode,
  isTopLevel: false,
): (JSXExpressionContainer | JSXText | JSXElement)[];
function htmlToBabelAst(node: pt.ChildNode, isTopLevel: boolean) {
  if (isTopLevel) {
    if (isCommentNode(node)) {
      const block = bt.blockStatement([]);
      bt.addComment(block, "inner", node.data, false);

      return block;
    } else if (isTextNode(node)) {
      const parts = splitMergeTags(node.value);
      return mapTextPartsToTopLevel(parts);
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      if (node.nodeName === "style" || node.nodeName === "script") {
        return bt.expressionStatement(
          createCodeElement(node.nodeName, node.attrs, node.childNodes),
        );
      }

      return bt.expressionStatement(
        createJSXElement(node.nodeName, node.attrs, node.childNodes),
      );
    }
  } else {
    if (isCommentNode(node)) {
      const emptyExpression = bt.jsxEmptyExpression();
      bt.addComment(emptyExpression, "inner", node.data, false);

      return [bt.jsxExpressionContainer(emptyExpression)] as (
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
  attributes: Token.Attribute[],
  childNodes: pt.ChildNode[],
) {
  const hasChildNodes = childNodes.length > 0;

  return bt.jsxElement(
    bt.jsxOpeningElement(
      bt.jsxIdentifier(tagName),
      convertAttributes(attributes),
      !hasChildNodes,
    ),
    bt.jsxClosingElement(bt.jsxIdentifier(tagName)),
    childNodes.flatMap((node) => htmlToBabelAst(node, false)),
  );
}

function createCodeElement(
  tagName: string,
  attributes: Token.Attribute[],
  childNodes: pt.ChildNode[],
) {
  const innerText = childNodes
    .filter(isTextNode)
    .map((childNode) => childNode.value)
    .join("");

  const hasContent = innerText.trim() !== "";

  const content = hasContent
    ? [
        bt.jsxExpressionContainer(
          bt.templateLiteral([bt.templateElement({ raw: innerText })], []),
        ),
      ]
    : [];

  return bt.jsxElement(
    bt.jsxOpeningElement(
      bt.jsxIdentifier(tagName),
      convertAttributes(attributes),
      !hasContent,
    ),
    hasContent ? bt.jsxClosingElement(bt.jsxIdentifier(tagName)) : null,
    content,
  );
}

/**
 * Represent the given string as a JSX comment
 *
 * @param value the string to mark up
 * @returns a JSX `<script>` tag containing the specified string
 */
function createMergeTagComment<T extends Parameters<typeof bt.addComment>[0]>(
  node: T,
  value: string,
) {
  return bt.addComment(node, "inner", `$merge: ${value}`, false);
}

function mapTextPartsToJSX(parts: TextPart[]) {
  return parts.map((part) =>
    part.type === "string"
      ? bt.jsxText(encodeText(part.value))
      : bt.jsxExpressionContainer(
          createMergeTagComment(bt.jsxEmptyExpression(), part.value),
        ),
  );
}

function mapTextPartsToTopLevel(parts: TextPart[]) {
  // If its a single part, use a string literal or direct script tag instead
  if (parts.length === 1 && parts[0])
    return parts[0]?.type === "string"
      ? bt.expressionStatement(bt.stringLiteral(parts[0].value))
      : createMergeTagComment(bt.blockStatement([]), parts[0].value);

  return bt.expressionStatement(
    bt.jsxFragment(
      bt.jsxOpeningFragment(),
      bt.jsxClosingFragment(),
      mapTextPartsToJSX(parts),
    ),
  );
}

function isCommentNode(node: pt.ChildNode): node is pt.CommentNode {
  return node.nodeName === "#comment";
}

function isTextNode(node: pt.ChildNode): node is pt.TextNode {
  return node.nodeName === "#text";
}

function isDocumentType(node: pt.ChildNode): node is pt.DocumentType {
  return (
    node.nodeName === "#document" || node.nodeName === "#document-fragment"
  );
}
