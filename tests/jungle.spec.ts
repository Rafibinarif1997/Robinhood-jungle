import { expect, test } from '@playwright/test'

test('3D jungle page renders the explorer scene and objectives', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.jungle3d-wrap')).toBeVisible()
  await expect(page.locator('.jungle3d-head h2')).toContainText('THE EMERALD')
  await expect(page.locator('.jungle3d-stage canvas')).toBeVisible()
  await expect(page.locator('.j3d-objective')).toContainText('JUNGLE EXPEDITION')
  await expect(page.locator('.j3d-note')).toContainText('0/2 discovered')
})

test('mobile layout exposes touch controls', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only control check')
  await page.goto('/')
  await expect(page.locator('.j3d-mobile-controls')).toBeVisible()
  await expect(page.locator('.j3d-joystick')).toBeVisible()
  await expect(page.getByRole('button', { name: 'JUMP' })).toBeVisible()
})
