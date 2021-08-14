import { almostEqual, unique } from "./util.ts";

export type CueType = typeof cueTypes[number];
const cueTypes = [1, "go", "stop", "get", "set"] as const;
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
  ["SayReadyGetSetGo", [undefined, undefined, "get", "set", "go"]]
]);
export type CueSource = typeof cueSources[number];
const cueSources = ["nurse", "ian"] as const;
const cueSourceMap = new Map<string, CueSource>([
  ["Nurse", "nurse"],
  ["NurseTired", "nurse"],
  ["IanExcited", "ian"],
  ["IanCalm", "ian"],
  ["IanSlow", "ian"]
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
  cues: Cue[];
  beats: Beat[];
}

export function parseLevel(level: string): Level {
  const { rows, events } = JSON.parse(level.replace(/^\ufeff/, "").replace(/\r|,\s*(?=[}\]])/g, ""));
  const cues: Cue[] = [];
  const beats: Beat[] = [];
  const enabledRows = new Set<number>();
  for (const { row, muteBeats } of rows)
    if (!muteBeats)
      enabledRows.add(row);
  const activeEvents = events
    .filter((event: { active?: boolean; }) => event.active !== false)
    .sort((a: { bar: number; }, b: { bar: number; }) => a.bar - b.bar);
  let bar = 1;
  let barTime = 0;
  let secondsPerBeat = 60 / (activeEvents.find((event: { type: string; }) => event.type === "PlaySong")?.bpm ?? 100);
  let crotchetsPerBar = 8;
  for (const event of activeEvents) {
    if (event.if || event.tag)
      continue;
    barTime += (event.bar - bar) * crotchetsPerBar * secondsPerBeat;
    bar = event.bar;
    switch (event.type) {
      case "PlaySong":
        secondsPerBeat = 60 / event.bpm;
        break;
      case "SetCrotchetsPerBar":
        crotchetsPerBar = event.crotchetsPerBar;
        break;
      case "SetBeatsPerMinute":
        secondsPerBeat = 60 / event.beatsPerMinute;
        break;
      case "SayReadyGetSetGo": {
        const tick = event.tick;
        const parts = cueTypeMap.get(event.phraseToSay) ?? [];
        const source = cueSourceMap.get(event.voiceSource) ?? "nurse";
        const beat = event.beat - 1;
        for (let i = 0, len = parts.length; i < len; i++) {
          const part = parts[i];
          if (part !== undefined)
            cues.push({ time: barTime + (beat + tick * i) * secondsPerBeat, type: part, source });
        }
        break;
      }
      case "AddOneshotBeat": {
        if (!enabledRows.has(event.row))
          break;
        const tick = event.tick;
        const loops = event.loops ?? 0;
        const interval = event.interval ?? 0;
        const delay = event.delay ?? 0;
        const skipshot = event.skipshot ?? false;
        const startBeat = event.beat - 1;
        const hitBeat = startBeat + (delay ? interval - delay : tick);
        for (let i = 0; i <= loops; i++)
          beats.push({
            time: barTime + (hitBeat + interval * i) * secondsPerBeat,
            skipshot: skipshot && i === loops,
            start: barTime + (startBeat + interval * i) * secondsPerBeat,
            delay: delay * secondsPerBeat
          });
        break;
      }
    }
  }
  cues.sort((a, b) => cueTypes.indexOf(a.type) - cueTypes.indexOf(b.type) || cueSources.indexOf(a.source) - cueSources.indexOf(b.source) || a.time - b.time);
  unique(cues, (a, b) => a.type === b.type && a.source === b.source && almostEqual(a.time, b.time));
  cues.sort((a, b) => a.time - b.time);
  beats.sort((a, b) => (a.skipshot ? 1 : 0) - (b.skipshot ? 1 : 0) || a.time - b.time);
  unique(beats, (a, b) => a.skipshot === b.skipshot && almostEqual(a.time, b.time));
  beats.sort((a, b) => a.time - b.time);
  return { cues, beats };
}
