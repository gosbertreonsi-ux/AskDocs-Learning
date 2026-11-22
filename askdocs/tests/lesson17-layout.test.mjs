import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const get = path => readFileSync(resolve(process.cwd(), path), "utf8");

test("photo-inspired colors are declared as editable CSS tokens", () => {
  const css = get("app/globals.css");
  for (const name of ["--ad-navy", "--ad-denim", "--ad-cream", "--ad-taupe"]) {
    assert.ok(css.includes(name), `${name} is missing`);
  }
});

test("workspace has accessible navigation and a skip link", () => {
  const source = get("components/WorkspaceShell.tsx");
  assert.match(source, /Skip to content/);
  assert.match(source, /aria-current/);
  assert.match(source, /WorkspaceShell/);
});

test("chat preserves existing document API and source rendering", () => {
  const source = get("components/Chat.tsx");
  assert.match(source, /fetch\("\/api\/messages"/);
  assert.match(source, /MessageBubble/);
  assert.match(source, /2000/);
  assert.match(get("components/MessageBubble.tsx"), /SOURCE_LINE/);
});

test("document library keeps indexing and retry flows", () => {
  const source = get("app/documents/page.tsx");
  assert.match(source, /indexStatus/);
  assert.match(source, /\/retry/);
  assert.match(source, /fetch\("\/api\/documents"/);
});

test("document reader preserves per-user authorization", () => {
  const source = get("app/documents/[id]/page.tsx");
  assert.match(source, /getAuthenticatedUser/);
  assert.match(source, /getUserConversationId/);
  assert.match(source, /findDocument\(id, conversationId\)/);
});

test("responsive layouts exist for small screens", () => {
  for (const path of ["components/WorkspaceShell.module.css", "components/Chat.module.css", "app/documents/DocumentsPage.module.css"]) {
    assert.ok(existsSync(resolve(process.cwd(), path)));
    assert.match(get(path), /@media/);
  }
});
