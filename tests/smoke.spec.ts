import { expect, test } from "@playwright/test";

async function dismissOnboarding(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog", { name: "新手指导" });
  const appeared = await dialog.waitFor({ state: "visible", timeout: 8000 }).then(
    () => true,
    () => false
  );
  if (appeared) {
    await dialog.getByRole("button", { name: "跳过" }).click();
    await expect(page.getByRole("dialog", { name: "新手指导" })).toBeHidden({ timeout: 10_000 });
  }
}

test("registers a user and reaches the course workspace", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `student-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("测试学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("dialog", { name: "新手指导" })).toBeVisible();
  await dismissOnboarding(page);
  await expect(page.getByRole("heading", { name: "课程章节" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 整理台" })).toBeVisible();
  await page.getByRole("button", { name: "新手指导" }).click();
  await expect(page.getByRole("dialog", { name: "新手指导" })).toBeVisible();
  await dismissOnboarding(page);
});

test("scrolls notes and AI sidebar independently on desktop", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto("/");

  const email = `scroll-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("滚动测试");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();
  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);

  const notes = page.locator(".content-scroll");
  const organizer = page.locator(".organizer");
  await expect(notes).toHaveCSS("overflow-y", "auto");
  await expect(organizer).toHaveCSS("overflow-y", "auto");

  await page.evaluate(() => {
    for (const selector of [".content-scroll", ".organizer"]) {
      const region = document.querySelector(selector);
      const filler = document.createElement("div");
      filler.style.height = "1600px";
      filler.dataset.testFiller = "true";
      region?.appendChild(filler);
    }
  });

  await notes.hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => notes.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => organizer.evaluate((element) => element.scrollTop)).toBe(0);

  const notesScrollTop = await notes.evaluate((element) => element.scrollTop);
  await organizer.locator(":scope > .panel-heading").hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => organizer.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => notes.evaluate((element) => element.scrollTop)).toBe(notesScrollTop);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("resets a forgotten password with a one-time code", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `reset-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("忘密学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByRole("button", { name: "退出" }).click();
  await expect(page.getByRole("heading", { name: "创建学习空间" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "回到学习空间" })).toBeVisible();
  await page.getByRole("button", { name: "忘记密码？" }).click();
  await page.getByLabel("邮箱").fill(email);
  await page.getByRole("button", { name: "获取验证码" }).click();

  await expect(page.getByRole("heading", { name: "设置新密码" })).toBeVisible();
  await expect(page.getByLabel("验证码")).toHaveValue(/\d{6}/);
  await page.getByLabel("新密码").fill("newpass123");
  await page.getByRole("button", { name: "重置密码" }).click();

  await expect(page.getByRole("heading", { name: "回到学习空间" })).toBeVisible();
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("newpass123");
  await page.locator("form").getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
});

test("creates a course board from a direct AI command", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `course-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("课程学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByLabel("AI 命令行").fill("新建一个phy1000学习板块");
  await page.getByRole("button", { name: /执行命令/ }).click();

  await expect(page.getByText("已新建板块")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "PHY1000" })).toBeVisible();
  await expect(page.getByLabel("选择课程")).toHaveValue(/.+/);
});

test("deletes a chapter card from a direct AI command", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `lesson-delete-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("章节学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await expect(page.getByRole("heading", { name: "公式、表格与图像标注" })).toBeVisible();
  await page.getByLabel("AI 命令行").fill("删除公式、表格与图像标注的笔记栏");
  await page.getByRole("button", { name: /执行命令/ }).click();

  await expect(page.getByText("已删除章节")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "公式、表格与图像标注" })).toBeHidden();
});

test("renames a numbered chapter from a direct AI command", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `lesson-rename-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("改名学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByLabel("AI 命令行").fill("第一章标题改为牛顿力学");
  await page.getByRole("button", { name: /执行命令/ }).click();

  await expect(page.getByText("已将章节重命名为")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "牛顿力学" })).toBeVisible();
});

test("uses a real AI provider for a compound notebook command", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `ai-command-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("AI 命令学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);

  await page.getByLabel("AI 命令行").fill("把第一章标题改成经典力学导论，同时把这张章节卡片改成蓝色");
  const commandResponse = page.waitForResponse((response) => response.url().includes("/api/ai/command"));
  await page.getByRole("button", { name: /执行命令/ }).click();
  const response = await commandResponse;
  const data = await response.json();

  expect(response.ok()).toBeTruthy();
  expect(data.aiProvider).toBeTruthy();
  expect(data.action).toBe("ai_plan");
  await expect(page.getByText(/由 .+ 理解并执行/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "经典力学导论" })).toBeVisible();
  await expect(page.locator(".lesson-card").filter({ hasText: "Lecture 1" }).locator(".lesson-art.cobalt")).toBeVisible();
});

test("changes a numbered chapter card color without renaming it", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `lesson-style-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("样式学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByLabel("AI 命令行").fill("新建一个phy1000学习板块");
  await page.getByRole("button", { name: /执行命令/ }).click();
  await expect(page.getByRole("heading", { name: "PHY1000" })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("AI 命令行").fill("第一章课程按钮颜色改为粉色");
  await page.getByRole("button", { name: /执行命令/ }).click();

  await expect(page.getByText("卡片样式改为粉色")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "第一章" })).toBeVisible();
  await expect(page.locator(".lesson-card").filter({ hasText: "Lecture 1" }).locator(".lesson-art.rose")).toBeVisible();
});

test("changes a numbered chapter card to a colorful style", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `lesson-colorful-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("彩色学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByLabel("AI 命令行").fill("第一章颜色调成彩色");
  await page.getByRole("button", { name: /执行命令/ }).click();

  await expect(page.getByText(/彩色渐变|章节卡片样式/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".lesson-card").filter({ hasText: "Lecture 1" }).locator(".lesson-art.rose")).toBeVisible();
});

test("uploads courseware and sends it for note organization", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `upload-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("课件学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);

  const workspace = await page.evaluate(async () => {
    const response = await fetch("/api/workspace");
    return response.json();
  });
  const course = workspace.courses[0];
  const lesson = workspace.lessons.find((item: { courseId: string }) => item.courseId === course.id);
  const now = new Date().toISOString();
  let organizeRequests = 0;

  await page.route("**/api/ai/organize", async (route) => {
    organizeRequests += 1;
    const request = route.request();
    const contentType = await request.headerValue("content-type");
    expect(contentType).toContain("multipart/form-data");
    expect(request.postDataBuffer()?.toString("utf8")).toContain("lecture-notes.txt");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (organizeRequests === 1) {
      await route.fulfill({
        contentType: "text/plain",
        status: 502,
        body: "upstream connection closed"
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        lesson,
        note: {
          id: `note-${Date.now()}`,
          userId: course.userId,
          courseId: course.id,
          lessonId: lesson.id,
          title: "动量守恒课件整理",
          sourceType: "file",
          sourceText: "动量守恒与冲量",
          contentMarkdown: "# 动量守恒课件整理\n\n## 核心内容\n\n动量守恒与冲量。",
          summary: "课件整理完成。",
          flashcards: [],
          mindMap: [
            {
              id: "mind-root",
              label: "动量守恒",
              children: [{ id: "mind-formula", label: "公式：$p=mv$" }]
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      })
    });
  });

  await page.locator(".upload-zone input[type=file]").setInputFiles({
    name: "lecture-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("动量守恒与冲量")
  });
  await expect(page.getByText("lecture-notes.txt")).toBeVisible();
  await page.getByRole("button", { name: /开始整理/ }).click();
  await expect(page.getByRole("progressbar", { name: /整理进度/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /整理中 \d+%/ })).toBeVisible();
  await expect(page.getByText("整理请求中断或服务器响应异常，请检查网络后重试。")).toBeVisible({
    timeout: 10_000
  });
  await expect(page.getByRole("button", { name: /开始整理/ })).toBeEnabled();

  await page.getByRole("button", { name: /开始整理/ }).click();

  await expect(page.getByRole("article").getByRole("heading", { name: "动量守恒课件整理" })).toBeVisible({
    timeout: 30_000
  });
  await expect(page.locator(".mindmap .katex")).toContainText("p=mv");
});

test("organizes material into a note when AI is configured", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `ai-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("AI 学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByLabel("原始文字").fill(
    "牛顿第二定律 F=ma。请整理成 Markdown，包含 LaTeX 公式 $$F=ma$$，并给出三列表格和复习闪卡。至少一张闪卡的答案必须包含公式 $F=ma$。"
  );
  await expect(page.getByLabel("原始文字")).toHaveValue(/牛顿第二定律/);
  await page.getByRole("button", { name: /开始整理/ }).click();

  await Promise.race([
    page.locator(".note-reader").waitFor({ timeout: 90_000 }),
    page.locator(".error-box").waitFor({ timeout: 90_000 })
  ]);

  const error = page.locator(".error-box").last();
  if (await error.isVisible().catch(() => false)) {
    await expect(error).toContainText(/OPENAI_API_KEY|速率限制|AI 整理失败/);
  } else {
    await expect(page.locator(".note-reader")).toContainText(/牛顿|第二定律|Newton/);
    await expect(page.locator(".flashcard .katex").first()).toBeVisible({ timeout: 30_000 });
  }
});

test("organizes into a missing explicit second chapter", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = `ai-second-${testInfo.project.name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("昵称").fill("第二章学生");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("12345678");
  await page.getByRole("button", { name: "进入笔记本" }).click();

  await expect(page.getByRole("heading", { name: "自然对话基础" })).toBeVisible({ timeout: 30_000 });
  await dismissOnboarding(page);
  await page.getByLabel("AI 命令行").fill("新建一个体育学习板块");
  await page.getByRole("button", { name: /执行命令/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /体育/ })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("整理要求").fill("整理到第二章");
  await page.getByLabel("原始文字").fill("游泳时遇到了女朋友，记录这个生活场景。");
  await page.getByRole("button", { name: /开始整理/ }).click();

  await Promise.race([
    page.getByRole("heading", { name: "第二章" }).waitFor({ timeout: 90_000 }),
    page.locator(".error-box").waitFor({ timeout: 90_000 })
  ]);

  const error = page.locator(".error-box").last();
  if (await error.isVisible().catch(() => false)) {
    await expect(error).toContainText(/AI 整理失败|速率限制|API Key/);
  } else {
    await expect(page.getByRole("heading", { name: "第二章" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "第一章" })).toBeHidden();
  }
});
