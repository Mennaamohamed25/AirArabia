import { expect, test } from '@playwright/test'
import { login, tokenFor } from './helpers'

test('wrong password shows an error', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('driver@airarabia.com')
  await page.locator('#password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Wrong email or password')
})

test('each role lands on its home page', async ({ page }) => {
  for (const [user, path] of [['driver', '/driver'], ['manager', '/approvals'], ['hr', '/dashboard']]) {
    await login(page, user)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await page.getByTestId('logout').click()
    await expect(page).toHaveURL(/\/login$/)
  }
})

test('driver cannot open manager, HR or admin pages', async ({ page }) => {
  await login(page, 'driver')
  for (const path of ['/dashboard', '/approvals', '/admin']) {
    await page.goto(path)
    await expect(page.getByTestId('not-allowed')).toBeVisible()
  }
})

test('server rejects driver calls to protected APIs', async ({ page, request }) => {
  await login(page, 'driver')
  const headers = { Authorization: `Bearer ${await tokenFor(page)}` }
  expect((await request.get('http://localhost:5081/api/dashboard', { headers })).status()).toBe(403)
  expect((await request.get('http://localhost:5081/api/admin/users', { headers })).status()).toBe(403)
  expect((await request.post('http://localhost:5081/api/months/2026-01/close', { headers })).status()).toBe(403)
  expect((await request.get('http://localhost:5081/api/dashboard')).status()).toBe(401)
})

test('HR is the main role and sees all management tabs', async ({ page }) => {
  await login(page, 'hr')
  await page.getByRole('link', { name: 'Management' }).first().click()
  for (const tab of ['Users', '92 fuel price', 'Settings', 'Storage'])
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible()
  await page.getByRole('button', { name: '92 fuel price' }).click()
  await expect(page.getByTestId('current-price')).toContainText('22.25')
  // 100 km with the default 10 km/L: 10 L × 22.25 = 222.50 EGP (2.23 EGP per km)
  await expect(page.getByTestId('calc-per-km')).toContainText('2.23')
  await expect(page.getByTestId('calc-total')).toContainText('222.50')
})

test('manager cannot open management pages', async ({ page }) => {
  await login(page, 'manager')
  await page.goto('/admin')
  await expect(page.getByTestId('not-allowed')).toBeVisible()
})

test('language switch flips to Arabic RTL and is remembered', async ({ page }) => {
  await login(page, 'driver')
  await page.getByTestId('lang-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByTestId('start-ride')).toContainText('ابدأ الرحلة')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByTestId('start-ride')).toContainText('ابدأ الرحلة')
  await page.getByTestId('lang-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('password can be shown and hidden on the login page', async ({ page }) => {
  await page.goto('/login')
  const field = page.locator('#password')
  await field.fill('Pass@123')
  await expect(field).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(field).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(field).toHaveAttribute('type', 'password')
})

test('HR account is named Omnia', async ({ page }) => {
  await login(page, 'hr')
  await expect(page.getByTestId('user-name')).toHaveText('Omnia')
})
