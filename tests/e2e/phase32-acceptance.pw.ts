import { expect, test } from "@playwright/test";

test.describe("Phase 3.2.1 isolated workspace", () => {
  test("opens VYRA with isolated persisted project APIs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Projects");
    const projects = await page.request.get("/api/projects?take=10");
    expect(projects.ok()).toBeTruthy();
    const payload = await projects.json();
    expect(Array.isArray(payload.projects)).toBeTruthy();
  });

  test("keeps Bun unit tests outside Playwright discovery", async ({}, testInfo) => {
    expect(testInfo.file).toContain("tests\\e2e");
  });
});
