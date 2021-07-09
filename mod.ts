import { checkBeats } from "./beat.ts";
import type { ExpectedBeat } from "./cue.ts";
import { playCues } from "./cue.ts";
import { parse } from "./deps/std/flags.ts";
import type { Error, ErrorType } from "./error.ts";
import { sortErrors } from "./error.ts";
import { readText } from "./io.ts";
import type { Beat, Cue, CueSource, CueType } from "./level.ts";
import { parseLevel } from "./level.ts";

export type { Beat, Cue, CueSource, CueType, Error, ErrorType, ExpectedBeat };
export { checkBeats, parseLevel, playCues };

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
Usage: deno run ${import.meta.url} [options]

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
  const { cues, beats } = parseLevel(await readText(Deno.stdin));
  const { expected, errors: cueErrors } = playCues(cues, {
    ignoreSource,
    keepPattern
  });
  const { errors: beatErrors } = checkBeats(beats, expected);
  const errors = sortErrors([...cueErrors, ...beatErrors]);
  if (errors.length !== 0) {
    for (const { type, time } of errors)
      switch (type) {
        case "uncued_hit":
          console.error(`Uncued hit at ${time.toFixed(3)}s`);
          break;
        case "skipped_hit":
          console.error(`Hit at ${time.toFixed(3)}s is skipped by a previous skipshot`);
          break;
        case "missing_hit":
          console.error(`Missing hit at ${time.toFixed(3)}s`);
          break;
        case "unrecognized_normal":
          console.error(`Unrecognized oneshot cue at ${time.toFixed(3)}s`);
          break;
        case "unrecognized_square":
          console.error(`Unrecognized squareshot cue at ${time.toFixed(3)}s`);
          break;
        case "unexpected_skipshot":
          console.error(`Unexpected skipshot at ${time.toFixed(3)}s`);
          break;
        case "overlapping_skipshot":
          console.error(`Overlapping skipshot at ${time.toFixed(3)}s`);
          break;
        default:
          throw ((_: never) => new TypeError("Non-exhaustive switch"))(type);
      }
    Deno.exit(1);
  }
}
