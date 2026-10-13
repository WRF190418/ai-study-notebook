const COURSEWARE_APPENDIX_MARKER = "\n<!-- courseware-appendix -->\n";

export type NotePageSection = {
  key: string;
  pageNumber: number;
  occurrence: number;
  heading: string;
  title: string;
  markdown: string;
  plainText: string;
  excerpt: string;
  order: number;
  sourceStart: number;
};

export type PageSourceImage = {
  src: string;
  alt: string;
};

const pageHeadingPattern = /^第\s*(\d+)\s*页(?:\s*[|｜:：]\s*(.+))?\s*$/u;

export function parsePageHeading(value: string) {
  const heading = cleanInlineMarkdown(value);
  const match = heading.match(pageHeadingPattern);
  if (!match) return null;

  const pageNumber = Number(match[1]);
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) return null;
  return {
    pageNumber,
    heading,
    title: match[2]?.trim() || `第${pageNumber}页`
  };
}

export function extractNotePages(markdown: string): NotePageSection[] {
  const main = markdown.split(COURSEWARE_APPENDIX_MARKER)[0] ?? markdown;
  const headings = [...main.matchAll(/^#{2,3}[ \t]+(.+?)\s*#*\s*$/gm)]
    .map((match) => {
      const page = parsePageHeading(match[1]);
      if (!page || match.index === undefined) return null;
      return {
        ...page,
        start: match.index,
        contentStart: match.index + match[0].length
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const occurrences = new Map<number, number>();
  return headings.map((item, index) => {
    const occurrence = (occurrences.get(item.pageNumber) ?? 0) + 1;
    occurrences.set(item.pageNumber, occurrence);
    const end = headings[index + 1]?.start ?? main.length;
    const sectionMarkdown = main.slice(item.contentStart, end).trim();
    const plainText = markdownToPlainText(sectionMarkdown);
    return {
      key: `page-${item.pageNumber}-${occurrence}`,
      pageNumber: item.pageNumber,
      occurrence,
      heading: item.heading,
      title: item.title,
      markdown: sectionMarkdown,
      plainText,
      excerpt: makeExcerpt(plainText, "", 118),
      order: index,
      sourceStart: item.start
    };
  });
}

export function extractPageSourceImages(markdown: string): Map<number, PageSourceImage> {
  const [main, appendix = ""] = markdown.split(COURSEWARE_APPENDIX_MARKER);
  const images = new Map<number, PageSourceImage>();

  collectPageImages(appendix, images);
  for (const page of extractNotePages(main)) {
    if (images.has(page.pageNumber)) continue;
    const image = firstStoredImage(page.markdown);
    if (image) images.set(page.pageNumber, image);
  }

  return images;
}

function collectPageImages(markdown: string, images: Map<number, PageSourceImage>) {
  const headings = [...markdown.matchAll(/^#{2,6}[ \t]+(.+?)\s*#*\s*$/gm)]
    .map((match) => {
      const parsed = parsePageHeading(match[1]) ?? parseOriginalPageHeading(match[1]);
      if (!parsed || match.index === undefined) return null;
      return { pageNumber: parsed.pageNumber, start: match.index, contentStart: match.index + match[0].length };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  headings.forEach((heading, index) => {
    if (images.has(heading.pageNumber)) return;
    const end = headings[index + 1]?.start ?? markdown.length;
    const image = firstStoredImage(markdown.slice(heading.contentStart, end));
    if (image) images.set(heading.pageNumber, image);
  });
}

function parseOriginalPageHeading(value: string) {
  const match = cleanInlineMarkdown(value).match(/^原课件第\s*(\d+)\s*页(?:\s*[|｜:：]\s*(.+))?\s*$/u);
  if (!match) return null;
  const pageNumber = Number(match[1]);
  return Number.isSafeInteger(pageNumber) && pageNumber > 0 ? { pageNumber } : null;
}

function firstStoredImage(markdown: string): PageSourceImage | null {
  const match = markdown.match(/!\[([^\]]*)\]\((\/api\/media\/[A-Za-z0-9_-]+)(?:\s+["']([^"']*)["'])?\)/);
  if (!match) return null;
  return { src: match[2], alt: (match[1] || match[3] || "课件原图").trim() };
}

export function pageAnchorId(noteId: string, pageKey: string) {
  return `note-${noteId}-${pageKey}`.replace(/[^A-Za-z0-9_-]/g, "-");
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[^\n]*\n?/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[>*_~`$]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeExcerpt(text: string, query: string, limit = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "本页主要由图片、公式或表格构成。";
  if (clean.length <= limit) return clean;

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const lower = clean.toLocaleLowerCase();
  const matchAt = tokens.reduce((best, token) => {
    const index = lower.indexOf(token);
    return index >= 0 && (best < 0 || index < best) ? index : best;
  }, -1);
  const start = Math.max(0, (matchAt < 0 ? 0 : matchAt) - Math.floor(limit * 0.3));
  const excerpt = clean.slice(start, start + limit).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${start + limit < clean.length ? "…" : ""}`;
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .trim();
}
