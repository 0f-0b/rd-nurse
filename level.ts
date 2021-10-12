import type { TimeCache } from "./time.ts";
import { barToBeat, beatToTime, initBarCache, initBeatCache } from "./time.ts";
import { almostEqual, unique } from "./util.ts";

export type CueType = typeof cueTypes[number];
const cueTypes = [1, 2, "go", "stop", "get", "set"] as const;
const cueTypeMap = new Map<string, (CueType | undefined)[]>([
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
  ["SayReadyGetSetGo", [undefined, undefined, "get", "set", "go"]],
]);
export type CueSource = typeof cueSources[number];
const cueSources = ["nurse", "ian"] as const;
const cueSourceMap = new Map<string, CueSource>([
  ["Nurse", "nurse"],
  ["NurseTired", "nurse"],
  ["IanExcited", "ian"],
  ["IanCalm", "ian"],
  ["IanSlow", "ian"],
]);

export interface Cue {
  time: number;
  type: CueType;
  source: CueSource;
}

export interface Beat {
  time: number;
  skipshot: boolean;
  start: number;
  delay: number;
}

export interface Level {
  barCache: TimeCache;
  beatCache: TimeCache;
  cues: Cue[];
  beats: Beat[];
}

export function parseLevel(level: string): Level {
  const { rows, events } = JSON.parse(
    level.replace(/^\ufeff/, "").replace(/[\t\r]|,\s*(?=[}\]])/g, ""),
  );
  const cues: Cue[] = [];
  const beats: Beat[] = [];
  const enabledRows = new Set<number>();
  for (const { row, muteBeats } of rows) {
    if (!muteBeats) {
      enabledRows.add(row);
    }
  }
  const activeEvents = events
    .filter((event: { active?: boolean }) => event.active !== false)
    .sort((a: { bar: number }, b: { bar: number }) => a.bar - b.bar);
  const barCache = initBarCache(activeEvents);
  const beatCache = initBeatCache(barCache, activeEvents);
  for (const event of activeEvents) {
    if (event.if || event.tag) {
      continue;
    }
    const beat = barToBeat(barCache, event.bar - 1) + (event.beat - 1);
    const [time, spb] = beatToTime(beatCache, beat);
    switch (event.type) {
      case "SayReadyGetSetGo": {
        const tick = event.tick;
        const parts = cueTypeMap.get(event.phraseToSay) ?? [];
        const source = cueSourceMap.get(event.voiceSource) ?? "nurse";
        for (let i = 0, len = parts.length; i < len; i++) {
          const part = parts[i];
          if (part !== undefined) {
            cues.push({ time: time + (tick * i) * spb, type: part, source });
          }
        }
        break;
      }
      case "AddOneshotBeat": {
        if (!enabledRows.has(event.row)) {
          break;
        }
        const tick = event.tick;
        const loops = event.loops ?? 0;
        const interval = event.interval ?? 0;
        const delay = event.delay ?? 0;
        const skipshot = event.skipshot ?? false;
        for (let i = 0; i <= loops; i++) {
          beats.push({
            time: time +
              (interval * i + (delay ? interval - delay : tick)) * spb,
            skipshot: skipshot && i === loops,
            start: time + (interval * i) * spb,
            delay: delay * spb,
          });
        }
        break;
      }
      case "FinishLevel": {
        for (const source of cueSources) {
          cues.push({ time, type: "stop", source });
        }
        break;
      }
    }
  }
  cues.sort((a, b) =>
    cueTypes.indexOf(a.type) - cueTypes.indexOf(b.type) ||
    cueSources.indexOf(a.source) - cueSources.indexOf(b.source) ||
    a.time - b.time
  );
  unique(
    cues,
    (a, b) =>
      a.type === b.type && a.source === b.source && almostEqual(a.time, b.time),
  ).sort((a, b) => a.time - b.time);
  unique(
    beats.sort((a, b) =>
      Number(a.skipshot) - Number(b.skipshot) || a.time - b.time
    ),
    (a, b) => a.skipshot === b.skipshot && almostEqual(a.time, b.time),
  ).sort((a, b) => a.time - b.time);
  return { barCache, beatCache, cues, beats };
}
