function partitionPoint<T>(
  arr: readonly T[],
  pred: (value: T, index: number, arr: readonly T[]) => boolean,
): number {
  let l = 0;
  let r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (pred(arr[m], m, arr)) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return l;
}

export type TimeCache = [bar: number, beat: number, cpb: number][];

// deno-lint-ignore no-explicit-any
export function initBarCache(events: any[]): TimeCache {
  const cpbs = new Map<number, number>([
    [0, 8],
  ]);
  for (const event of events) {
    if (event.if || event.tag) {
      continue;
    }
    switch (event.type) {
      case "SetCrotchetsPerBar":
        cpbs.set(event.bar - 1, event.crotchetsPerBar);
        break;
    }
  }
  const result: TimeCache = [];
  let cbar = 0;
  let cbeat = 0;
  let ccpb = 0;
  for (const [bar, cpb] of cpbs) {
    if (cpb === ccpb) {
      continue;
    }
    cbeat += (bar - cbar) * ccpb;
    cbar = bar;
    ccpb = cpb;
    result.push([cbar, cbeat, ccpb]);
  }
  return result;
}

export function barToBeat(barCache: TimeCache, bar: number): number {
  const [cbar, cbeat, ccpb] =
    barCache[partitionPoint(barCache, ([cbar]) => cbar <= bar) - 1];
  return cbeat + (bar - cbar) * ccpb;
}

export function beatToBar(
  barCache: TimeCache,
  beat: number,
): [bar: number, beat: number] {
  const [cbar, cbeat, ccpb] =
    barCache[partitionPoint(barCache, ([, cbeat]) => cbeat <= beat) - 1];
  const dbeat = beat - cbeat;
  const rbeat = dbeat % ccpb;
  return [cbar + (dbeat - rbeat) / ccpb, rbeat];
}

// deno-lint-ignore no-explicit-any
export function initBeatCache(barCache: TimeCache, events: any[]): TimeCache {
  const spbs = new Map<number, number>([
    [0, 60 / (events.find((event) => event.type === "PlaySong")?.bpm ?? 100)],
  ]);
  for (const event of events) {
    if (event.if || event.tag) {
      continue;
    }
    switch (event.type) {
      case "PlaySong":
        spbs.set(
          barToBeat(barCache, event.bar - 1) + (event.beat - 1),
          60 / event.bpm,
        );
        break;
      case "SetBeatsPerMinute":
        spbs.set(
          barToBeat(barCache, event.bar - 1) + (event.beat - 1),
          60 / event.beatsPerMinute,
        );
        break;
    }
  }
  const result: TimeCache = [];
  let cbeat = 0;
  let ctime = 0;
  let cspb = 0;
  for (const [beat, spb] of spbs) {
    if (spb === cspb) {
      continue;
    }
    ctime += (beat - cbeat) * cspb;
    cbeat = beat;
    cspb = spb;
    result.push([cbeat, ctime, cspb]);
  }
  return result;
}

export function beatToTime(
  beatCache: TimeCache,
  beat: number,
): [time: number, spb: number] {
  const [cbeat, ctime, cspb] =
    beatCache[partitionPoint(beatCache, ([cbeat]) => cbeat <= beat) - 1];
  return [ctime + (beat - cbeat) * cspb, cspb];
}

export function timeToBeat(beatCache: TimeCache, time: number): number {
  const [cbeat, ctime, cspb] =
    beatCache[partitionPoint(beatCache, ([, ctime]) => ctime <= time) - 1];
  return cbeat + (time - ctime) / cspb;
}
