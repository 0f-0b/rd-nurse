import { joinToString } from "https://deno.land/std@0.116.0/collections/join_to_string.ts";
import { readAllSync } from "https://deno.land/std@0.116.0/streams/conversion.ts";
// @deno-types="https://cdn.esm.sh/v58/@types/yargs@17.0.7/index.d.ts"
import yargs from "https://deno.land/x/yargs@v17.3.0-deno/deno.ts";
import type { CheckLevelResult } from "./mod.ts";
import {
  beatToBar,
  checkLevel,
  formatTime,
  parseLevel,
  timeToBeat,
} from "./mod.ts";

const {
  "ignore-source": ignoreSource,
  "interruptible-pattern": interruptiblePattern,
  "triangleshot": triangleshot,
} = yargs(Deno.args)
  .usage("Usage: rd-nurse [options]")
  .version(false)
  .option("ignore-source", {
    alias: "s",
    description: "ignore the voice sources of the cues",
    type: "boolean",
  })
  .option("interruptible-pattern", {
    alias: "p",
    description: "make squareshots stop oneshot patterns",
    type: "boolean",
  })
  .option("triangleshot", {
    alias: "t",
    description: "enable triangleshots",
    type: "boolean",
  })
  .option("help", {
    alias: "h",
    description: "show this help message",
    type: "boolean",
  })
  .epilogue("The level is read from stdin.")
  .fail((msg, err) => {
    if (err) {
      throw err;
    }
    console.error(msg);
    console.error("Try --help for more information.");
    Deno.exit(2);
  })
  .strict()
  .parseSync();
type ResultKey = keyof CheckLevelResult;
const descs: { [K in ResultKey]: string } = {
  invalidNormalCues: "Invalid oneshot cue",
  invalidSquareCues: "Invalid squareshot cue",
  unexpectedSkipshots: "Unexpected skipshot",
  overlappingSkipshots: "Overlapping skipshots",
  unexpectedFreezeshots: "Unexpected freezeshot",
  overlappingFreezeshots: "Overlapping freezeshots",
  uncuedHits: "Uncued hit",
  skippedHits: "Skipped hit",
  missingHits: "Missing hit",
  hitOnHoldRelease: "Hit on hold release",
  overlappingHolds: "Overlapping holds",
};
const level = parseLevel(
  new TextDecoder("utf-8", { fatal: true }).decode(readAllSync(Deno.stdin)),
);
const result = checkLevel(level, {
  ignoreSource,
  interruptiblePattern,
  triangleshot,
});
const { barCache, beatCache } = level;
let count = 0;
for (const [key, desc] of Object.entries(descs) as [ResultKey, string][]) {
  const pos = result[key];
  if (pos.length === 0) {
    continue;
  }
  count += pos.length;
  console.log(joinToString(
    pos,
    (time) => formatTime(beatToBar(barCache, timeToBeat(beatCache, time))),
    { separator: ", ", prefix: desc + ": " },
  ));
}
if (count !== 0) {
  Deno.exit(1);
}
