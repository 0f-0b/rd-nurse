import { Command } from "./deps/cliffy/command.ts";
import { joinToString } from "./deps/std/collections/join_to_string.ts";
import { readAllSync } from "./deps/std/streams/conversion.ts";
import {
  beatToBar,
  checkLevel,
  type CheckLevelResult,
  formatTime,
  parseLevel,
  timeToBeat,
} from "./mod.ts";

await new Command()
  .name("rd-nurse")
  .usage("[options]")
  .description(
    "Checks a Rhythm Doctor level for illegal oneshots and holds.\n\nThe level is read from stdin.",
  )
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
  .action(({ ignoreSource, interruptiblePattern, triangleshot }) => {
    type ResultKey = keyof CheckLevelResult;
    const descs: { [K in ResultKey]: string } = {
      invalidCues: "Invalid cue",
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
  })
  .parse();
