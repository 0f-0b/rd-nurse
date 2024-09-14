import type * as RD from "./deps/rd_schema/level.d.ts";

import { partitionPoint } from "./collections/partition_point.ts";

export interface CpbChange {
  bar: number;
  beat: number;
  cpb: number;
}

export function getCpbChanges(events: readonly RD.Event[]): CpbChange[] {
  const cpbChanges = new Map([[0, 8]]);
  for (const event of events) {
    if (event.if || event.tag) {
      continue;
    }
    const { bar: eventBar = 1 } = event;
    switch (event.type) {
      case "SetCrotchetsPerBar": {
        const { crotchetsPerBar = 8 } = event;
        cpbChanges.set(eventBar - 1, crotchetsPerBar);
        break;
      }
    }
  }
  const result: CpbChange[] = [];
  let bar = 0;
  let beat = 0;
  let cpb = 0;
  for (const [newBar, newCpb] of cpbChanges) {
    if (newCpb === cpb) {
      continue;
    }
    beat += (newBar - bar) * cpb;
    bar = newBar;
    cpb = newCpb;
    result.push({ bar, beat, cpb });
  }
  return result;
}

export function barToBeat(
  cpbChanges: readonly CpbChange[],
  bar: number,
): { beat: number; cpb: number } {
  const lastCpbChange = cpbChanges[
    partitionPoint(cpbChanges, (change) => change.bar <= bar) - 1
  ];
  return {
    beat: lastCpbChange.beat + (bar - lastCpbChange.bar) * lastCpbChange.cpb,
    cpb: lastCpbChange.cpb,
  };
}

export interface BarAndBeat {
  bar: number;
  beat: number;
}

export function beatToBar(
  cpbChanges: readonly CpbChange[],
  beat: number,
): BarAndBeat {
  const lastCpbChange = cpbChanges[
    partitionPoint(cpbChanges, (change) => change.beat <= beat) - 1
  ];
  const beatFromLastCpbChange = beat - lastCpbChange.beat;
  const beatFromStartOfBar = beatFromLastCpbChange % lastCpbChange.cpb;
  return {
    bar: lastCpbChange.bar +
      (beatFromLastCpbChange - beatFromStartOfBar) / lastCpbChange.cpb,
    beat: beatFromStartOfBar,
  };
}

export interface TempoChange {
  beat: number;
  time: number;
  beatLength: number;
}

export function getTempoChanges(
  cpbChanges: readonly CpbChange[],
  events: readonly RD.Event[],
): TempoChange[] {
  const firstSong = events.find((event) => event.type === "PlaySong");
  const bpmChanges = new Map([[0, firstSong?.bpm ?? 100]]);
  for (const event of events) {
    if (event.if || event.tag) {
      continue;
    }
    const { bar: eventBar = 1, beat: eventBeat = 1 } = event;
    const beatAndCpb = barToBeat(cpbChanges, eventBar - 1);
    const beat = beatAndCpb.beat + (eventBeat - 1);
    switch (event.type) {
      case "PlaySong":
        bpmChanges.set(beat, event.bpm ?? 100);
        break;
      case "SetBeatsPerMinute":
        bpmChanges.set(beat, event.beatsPerMinute ?? 100);
        break;
    }
  }
  const result: TempoChange[] = [];
  let beat = 0;
  let time = 0;
  let beatLength = 0;
  for (const [newBeat, newBpm] of bpmChanges) {
    const newBeatLength = 60 / newBpm;
    if (newBeatLength === beatLength) {
      continue;
    }
    time += (newBeat - beat) * beatLength;
    beat = newBeat;
    beatLength = newBeatLength;
    result.push({ beat, time, beatLength });
  }
  return result;
}

export function beatToTime(
  tempoChanges: readonly TempoChange[],
  beat: number,
): { time: number; beatLength: number } {
  const lastTempoChange = tempoChanges[
    partitionPoint(tempoChanges, (change) => change.beat <= beat) - 1
  ];
  return {
    time: lastTempoChange.time +
      (beat - lastTempoChange.beat) * lastTempoChange.beatLength,
    beatLength: lastTempoChange.beatLength,
  };
}

export function timeToBeat(
  tempoChanges: readonly TempoChange[],
  time: number,
): number {
  const lastTempoChange = tempoChanges[
    partitionPoint(tempoChanges, (change) => change.time <= time) - 1
  ];
  return lastTempoChange.beat +
    (time - lastTempoChange.time) / lastTempoChange.beatLength;
}
