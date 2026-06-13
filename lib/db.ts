import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { AppDb, Course, Lesson, Note, PasswordReset, User, UserPreferences } from "@/lib/types";

const dataDir =
  process.env.APP_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app-db.json");
let writeQueue = Promise.resolve();

const emptyDb: AppDb = {
  users: [],
  preferences: [],
  passwordResets: [],
  courses: [],
  lessons: [],
  notes: []
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
    Object.assign(course, input);
    return course;
  });
}

export async function deleteCourse(userId: string, courseId: string) {
  return mutateDb((db) => {
    const index = db.courses.findIndex((item) => item.id === courseId && item.userId === userId);
    if (index === -1) return null;
    const [course] = db.courses.splice(index, 1);
    db.lessons = db.lessons.filter((lesson) => !(lesson.userId === userId && lesson.courseId === courseId));
    db.notes = db.notes.filter((note) => !(note.userId === userId && note.courseId === courseId));
    return course;
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
    Object.assign(lesson, input);
    return lesson;
  });
}

export async function deleteLesson(userId: string, lessonId: string) {
  return mutateDb((db) => {
    const index = db.lessons.findIndex((item) => item.id === lessonId && item.userId === userId);
    if (index === -1) return null;
    const [lesson] = db.lessons.splice(index, 1);
    db.notes = db.notes.filter((note) => !(note.userId === userId && note.lessonId === lessonId));
    return lesson;
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
  input: Partial<Pick<Note, "title" | "summary" | "contentMarkdown" | "flashcards" | "mindMap">>
) {
  return mutateDb((db) => {
    const note = db.notes.find((item) => item.id === noteId && item.userId === userId);
    if (!note) return null;
    Object.assign(note, input, { updatedAt: new Date().toISOString() });
    return note;
  });
}

export async function deleteNote(userId: string, noteId: string) {
  return mutateDb((db) => {
    const index = db.notes.findIndex((item) => item.id === noteId && item.userId === userId);
    if (index === -1) return null;
    const [note] = db.notes.splice(index, 1);
    return note;
  });
}
