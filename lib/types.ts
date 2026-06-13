export type Flashcard = {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
};

export type MindMapNode = {
  id: string;
  label: string;
  children?: MindMapNode[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  onboardingCompletedAt?: string;
  createdAt: string;
};

export type UserPreferences = {
  userId: string;
  primaryColor: "sage" | "cobalt" | "violet" | "mono";
  buttonRadius: "square" | "soft" | "pill";
  buttonStyle: "solid" | "soft" | "outline";
  density: "compact" | "comfortable" | "airy";
  cardStyle: "elevated" | "bordered" | "flat";
  lessonLayout: "grid" | "list";
  noteLayout: "reader" | "study";
  updatedAt: string;
};

export type PasswordReset = {
  id: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

export type Course = {
  id: string;
  userId: string;
  title: string;
  code: string;
  term: string;
  description: string;
  tags: string[];
  accent: string;
  createdAt: string;
};

export type Lesson = {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  subtitle: string;
  order: number;
  icon: "book" | "atom" | "sparkles" | "function" | "image";
  accent: string;
  createdAt: string;
};

export type Note = {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  title: string;
  sourceType: "text" | "outline" | "image" | "file";
  sourceText: string;
  contentMarkdown: string;
  summary: string;
  flashcards: Flashcard[];
  mindMap: MindMapNode[];
  createdAt: string;
  updatedAt: string;
};

export type AppDb = {
  users: User[];
  preferences: UserPreferences[];
  passwordResets: PasswordReset[];
  courses: Course[];
  lessons: Lesson[];
  notes: Note[];
};

export type AiOrganizeResult = {
  title: string;
  summary: string;
  markdown: string;
  flashcards: Flashcard[];
  mindMap: MindMapNode[];
  targetLesson?: {
    mode: "existing" | "new";
    lessonId?: string;
    title?: string;
    subtitle?: string;
    icon?: Lesson["icon"];
    accent?: string;
    reason?: string;
  };
};
