import path from "node:path";
import process from "node:process";
import {parseArgs} from "node:util";
import fs from "node:fs";

import { minify } from "./minify.js";
import * as obfuscate from "./obfuscate.js"
import { tokenize, formatTokens } from "./tokenize.js"
import { confirmContinue } from "./utils.js";

const modes = ["minify", "obfuscate", "tokenize"];

function usage(full = false) {
  // abbreviate full path to node and script with just base names
  const program = path.basename(process.argv[0]) + " " + path.basename(process.argv[1]);
  console.log(`usage: ${program} [--mode=mode] [--outdir=dir] --infile <input.js>`);
  console.log(`       ${program} [--mode=mode] [--outdir=dir] --batch <input_files.txt>`);
  if (full) {
    // transform modes list to indicate initial can also be used as mode specifier
    // "minify" -> "m[inify]"
    const modesList = modes.map((m) => {
      return m[0] + `[${m.slice(1)}]`;
    }).join(", ")

    console.log();
    console.log("--infile accepts a single JS file for processing");
    console.log("--batch accepts a text file where each line is the path of a JS file to process");
    console.log("--outdir sets the directory to output files to (default: current dir)");
    console.log();
    console.log("Valid modes: " + modesList + " (default: obfuscate)");
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

function parseMode(cliModeArg) {
  let mode = "";
  for (let m of modes) {
    // we already tested cliArgs.mode === "" before, so can assume length > 0
    if (cliModeArg === m || cliModeArg[0] === m[0]) {
      mode = m;
    }
  }

  return mode;
}

function doSingleFile(inputFile, mode, outputDir) {
  switch (mode) {
    case "minify":
      const outputPath = minify(inputFile, outputDir);
      console.log(outputPath);
      break;
    case "obfuscate":
      console.log(`Output directory: ${outputDir}`)
      const combinations = obfuscate.generateOptionCombinations();
      obfuscate.generateObfuscatedVersions(inputFile, inputFile, combinations, outputDir)
      break;
    case "tokenize":
      const tokens = tokenize(inputFile);
      const formattedTokens = formatTokens(tokens, false);
      console.log(formattedTokens);
  }
}

function doMultipleFiles(filenamesFile, mode, outputDir) {
  const filenames = fs.readFileSync(filenamesFile, {encoding: "utf8"})
    .split("\n")
    .filter(filename => filename !== "");

  if (mode === "minify") {
    batch(filenames, (filename, _) => {
      const outputPath = minify(filename, outputDir);
      console.log(outputPath);
    });
    return;
  }

  if (mode === "tokenize") {
    console.log("tokenize for multiple files is not implemented yet, sorry!")
    return;
  }

  console.log(`Output directory: ${outputDir}`)
  console.log(`Read ${filenames.length} filenames`);

  const combinations = obfuscate.generateOptionCombinations();
  const numFiles = filenames.length * combinations.length
  console.log(`\n## This program will generate ${numFiles} files ##\n`);

  confirmContinue().then((confirm) => {
    if (confirm) {
      console.log("begin");
      batch(filenames, (filename, progress) => {
        obfuscate.generateObfuscatedVersions(filename, progress, combinations, outputDir);
      });
    } else {
      console.log("aborted");
    }
  });
}

/*
 batch iterates over a list of filenames and calls
   processFn(filename, progress);
 for each filename in the list.
 progress is a string indicating progress through the list,
 may be prepended to console.log messages inside processFn.
 All errors thrown by processFn while processing files are
 recorded, and then printed along with the associated file
 at the end of processing.
 */
function batch(filenames, processFn) {
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
    console.log();
    usage();
    process.exit(-1);
  }
  if (cliArgs.infile === "" && cliArgs.batch === "") {
    console.log("no input files specified");
    console.log();
    usage(true);
    process.exit(-1);
  }

  const mode = parseMode(cliArgs.mode);
  if (mode === "") {
    console.log(`unrecognised mode: ${cliArgs.mode}`);
    usage(true);
    process.exit(-1);
  }

  if (cliArgs.outdir === "") {
    cliArgs.outdir = process.cwd();
  }
  const outputDir = cliArgs.outdir;

  if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
    console.log(`output path '${outputDir}' does not exist or is not a directory`);
    process.exit(1);
  }

  if (cliArgs.batch !== "") {
    doMultipleFiles(cliArgs.batch, mode, outputDir);
  }

  if (cliArgs.infile !== "") {
    doSingleFile(cliArgs.infile, mode, outputDir);
  }
}

main();
