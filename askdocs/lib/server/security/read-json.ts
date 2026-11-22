export type JsonReadResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

/** Enforce an actual body byte limit, even for requests lacking Content-Length. */
export async function readJsonWithinLimit(
  request: Request,
  maxBytes: number
): Promise<JsonReadResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error('Invalid request size limit');
  }
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json(?:\s*;|\s*$)/i.test(type)) {
    return { ok: false, status: 415, error: 'Expected application/json' };
  }
  const declared = request.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    return { ok: false, status: 413, error: 'Request body is too large' };
  }
  if (!request.body) {
    return { ok: false, status: 400, error: 'Invalid JSON request body' };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let total = 0;
  let contents = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: 'Request body is too large' };
      }
      contents += decoder.decode(chunk.value, { stream: true });
    }
    contents += decoder.decode();
    const data: unknown = JSON.parse(contents);
    return { ok: true, data };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON request body' };
  } finally {
    reader.releaseLock();
  }
}
