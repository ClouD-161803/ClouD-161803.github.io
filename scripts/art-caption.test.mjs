// run with `node --test scripts/`. the captions are verbatim from the Instagram export of __cldrt__
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixCaption, parseCaption } from './art-caption.mjs';

test('parseCaption reads the three-line form', () => {
  assert.deepEqual(parseCaption('"Medusa"\n\nCecilia Vicuña, 1972\n\n📍 Irish Museum of Modern Art, Dublin, Ireland'), {
    title: 'Medusa',
    artist: 'Cecilia Vicuña',
    year: '1972',
    museum: 'Irish Museum of Modern Art',
    city: 'Dublin',
    country: 'Ireland',
    exhibition: null,
  });
});

// the posts of 2025-01-03 and 2025-01-04 mark the artist line with a bust in silhouette
test('parseCaption leaves the person emoji out of the artist', () => {
  assert.deepEqual(parseCaption('"The Singing Lesson"\n\n👤 Federico Zandomeneghi, 1890\n\n📍 Gallerie d\'Italia, Milan, Italy'), {
    title: 'The Singing Lesson',
    artist: 'Federico Zandomeneghi',
    year: '1890',
    museum: "Gallerie d'Italia",
    city: 'Milan',
    country: 'Italy',
    exhibition: null,
  });
});

test('parseCaption moves a temporary exhibition out of the museum into a tag', () => {
  const fields = parseCaption('"The Sower"\n\nVincent Van Gogh, 1888\n\n📍 National Gallery (temporary exhibition), London, United Kingdom');
  assert.equal(fields.museum, 'National Gallery');
  assert.equal(fields.exhibition, 'temporary exhibition');
});

test('parseCaption reads a named exhibition at a venue as a tag on the venue', () => {
  const fields = parseCaption('"Dark Force"\n\nStanley Downwood, 2024\n\n📍 Logical Absurdity Exhibition at No.9 Cork Street, London, United Kingdom');
  assert.equal(fields.museum, 'No.9 Cork Street');
  assert.equal(fields.exhibition, 'Logical Absurdity Exhibition');
});

test('parseCaption takes an unquoted untitled as the title', () => {
  const fields = parseCaption('untitled\n\n👤 Keith Haring, 1978\n\n📍 Moco Museum, London, United Kingdom');
  assert.equal(fields.title, 'untitled');
  assert.equal(fields.artist, 'Keith Haring');
});

test('fixCaption replaces whole words only', () => {
  const fixes = { 'enny Nyström': 'Jenny Nyström', Øslo: 'Oslo' };
  assert.equal(fixCaption('"The Convalescent"\n\nenny Nyström, 1884', fixes), '"The Convalescent"\n\nJenny Nyström, 1884');
  assert.equal(fixCaption('Jenny Nyström in Øslo', fixes), 'Jenny Nyström in Oslo');
});
