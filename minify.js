"use strict";

import fs from "node:fs";
import path from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";
import UglifyJS from "uglify-js";

import {modifyBasename} from "./utils.js";

// JSObfuscator config that does minification with minimal obfuscation
// however, it has some issues, e.g. console.log() becomes console['log']()
const jsObfuscatorMinifyOptions = {
  target: "node",
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "mangled",
  ignoreImports: true,
  numbersToExpressions: false,
  renameGlobals: false,
  renameProperties: false,
  reservedNames: ["."], // disable obfuscation for all names
  reservedStrings: ["."], // disable obfuscation for all strings
  selfDefending: false,
  simplify: false,
  splitStrings: false,
  stringArray: false,
  stringArrayCallsTransform: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
}

// keep code as intact as possible
const uglifyJSMinifyOptions = {
  keep_fargs: true,
  keep_fnames: true,
  mangle: false,
  compress: false,
  output: {
    annotations: true,
    beautify: false,
    comments: true,
    inline_script: false,
    quote_style: 3, // keep original quotes in strings
    semicolons: true,
  }
}

export function minify(filename, outputDir, useJsObfuscator=false) {
  const sourceCode = fs.readFileSync(filename, {encoding: "utf8"});

  let minifiedCode = "";
  if (useJsObfuscator) {
    const result = JavaScriptObfuscator.obfuscate(sourceCode, jsObfuscatorMinifyOptions);
    minifiedCode = result.getObfuscatedCode();
  } else {
    const result = UglifyJS.minify(sourceCode, uglifyJSMinifyOptions)
    minifiedCode = result.code;
  }

  // write to file
  const outputPath = path.join(outputDir, modifyBasename(filename, "-min"));
  fs.writeFileSync(outputPath, minifiedCode);
  return outputPath;
}


