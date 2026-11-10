// parseTalkHead reads the listing of a talk from the head of its deck: the <title>, and the meta tags
// talk-date (YYYY-MM-DD) and talk-venue. a missing or malformed field is null
export function parseTalkHead(html) {
  const head = html.split(/<\/head>/i)[0];
  const decode = (text) =>
    text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
  const meta = (name) => {
    for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
      const attr = (key) => tag.match(new RegExp(`\\b${key}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
      if (attr('name')?.toLowerCase() === name) return decode(attr('content') ?? '') || null;
    }
    return null;
  };
  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const date = meta('talk-date');
  return {
    title: title ? decode(title.replace(/\s+/g, ' ')) || null : null,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    venue: meta('talk-venue'),
  };
}
