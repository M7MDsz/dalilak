// Owner: brain-advisor. Newline-delimited JSON streaming, shared by the routes (encode) and the browser (decode).
// Web APIs only (ReadableStream, TextEncoder, TextDecoderStream): safe on both sides.
// Pattern and traps: STACK-NOTES 1.5 (buffer and split on "\n"; keep `Cache-Control: no-cache, no-transform`; stop
// enqueueing after cancel; a stream that ends without `done` is a failure).

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;

/**
 * A streamed Response that writes each event as one JSON line, then closes. Headers:
 * `Content-Type: application/x-ndjson; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.
 * An exception thrown by the iterator is NOT caught here: the caller's generator must end with its own error event.
 */
export function ndjsonResponse<T>(events: AsyncIterable<T>): Response {
  const encoder = new TextEncoder();
  const iterator = events[Symbol.asyncIterator]();
  let open = true;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!open) return;
      let step: IteratorResult<T>;
      try {
        step = await iterator.next();
      } catch (error) {
        open = false;
        controller.error(error);
        return;
      }
      if (!open) return;
      if (step.done) {
        open = false;
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`${JSON.stringify(step.value)}\n`));
    },
    async cancel() {
      // The browser went away («إيقاف» or a closed tab): stop the generator so it releases its provider call.
      open = false;
      try {
        await iterator.return?.(undefined);
      } catch {
        // nothing to do: the stream is gone
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

/** Reads a streamed Response line by line. Throws on a non-2xx status or a missing body. */
export async function* readNdjson<T>(response: Response): AsyncGenerator<T> {
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield JSON.parse(line) as T;
        newline = buffer.indexOf("\n");
      }
    }
    const rest = buffer.trim();
    if (rest) yield JSON.parse(rest) as T;
  } finally {
    reader.releaseLock();
  }
}
