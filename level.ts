import type * as RD from "./deps/rd_schema/level.d.ts";

import { parseRDJson } from "./rd_json_parser.ts";
import {
  barToBeat,
  beatToTime,
  type CpbChange,
  getCpbChanges,
  getTempoChanges,
  type TempoChange,
} from "./time.ts";

const cueTypes = ["go", "stop", "get", "set"] as const;
export type CueType = typeof cueTypes[number] | number;

function compareCueTypesForSorting(a: CueType, b: CueType): number {
  return typeof a === "number"
    ? (typeof b === "number" ? a - b : -1)
    : (typeof b === "number" ? 1 : cueTypes.indexOf(a) - cueTypes.indexOf(b));
}

const cueTypeMap = Object.freeze<
  Partial<
    Record<
      NonNullable<RD.SayReadyGetSetGoEvent["phraseToSay"]>,
      (CueType | null)[]
    >
  >
>({
  // @ts-expect-error Remove prototype
  __proto__: null,
  "SayReaDyGetSetGoNew": ["get", "set", "get", "set", "go"],
  "SayGetSetGo": ["get", "set", "go"],
  "SayReaDyGetSetOne": ["get", "set", "get", "set", 1],
  "SayGetSetOne": ["get", "set", 1],
  "JustSayRea": ["get"],
  "JustSayDy": ["set"],
  "JustSayGet": ["get"],
  "JustSaySet": ["set"],
  "JustSayGo": ["go"],
  "JustSayStop": ["stop"],
  "JustSayAndStop": ["stop"],
  "Count1": [1],
  "Count2": [2],
  "Count3": [3],
  "Count4": [4],
  "Count5": [5],
  "Count6": [6],
  "Count7": [7],
  "Count8": [8],
  "Count9": [9],
  "Count10": [10],
  "SayReadyGetSetGo": [null, null, "get", "set", "go"],
});

const cueSources = ["nurse", "ian"] as const;
export type CueSource = typeof cueSources[number];

function compareCueSourcesForSorting(a: CueSource, b: CueSource): number {
  return cueSources.indexOf(a) - cueSources.indexOf(b);
}

const cueSourceMap = Object.freeze<
  Partial<
    Record<NonNullable<RD.SayReadyGetSetGoEvent["voiceSource"]>, CueSource>
  >
>({
  // @ts-expect-error Remove prototype
  __proto__: null,
  "Nurse": "nurse",
  "NurseTired": "nurse",
  "IanExcited": "ian",
  "IanCalm": "ian",
  "IanSlow": "ian",
});
const countingSourceMap = Object.freeze<
  Partial<
    Record<NonNullable<RD.SetCountingSoundEvent["voiceSource"]>, CueSource>
  >
>({
  // @ts-expect-error Remove prototype
  __proto__: null,
  "JyiCountEnglish": "nurse",
  "IanCountEnglish": "ian",
  "IanCountEnglishCalm": "ian",
  "IanCountEnglishSlow": "ian",
});

export interface OneshotCue {
  time: number;
  type: CueType;
  source: CueSource;
}

export interface OneshotBeat {
  time: number;
  skipshot: boolean;
  delay: number;
  interval: number;
}

export interface Hold {
  hit: number;
  release: number;
}

export interface Level {
  cpbChanges: CpbChange[];
  tempoChanges: TempoChange[];
  oneshotCues: OneshotCue[];
  oneshotBeats: OneshotBeat[];
  hits: number[];
  holds: Hold[];
}

interface CountingSound {
  source: CueSource;
  subdivOffset: number;
}

interface Freetime {
  offset: number;
  cpb: number;
  beat: number;
  pulse: number;
}

export function parseLevel(level: string): Level {
  const { rows, events } = parseRDJson(level) as RD.Level;
  const enabledRows = new Set<number>();
  for (const { row, muteBeats } of rows) {
    if (!muteBeats) {
      enabledRows.add(row);
    }
  }
  const rowCountingSound = new Map<number, CountingSound>();
  const activeEvents = events
    .filter((event) => event.active !== false)
    .sort(({ bar: a = 1 }, { bar: b = 1 }) => a - b);
  const cpbChanges = getCpbChanges(activeEvents);
  const tempoChanges = getTempoChanges(cpbChanges, activeEvents);
  const oneshotCues: OneshotCue[] = [];
  const oneshotBeats: OneshotBeat[] = [];
  const hits: number[] = [];
  const holds: Hold[] = [];
  const freetimes: Freetime[] = [];
  const addClassicBeat = (beat: number, hold: number) => {
    const { time: hit } = beatToTime(tempoChanges, beat);
    if (hold) {
      const { time: release } = beatToTime(tempoChanges, beat + hold);
      holds.push({ hit, release });
    } else {
      hits.push(hit);
    }
  };
  for (const event of activeEvents) {
    if (event.if || event.tag) {
      continue;
    }
    const { bar: eventBar = 1 } = event;
    let { beat, cpb } = barToBeat(cpbChanges, eventBar - 1);
    switch (event.type) {
      case "SayReadyGetSetGo": {
        const {
          beat: eventBeat = 1,
          phraseToSay = "SayReadyGetSetGo",
          voiceSource = "Nurse",
          tick = 1,
        } = event;
        beat += eventBeat - 1;
        const parts = cueTypeMap[phraseToSay] ?? [];
        const source = cueSourceMap[voiceSource] ?? "nurse";
        for (const [pos, part] of parts.entries()) {
          if (part !== null) {
            const { time } = beatToTime(tempoChanges, beat + tick * pos);
            oneshotCues.push({ time, type: part, source });
          }
        }
        break;
      }
      case "SetCountingSound": {
        const { voiceSource = "JyiCount", enabled, subdivOffset = 0.5 } = event;
        const source = enabled ? countingSourceMap[voiceSource] : undefined;
        if (source === undefined) {
          rowCountingSound.delete(event.row);
        } else {
          rowCountingSound.set(event.row, { source, subdivOffset });
        }
        break;
      }
      case "AddOneshotBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        let {
          beat: eventBeat = 1,
          tick = 1,
          loops = 0,
          interval = 0,
          delay = 0,
          pulseType = "Wave",
          subdivisions = 1,
          freezeBurnMode = "None",
          skipshot = false,
        } = event;
        beat += eventBeat - 1;
        if (freezeBurnMode === "None" && delay > 0) {
          freezeBurnMode = "Freezeshot";
          interval -= delay;
          beat += interval - tick;
        }
        if (freezeBurnMode === "Burnshot") {
          const halfInterval = interval / 2;
          delay = tick - halfInterval;
          tick = halfInterval;
        }
        if (pulseType === "Square" || pulseType === "Triangle") {
          const countingSound = rowCountingSound.get(event.row);
          if (countingSound) {
            const { source, subdivOffset } = countingSound;
            const cueOffset = pulseType === "Square" ? 0 : subdivOffset * tick;
            const { time } = beatToTime(tempoChanges, beat - cueOffset);
            oneshotCues.push({ time, type: subdivisions, source });
          }
        }
        const subinterval = tick / subdivisions;
        for (let pos = 0; pos <= loops; pos++) {
          for (let subdiv = 0; subdiv < subdivisions; subdiv++) {
            const baseOffset = interval * pos + subinterval * subdiv + tick;
            const isLastHit = pos === loops && subdiv === subdivisions - 1;
            const { time } = beatToTime(tempoChanges, beat + baseOffset);
            const { time: hit } = beatToTime(
              tempoChanges,
              beat + baseOffset + delay,
            );
            const { time: prev } = beatToTime(
              tempoChanges,
              beat + baseOffset - interval,
            );
            oneshotBeats.push({
              time,
              skipshot: skipshot && isLastHit,
              delay: hit - time,
              interval: hit === time ? NaN : time - prev,
            });
            hits.push(hit);
          }
        }
        break;
      }
      case "AddClassicBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const { beat: eventBeat = 1, tick = 1, hold = 0 } = event;
        beat += eventBeat - 1;
        addClassicBeat(beat + tick * 6, hold);
        break;
      }
      case "AddFreeTimeBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const { beat: eventBeat = 1, pulse = 0, hold = 0 } = event;
        beat += eventBeat - 1;
        if (pulse === 6) {
          addClassicBeat(beat, hold);
          break;
        }
        freetimes.push({
          offset: beat - (eventBar * cpb + eventBeat),
          cpb,
          beat,
          pulse,
        });
        break;
      }
      case "PulseFreeTimeBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const {
          beat: eventBeat = 1,
          action = "Decrement",
          customPulse = 0,
          hold = 0,
        } = event;
        let remaining = 0;
        for (const freetime of freetimes) {
          const beat = freetime.offset + eventBar * freetime.cpb + eventBeat;
          if (beat > freetime.beat) {
            switch (action) {
              case "Increment":
                freetime.pulse++;
                break;
              case "Decrement":
                if (freetime.pulse !== 0) {
                  freetime.pulse--;
                }
                break;
              case "Custom":
                freetime.pulse = customPulse;
                break;
              case "Remove":
                continue;
            }
            if (freetime.pulse === 6) {
              addClassicBeat(beat, hold);
              continue;
            }
          }
          freetimes[remaining++] = freetime;
        }
        freetimes.length = remaining;
        break;
      }
      case "FinishLevel": {
        const { beat: eventBeat = 1 } = event;
        beat += eventBeat - 1;
        const { time } = beatToTime(tempoChanges, beat);
        for (const source of cueSources) {
          oneshotCues.push({ time, type: "stop", source });
        }
        break;
      }
    }
  }
  oneshotCues.sort((a, b) =>
    a.time - b.time ||
    compareCueTypesForSorting(a.type, b.type) ||
    compareCueSourcesForSorting(a.source, b.source)
  );
  oneshotBeats.sort((a, b) =>
    a.time - b.time || Number(a.skipshot) - Number(b.skipshot)
  );
  hits.sort((a, b) => a - b);
  holds.sort((a, b) => a.hit - b.hit || a.release - b.release);
  return { cpbChanges, tempoChanges, oneshotCues, oneshotBeats, hits, holds };
}
