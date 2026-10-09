import { expect, test, type Page } from '@playwright/test'
import { drive, newSession, tinyPng } from './helpers'

// Full money flow, in order: driver ride → HR sees it live → submit → manager approves →
// receipt → HR closes the month → second ride rejected.
test.describe.configure({ mode: 'serial' })

let rideId = ''

async function startRide(page: Page, odometer: string) {
  await page.getByTestId('start-ride').click()
  await page.locator('#odometer').fill(odometer)
  await page.getByRole('button', { name: 'Start now' }).click()
  await expect(page.getByTestId('elapsed')).toBeVisible()
}

async function stopRide(page: Page, odometer: string) {
  await page.getByTestId('stop-ride').click()
  await page.locator('#odometer').fill(odometer)
  await page.getByRole('button', { name: 'Stop now' }).click()
  await expect(page.getByRole('heading', { name: 'Ride summary' })).toBeVisible()
}

test('driver ride appears live on the HR dashboard, then is submitted', async ({ browser }) => {
  const hr = await newSession(browser, 'hr')
  const driver = await newSession(browser, 'driver', true)

  await startRide(driver.page, '1000')
  await expect(driver.page.getByTestId('gps-status')).toContainText('GPS active')

  // HR sees the active ride without reloading (polling), gets an alert, and sees the name on the map.
  await expect(hr.page.getByTestId('active-rides')).toContainText('Ahmed Hassan')
  await expect(hr.page.getByTestId('toast').filter({ hasText: 'Ahmed Hassan started a ride' })).toBeVisible()
  await expect(hr.page.locator('.driver-label')).toContainText('Ahmed Hassan')

  await drive(driver.context, driver.page, 8)

  // End odometer below start is rejected.
  await driver.page.getByTestId('stop-ride').click()
  await driver.page.locator('#odometer').fill('999')
  await driver.page.getByRole('button', { name: 'Stop now' }).click()
  await expect(driver.page.getByRole('alert')).toContainText('greater than 1000')
  await driver.page.getByRole('button', { name: 'Cancel' }).click()

  // GPS ≈ 0.27 km vs odometer 1 km → mismatch warning.
  await stopRide(driver.page, '1001')
  await expect(driver.page.getByText('differ a lot')).toBeVisible()
  // The breakdown explains the payment and shows both options while the distance is undecided.
  const breakdown = driver.page.getByTestId('payment-breakdown')
  await expect(breakdown).toContainText('What we will pay')
  await expect(breakdown).toContainText('If odometer distance (1 km)')
  await expect(breakdown).toContainText('2.23')
  await expect(hr.page.getByTestId('active-rides')).not.toContainText('Ahmed Hassan')
  await expect(hr.page.getByTestId('toast').filter({ hasText: 'Ahmed Hassan ended the ride' })).toBeVisible()

  // Purpose is required.
  await driver.page.getByTestId('submit-ride').click()
  await expect(driver.page.getByRole('alert')).toContainText('purpose')

  await driver.page.locator('#purpose').fill('Brought printer toner from the supplier')
  await driver.page.getByRole('button', { name: 'Add fee' }).click()
  await driver.page.getByLabel('Amount (EGP)').fill('100')
  // A fee without a receipt photo is rejected.
  await driver.page.getByTestId('submit-ride').click()
  await expect(driver.page.getByRole('alert')).toContainText('receipt photo')
  await driver.page.getByTestId('fee-photo-0').setInputFiles(tinyPng)
  await expect(driver.page.getByTestId('fee-row').locator('img')).toBeVisible()
  await driver.page.getByTestId('submit-ride').click()

  const success = driver.page.getByRole('status').filter({ hasText: 'submitted for approval' })
  await expect(success).toBeVisible()
  rideId = (await success.getByRole('link').innerText()).replace('#', '')

  await expect(hr.page.getByTestId('submissions')).toContainText('Ahmed Hassan')
  await expect(hr.page.getByTestId('toast').filter({ hasText: 'Ahmed Hassan submitted ride' })).toBeVisible()
  await hr.context.close()
  await driver.context.close()
})

test('manager must pick a distance for a mismatched ride, then approves it', async ({ browser }) => {
  const { page, context } = await newSession(browser, 'manager')
  await page.getByTestId('ride-card').filter({ hasText: `#${rideId}` }).click()
  await expect(page.getByTestId('decision-panel')).toBeVisible()

  await page.getByTestId('approve').click()
  await expect(page.getByRole('alert')).toContainText('Choose which distance')

  await page.getByTestId('source-Odometer').click()
  await page.locator('#comment').fill('OK — odometer used')
  await page.getByTestId('approve').click()

  await expect(page.getByTestId('status').first()).toHaveText('Approved')
  // 1 km ÷ 10 km/L (company default) × 22.25 EGP = 2.23 fuel + 100 fee
  await expect(page.getByTestId('ride-total')).toContainText('102.23')
  await expect(page.getByTestId('pay-total')).toContainText('102.23')

  const download = page.waitForEvent('download')
  await page.getByTestId('download-receipt').click()
  expect((await download).suggestedFilename()).toBe(`receipt-RT-${rideId}.pdf`)
  await context.close()
})

test('HR closes the month, exports reports and the ride becomes Paid', async ({ browser }) => {
  const { page, context } = await newSession(browser, 'hr')
  await page.goto('/monthly')
  await expect(page.getByTestId('grand-total')).toContainText('102.23')
  await expect(page.getByTestId('month-state')).toHaveText('Open')

  const pdf = page.waitForEvent('download')
  await page.getByTestId('export-pdf').click()
  expect((await pdf).suggestedFilename()).toMatch(/^monthly-report-\d{4}-\d{2}\.pdf$/)

  const xlsx = page.waitForEvent('download')
  await page.getByTestId('export-excel').click()
  expect((await xlsx).suggestedFilename()).toMatch(/^rides-\d{4}-\d{2}\.xlsx$/)

  page.once('dialog', (d) => d.accept())
  await page.getByTestId('close-month').click()
  await expect(page.getByTestId('month-state')).toHaveText('Closed')
  await expect(page.getByTestId('ride-card').filter({ hasText: `#${rideId}` })).toContainText('Paid')
  await context.close()
})

test('driver sees the ride as Paid and can download the statement', async ({ browser }) => {
  const { page, context } = await newSession(browser, 'driver', true)
  await page.goto(`/rides/${rideId}`)
  await expect(page.getByTestId('status').first()).toHaveText('Paid')
  await page.goto('/monthly')
  await page.getByRole('button', { name: 'previous month' }).click()
  await page.getByRole('button', { name: 'next month' }).click()
  const pdf = page.waitForEvent('download')
  await page.getByTestId('export-pdf').click()
  expect((await pdf).suggestedFilename()).toMatch(/^statement-\d{4}-\d{2}\.pdf$/)
  await context.close()
})

test('manager rejects a ride with a reason the driver can read', async ({ browser }) => {
  const driver = await newSession(browser, 'driver', true)
  await startRide(driver.page, '2000')
  await drive(driver.context, driver.page, 3)
  await stopRide(driver.page, '2001')
  await driver.page.locator('#purpose').fill('Personal errand')
  await driver.page.getByTestId('submit-ride').click()
  const success = driver.page.getByRole('status').filter({ hasText: 'submitted for approval' })
  const id = (await success.getByRole('link').innerText()).replace('#', '')

  const manager = await newSession(browser, 'manager')
  await manager.page.goto(`/rides/${id}`)
  await manager.page.getByTestId('reject').click()
  await expect(manager.page.getByRole('alert')).toContainText('reason')
  await manager.page.locator('#comment').fill('Not a work trip')
  await manager.page.getByTestId('reject').click()
  await expect(manager.page.getByTestId('status').first()).toHaveText('Rejected')

  await driver.page.goto(`/rides/${id}`)
  await expect(driver.page.getByTestId('decision-comment')).toContainText('Not a work trip')
  await driver.context.close()
  await manager.context.close()
})
