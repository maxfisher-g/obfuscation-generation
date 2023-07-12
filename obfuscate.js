"use strict";

import fs from "node:fs";
import path from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";

import { modifyBasename } from "./utils.js";

// from https://jabde.com/2022/01/09/top-100-variable-names-2021/
const variablesDictionary = [
  "a", "b", "c", "f", "i", "j", "k", "n", "p", "r", "s", "t", "v", "x", "y", "z", "id", "ii", "im", "jj",
  "x2", "y2", "all", "any", "arg", "bar", "ctr", "dat", "err", "foo", "idx", "inc", "len", "loc", "map",
  "mat", "msg", "num", "pos", "ptr", "pts", "pub", "ret", "rng", "rst", "sec", "str", "sub", "sum", "tst",
  "vec", "x_t", "yes", "copy", "data", "func", "info", "iter", "left", "list", "next", "none", "parm",
  "path", "prob", "rcvr", "temp", "text", "time", "unit", "used", "vals", "word", "angle", "array",
  "check", "found", "fpath", "input", "items", "names", "right", "sigma", "state", "theta", "failed",
  "output", "scores", "sender", "string", "var_in", "current", "var_out", "filename", "temp_vec"
];

// Each input file is obfuscated with every permutation of these options
const obfuscationSwitches = {
  compact: [false],
  controlFlowFlattening: [true, false],
  deadCodeInjection: [false],
  debugProtection: [false],
  disableConsoleOutput: [false],
  identifierNamesGenerator: ["dictionary", "hexadecimal"],
  ignoreImports: [false],
  numbersToExpressions: [true, false],
  renameGlobals: [true],
  renameProperties: [true],
  selfDefending: [false],
  simplify: [true],
  splitStrings: [true, false],
  stringArray: [true, false],
  stringArrayCallsTransform: [true],
  transformObjectKeys: [true, false],
  unicodeEscapeSequence: [false],
}

// These options aren't iterated over
const obfuscationOptions = {
  deadCodeInjectionThreshold: 0.33,
  identifiersDictionary: variablesDictionary,
  renamePropertiesMode: "safe",
  stringArrayEncoding: ["none", "base64"],
  stringArrayCallsTransformThreshold: 0.5,
  target: "node",
};

// Generates many combinations of obfuscation options
// For option meanings, see
// https://github.com/javascript-obfuscator/javascript-obfuscator#javascript-obfuscator-options
export function generateOptionCombinations() {
  // Map of option key to allowable values
  // Total number of combinations is approximately equal to product of lengths of all value arrays.
  // Some options are restricted to one value so that there is some baseline level of obfuscation.
  const combinations = createCombinations(obfuscationSwitches, obfuscationOptions);
  console.log(`Generated ${combinations.length} option combinations`)
  return combinations;
}

// Creates a list of all combinations of option values
// based on the list of option names passed in the first argument
// and valid values passed in the second argument.
// NOTE: this function allocates a struct for each of the combinations,
// Time and space complexity is linear in the product of the lengths of all option values
function createCombinationsRecursively(optionNames, optionValues, currentIndex, currentSettings, allCombinations) {
  if (currentIndex === optionNames.length) {
    // finished settings all options so add this combination to the list of all
    allCombinations.push(currentSettings);
    return;
  }

  const currentOption = optionNames[currentIndex];
  const values = optionValues[currentOption];
  for (let v of values) {
    // add the current option and current value to the existing settings and recurse
    const newSettings = {}
    Object.assign(newSettings, currentSettings);
    newSettings[currentOption] = v
    createCombinationsRecursively(optionNames, optionValues, currentIndex + 1, newSettings, allCombinations)
  }
}

// Creates a list of all combinations of option values
// based on the list of option names passed in the first argument
// and valid values passed in the second argument.
function createCombinations(variableOptions, fixedOptions) {
  const optionNames = Object.keys(variableOptions);
  const allCombinations = [];
  createCombinationsRecursively(optionNames, variableOptions, 0, fixedOptions, allCombinations)
  return allCombinations;
}


export function generateObfuscatedVersions(filename, logPrefix, optionCombinations, outputDir) {
  const sourceCode = fs.readFileSync(filename, {encoding: "utf8"});

  let combinationId = 0;
  for (let obfuscationOptions of optionCombinations) {
    const result = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
    const obfuscatedCode = result.getObfuscatedCode();

    // write to file
    const outputPath = path.join(outputDir, modifyBasename(filename, "-obfs"+combinationId));
    fs.writeFileSync(outputPath, obfuscatedCode)

    if ((combinationId + 1) % 64 === 0) {
      console.log(`${logPrefix} progress ${combinationId+1}/${optionCombinations.length}`)
    }
    combinationId++;
  }
}

function debugFailingObfuscationCases(sourceCode) {
  const combinations = generateOptionCombinations();

  let index = 0;

  const errorCombinations = [];
  for (let obfuscationOptions of combinations) {
    const indexString =`[${index}]`
    try {
      const result = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
      console.log(`${indexString} Obfuscated successfully (len ${result.getObfuscatedCode().length})`);

    } catch (err) {
      console.log(`${indexString} Error: ${err}`)
      errorCombinations.push(obfuscationOptions)
    }
    index++;
  }

  console.log("\n")
  if (errorCombinations.length === 0) {
    console.log("No errors occurred ;)")
  }

  // see what the options were that caused problems
  console.log("Error combinations")
  for (let errorCombination of errorCombinations) {
    // but first, create a copy and remove the option keys that don't change
    const options = {};
    Object.assign(options, errorCombination);
    for (let key of Object.keys(obfuscationOptions)) {
      delete options[key];
    }
    for (let key of Object.keys(obfuscationSwitches)) {
      if (obfuscationSwitches[key].length === 1)
        delete options[key];
    }
    console.log(options);
  }
}

