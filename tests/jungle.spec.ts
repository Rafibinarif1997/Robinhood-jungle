import { expect, test } from '@playwright/test'

async function openApp(page: import('@playwright/test').Page) {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`) })
  page.on('requestfailed', request => pageErrors.push(`request failed: ${request.url()} — ${request.failure()?.errorText}`))
  const response = await page.goto('./')
  await page.locator('#root').waitFor({ state: 'attached' })
  await page.waitForTimeout(1500)
  const rootHtml = await page.locator('#root').innerHTML()
  console.log(JSON.stringify({
    url: page.url(),
    status: response?.status(),
    title: await page.title(),
    rootText: (await page.locator('#root').innerText()).slice(0, 1200),
    rootHtml: rootHtml.slice(0, 1800),
    pageErrors,
  }))
  expect(response?.ok(), 'The app document should load successfully').toBeTruthy()
  expect(rootHtml, 'React should mount content into #root').not.toBe('')
  expect(pageErrors, 'The page should not throw uncaught runtime errors').toEqual([])
}

test('3D jungle page renders the explorer scene and objectives', async ({ page }) => {
  await openApp(page)
  await expect(page.locator('.jungle3d-wrap')).toBeVisible()
  await expect(page.locator('.jungle3d-head h2')).toContainText('ETH JUNGLE')
  await expect(page.locator('.jungle3d-stage canvas')).toBeVisible()
  await expect(page.locator('.j3d-objective')).toContainText('JUNGLE EXPEDITION')
  await expect(page.locator('.j3d-note')).toContainText('0/3 relics')
})

test('mobile layout exposes touch controls', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only control check')
  await openApp(page)
  await expect(page.locator('.j3d-mobile-controls')).toBeVisible()
  await expect(page.locator('.j3d-joystick')).toBeVisible()
  await expect(page.getByRole('button', { name: 'JUMP' })).toBeVisible()
})
