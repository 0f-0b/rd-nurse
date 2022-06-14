import { Command } from "./deps/cliffy/command.ts";
import { joinToString } from "./deps/std/collections/join_to_string.ts";
import { bold, red, yellow } from "./deps/std/fmt/colors.ts";
import { readAllSync } from "./deps/std/streams/conversion.ts";
import {
  beatToBar,
  checkLevel,
  type CheckLevelResult,
  formatTime,
  parseLevel,
  timeToBeat,
} from "./mod.ts";

type ResultKey = keyof CheckLevelResult;
const descs: [ResultKey, string][] = [
  ["invalidCues", "Invalid cue"],
  ["unexpectedSkipshots", "Unexpected skipshot"],
  ["overlappingSkipshots", "Overlapping skipshots"],
  ["unexpectedFreezeshots", "Unexpected freezeshot"],
  ["overlappingFreezeshots", "Overlapping freezeshots"],
  ["uncuedHits", "Uncued hit"],
  ["skippedHits", "Skipped hit"],
  ["missingHits", "Missing hit"],
  ["hitOnHoldRelease", "Hit on hold release"],
  ["overlappingHolds", "Overlapping holds"],
];
await new class extends Command {
  error(e: Error): never {
    this.showHelp();
    console.error(`${bold(red("error"))}: ${e.message}`);
    Deno.exit(2);
  }
}()
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
  .action(function ({ ignoreSource, interruptiblePattern, triangleshot }) {
    if (Deno.isatty(Deno.stdin.rid)) {
      console.warn(`${yellow("Warning")} Reading from stdin which is a TTY`);
    }
    const input = readAllSync(Deno.stdin);
    if (input.length === 0) {
      this.showHelp();
      Deno.exit(1);
    }
    const level = parseLevel(
      new TextDecoder("utf-8", { fatal: true }).decode(input),
    );
    const result = checkLevel(level, {
      ignoreSource,
      interruptiblePattern,
      triangleshot,
    });
    const { barCache, beatCache } = level;
    let count = 0;
    for (const [key, desc] of descs) {
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
  })
  .parse();
