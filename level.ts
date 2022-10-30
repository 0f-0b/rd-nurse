import { parseRDLevel } from "./rdlevel_parser.ts";
import {
  barToBeat,
  beatToTime,
  initBarCache,
  initBeatCache,
  type TimeCache,
} from "./time.ts";

export type CueType = typeof cueTypes[number];
const cueTypes = [1, 2, 3, 4, 5, "go", "stop", "get", "set"] as const;
const cueTypeMap = new Map<string, (CueType | null)[]>([
  ["SayReaDyGetSetGoNew", ["get", "set", "get", "set", "go"]],
  ["SayGetSetGo", ["get", "set", "go"]],
  ["SayReaDyGetSetOne", ["get", "set", "get", "set", 1]],
  ["SayGetSetOne", ["get", "set", 1]],
  ["JustSayRea", ["get"]],
  ["JustSayDy", ["set"]],
  ["JustSayGet", ["get"]],
  ["JustSaySet", ["set"]],
  ["JustSayGo", ["go"]],
  ["JustSayStop", ["stop"]],
  ["JustSayAndStop", ["stop"]],
  ["Count1", [1]],
  ["Count2", [2]],
  ["Count3", [3]],
  ["Count4", [4]],
  ["Count5", [5]],
  ["SayReadyGetSetGo", [null, null, "get", "set", "go"]],
]);
export type CueSource = typeof cueSources[number];
const cueSources = ["nurse", "ian"] as const;
const cueSourceMap = new Map<string | undefined, CueSource>([
  ["Nurse", "nurse"],
  ["NurseTired", "nurse"],
  ["IanExcited", "ian"],
  ["IanCalm", "ian"],
  ["IanSlow", "ian"],
]);

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
  barCache: TimeCache;
  beatCache: TimeCache;
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

declare namespace RD {
  interface Level {
    rows: Row[];
    events: Event[];
  }

  interface Row {
    row: number;
    muteBeats: boolean;
  }

  interface EventBase {
    bar: number;
    beat: number;
    if?: string;
    tag?: string;
    active?: boolean;
  }

  interface SayReadyGetSetGoEvent extends EventBase {
    type: "SayReadyGetSetGo";
    phraseToSay: string;
    voiceSource?: string;
    tick: number;
  }

  interface AddOneshotBeatEvent extends EventBase {
    type: "AddOneshotBeat";
    row: number;
    loops?: number;
    interval?: number;
    delay?: number;
    skipshot?: boolean;
    tick: number;
  }

  interface AddClassicBeatEvent extends EventBase {
    type: "AddClassicBeat";
    row: number;
    tick: number;
    hold?: number;
  }

  interface AddFreeTimeBeatEvent extends EventBase {
    type: "AddFreeTimeBeat";
    row: number;
    hold?: number;
    pulse: number;
  }

  interface PulseFreeTimeBeatEvent extends EventBase {
    type: "PulseFreeTimeBeat";
    row: number;
    hold?: number;
    action: string;
    customPulse: number;
  }

  interface FinishLevelEvent extends EventBase {
    type: "FinishLevel";
  }

  type Event =
    | SayReadyGetSetGoEvent
    | AddOneshotBeatEvent
    | AddClassicBeatEvent
    | AddFreeTimeBeatEvent
    | PulseFreeTimeBeatEvent
    | FinishLevelEvent;
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
  const barCache = initBarCache(activeEvents);
  const beatCache = initBeatCache(barCache, activeEvents);
  const oneshotCues: OneshotCue[] = [];
  const oneshotBeats: OneshotBeat[] = [];
  const hits: number[] = [];
  const holds: Hold[] = [];
  const freetimes: Freetime[] = [];
  const addClassicBeat = (beat: number, hold: number) => {
    const [hit] = beatToTime(beatCache, beat);
    if (hold) {
      const [release] = beatToTime(beatCache, beat + hold);
      holds.push({ hit, release });
    } else {
      hits.push(hit);
    }
  };
  for (const event of activeEvents) {
    if (event.if || event.tag) {
      continue;
    }
    const [beatAtStartOfBar, cpb] = barToBeat(barCache, event.bar - 1);
    const beat = beatAtStartOfBar + (event.beat - 1);
    switch (event.type) {
      case "SayReadyGetSetGo": {
        const tick = event.tick;
        const parts = cueTypeMap.get(event.phraseToSay) ?? [];
        const source = cueSourceMap.get(event.voiceSource) ?? "nurse";
        const [time, spb] = beatToTime(beatCache, beat);
        for (let i = 0, len = parts.length; i < len; i++) {
          const part = parts[i];
          if (part !== null) {
            oneshotCues.push({
              time: time + (tick * i) * spb,
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
        const [time, spb] = beatToTime(beatCache, beat);
        for (let i = 0; i <= loops; i++) {
          oneshotBeats.push({
            time: time +
              (interval * i + (delay ? interval - delay : tick)) * spb,
            skipshot: skipshot && i === loops,
            start: time + (interval * i) * spb,
            delay: delay * spb,
          });
          hits.push(time + (interval * i + (delay ? interval : tick)) * spb);
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
        const [time] = beatToTime(beatCache, beat);
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
  return { barCache, beatCache, oneshotCues, oneshotBeats, hits, holds };
}
