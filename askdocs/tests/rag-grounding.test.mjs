import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankHybridPassages,
  parseGroundedReply,
  renderGroundedReply,
} from '../lib/server/services/rag-grounding.ts';

const sources = [
  { ref: 1, documentId: 'a-a', documentName: 'Guide.pdf', chunkIndex: 2, text: 'The deadline is Friday.' },
  { ref: 2, documentId: 'b-b', documentName: 'Notes.pdf', chunkIndex: 0, text: 'The team met on Tuesday.' },
];

const passage = (id, index) => ({
  chunkId: id, documentId: 'doc-1', documentName: 'Test.pdf', chunkIndex: index, text: 'test',
});

test('only existing cited source IDs are accepted', () => {
  assert.deepEqual(
    parseGroundedReply(JSON.stringify({ answer: 'The deadline is Friday.', citations: [1, 1] }), sources),
    { answer: 'The deadline is Friday.', citations: [1] }
  );
  assert.equal(parseGroundedReply(JSON.stringify({ answer: 'Invented', citations: [99] }), sources), null);
  assert.equal(parseGroundedReply('not JSON', sources), null);
  assert.equal(parseGroundedReply(JSON.stringify({ answer: 'Unsupported claim', citations: [] }), sources), null);
});

test('inline AI-generated citation markers are discarded', () => {
  const reply = parseGroundedReply(JSON.stringify({ answer: 'Fact [999] from passage [1].', citations: [1] }), sources);
  assert.equal(reply?.answer, 'Fact  from passage .');
});

test('grounded reply displays clickable-link syntax and passage not fictitious page number', () => {
  const rendered = renderGroundedReply({ answer: 'The deadline is Friday.', citations: [1] }, sources);
  assert.match(rendered, /Guide\.pdf \(\/documents\/a-a\)/);
  assert.match(rendered, /Passage 3: “The deadline is Friday\.”/);
  assert.doesNotMatch(rendered, /Page 3/);
});

test('hybrid ranking combines keyword and semantic matches and removes adjacent duplicates', () => {
  const hybrid = rankHybridPassages(
    [
      { ...passage('c1', 0), similarity: 0.80 },
      { ...passage('c2', 1), similarity: 0.78 },
      { ...passage('c3', 10), similarity: 0.10 },
    ],
    [
      { ...passage('c3', 10), lexicalScore: 2.0 },
      { ...passage('c1', 0), lexicalScore: 1.0 },
    ]
  );
  assert.deepEqual(hybrid.map(item => item.chunkId), ['c1', 'c3']);
});
