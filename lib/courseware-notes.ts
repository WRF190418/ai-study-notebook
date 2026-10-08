import { updateNote } from "@/lib/db";
import { removeNoteImage, saveCoursewareImages } from "@/lib/media";
import type { CoursewareImage } from "@/lib/pptx";
import type { Note } from "@/lib/types";

export async function retainCoursewareImages(userId: string, note: Note, images: CoursewareImage[], enabled: boolean) {
  const marker = /!\[([^\]\n]*)\]\(courseware:([A-Za-z0-9_-]+)\)/g;
  if (!images.length || !enabled) {
    const markdown = note.contentMarkdown.replace(marker, "");
    return { note: markdown === note.contentMarkdown ? note : await updateNote(userId, note.id, { contentMarkdown: markdown }) ?? note, warning: "" };
  }
  let stored: Awaited<ReturnType<typeof saveCoursewareImages>> = [];
  try {
    stored = await saveCoursewareImages(userId, note.id, images);
    const lookup = new Map(stored.map((entry) => [entry.key, entry.asset]));
    const markdown = note.contentMarkdown.replace(marker, (_match, alt: string, key: string) => {
      const asset = lookup.get(key);
      if (!asset) return "";
      const label = `${alt || asset.alt || "课件插图"} · ${asset.sourceFile} 第 ${asset.slideNumber} 页`.replace(/[\[\]\r\n]/g, " ");
      return `![${label}](/api/media/${asset.id})`;
    });
    const updated = await updateNote(userId, note.id, { contentMarkdown: markdown });
    if (!updated) throw new Error("NOTE_NOT_FOUND");
    return { note: updated, warning: "" };
  } catch (error) {
    for (const { asset } of stored) await removeNoteImage(asset);
    console.error("Retaining courseware images failed.", error);
    const updated = await updateNote(userId, note.id, { contentMarkdown: note.contentMarkdown.replace(marker, "") });
    return { note: updated ?? note, warning: "笔记已保存，课件图片未能导入，请在课件图片中重新导入。" };
  }
}
