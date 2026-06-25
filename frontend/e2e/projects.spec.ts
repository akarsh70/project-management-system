import { test, expect } from '@playwright/test';

test.describe('Projects Page (authenticated)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('projects page correctly render hoti hai', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();
  });

  test('create project dialog open hota hai', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/project name/i)).toBeVisible();
  });

  test('empty project name par validation error', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test('new project create aur list mein dikhta hai', async ({ page }) => {
    const projectName = `E2E Project ${Date.now()}`;
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByLabel(/description/i).fill('E2E test project description');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });
  });

  test('project search filter kaam karta hai', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search projects/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('non-existent-project-xyz');
    await page.waitForTimeout(600); // debounce wait
    await expect(page.getByText(/no projects found/i)).toBeVisible({ timeout: 5000 });
  });

  test('cancel dialog kaam karta hai', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Tasks Page (authenticated)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('tasks kanban board render hota hai', async ({ page }) => {
    // Navigate to a project's tasks
    await page.goto('/projects');
    await page.waitForTimeout(2000); // Wait for projects to load

    const projectLink = page.getByRole('button', { name: /view tasks/i }).first();
    const exists = await projectLink.isVisible();

    if (exists) {
      await projectLink.click();
      await expect(page.getByText(/todo/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/in progress/i)).toBeVisible();
      await expect(page.getByText(/done/i)).toBeVisible();
    } else {
      // No projects yet — just verify tasks page is accessible
      await page.goto('/tasks');
      await expect(page).toHaveURL(/tasks/);
    }
  });
});
