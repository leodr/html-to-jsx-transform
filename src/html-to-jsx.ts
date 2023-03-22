import generate from "@babel/generator";
import {
  addComment,
  blockStatement,
  expressionStatement,
  ExpressionStatement,
  jsxAttribute,
  jsxClosingElement,
  jsxClosingFragment,
  jsxElement,
  JSXElement,
  jsxEmptyExpression,
  jsxExpressionContainer,
  JSXExpressionContainer,
  JSXFragment,
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
import { convertAttributes } from "./convert-attributes";
import { splitMergeTags } from "./split-merge-tags";

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
          htmlToBabelAst(childNode, false)
        )
      )
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

function htmlToBabelAst(
  node: ChildNode,
  isTopLevel: false
): (JSXExpressionContainer | JSXText | JSXElement)[];
function htmlToBabelAst(node: ChildNode, isTopLevel: true): ExpressionStatement;
function htmlToBabelAst(node: ChildNode, isTopLevel: boolean) {
  if (isTopLevel) {
    if (isCommentNode(node)) {
      const block = blockStatement([]);
      addComment(block, "inner", node.data, false);

      return block;
    } else if (isTextNode(node)) {
      const result = mapTextToTemplateLiteral(node);
      return expressionStatement(result);
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      if (node.nodeName === "style" || node.nodeName === "script") {
        return expressionStatement(
          createCodeElement(node.nodeName, node.attrs, node.childNodes)
        );
      }

      return expressionStatement(
        createJSXElement(node.nodeName, node.attrs, node.childNodes)
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
      const result = mapTextToJSX(node);
      return result;
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

function createJSXElement(
  tagName: string,
  attributes: Attribute[],
  childNodes: ChildNode[]
) {
  const hasChildNodes = childNodes.length > 0;

  return jsxElement(
    jsxOpeningElement(
      jsxIdentifier(tagName),
      convertAttributes(attributes),
      !hasChildNodes
    ),
    jsxClosingElement(jsxIdentifier(tagName)),
    childNodes.flatMap((node) => htmlToBabelAst(node, false))
  );
}

function createCodeElement(
  tagName: string,
  attributes: Attribute[],
  childNodes: ChildNode[]
) {
  const innerText = childNodes
    .filter(isTextNode)
    .map((childNode) => childNode.value)
    .join("");

  const hasContent = innerText.trim() !== "";

  const content = hasContent
    ? [
        jsxExpressionContainer(
          templateLiteral([templateElement({ raw: innerText })], [])
        ),
      ]
    : [];

  return jsxElement(
    jsxOpeningElement(
      jsxIdentifier(tagName),
      convertAttributes(attributes),
      !hasContent
    ),
    hasContent ? jsxClosingElement(jsxIdentifier(tagName)) : null,
    content
  );
}

function createMergeScriptElement(value: string) {
  return jsxElement(
    jsxOpeningElement(jsxIdentifier("script"), [
      {
        name: jsxIdentifier("type"),
        value: stringLiteral("text/x-merge-tag"),
        type: "JSXAttribute",
      },
    ]),
    jsxClosingElement(jsxIdentifier("script")),
    [
      jsxExpressionContainer(
        templateLiteral([templateElement({ raw: value })], [])
      ),
    ]
  );
}

function mapTextToJSX(node: TextNode) {
  const parts = splitMergeTags(node.value);
  return parts.map((part) => {
    if (part.type === "string") {
      return jsxText(part.value);
    } else {
      return createMergeScriptElement(part.value);
    }
  });
}

function mapTextToTemplateLiteral(node: TextNode) {
  const parts = splitMergeTags(node.value);
  if (parts.length === 1 && parts[0]?.type === "string")
    return stringLiteral(node.value);
  return templateLiteral(
    parts.map((part, index) => {
      if (part.type === "string") return templateElement({ raw: part.value });
      else {
        return templateElement({ raw: `part${index}` });
      }
    }),
    parts
      .filter((part) => part.type === "merge")
      .map((part) => {
        if (part.type === "merge") return createMergeScriptElement(part.value);
        // unreachable
        return stringLiteral("");
      })
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
