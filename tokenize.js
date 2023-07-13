"use strict";

import fs from "node:fs";
import parser from "@babel/parser";

export function tokenize(filename) {
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
      tokenValues.push("\n");
      lastEndPos++;
    }
    lastLine = t.loc.end.line;
    if (t.start > lastEndPos) {
      tokenValues.push(" ");
    }
    lastEndPos = t.end;

    let value;
    if (t.value === undefined) {
      // syntax marker (e.g bracket, dot)
      value = t.type.label;
    } else if (t.type.label === "string") {
      // quote string
      value = `"${t.value}"`
    } else {
      // anything else
      value = t.value;
    }
    tokenValues.push(value);
  }

  console.log(sourceCode);
  console.log(tokenValues);
  return tokenValues;
}