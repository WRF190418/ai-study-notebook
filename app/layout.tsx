import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./themes.css";
import "./worlds.css";
import "./course-spaces.css";
import "./home-spaces.css";
import "./tutorial.css";

export const metadata: Metadata = {
  title: "StudyNote AI",
  description: "面向大学生的 AI 网页笔记本"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
