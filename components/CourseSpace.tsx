"use client";

import { Atom, BookOpen, ChevronRight, FunctionSquare, Sparkles } from "lucide-react";
import type { Course, Lesson, Note, NoteReadingProgress, UserPreferences } from "@/lib/types";
import { poeticScenes } from "@/lib/themes";
import ThemeLandscape from "@/components/ThemeWorld";

const spaces = {
  "warm-study": { label: "灯下目录", eyebrow: "THE LAMPLIT STUDY", invitation: "灯已亮起，翻到今天想读的一章。", collection: "书房目录", action: "翻阅本章", mark: "藏" },
  "mist-forest": { label: "林间书径", eyebrow: "A PATH THROUGH THE GROVE", invitation: "循着知识的脉络，往林深处走一程。", collection: "沿径而读", action: "走入本章", mark: "叶" },
  "midnight-atlas": { label: "知识星图", eyebrow: "ATLAS OF DISCOVERY", invitation: "每个章节，都是一处值得抵达的坐标。", collection: "章节坐标", action: "前往坐标", mark: "✧" },
  "cognitive-lab": { label: "研究索引", eyebrow: "COGNITION / RESEARCH INDEX", invitation: "从概念到连接，在这里展开新的探索。", collection: "章节索引", action: "打开章节", mark: "＋" },
  "poetic-realm": { label: "卷中目录", eyebrow: "一卷在手 · 心有山水", invitation: "循字入境，慢慢读，慢慢懂。", collection: "此卷篇目", action: "展读此章", mark: "卷" },
  "arcane-library": { label: "藏书内页", eyebrow: "THE NOCTURNE ARCHIVE / CONTENTS", invitation: "书已展开，求索自此页开始。", collection: "秘典目录", action: "翻开此章", mark: "✦" }
} as const;

export default function CourseSpace({ theme, poemIndex, course, lessons, notes, readingProgress, activeLessonId, lessonLayout, onEnterLesson }: {
  theme: UserPreferences["theme"]; poemIndex: number; course?: Course; lessons: Lesson[]; notes: Note[];
  readingProgress: NoteReadingProgress[]; activeLessonId: string; lessonLayout: UserPreferences["lessonLayout"];
  onEnterLesson: (lesson: Lesson) => void;
}) {
  const space = spaces[theme];
  const ownNotes = notes.filter(note => note.courseId === course?.id);
  const readIds = new Set(readingProgress.map(progress => progress.noteId));
  const readNotes = ownNotes.filter(note => readIds.has(note.id)).length;
  const title = course?.title.startsWith(course.code) ? course.title.slice(course.code.length).trim() : course?.title;
  const poem = poeticScenes[poemIndex];

  return <div className={`course-space course-space-${theme}`} data-course-theme={theme}>
    {course && <section className="course-hero course-titlepage" aria-label={space.label}>
      <div className="course-space-eyebrow"><span>{space.eyebrow}</span><span className="course-volume-mark" aria-hidden="true">{space.mark}</span></div>
      <div className="course-titlepage-main">
        <span className="course-call-number">{course.code}</span>
        <h1>{title || course.title}</h1>
        <p className="course-description">{course.description}</p>
        <div className="tag-row">{course.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
      </div>
      <div className="course-world-art"><ThemeLandscape theme={theme} poemIndex={poemIndex} preview /></div>
      <div className="course-titlepage-footer">
        <div className="course-space-stats" aria-label="本课程阅读概览"><span><strong>{lessons.length}</strong> 章</span><span><strong>{ownNotes.length}</strong> 篇笔记</span><span><strong>{readNotes}</strong> 篇有阅读记录</span></div>
        <p className="course-invitation">{space.invitation}</p>
        {theme === "poetic-realm" && <div className="course-margin-poem" aria-label="此刻诗境"><span>{poem.verse[0]}<br />{poem.verse[1]}</span><small>{poem.author} ·《{poem.title}》</small></div>}
        {theme === "arcane-library" && <div className="course-archive-emblem" aria-hidden="true"><i /><span>✧</span><i /></div>}
      </div>
    </section>}
    <section className="course-contents" aria-label="课程章节">
      <header className="section-title course-contents-heading"><div><span>{space.collection}</span><h2><BookOpen size={19} />课程章节</h2></div><small>{String(lessons.length).padStart(2, "0")} CHAPTERS</small></header>
      <div className={`lesson-grid course-chapters${lessonLayout === "list" ? " lesson-list" : ""}`}>
        {theme === "midnight-atlas" && lessons.length > 1 && <svg className="chapter-constellation" viewBox={`0 0 1000 ${Math.ceil(lessons.length / 2) * 200}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={lessons.map((_, index) => `${index % 2 ? 740 : 240},${Math.floor(index / 2) * 200 + 65 + (index % 2 ? 35 : 0)}`).join(" ")} fill="none" stroke="currentColor" strokeDasharray="3 9" /></svg>}
        {lessons.map((lesson, index) => {
          const Icon = lesson.icon === "atom" ? Atom : lesson.icon === "function" ? FunctionSquare : lesson.icon === "sparkles" ? Sparkles : BookOpen;
          const chapterNotes = ownNotes.filter(note => note.lessonId === lesson.id);
          const hasRead = chapterNotes.some(note => readIds.has(note.id));
          const label = lesson.title.match(/^(?:Lecture|Tutorial|Chapter)\s+\d+[a-z]?(?=\s|[:：]|$)/i)?.[0] ?? `Lecture ${lesson.order}`;
          return <button className={`lesson-card course-chapter${lesson.id === activeLessonId ? " is-current" : ""}`} type="button" key={lesson.id} onClick={() => onEnterLesson(lesson)}>
            <div className={`lesson-art ${lesson.accent}`}><span className="chapter-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="lesson-badge">{label}</span><span className="lesson-icon"><Icon size={23} /></span></div>
            <div className="lesson-body"><h3>{lesson.title}</h3><p>{lesson.subtitle}</p><span className="chapter-note-meta">{chapterNotes.length ? `${chapterNotes.length} 篇笔记` : "待整理"}{hasRead && <span className="chapter-read-marker">有阅读记录</span>}</span></div>
            <span className="inline-link chapter-open"><span>{space.action}</span><ChevronRight size={17} /></span>
          </button>;
        })}
        {!lessons.length && <p className="course-chapters-empty">这门课程还没有章节。可使用右侧整理台添加资料或创建章节。</p>}
      </div>
      <footer className="course-colophon"><span>{course?.code}</span><span>{space.label} · 按原课程顺序</span><span aria-hidden="true">{space.mark}</span></footer>
    </section>
  </div>;
}
