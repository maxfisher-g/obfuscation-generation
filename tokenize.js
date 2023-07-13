"use strict";

import fs from "node:fs";
import parser from "@babel/parser";

export function tokenize(filename, printDebug = false) {
  const sourceCode = fs.readFileSync(filename, { encoding: "utf8" });

  const ast = parser.parse(sourceCode, {
    // copied from Package Analysis babel-parser.js
    errorRecovery: true,
    sourceType: "unambiguous",
    tokens: true
  })

  const tokenValues = [];
  let lastEndPos = 0;
  let lastLine = 1;
  for (let t of ast.tokens) {
    // check if there was whitespace since last token
    if (t.loc.start.line > lastLine) {
      tokenValues.push("nl");
      lastEndPos++;
    }
    lastLine = t.loc.end.line;
    if (t.start > lastEndPos) {
      tokenValues.push("sp");
    }
    lastEndPos = t.end;

    let value;
    if (t.value === undefined) {
      // syntax marker (e.g bracket, dot)
      value = t.type.label;
    } else if (t.type.label === "string" || t.type.label === "template") {
      // quote string
      value = `"${t.value}"`
    } else {
      // anything else
      value = t.value;
    }
    tokenValues.push(value);
  }

  if (printDebug) {
    console.log(ast.tokens);
    console.log(sourceCode);
    console.log(tokenValues);
  }
  return tokenValues;
}

// formats the list of tokens returned by tokenize() into a
// Python list of strings
export function formatTokens(tokens, includeSpace) {
  const tokenList = [];
  for (let t of tokens) {
    if (t === "sp" && !includeSpace) {
      continue;
    }
    tokenList.push(`'${t}'`)
  }
  return "[" + tokenList.join(", ") + "]";
}