import { CheckBeatsResult } from "./beat.ts";
import { checkBeats } from "./beat.ts";
import type { ExpectedBeat, PlayCuesOptions, PlayCuesResult } from "./cue.ts";
import { playCues } from "./cue.ts";
import { parse } from "./deps/std/flags.ts";
import { readText } from "./io.ts";
import type { Beat, Cue, CueSource, CueType, Level } from "./level.ts";
import { parseLevel } from "./level.ts";

export type { Beat, CheckBeatsResult, Cue, CueSource, CueType, ExpectedBeat, Level, PlayCuesOptions, PlayCuesResult };
export { checkBeats, parseLevel, playCues };

export interface CheckLevelResult {
  invalidNormalCues: number[];
  invalidSquareCues: number[];
  unexpectedSkipshots: number[];
  overlappingSkipshots: number[];
  unexpectedFreezeshots: number[];
  overlappingFreezeshots: number[];
  uncuedHits: number[];
  skippedHits: number[];
  missingHits: number[];
}

export function checkLevel(level: string, options?: PlayCuesOptions): CheckLevelResult {
  const { cues, beats } = parseLevel(level);
  const { expected, invalidNormalCues, invalidSquareCues } = playCues(cues, options);
  const { unexpectedSkipshots, overlappingSkipshots, unexpectedFreezeshots, overlappingFreezeshots, uncuedHits, skippedHits, missingHits } = checkBeats(beats, expected);
  return {
    invalidNormalCues,
    invalidSquareCues,
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits
  };
}

if (import.meta.main) {
  const {
    "ignore-source": ignoreSource,
    "keep-pattern": keepPattern,
    "help": help
  } = parse(Deno.args, {
    boolean: [
      "ignore-source",
      "keep-pattern",
      "help"
    ],
    alias: {
      s: "ignore-source",
      p: "keep-pattern",
      h: "help"
    }
  });
  if (help) {
    console.log(`
Usage: rd-nurse [options]

Options:
    -s, --ignore-source
        ignore the voice sources of the cues
    -p, --keep-pattern
        continue the oneshot pattern after squareshots
    -h, --help
        show this help message

The level is read from stdin.
`.substring(1));
    Deno.exit(0);
  }
  const {
    invalidNormalCues,
    invalidSquareCues,
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits
  } = checkLevel(await readText(Deno.stdin), { ignoreSource, keepPattern });
  if (invalidNormalCues.length !== 0
    || invalidSquareCues.length !== 0
    || unexpectedSkipshots.length !== 0
    || overlappingSkipshots.length !== 0
    || unexpectedFreezeshots.length !== 0
    || overlappingFreezeshots.length !== 0
    || uncuedHits.length !== 0
    || skippedHits.length !== 0
    || missingHits.length !== 0) {
    for (const time of invalidNormalCues)
      console.error(`Invalid oneshot cue at ${time.toFixed(3)}s`);
    for (const time of invalidSquareCues)
      console.error(`Invalid squareshot cue at ${time.toFixed(3)}s`);
    for (const time of unexpectedSkipshots)
      console.error(`Unexpected skipshot at ${time.toFixed(3)}s`);
    for (const time of overlappingSkipshots)
      console.error(`Overlapping skipshot at ${time.toFixed(3)}s`);
    for (const time of unexpectedFreezeshots)
      console.error(`Unexpected freezeshot at ${time.toFixed(3)}s`);
    for (const time of overlappingFreezeshots)
      console.error(`Overlapping freezeshot at ${time.toFixed(3)}s`);
    for (const time of uncuedHits)
      console.error(`Uncued hit at ${time.toFixed(3)}s`);
    for (const time of skippedHits)
      console.error(`Hit at ${time.toFixed(3)}s is skipped by a previous skipshot`);
    for (const time of missingHits)
      console.error(`Missing hit at ${time.toFixed(3)}s`);
    Deno.exit(1);
  }
}
