import { fromFileUrl, join } from "./deps/std/path.ts";
import { assertSnapshot } from "./deps/std/testing/snapshot.ts";

import { type Level, parseLevel } from "./level.ts";

function readTestdata(path: string | URL): string {
  const text = Deno.readTextFileSync(path);
  return text.charAt(0) === "\ufeff" ? text.substring(1) : text;
}

const testdata = fromFileUrl(new URL("testdata", import.meta.url));
const snapshots = join(testdata, "snapshots");
const cases = [
  readTestdata(join(testdata, "internet_overdose.rdlevel")),
];
const permissions: Deno.PermissionOptions = {
  read: [snapshots],
  write: [snapshots],
};

Deno.test("parseLevel", { permissions }, async (t) => {
  const serializer = (level: Level) =>
    JSON.stringify(
      level,
      (_key, value) =>
        typeof value === "number"
          ? Math.round(value * 1000000) / 1000000
          : value,
      2,
    );
  for (const input of cases) {
    await assertSnapshot(t, parseLevel(input), { dir: snapshots, serializer });
  }
});
