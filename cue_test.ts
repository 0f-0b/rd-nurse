import { assertEquals } from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { playOneshotCues, type PlayOneshotCuesResult } from "./cue.ts";

Deno.test("correct cues", () => {
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 1, type: "stop", source: "nurse" },
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "nurse" },
      { time: 4, type: "go", source: "nurse" },
      { time: 7, type: "stop", source: "nurse" },
      { time: 11, type: "set", source: "nurse" },
      { time: 12, type: "go", source: "nurse" },
      { time: 14, type: "get", source: "nurse" },
      { time: 15.5, type: "set", source: "nurse" },
      { time: 16, type: "go", source: "nurse" },
      { time: 18, type: "get", source: "nurse" },
      { time: 18.5, type: "set", source: "nurse" },
      { time: 19, type: "get", source: "nurse" },
      { time: 19.5, type: "set", source: "nurse" },
      { time: 20, type: "go", source: "nurse" },
      { time: 22, type: "get", source: "nurse" },
      { time: 22.5, type: "set", source: "nurse" },
      { time: 22.75, type: "get", source: "nurse" },
      { time: 23.25, type: "set", source: "nurse" },
      { time: 23.5, type: "set", source: "nurse" },
      { time: 24, type: "go", source: "nurse" },
      { time: 26, type: "get", source: "nurse" },
      { time: 27, type: "set", source: "nurse" },
      { time: 28, type: "go", source: "nurse" },
      { time: 32, type: 1, source: "nurse" },
      { time: 33.5, type: 2, source: "nurse" },
      { time: 39, type: "stop", source: "nurse" },
    ]),
    {
      expected: [
        { time: 5, prev: -1, next: 7 },
        { time: 7, prev: 5, next: 9 },
        { time: 13, prev: -1, next: 15 },
        { time: 15, prev: 13, next: 17 },
        { time: 17.5, prev: -1, next: 19.5 },
        { time: 19.5, prev: 17.5, next: 21.5 },
        { time: 20.5, prev: -1, next: 21.5 },
        { time: 21.5, prev: 20.5, next: 22.5 },
        { time: 22.5, prev: 21.5, next: 23.5 },
        { time: 23.5, prev: 22.5, next: 24.5 },
        { time: 24.5, prev: -1, next: 25.25 },
        { time: 25.25, prev: 24.5, next: 25.5 },
        { time: 25.5, prev: 25.25, next: 26.5 },
        { time: 26.5, prev: 25.5, next: 27.25 },
        { time: 27.25, prev: 26.5, next: 27.5 },
        { time: 27.5, prev: 27.25, next: 28.5 },
        { time: 29, prev: -1, next: 31 },
        { time: 31, prev: 29, next: 33 },
        { time: 33, prev: -1, next: -1 },
        { time: 33, prev: 31, next: 35 },
        { time: 35, prev: -1, next: -1 },
        { time: 35, prev: 33, next: 37 },
        { time: 35.5, prev: -1, next: -1 },
        { time: 37, prev: 35, next: 39 },
        { time: 39, prev: 37, next: 41 },
      ],
      result: {
        invalidCues: [],
      },
    },
  );
});

Deno.test("incorrect cues", () => {
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 0, type: "go", source: "nurse" },
      { time: 1, type: 1, source: "nurse" },
      { time: 2, type: "set", source: "nurse" },
      { time: 3, type: "set", source: "nurse" },
      { time: 4, type: "go", source: "nurse" },
      { time: 5, type: "get", source: "nurse" },
      { time: 6, type: "go", source: "nurse" },
      { time: 7, type: "stop", source: "nurse" },
      { time: 8, type: "get", source: "nurse" },
      { time: 9, type: "set", source: "nurse" },
      { time: 9.5, type: "get", source: "nurse" },
      { time: 10.5, type: "set", source: "nurse" },
      { time: 12, type: 1, source: "nurse" },
      { time: 14, type: "get", source: "nurse" },
      { time: 14, type: "set", source: "nurse" },
      { time: 16, type: 1, source: "nurse" },
    ]),
    {
      expected: [],
      result: {
        invalidCues: [0, 1, 4, 12, 16],
      },
    },
  );
});

Deno.test("ignore source", () => {
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "ian" },
      { time: 4, type: 1, source: "nurse" },
      { time: 6, type: 1, source: "ian" },
    ]),
    {
      expected: [
        { time: 9, prev: -1, next: -1 },
      ],
      result: {
        invalidCues: [4],
      },
    },
  );
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "ian" },
      { time: 4, type: 1, source: "nurse" },
      { time: 6, type: 1, source: "ian" },
    ], {
      ignoreSource: true,
    }),
    {
      expected: [
        { time: 5, prev: -1, next: -1 },
        { time: 7, prev: -1, next: -1 },
      ],
      result: {
        invalidCues: [],
      },
    },
  );
});

Deno.test("interruptible pattern", () => {
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "nurse" },
      { time: 4, type: "go", source: "nurse" },
      { time: 8, type: 1, source: "nurse" },
      { time: 11, type: "stop", source: "nurse" },
    ]),
    {
      expected: [
        { time: 5, prev: -1, next: 7 },
        { time: 7, prev: 5, next: 9 },
        { time: 9, prev: -1, next: -1 },
        { time: 9, prev: 7, next: 11 },
        { time: 11, prev: 9, next: 13 },
      ],
      result: {
        invalidCues: [],
      },
    },
  );
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "nurse" },
      { time: 4, type: "go", source: "nurse" },
      { time: 8, type: 1, source: "nurse" },
      { time: 11, type: "stop", source: "nurse" },
    ], {
      interruptiblePattern: true,
    }),
    {
      expected: [
        { time: 5, prev: -1, next: 7 },
        { time: 7, prev: 5, next: 9 },
        { time: 9, prev: -1, next: -1 },
      ],
      result: {
        invalidCues: [],
      },
    },
  );
});

Deno.test("triangleshot", () => {
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "nurse" },
      { time: 4, type: 1, source: "nurse" },
      { time: 5.5, type: 2, source: "nurse" },
    ]),
    {
      expected: [
        { time: 5, prev: -1, next: -1 },
        { time: 7, prev: -1, next: -1 },
        { time: 7.5, prev: -1, next: -1 },
      ],
      result: {
        invalidCues: [],
      },
    },
  );
  assertEquals<PlayOneshotCuesResult>(
    playOneshotCues([
      { time: 2, type: "get", source: "nurse" },
      { time: 3, type: "set", source: "nurse" },
      { time: 4, type: 1, source: "nurse" },
      { time: 5.5, type: 2, source: "nurse" },
    ], {
      triangleshot: false,
    }),
    {
      expected: [
        { time: 5, prev: -1, next: -1 },
        { time: 6.5, prev: -1, next: -1 },
        { time: 7.5, prev: -1, next: -1 },
      ],
      result: {
        invalidCues: [],
      },
    },
  );
});
