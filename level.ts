import type * as RD from "./deps/rd_schema/level.d.ts";

import { parseRDLevel } from "./rdlevel_parser.ts";
import {
  barToBeat,
  beatToTime,
  type CpbChange,
  getCpbChanges,
  getTempoChanges,
  type TempoChange,
} from "./time.ts";

export type CueType = typeof cueTypes[number];
const cueTypes = [1, 2, 3, 4, 5, "go", "stop", "get", "set"] as const;
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
  "SayReadyGetSetGo": [null, null, "get", "set", "go"],
});
export type CueSource = typeof cueSources[number];
const cueSources = ["nurse", "ian"] as const;
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

export interface OneshotCue {
  time: number;
  type: CueType;
  source: CueSource;
}

export interface OneshotBeat {
  time: number;
  skipshot: boolean;
  start: number;
  delay: number;
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

interface Freetime {
  offset: number;
  cpb: number;
  beat: number;
  pulse: number;
}

export function parseLevel(level: string): Level {
  const { rows, events } = parseRDLevel(level) as RD.Level;
  const enabledRows = new Set<number>();
  for (const { row, muteBeats } of rows) {
    if (!muteBeats) {
      enabledRows.add(row);
    }
  }
  const activeEvents = events
    .filter((event) => event.active !== false)
    .sort((a, b) => a.bar - b.bar);
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
    const beatAndCpb = barToBeat(cpbChanges, event.bar - 1);
    const beat = beatAndCpb.beat + (event.beat - 1);
    const cpb = beatAndCpb.cpb;
    switch (event.type) {
      case "SayReadyGetSetGo": {
        const tick = event.tick;
        const parts = cueTypeMap[event.phraseToSay ?? "SayReadyGetSetGo"] ?? [];
        const source = cueSourceMap[event.voiceSource ?? "Nurse"] ?? "nurse";
        const { time, beatLength } = beatToTime(tempoChanges, beat);
        for (const [pos, part] of parts.entries()) {
          if (part !== null) {
            oneshotCues.push({
              time: time + (tick * pos) * beatLength,
              type: part,
              source,
            });
          }
        }
        break;
      }
      case "AddOneshotBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const {
          tick,
          loops = 0,
          interval = 0,
          delay = 0,
          skipshot = false,
        } = event;
        const { time, beatLength } = beatToTime(tempoChanges, beat);
        for (let pos = 0; pos <= loops; pos++) {
          oneshotBeats.push({
            time: time +
              (interval * pos + (delay ? interval - delay : tick)) * beatLength,
            skipshot: skipshot && pos === loops,
            start: time + (interval * pos) * beatLength,
            delay: delay * beatLength,
          });
          hits.push(
            time + (interval * pos + (delay ? interval : tick)) * beatLength,
          );
        }
        break;
      }
      case "AddClassicBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const { tick, hold = 0 } = event;
        addClassicBeat(beat + tick * 6, hold);
        break;
      }
      case "AddFreeTimeBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const { pulse, hold = 0 } = event;
        if (pulse === 6) {
          addClassicBeat(beat, hold);
          break;
        }
        freetimes.push({
          offset: beat - (event.bar * cpb + event.beat),
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
        const { action, customPulse, hold = 0 } = event;
        let remaining = 0;
        for (const freetime of freetimes) {
          const beat = freetime.offset + event.bar * freetime.cpb + event.beat;
          if (beat > freetime.beat) {
            switch (action) {
              default:
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
    cueTypes.indexOf(a.type) - cueTypes.indexOf(b.type) ||
    cueSources.indexOf(a.source) - cueSources.indexOf(b.source)
  );
  oneshotBeats.sort((a, b) =>
    a.time - b.time ||
    Number(a.skipshot) - Number(b.skipshot) ||
    a.start - b.start ||
    a.delay - b.delay
  );
  hits.sort((a, b) => a - b);
  holds.sort((a, b) => a.hit - b.hit || a.release - b.release);
  return { cpbChanges, tempoChanges, oneshotCues, oneshotBeats, hits, holds };
}
