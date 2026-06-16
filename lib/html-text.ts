/**
 * Convert rich-text/HTML (as authored in the care app's contentEditable
 * editor) into clean plain text for display inside React Native <Text>.
 *
 * RN <Text> does NOT parse HTML or decode entities, so note content saved as
 * innerHTML would otherwise show raw tags and literal entities like `&nbsp;`.
 * This strips tags, turns block boundaries into newlines, and decodes the
 * common named + numeric HTML entities.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  sbquo: '‚',
  bdquo: '„',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  middot: '·',
  bull: '•',
  laquo: '«',
  raquo: '»',
  deg: '°',
  trade: '™',
  copy: '©',
  reg: '®',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  agrave: 'à',
  acirc: 'â',
  ccedil: 'ç',
  ocirc: 'ô',
  icirc: 'î',
  ucirc: 'û',
  ugrave: 'ù',
  iuml: 'ï',
  euml: 'ë',
}

function codePointToString(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return ''
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => codePointToString(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => codePointToString(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name: string) => {
      const direct = NAMED_ENTITIES[name]
      if (direct !== undefined) return direct
      const lower = NAMED_ENTITIES[name.toLowerCase()]
      return lower !== undefined ? lower : match
    })
}

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''

  const withBreaks = html
    // List items become their own bulleted line
    .replace(/<li[^>]*>/gi, '\n• ')
    // Block-level boundaries become newlines
    .replace(/<\/?(p|div|br|h[1-6]|ul|ol|tr|table|blockquote|section|header)\b[^>]*\/?>/gi, '\n')
    // Drop any remaining tags
    .replace(/<[^>]*>/g, '')

  return decodeEntities(withBreaks)
    // Normalize any leftover non-breaking spaces (U+00A0) to regular spaces
    .replace(/ /g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
