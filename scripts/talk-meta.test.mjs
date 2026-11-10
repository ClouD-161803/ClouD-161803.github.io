import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTalkHead } from './talk-meta.mjs';

test('parseTalkHead reads the title, the date, and the venue', () => {
  const html = `<!doctype html><html><head>
<meta charset="utf-8">
<title>Tracking bifurcations
  of periodic-orbit families</title>
<meta name="talk-date" content="2026-11-09">
<meta content="Beeson group meeting, Princeton &amp; friends" name="talk-venue">
</head><body><meta name="talk-date" content="1999-01-01"></body></html>`;
  assert.deepEqual(parseTalkHead(html), {
    title: 'Tracking bifurcations of periodic-orbit families',
    date: '2026-11-09',
    venue: 'Beeson group meeting, Princeton & friends',
  });
});

test('parseTalkHead gives null for a missing or malformed field', () => {
  assert.deepEqual(parseTalkHead('<head><meta name="talk-date" content="9 Nov 2026"></head>'), {
    title: null,
    date: null,
    venue: null,
  });
});
