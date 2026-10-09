import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('HR creates a user with an email and that user can sign in', async ({ page }) => {
  await login(page, 'hr')
  await page.goto('/admin')
  await page.getByPlaceholder('Email').fill('Omar.Khaled@airarabia.com')
  await page.getByPlaceholder('Full name').fill('Omar Khaled')
  await page.getByPlaceholder('Password').fill('Secret@1')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('omar.khaled@airarabia.com · Driver')).toBeVisible()

  await page.getByTestId('logout').click()
  await login(page, 'omar.khaled@airarabia.com', 'Secret@1')
  await expect(page.getByTestId('user-name')).toHaveText('Omar Khaled')
})

test('HR records a new 92 fuel price', async ({ page }) => {
  await login(page, 'hr')
  await page.goto('/admin')
  await page.getByRole('button', { name: '92 fuel price' }).click()
  await page.getByTestId('price-input').fill('21.50')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('current-price')).toContainText('21.50')
})

test('HR sees storage usage and can run cleanup', async ({ page }) => {
  await login(page, 'hr')
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Storage', exact: true }).click()
  await expect(page.getByText('Database size')).toBeVisible()
  await page.getByRole('button', { name: 'Run cleanup now' }).click()
  await expect(page.getByRole('status')).toContainText('Cleanup removed')
})

test('HR deletes a user without history after confirming', async ({ page }) => {
  await login(page, 'hr')
  await page.goto('/admin')
  await page.getByPlaceholder('Email').fill('temp.user@airarabia.com')
  await page.getByPlaceholder('Full name').fill('Temp User')
  await page.getByPlaceholder('Password').fill('Secret@1')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('temp.user@airarabia.com · Driver')).toBeVisible()

  await page.getByRole('button', { name: 'Delete Temp User' }).click()
  await expect(page.getByTestId('confirm-delete')).toContainText('Delete Temp User?')
  await page.getByTestId('confirm-delete').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Temp User was deleted.')).toBeVisible()
  await expect(page.getByText('temp.user@airarabia.com')).toHaveCount(0)
})

test('a driver with rides cannot be deleted, and HR cannot delete themselves', async ({ page }) => {
  await login(page, 'hr')
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Delete Ahmed Hassan' }).click()
  await page.getByTestId('confirm-delete').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('alert')).toContainText('Disable the account instead')
  await expect(page.getByText('driver@airarabia.com · Driver')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Omnia' })).toHaveCount(0)
})
