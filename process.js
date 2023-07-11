'use strict';

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import JavaScriptObfuscator from 'javascript-obfuscator';

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
  identifierNamesGenerator: ['dictionary', 'hexadecimal'],
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
  renamePropertiesMode: 'safe',
  stringArrayEncoding: ['none', 'base64'],
  stringArrayCallsTransformThreshold: 0.5,
  target: 'node',
};

// configuration for the JS obfuscator that just does minification,
// without any obfuscation
const minifyOptions = {
  target: 'node',
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled',
  ignoreImports: true,
  numbersToExpressions: false,
  renameGlobals: false,
  renameProperties: false,
  selfDefending: false,
  simplify: false,
  splitStrings: false,
  stringArray: false,
  stringArrayCallsTransform: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
}

// Generates many combinations of obfuscation options
// For option meanings, see
// https://github.com/javascript-obfuscator/javascript-obfuscator#javascript-obfuscator-options
function generateOptionCombinations() {
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

// example.js -> example-obfs4000.js
function modifyBasename(filename, suffix, extension=".js") {
  const basename = path.basename(filename, extension)
  return `${basename}${suffix}.js`
}

function generateObfuscatedVersions(filename, logPrefix, optionCombinations, outputDir) {
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

function minify(filename, outputDir) {
  const sourceCode = fs.readFileSync(filename, {encoding: "utf8"});
  const result = JavaScriptObfuscator.obfuscate(sourceCode, minifyOptions);
  const minifiedCode = result.getObfuscatedCode();
  // write to file
  const outputPath = path.join(outputDir, modifyBasename(filename, "-min"));
  fs.writeFileSync(outputPath, minifiedCode);
  return outputPath;
}

async function confirmContinue() {
  let confirmation = false;
  const interaction = readline.createInterface({input: process.stdin, output: process.stdout});

  process.stdout.write("Continue (y/N)? ")

  for await (const line of interaction) {
    if (line.trim() === "y") {
      confirmation = true;
    }
    break;
  }
  process.stdout.write("\n");
  interaction.close()

  return confirmation;
}

/*
 processFiles iterates over a list of filenames and calls
   processFn(filename, progress);
 for each filename in the list.
 progress is a string indicating progress through the list,
 may be prepended to console.log messages inside processFn.
 All errors thrown by processFn while processing files are
 recorded, and then printed along with the associated file
 at the end of processing.
 */
function processFiles(filenames, processFn) {
  const fileErrors = {};
  let fileCount = 0;
  for (let filename of filenames) {
    const progress = `[${fileCount+1}/${filenames.length}]`

    console.log(`${progress} ${filename}`);
    try {
      processFn(filename, progress);
    } catch (err) {
      console.log(`${progress} error processing file`);
      fileErrors[filename] = err;
    }
    fileCount++;
  }

  if (fileErrors.length > 0) {
    console.log("\nThe following errors occurred during processing");
    for (let problemFile in fileErrors) {
      console.log(`path: ${problemFile}, error: ${fileErrors[problemFile]}`);
    }

    console.log("\nList of files for which errors occurred:");
    for (let filename of Object.keys(fileErrors)) {
      console.log(filename);
    }
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

function usage(full = false) {
  // abbreviate full path to node and script with just base names
  const program = path.basename(process.argv[0]) + " " + path.basename(process.argv[1]);
  console.log(`usage: ${program} [--mode=mode] [--outdir=dir] --infile <input.js>`);
  console.log(`       ${program} [--mode=mode] [--outdir=dir] --batch <input_files.txt>`);
  if (full) {
    console.log("--infile processes one JS input file, --batch takes a list of files as input.")
    console.log("Valid modes: m[inify], o[bfuscate] (default: obfuscate)");
    console.log("Use --outdir to set directory for output files (default: current dir)");
  }
}

const cliOptions = {
  infile: { type: "string", short: "i", default: ""},
  batch: { type: "string", short: "b", default: ""},
  outdir: { type: "string", short: "d", default: "" },
  mode: { type: "string", short: "m", default: "obfuscate" },
  help: { type: "boolean", short: "h", default: false },
};

// Parse command line arguments
function parseCliArgs(args) {
  let argValues = null;
  try {
    const parsedArgs = parseArgs({
      args: args,
      allowPositionals: true,
      options: cliOptions
    });
    argValues = parsedArgs.values;
    // record single positional value as infiles path, if present
    argValues.infiles = (parsedArgs.positionals.length === 1) ? parsedArgs.positionals[0] : null;
  } catch (e) {
    if (e instanceof TypeError) {
      console.log(e.message + "\n");
    } else {
      throw e;
    }
  }
  return argValues;
}

function batchMode(filenamesFile, justMinify, outputDir) {
  const lines = fs.readFileSync(filenamesFile, {encoding: "utf8"}).split("\n");
  const filenames = [];
  for (let line of lines) {
    if (line !== "") {
      filenames.push(line);
    }
  }

  if (justMinify) {
    processFiles(filenames, (filename, _) => {
      const outputPath = minify(filename, outputDir);
      console.log(outputPath);
    });
    return;
  }

  console.log(`Output directory: ${outputDir}`)
  console.log(`Read ${filenames.length} filenames`);

  const combinations = generateOptionCombinations();
  const numFiles = filenames.length * combinations.length
  console.log(`\n## This program will generate ${numFiles} files ##\n`);

  confirmContinue().then((confirm) => {
    if (confirm) {
      console.log("begin");
      processFiles(filenames, (filename, progress) => {
        generateObfuscatedVersions(filename, progress, combinations, outputDir);
      });
    } else {
      console.log("aborted");
    }
  });
}

function singleMode(inputFile, justMinify, outputDir) {
  if (justMinify) {
    const outputPath = minify(inputFile, outputDir);
    console.log(outputPath);
  } else {
    console.log(`Output directory: ${outputDir}`)
    const combinations = generateOptionCombinations();
    generateObfuscatedVersions(inputFile, inputFile, combinations, outputDir)
  }
}

function main() {
  const args = process.argv.slice(2);
  const cliArgs = parseCliArgs(args);
  if (args.length === 0 || cliArgs === null || cliArgs.help || cliArgs.mode === "")  {
    const printFull = cliArgs !== null; // if null, then there was also an error message printed
    usage(printFull);
    process.exit(-1);
  }

  if (cliArgs.infile !== "" && cliArgs.batch !== "") {
    console.log("cannot specify both --infile (parse single file) and --batch (parse multiple files)");
    usage();
    process.exit(-1);
  }

  let mode = "";
  const modes = ["minify", "obfuscate"];
  for (let m of modes) {
    // we already tested cliArgs.mode === "" before, so can assume length > 0
    if (cliArgs.mode === m || cliArgs.mode[0] === m[0]) {
      mode = m;
    }
  }
  if (mode === "") {
    console.log(`unrecognised mode: ${cliArgs.mode}`);
    usage(true);
    process.exit(-1);
  }

  //debugFailingObfuscationCases(sourceCode);

  if (cliArgs.outdir === "") {
    cliArgs.outdir = process.cwd();
  }
  const outputDir = cliArgs.outdir;

  if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
    console.log(`output path '${outputDir}' does not exist or is not a directory`);
    process.exit(1);
  }


  if (cliArgs.batch !== "") {
    batchMode(cliArgs.batch, mode === "minify", outputDir);
  }

  if (cliArgs.infile !== "") {
    singleMode(cliArgs.infile, mode === "minify", outputDir);
  }
}

main();
