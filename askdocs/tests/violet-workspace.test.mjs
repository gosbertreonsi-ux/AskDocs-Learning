import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const get = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('violet reference palette is installed', () => {
  const css=get('app/globals.css');
  assert.match(css,/--ad-violet:\s*#8981d7/i);
  assert.match(css,/--ad-violet-deep:\s*#7167c3/i);
});
test('shell uses working document search and private navigation', () => {
  const src=get('components/WorkspaceShell.tsx');
  assert.match(src,/action="\/documents" method="get"/);
  assert.match(src,/name="q"/);
  assert.match(src,/href="\/documents\?status=READY"/);
  assert.match(src,/SignOutButton/);
});
test('document grid reads real API metadata, not placeholder cards', () => {
  const src=get('components/DocumentGrid.tsx');
  assert.match(src,/documents\.map/);
  assert.match(src,/doc\.name/);
  assert.match(src,/doc\.indexStatus/);
  assert.match(src,/\/documents\/\$\{doc\.id\}/);
});
test('upload and indexing retry remain functional', () => {
  const src=get('app/documents/page.tsx');
  assert.match(src,/fetch\("\/api\/documents"/);
  assert.match(src,/method: "POST", body: form/);
  assert.match(src,/\/retry`/);
});
test('chat retains API and citation-capable bubble', () => {
  assert.match(get('components/Chat.tsx'),/fetch\("\/api\/messages"/);
  assert.match(get('components/MessageBubble.tsx'),/SOURCE_LINE/);
});
test('responsive breakpoints and compact reference typography present', () => {
  const css=get('components/WorkspaceShell.module.css')+get('components/DocumentGrid.module.css');
  assert.match(css,/max-width: 720px/);
  assert.match(css,/grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/font-size: 11px/);
});
