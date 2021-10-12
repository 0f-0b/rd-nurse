import { CheckBeatsResult } from "./beat.ts";
import { checkBeats } from "./beat.ts";
import type { ExpectedBeat, PlayCuesOptions, PlayCuesResult } from "./cue.ts";
import { playCues } from "./cue.ts";
import { parse } from "./deps/std/flags.ts";
import { readText } from "./io.ts";
import type { Beat, Cue, CueSource, CueType, Level } from "./level.ts";
import { parseLevel } from "./level.ts";
import type { TimeCache } from "./time.ts";
import { barToBeat, beatToBar, beatToTime, timeToBeat } from "./time.ts";
import { joinToString } from "./util.ts";

export type {
  Beat,
  CheckBeatsResult,
  Cue,
  CueSource,
  CueType,
  ExpectedBeat,
  Level,
  PlayCuesOptions,
  PlayCuesResult,
  TimeCache,
};
export {
  barToBeat,
  beatToBar,
  beatToTime,
  checkBeats,
  parseLevel,
  playCues,
  timeToBeat,
};

export interface CheckLevelResult {
  barCache: TimeCache;
  beatCache: TimeCache;
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

export function checkLevel(
  level: string,
  options?: PlayCuesOptions,
): CheckLevelResult {
  const { barCache, beatCache, cues, beats } = parseLevel(level);
  const { expected, invalidNormalCues, invalidSquareCues } = playCues(
    cues,
    options,
  );
  const {
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits,
  } = checkBeats(beats, expected);
  return {
    barCache,
    beatCache,
    invalidNormalCues,
    invalidSquareCues,
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits,
  };
}

export function formatTime([bar, beat]: [number, number]): string {
  return `${bar + 1}-${Math.round((beat + 1) * 1000) / 1000}`;
}

if (import.meta.main) {
  const {
    "ignore-source": ignoreSource,
    "keep-pattern": keepPattern,
    "triangleshot": triangleshot,
    "help": help,
  } = parse(Deno.args, {
    boolean: [
      "ignore-source",
      "keep-pattern",
      "triangleshot",
      "help",
    ],
    alias: {
      s: "ignore-source",
      p: "keep-pattern",
      t: "triangleshot",
      h: "help",
    },
  });
  if (help) {
    console.log(`
Usage: rd-nurse [options]

Options:
    -s, --ignore-source
        ignore the voice sources of the cues
    -p, --keep-pattern
        continue the oneshot pattern after squareshots
    -t, --triangleshot
        enable triangleshots
    -h, --help
        show this help message

The level is read from stdin.
`.substring(1));
    Deno.exit(0);
  }

  const {
    barCache,
    beatCache,
    invalidNormalCues,
    invalidSquareCues,
    unexpectedSkipshots,
    overlappingSkipshots,
    unexpectedFreezeshots,
    overlappingFreezeshots,
    uncuedHits,
    skippedHits,
    missingHits,
  } = checkLevel(await readText(Deno.stdin), {
    ignoreSource,
    keepPattern,
    triangleshot,
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
    [missingHits, "Missing hit"],
  ];
  let errors = 0;
  for (const [pos, desc] of errorTypes) {
    if (pos.length === 0) {
      continue;
    }
    errors += pos.length;
    console.log(
      joinToString(
        pos,
        (time) => formatTime(beatToBar(barCache, timeToBeat(beatCache, time))),
        {
          separator: ", ",
          prefix: desc + ": ",
        },
      ),
    );
  }
  if (errors !== 0) {
    Deno.exit(1);
  }
}
