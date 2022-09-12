import { BabelFileResult, transformFromAst } from "@babel/core";
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
} from "@babel/types";
import { parseFragment } from "parse5";
import type { Attribute } from "parse5/dist/common/token";
import type {
  ChildNode,
  CommentNode,
  DocumentType,
  TextNode,
} from "parse5/dist/tree-adapters/default";
import { convertAttributes } from "./attributes";

export async function htmlToJsx(html: string): Promise<string> {
  const fragment = parseFragment(html.trim());

  let newAst: ExpressionStatement;

  if (fragment.childNodes.length === 1) {
    newAst = htmlAstToBabelJSXAst(fragment.childNodes[0]!);
  } else {
    newAst = expressionStatement(
      jsxFragment(
        jsxOpeningFragment(),
        jsxClosingFragment(),
        fragment.childNodes.map((childNode) =>
          htmlAstToBabelJSXAst(childNode, false)
        )
      )
    );
  }

  const babelOutput = await new Promise<BabelFileResult>((resolve, reject) => {
    transformFromAst(program([newAst]), undefined, undefined, (err, result) => {
      if (err || result === null) reject(err);
      else resolve(result);
    });
  });

  let babelCode = babelOutput.code;

  if (typeof babelCode === "string") {
    if (babelCode.endsWith(";")) {
      babelCode = babelCode.slice(0, -1);
    }

    // Replaces comments that look like this {
    //  /* Hello World */
    // }
    // with their more concise version {/* Hello World! */}
    babelCode = babelCode.replace(/\{\s*\/\*.*?\*\/\s*\}/g, (match) => {
      const comment = match.match(/\{\s*\/\*(.*?)\*\/\s*\}/)![1]!;

      return `{/*${comment}*/}`;
    });

    return babelCode;
  } else {
    throw Error("Babel Output was not a string.");
  }
}

function htmlAstToBabelJSXAst(
  node: ChildNode,
  isTopLevel?: true
): ExpressionStatement;
function htmlAstToBabelJSXAst(
  node: ChildNode,
  isTopLevel?: false
): JSXExpressionContainer | JSXText | JSXElement;
function htmlAstToBabelJSXAst(node: ChildNode, isTopLevel = true) {
  if (isTopLevel) {
    if (isCommentNode(node)) {
      const block = blockStatement([]);
      addComment(block, "inner", node.data, false);

      return block;
    } else if (isTextNode(node)) {
      return expressionStatement(stringLiteral(node.value));
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      return expressionStatement(
        constructJSXElement(node.nodeName, node.attrs, node.childNodes)
      );
    }
  } else {
    if (isCommentNode(node)) {
      const emptyExpression = jsxEmptyExpression();
      addComment(emptyExpression, "inner", node.data, false);

      return jsxExpressionContainer(emptyExpression);
    } else if (isTextNode(node)) {
      return jsxText(node.value);
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      return constructJSXElement(node.nodeName, node.attrs, node.childNodes);
    }
  }
}

function constructJSXElement(
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
    childNodes.map((node) => htmlAstToBabelJSXAst(node, false))
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
