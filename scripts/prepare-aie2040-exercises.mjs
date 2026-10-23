import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const exerciseSpecs = [
  { chapter: 1, noteId: "LpJi8RoRYX91h8HzU6hIv", questions: [29, 50, 73, 93, 115, 139], answers: [141, 142, 143, 144, 145, 146], counts: [3, 3, 4, 3, 3, 3], context: [75, 104] },
  { chapter: 2, noteId: "XCQYbnkZS3nNJC1Tq79Ni", questions: [27, 44, 59, 81, 108, 131], answers: [133, 134, 135, 136, 137, 138], counts: [4, 4, 4, 4, 4, 4], context: [] },
  { chapter: 3, noteId: "SAmG_AvFtJyDqG82TEGKH", questions: [23, 46, 68, 94, 114, 135], answers: [137, 138, 139, 140, 141, 142], counts: [4, 4, 4, 4, 4, 4], context: [] },
  { chapter: 4, noteId: "kZSarcAdiP2OCIn1eJQnN", questions: [21, 41, 62, 77, 97, 120], answers: [122, 123, 124, 125, 126, 127], counts: [4, 4, 4, 3, 4, 4], context: [6] },
  { chapter: 5, noteId: "-gV0-uqfPXZRgeivqovJk", questions: [23, 47, 72, 96, 118, 145], answers: [146, 147, 148, 149, 150, 151], counts: [3, 3, 3, 4, 3, 3], context: [32] }
];

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const root = path.resolve("data/aie2040-exercises");
  await fs.mkdir(root, { recursive: true });
  const db = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
  const manifest = [];
  for (const spec of exerciseSpecs) {
    const sourceDir = path.resolve(`data/aie2040-chapters/chapter${spec.chapter}`);
    const materials = JSON.parse(await fs.readFile(path.join(sourceDir, "materials.json"), "utf8"));
    const source = db.notes.find(note => note.id === spec.noteId);
    if (!source) throw new Error(`Missing source note: ${spec.noteId}`);
    const main = source.contentMarkdown.split("\n<!-- courseware-appendix -->\n")[0];
    const sections = main.split(/(?=^### 第\d+页｜)/m);
    const selected = [...spec.questions, ...spec.answers, ...spec.context];
    const entries = selected.map(number => ({
      number,
      text: materials.pages.find(page => page.number === number)?.text ?? "",
      noteSection: sections.find(section => section.startsWith(`### 第${number}页｜`)) ?? ""
    }));
    await fs.writeFile(path.join(root, `chapter${spec.chapter}-source.json`), JSON.stringify(entries, null, 2));
    for (let batch = 0; batch < 3; batch++) {
      // Each image pairs two practice sheets with their two answer sheets.
      const numbers = [spec.questions[batch * 2], spec.answers[batch * 2], spec.questions[batch * 2 + 1], spec.answers[batch * 2 + 1]];
      const tiles = [];
      for (const [index, number] of numbers.entries()) {
        const input = path.join(sourceDir, "pages", `page-${String(number).padStart(3, "0")}.webp`);
        tiles.push({ input: await sharp(input).resize(1200, 676, { fit: "contain", background: "white" }).png().toBuffer(), left: (index % 2) * 1200, top: Math.floor(index / 2) * 676 });
      }
      const contact = path.join(root, `chapter${spec.chapter}-pairs-${batch + 1}.png`);
      await sharp({ create: { width: 2400, height: 1352, channels: 3, background: "white" } }).composite(tiles).png().toFile(contact);
      manifest.push({ chapter: spec.chapter, numbers, contact });
    }
  }
  await fs.writeFile(path.join(root, "source-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ chapters: 5, sets: 30, practicePages: 30, answerPages: 30, contactSheets: manifest.length }));
}
