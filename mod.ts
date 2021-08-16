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
  } = checkLevel(await readText(Deno.stdin), {
    ignoreSource,
    keepPattern
  });
  const errorTypes: [number[], string][] = [
    [invalidNormalCues, "Invalid oneshot cue"],
    [invalidSquareCues, "Invalid squareshot cue"],
    [unexpectedSkipshots, "Unexpected skipshot"],
    [overlappingSkipshots, "Overlapping skipshot"],
    [unexpectedFreezeshots, "Unexpected freezeshot"],
    [overlappingFreezeshots, "Overlapping freezeshot"],
    [uncuedHits, "Uncued hit"],
    [skippedHits, "Skipped hit"],
    [missingHits, "Missing hit"]
  ];
  let errors = 0;
  for (const [pos, desc] of errorTypes) {
    if (pos.length === 0)
      continue;
    errors += pos.length;
    console.log(`${desc}: ${pos.map(time => `${time.toFixed(3)}s`).join(", ")}`);
  }
  if (errors !== 0)
    Deno.exit(1);
}
