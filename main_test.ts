import { assertEquals } from "./deps/std/assert/assert_equals.ts";
import { assertStrictEquals } from "./deps/std/assert/assert_strict_equals.ts";
import { fromFileUrl } from "./deps/std/path/from_file_url.ts";
import { join } from "./deps/std/path/join.ts";

const root = fromFileUrl(new URL(".", import.meta.url));
const entryPoint = join(
  root,
  Deno.build.os === "windows" ? "main_wrapper.cmd" : "main.ts",
);
const testdata = fromFileUrl(new URL("testdata", import.meta.url));
const input = Deno.readFileSync(join(testdata, "internet_overdose.rdlevel"));
const expected = Deno.readFileSync(join(testdata, "internet_overdose.out"));
const permissions: Deno.PermissionOptions = {
  run: [entryPoint],
};

Deno.test("main", { permissions }, async () => {
  const child = new Deno.Command(entryPoint, {
    args: ["-t"],
    stdin: "piped",
    stdout: "piped",
  }).spawn();
  ReadableStream.from([input]).pipeTo(child.stdin).catch(() => {});
  const { code, stdout } = await child.output();
  assertStrictEquals(code, 1);
  assertEquals(stdout, expected);
});
