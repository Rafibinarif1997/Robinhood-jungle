import { expect, test } from '@playwright/test'

async function openGame(page: import('@playwright/test').Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const response = await page.goto('./')
  await expect(page.locator('.pixel-game')).toBeVisible()
  await expect(page.locator('canvas[aria-label="Playable top down pixel adventure world"]')).toBeVisible()
  expect(response?.ok()).toBeTruthy()
  expect(errors).toEqual([])
}

test('desktop loads the playable pixel island and quest board', async ({ page }) => {
  await openGame(page)
  await expect(page.getByRole('heading', { name: /FIND YOUR OWN PATH/i })).toBeVisible()
  await expect(page.locator('.pg-canvas-wrap')).toBeVisible()
  await expect(page.locator('.pg-quest-card')).toHaveCount(3)
  await page.getByRole('button', { name: /OPEN BOARD/i }).click()
  await expect(page.locator('.pg-modal')).toContainText('QUEST BOARD')
  await expect(page.locator('.pg-modal')).toContainText('First Steps')
})

test('keyboard controls move the explorer', async ({ page }) => {
  await openGame(page)
  const before = await page.locator('.pg-stats').innerText()
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(600)
  await page.keyboard.up('ArrowUp')
  const after = await page.locator('.pg-stats').innerText()
  expect(after).not.toBe(before)
})

test('mobile layout exposes joystick and action controls', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only control check')
  await openGame(page)
  await expect(page.locator('.pg-touch-controls')).toBeVisible()
  await expect(page.locator('.pg-stick')).toBeVisible()
  await expect(page.getByRole('button', { name: 'JUMP' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'RUN' })).toBeVisible()
})
