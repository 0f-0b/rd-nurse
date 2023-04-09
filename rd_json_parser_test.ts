import { assertEquals } from "./deps/std/testing/asserts.ts";

import { parseRDJson } from "./rd_json_parser.ts";

// Mostly from https://github.com/auburnsummer/rd-indexer/blob/a246449889a37fe4805d79285ce16335e5e2f736/orchard/parse/test/test_parse.py
const cases: [name: string, input: string, expected: unknown][] = [
  [
    "scalar 1",
    `
      {"value": 2}
    `,
    { value: 2 },
  ],
  [
    "scalar 2",
    `
      {"value": "hello world"}
    `,
    { value: "hello world" },
  ],
  [
    "scalar 3",
    `
      {"value": false}
    `,
    { value: false },
  ],
  [
    "array 1",
    `
      [2, 4, 3, 5, 1]
    `,
    [2, 4, 3, 5, 1],
  ],
  [
    "array 2",
    `
      [3,
      4,
      5,
      1,
      "hello world",
      {"a": 4},
      ]
    `,
    [3, 4, 5, 1, "hello world", { a: 4 }],
  ],
  [
    "nested objects",
    `
      {
        "a": "hello",
        "b": "world",
        "c": "today",
        "d": {
          "e": "nesting now",
          "f": {
            "g": "even further",
            "h": [
              "i", "j", "k"
            ],
          }
        },
      },
    `,
    {
      a: "hello",
      b: "world",
      c: "today",
      d: {
        e: "nesting now",
        f: {
          g: "even further",
          h: ["i", "j", "k"],
        },
      },
    },
  ],
  [
    "encoded newlines",
    `
      {
        "a": "hello\\nworld\\nyep"
      }
    `,
    { a: "hello\nworld\nyep" },
  ],
  [
    "literal newlines",
    `
      {
        "a": "this is a valid value
in an rdlevel even though
it has literal newlines!"
      }
    `,
    {
      a: "this is a valid value\nin an rdlevel even though\nit has literal newlines!",
    },
  ],
  [
    "comma-separated entries",
    `{ "bar": 9, "rooms": [0], "strength": "High" }`,
    { bar: 9, rooms: [0], strength: "High" },
  ],
  [
    "space-separated entries 1",
    `{ "bar": 9, "rooms": [0] "strength": "High" }`,
    { bar: 9, rooms: [0], strength: "High" },
  ],
  [
    "space-separated entries 2",
    `{ "bar": 1, "beat": 1.01, "endOpacity": 100 "ease": "Linear" }`,
    { bar: 1, beat: 1.01, endOpacity: 100, ease: "Linear" },
  ],
  [
    "unseparated entries",
    `{ "bar": 3"foo": 4"foobar": 5}`,
    { bar: 3, foo: 4, foobar: 5 },
  ],
  [
    "prevent infinite loop",
    `[:`,
    null,
  ],
];

for (const [name, input, expected] of cases) {
  Deno.test(name, { permissions: "none" }, () => {
    assertEquals(parseRDJson(input), expected);
  });
}
