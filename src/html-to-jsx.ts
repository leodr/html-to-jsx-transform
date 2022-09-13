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

export async function htmlToJsx(html: string): Promise<string> {
  const htmlAst = parseFragment(html.trim());

  let babelAst: ExpressionStatement;

  if (htmlAst.childNodes.length === 1) {
    babelAst = htmlToBabelAst(htmlAst.childNodes[0]!);
  } else {
    babelAst = expressionStatement(
      jsxFragment(
        jsxOpeningFragment(),
        jsxClosingFragment(),
        htmlAst.childNodes.map((childNode) => htmlToBabelAst(childNode, false))
      )
    );
  }

  const babelOutput = await new Promise<BabelFileResult>((resolve, reject) => {
    transformFromAst(
      program([babelAst]),
      undefined,
      undefined,
      (err, result) => {
        if (err || result === null) reject(err);
        else resolve(result);
      }
    );
  });

  let babelCode = babelOutput.code;

  if (typeof babelCode !== "string") {
    throw Error("Babel Output was not a string.");
  }

  // Remove trailing semicolon from Babel string
  if (babelCode.endsWith(";")) {
    babelCode = babelCode.slice(0, -1);
  }

  // Replaces comments that look like this
  //   {
  //    /* Hello World */
  //   }
  // with their more concise version
  //   {/* Hello World! */}
  babelCode = babelCode.replace(/\{\s*\/\*.*?\*\/\s*\}/g, (matchedComment) => {
    const comment = matchedComment.match(/\{\s*\/\*(.*?)\*\/\s*\}/)![1]!;

    return `{/*${comment}*/}`;
  });

  return babelCode;
}

function htmlToBabelAst(
  node: ChildNode,
  isTopLevel?: true
): ExpressionStatement;
function htmlToBabelAst(
  node: ChildNode,
  isTopLevel?: false
): JSXExpressionContainer | JSXText | JSXElement;
function htmlToBabelAst(node: ChildNode, isTopLevel = true) {
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
      if (node.nodeName === "style" || node.nodeName === "script") {
        const innerText = node.childNodes
          .filter(isTextNode)
          .map((childNode) => childNode.value)
          .join("");

        return expressionStatement(
          jsxElement(
            jsxOpeningElement(
              jsxIdentifier(node.nodeName),
              convertAttributes(node.attrs),
              false
            ),
            jsxClosingElement(jsxIdentifier(node.nodeName)),
            [
              jsxExpressionContainer(
                templateLiteral([templateElement({ raw: innerText })], [])
              ),
            ]
          )
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

      return jsxExpressionContainer(emptyExpression);
    } else if (isTextNode(node)) {
      return jsxText(node.value);
    } else if (isDocumentType(node)) {
      throw Error("Document type nodes cannot be processed by this function.");
    } else {
      if (node.nodeName === "style" || node.nodeName === "script") {
        const innerText = node.childNodes
          .filter(isTextNode)
          .map((childNode) => childNode.value)
          .join("");

        return jsxElement(
          jsxOpeningElement(
            jsxIdentifier(node.nodeName),
            convertAttributes(node.attrs),
            false
          ),
          jsxClosingElement(jsxIdentifier(node.nodeName)),
          [
            jsxExpressionContainer(
              templateLiteral([templateElement({ raw: innerText })], [])
            ),
          ]
        );
      }

      return createJSXElement(node.nodeName, node.attrs, node.childNodes);
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
    childNodes.map((node) => htmlToBabelAst(node, false))
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
