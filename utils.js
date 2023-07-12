"use strict";

// example.js -> example-obfs4000.js
import path from "node:path";
import readline from "node:readline";
import process from "node:process";

export function modifyBasename(filename, suffix, extension=".js") {
  const basename = path.basename(filename, extension)
  return `${basename}${suffix}.js`
}

export async function confirmContinue() {
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
