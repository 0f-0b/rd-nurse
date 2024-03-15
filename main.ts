#!/usr/bin/env -S deno run

import { Command } from "./deps/cliffy/command.ts";
import { joinToString } from "./deps/std/collections/join_to_string.ts";

import {
  beatToBar,
  checkLevel,
  formatTime,
  parseLevel,
  timeToBeat,
} from "./mod.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder(undefined, { fatal: true });

function warn(message: string): undefined {
  console.warn("%cWarning%c", "color: yellow", "", message);
}

const descs = [
  ["invalidCues", "Invalid cue"],
  ["unexpectedSkipshots", "Unexpected skipshot"],
  ["overlappingSkipshots", "Overlapping skipshots"],
  ["unexpectedFreezeshots", "Unexpected freezeshot"],
  ["overlappingFreezeshots", "Overlapping freezeshots"],
  ["unexpectedBurnshots", "Unexpected burnshots"],
  ["overlappingBurnshots", "Overlapping burnshots"],
  ["uncuedHits", "Uncued hit"],
  ["skippedHits", "Skipped hit"],
  ["missingHits", "Missing hit"],
  ["hitOnHoldRelease", "Hit on hold release"],
  ["overlappingHolds", "Overlapping holds"],
] as const;
const {
  options: { ignoreSource, interruptiblePattern, triangleshot },
  cmd,
} = await new Command()
  .name("rd-nurse")
  .usage("[options]")
  .description(`
    Checks a Rhythm Doctor level for illegal oneshots and holds.

    The level is read from stdin.
  `)
  .option(
    "-s, --ignore-source",
    "Ignore the voice sources of the cues.",
  )
  .option(
    "-p, --interruptible-pattern",
    "Make squareshots stop oneshot patterns.",
  )
  .option(
    "-t, --triangleshot",
    "Enable triangleshots.",
  )
  .error((error, cmd) => {
    cmd.showHelp();
    console.error(
      "%cerror%c:",
      "color: red; font-weight: bold",
      "",
      error.message,
    );
    Deno.exit(2);
  })
  .parse();
if (Deno.stdin.isTerminal()) {
  warn("Reading from stdin which is a terminal");
}
const input = new Uint8Array(
  await new Response(Deno.stdin.readable).arrayBuffer(),
);
if (input.length === 0) {
  cmd.showHelp();
  Deno.exit(2);
}
const level = parseLevel(decoder.decode(input));
const result = checkLevel(level, {
  ignoreSource,
  interruptiblePattern,
  triangleshot,
});
if (result.hasBurnshot) {
  warn("Level contains burnshots; results may be incorrect");
}
const { cpbChanges, tempoChanges } = level;
let count = 0;
let output = "";
for (const [key, desc] of descs) {
  const pos = result[key];
  if (pos.length === 0) {
    continue;
  }
  count += pos.length;
  output += `${desc}: ${
    joinToString(
      pos,
      (time) =>
        formatTime(beatToBar(cpbChanges, timeToBeat(tempoChanges, time))),
      { separator: ", " },
    )
  }\n`;
}
await ReadableStream.from([encoder.encode(output)])
  .pipeTo(Deno.stdout.writable).catch(() => {});
if (count !== 0) {
  Deno.exit(1);
}
