import { test, expect, Page } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login form correctly render hota hai', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
  });

  test('empty form submit par validation errors aate hain', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('invalid email format par validation error', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('somepassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('register page par navigate hota hai', async ({ page }) => {
    await page.getByRole('link', { name: /create account/i }).click();
    await expect(page).toHaveURL(/register/);
  });

  test('wrong credentials par error message aata hai', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });

  test('password visibility toggle kaam karta hai', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('testpassword');

    // Initially password type should be 'password'
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle visibility
    await page.getByRole('button', { name: /toggle password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('registration form correctly render hota hai', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('short password par validation error aata hai', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email address/i).fill('john@example.com');
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/at least 8/i)).toBeVisible();
  });

  test('login page par navigate hota hai', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/login/);
  });

  test('successful registration dashboard redirect karta hai', async ({ page }) => {
    const uniqueEmail = `e2e-test-${Date.now()}@example.com`;
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email address/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill('SecurePass123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });
});
