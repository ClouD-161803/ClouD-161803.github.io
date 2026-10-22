// parses the three-line caption form: a quoted title, then artist and year split at the last comma,
// then a pin line with museum, city, and country. returns null when the caption does not fit
export function parseCaption(caption) {
  const lines = (caption ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length !== 3) return null;
  // an untitled work is written without quotes
  const title = /^untitled$/i.test(lines[0]) ? lines[0] : lines[0].match(/^["“„](.+)["”]$/u)?.[1].trim();
  // the posts of January 2025 open the artist line with a bust in silhouette
  const credit = lines[1].replace(/^\u{1F464}\s*/u, '');
  const comma = credit.lastIndexOf(',');
  const artist = comma > 0 ? credit.slice(0, comma).trim() : '';
  const year = comma > 0 ? credit.slice(comma + 1).trim() : '';
  const place = lines[2].match(/^\u{1F4CD}️?\s*(.+)$/u)?.[1];
  const parts = place ? place.split(',').map((part) => part.trim()) : [];
  // a museum name may hold a comma itself, hence the city and the country are the last two parts
  const country = parts.at(-1);
  const city = parts.at(-2);
  let museum = parts.slice(0, -2).join(', ');
  // an exhibition is a tag on the museum that hosts it, written as "Museum (temporary exhibition)"
  // or as "Name Exhibition at Museum"
  let exhibition = null;
  const temporary = museum.match(/^(.+?)\s*\((temporary exhibition)\)$/i);
  const named = museum.match(/^(.+? Exhibition) at (.+)$/);
  if (temporary) [, museum, exhibition] = temporary;
  else if (named) [, exhibition, museum] = named;
  if (!title || !artist || !year || parts.length < 3 || !museum || !city || !country) return null;
  return { title, artist, year, museum, city, country, exhibition };
}

// returns caption with each key of fixes replaced by its value where it stands as whole words, i.e.
// not inside a longer word. the manifest keeps the caption as posted, and the page shows it fixed
export function fixCaption(caption, fixes) {
  let fixed = caption ?? '';
  for (const [wrong, right] of Object.entries(fixes)) {
    const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    fixed = fixed.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu'), right);
  }
  return fixed;
}
