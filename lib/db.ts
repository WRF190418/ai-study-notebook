import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { AppDb, Course, Lesson, MediaAsset, Note, PasswordReset, User, UserPreferences } from "@/lib/types";

const dataDir =
  process.env.APP_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app-db.json");
let writeQueue = Promise.resolve();

function assignDefined<T extends object>(target: T, input: Partial<T>) {
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      Object.assign(target, { [key]: value });
    }
  }
}

const emptyDb: AppDb = {
  users: [],
  preferences: [],
  passwordResets: [],
  courses: [],
  lessons: [],
  notes: [],
  mediaAssets: []
};

export function defaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    primaryColor: "sage",
    buttonRadius: "soft",
    buttonStyle: "solid",
    density: "comfortable",
    cardStyle: "elevated",
    lessonLayout: "grid",
    noteLayout: "reader",
    updatedAt: new Date().toISOString()
  };
}

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(emptyDb, null, 2), "utf8");
  }
}

async function readDb(): Promise<AppDb> {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw) as AppDb;
  db.preferences ??= [];
  db.passwordResets ??= [];
  db.mediaAssets ??= [];
  for (const user of db.users) {
    if (!db.preferences.some((item) => item.userId === user.id)) {
      db.preferences.push(defaultPreferences(user.id));
    }
  }
  return db;
}

async function writeDb(db: AppDb) {
  await ensureDb();
  const tempPath = `${dbPath}.${nanoid()}.tmp`;
  await writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
  await rename(tempPath, dbPath);
}

export async function mutateDb<T>(fn: (db: AppDb) => T | Promise<T>): Promise<T> {
  const task = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  writeQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

export async function viewDb<T>(fn: (db: AppDb) => T | Promise<T>): Promise<T> {
  await writeQueue;
  const db = await readDb();
  return fn(db);
}

export async function findUserByEmail(email: string) {
  return viewDb((db) => db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null);
}

export async function findUserById(id: string) {
  return viewDb((db) => db.users.find((user) => user.id === id) ?? null);
}

export async function createPasswordReset(email: string) {
  return mutateDb((db) => {
    const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;

    const now = new Date();
    const reset: PasswordReset = {
      id: nanoid(),
      userId: user.id,
      email: user.email,
      code: String(Math.floor(100000 + Math.random() * 900000)),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      createdAt: now.toISOString()
    };
    db.passwordResets.push(reset);
    return reset;
  });
}

export async function resetPasswordWithCode(email: string, code: string, passwordHash: string) {
  return mutateDb((db) => {
    const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user) return false;

    const reset = [...db.passwordResets]
      .reverse()
      .find(
        (item) =>
          item.userId === user.id &&
          item.code === code &&
          !item.usedAt &&
          new Date(item.expiresAt).getTime() > Date.now()
      );
    if (!reset) return false;

    user.passwordHash = passwordHash;
    reset.usedAt = new Date().toISOString();
    return true;
  });
}

export async function createUser(input: { name: string; email: string; passwordHash: string }) {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const user: User = {
      id: nanoid(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      createdAt: now
    };
    db.users.push(user);
    db.preferences.push(defaultPreferences(user.id));
    seedWorkspaceForUser(db, user.id);
    return user;
  });
}

function seedWorkspaceForUser(db: AppDb, userId: string) {
  const now = new Date().toISOString();
  const course: Course = {
    id: nanoid(),
    userId,
    title: "自然对话基础",
    code: "GFN1000",
    term: "2026年秋季学期",
    description: "把课堂截图、老师板书和零散提纲整理成可复习的结构化笔记。",
    tags: ["课堂整理", "公式渲染", "闪卡复习"],
    accent: "sage",
    createdAt: now
  };
  db.courses.push(course);

  const lessons: Array<Omit<Lesson, "id" | "userId" | "courseId" | "createdAt">> = [
    {
      title: "柏拉图的现实观",
      subtitle: "Plato's View on Reality",
      order: 1,
      icon: "book",
      accent: "sage"
    },
    {
      title: "亚里士多德的自然哲学",
      subtitle: "Aristotle's Philosophy on Nature",
      order: 2,
      icon: "sparkles",
      accent: "amber"
    },
    {
      title: "近代物理学的诞生",
      subtitle: "The Birth of a New Physics",
      order: 3,
      icon: "atom",
      accent: "cobalt"
    },
    {
      title: "公式、表格与图像标注",
      subtitle: "Equations, Tables and Image Notes",
      order: 4,
      icon: "function",
      accent: "rose"
    }
  ];

  db.lessons.push(
    ...lessons.map((lesson) => ({
      ...lesson,
      id: nanoid(),
      userId,
      courseId: course.id,
      createdAt: now
    }))
  );
}

export async function getWorkspace(userId: string) {
  return viewDb((db) => {
    const courses = db.courses.filter((course) => course.userId === userId);
    const lessons = db.lessons.filter((lesson) => lesson.userId === userId);
    const notes = db.notes.filter((note) => note.userId === userId);
    const preferences = db.preferences.find((item) => item.userId === userId) ?? defaultPreferences(userId);
    return { courses, lessons, notes, preferences };
  });
}

export async function completeOnboarding(userId: string) {
  return mutateDb((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (!user) return null;
    user.onboardingCompletedAt = new Date().toISOString();
    return user;
  });
}

export async function updateUserPreferences(userId: string, input: Partial<Omit<UserPreferences, "userId" | "updatedAt">>) {
  return mutateDb((db) => {
    let preferences = db.preferences.find((item) => item.userId === userId);
    if (!preferences) {
      preferences = defaultPreferences(userId);
      db.preferences.push(preferences);
    }
    Object.assign(preferences, input, { updatedAt: new Date().toISOString() });
    return preferences;
  });
}

export async function createCourse(userId: string, input: Pick<Course, "title" | "code" | "term" | "description">) {
  return mutateDb((db) => {
    const course: Course = {
      id: nanoid(),
      userId,
      title: input.title,
      code: input.code,
      term: input.term,
      description: input.description,
      tags: ["AI 整理", "课程笔记"],
      accent: "sage",
      createdAt: new Date().toISOString()
    };
    db.courses.push(course);
    return course;
  });
}

export async function createCourseWithStarterLesson(
  userId: string,
  input: Pick<Course, "title" | "code" | "term" | "description"> & {
    tags?: string[];
    lessonTitle?: string;
    lessonSubtitle?: string;
  }
) {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const course: Course = {
      id: nanoid(),
      userId,
      title: input.title,
      code: input.code,
      term: input.term,
      description: input.description,
      tags: input.tags?.length ? input.tags : ["AI 命令", "课程笔记"],
      accent: "sage",
      createdAt: now
    };
    const lesson: Lesson = {
      id: nanoid(),
      userId,
      courseId: course.id,
      title: input.lessonTitle || "第一章",
      subtitle: input.lessonSubtitle || "Start here",
      order: 1,
      icon: "book",
      accent: "sage",
      createdAt: now
    };
    db.courses.push(course);
    db.lessons.push(lesson);
    return { course, lesson };
  });
}

export async function createLesson(
  userId: string,
  courseId: string,
  input: {
    title: string;
    subtitle?: string;
    icon?: Lesson["icon"];
    accent?: string;
  }
) {
  return mutateDb((db) => {
    const courseLessons = db.lessons.filter((lesson) => lesson.userId === userId && lesson.courseId === courseId);
    const lesson: Lesson = {
      id: nanoid(),
      userId,
      courseId,
      title: input.title,
      subtitle: input.subtitle || "AI-created chapter",
      order: Math.max(0, ...courseLessons.map((item) => item.order)) + 1,
      icon: input.icon ?? "book",
      accent: input.accent ?? "sage",
      createdAt: new Date().toISOString()
    };
    db.lessons.push(lesson);
    return lesson;
  });
}

export async function updateCourse(
  userId: string,
  courseId: string,
  input: Partial<Pick<Course, "title" | "code" | "term" | "description">>
) {
  return mutateDb((db) => {
    const course = db.courses.find((item) => item.id === courseId && item.userId === userId);
    if (!course) return null;
    assignDefined(course, input);
    return course;
  });
}

export async function deleteCourse(userId: string, courseId: string) {
  return mutateDb((db) => {
    const index = db.courses.findIndex((item) => item.id === courseId && item.userId === userId);
    if (index === -1) return null;
    const [course] = db.courses.splice(index, 1);
    const removedNoteIds = new Set(
      db.notes.filter((note) => note.userId === userId && note.courseId === courseId).map((note) => note.id)
    );
    db.lessons = db.lessons.filter((lesson) => !(lesson.userId === userId && lesson.courseId === courseId));
    db.notes = db.notes.filter((note) => !(note.userId === userId && note.courseId === courseId));
    const removedMediaAssets = db.mediaAssets.filter((asset) => removedNoteIds.has(asset.noteId));
    db.mediaAssets = db.mediaAssets.filter((asset) => !removedNoteIds.has(asset.noteId));
    return { course, removedMediaAssets };
  });
}

export async function updateLesson(
  userId: string,
  lessonId: string,
  input: Partial<Pick<Lesson, "title" | "subtitle" | "icon" | "accent">>
) {
  return mutateDb((db) => {
    const lesson = db.lessons.find((item) => item.id === lessonId && item.userId === userId);
    if (!lesson) return null;
    assignDefined(lesson, input);
    return lesson;
  });
}

export async function deleteLesson(userId: string, lessonId: string) {
  return mutateDb((db) => {
    const index = db.lessons.findIndex((item) => item.id === lessonId && item.userId === userId);
    if (index === -1) return null;
    const [lesson] = db.lessons.splice(index, 1);
    const removedNoteIds = new Set(
      db.notes.filter((note) => note.userId === userId && note.lessonId === lessonId).map((note) => note.id)
    );
    db.notes = db.notes.filter((note) => !(note.userId === userId && note.lessonId === lessonId));
    const removedMediaAssets = db.mediaAssets.filter((asset) => removedNoteIds.has(asset.noteId));
    db.mediaAssets = db.mediaAssets.filter((asset) => !removedNoteIds.has(asset.noteId));
    return { lesson, removedMediaAssets };
  });
}

export async function createNote(input: Omit<Note, "id" | "createdAt" | "updatedAt">) {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const note: Note = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now
    };
    db.notes.unshift(note);
    return note;
  });
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: Partial<Pick<Note, "courseId" | "lessonId" | "title" | "summary" | "contentMarkdown" | "flashcards" | "mindMap">>
) {
  return mutateDb((db) => {
    const note = db.notes.find((item) => item.id === noteId && item.userId === userId);
    if (!note) return null;
    assignDefined(note, input);
    note.updatedAt = new Date().toISOString();
    return note;
  });
}

export async function deleteNote(userId: string, noteId: string) {
  return mutateDb((db) => {
    const index = db.notes.findIndex((item) => item.id === noteId && item.userId === userId);
    if (index === -1) return null;
    const [note] = db.notes.splice(index, 1);
    const removedMediaAssets = db.mediaAssets.filter((asset) => asset.userId === userId && asset.noteId === noteId);
    db.mediaAssets = db.mediaAssets.filter((asset) => !(asset.userId === userId && asset.noteId === noteId));
    return { note, removedMediaAssets };
  });
}

export async function findNoteById(userId: string, noteId: string) {
  return viewDb((db) => db.notes.find((note) => note.id === noteId && note.userId === userId) ?? null);
}

export async function createMediaAsset(input: Omit<MediaAsset, "createdAt">) {
  return mutateDb((db) => {
    const asset: MediaAsset = {
      ...input,
      createdAt: new Date().toISOString()
    };
    db.mediaAssets.push(asset);
    return asset;
  });
}

export async function findMediaAsset(userId: string, assetId: string) {
  return viewDb(
    (db) => db.mediaAssets.find((asset) => asset.id === assetId && asset.userId === userId) ?? null
  );
}

export async function deleteMediaAsset(userId: string, assetId: string) {
  return mutateDb((db) => {
    const index = db.mediaAssets.findIndex((asset) => asset.id === assetId && asset.userId === userId);
    if (index === -1) return null;
    const [asset] = db.mediaAssets.splice(index, 1);
    return asset;
  });
}

export async function insertImageIntoNote(
  userId: string,
  noteId: string,
  input: {
    imageUrl: string;
    alt: string;
    placement: "start" | "end" | "after_heading";
    afterHeading?: string;
  }
) {
  return mutateDb((db) => {
    const note = db.notes.find((item) => item.id === noteId && item.userId === userId);
    if (!note) return null;
    note.contentMarkdown = insertImageMarkdown(note.contentMarkdown, input);
    note.updatedAt = new Date().toISOString();
    return note;
  });
}

function insertImageMarkdown(
  markdown: string,
  input: {
    imageUrl: string;
    alt: string;
    placement: "start" | "end" | "after_heading";
    afterHeading?: string;
  }
) {
  const safeAlt = input.alt.replace(/[\[\]\r\n]/g, " ").trim() || "笔记图片";
  const image = `![${safeAlt}](${input.imageUrl})`;
  const content = markdown.trim();

  if (input.placement === "start") {
    return [image, content].filter(Boolean).join("\n\n");
  }

  if (input.placement === "after_heading" && input.afterHeading?.trim()) {
    const target = normalizeHeading(input.afterHeading);
    const lines = markdown.split(/\r?\n/);
    const index = lines.findIndex((line) => {
      const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      if (!match) return false;
      const heading = normalizeHeading(match[1]);
      return heading === target || heading.includes(target) || target.includes(heading);
    });
    if (index >= 0) {
      lines.splice(index + 1, 0, "", image, "");
      return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
    }
    throw new Error("NOTE_IMAGE_HEADING_NOT_FOUND");
  }

  return [content, image].filter(Boolean).join("\n\n");
}

function normalizeHeading(value: string) {
  return value
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/\s*#*\s*$/, "")
    .toLocaleLowerCase();
}
