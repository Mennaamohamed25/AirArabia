import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

export const PASSWORD = 'Pass@123'

/** A valid 1×1 PNG used as odometer/receipt photo. */
export const tinyPng = {
  name: 'receipt.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
}

/** Demo users are <name>@airarabia.com; pass a short name or a full email. */
export const email = (user: string) => (user.includes('@') ? user : `${user}@airarabia.com`)

export async function login(page: Page, user: string, password = PASSWORD) {
  await page.goto('/login')
  await page.locator('#email').fill(email(user))
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByTestId('logout')).toBeVisible()
}

export async function newSession(browser: Browser, username: string, mobile = false) {
  const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {})
  const page = await context.newPage()
  await login(page, username)
  return { context, page }
}

/** Drives north from Cairo downtown at ~120 km/h, one fix per second (GPS interval is 1 s in E2E). */
export async function drive(context: BrowserContext, page: Page, steps: number) {
  let lat = 30.0444
  for (let i = 0; i < steps; i++) {
    lat += 0.0003
    await context.setGeolocation({ latitude: lat, longitude: 31.2357, accuracy: 10 })
    await page.waitForTimeout(1100)
  }
}

export async function tokenFor(page: Page) {
  return page.evaluate(() => localStorage.getItem('rt.token'))
}
