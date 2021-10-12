export async function readText(r: Deno.Reader): Promise<string> {
  const decoder = new TextDecoder();
  const buf = new Uint8Array(1024);
  const chunks: string[] = [];
  for (let len; (len = await r.read(buf)) !== null;) {
    chunks.push(decoder.decode(buf.subarray(0, len), { stream: true }));
  }
  chunks.push(decoder.decode(new ArrayBuffer(0)));
  return chunks.join("");
}
