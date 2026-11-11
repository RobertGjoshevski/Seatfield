import { expect, test, type Page } from '@playwright/test'

// Map world coordinates through the SVG's current screen CTM. This
// respects the viewBox and any letterboxing from preserveAspectRatio.
async function clickWorld(page: Page, x: number, y: number) {
  const svg = page.getByTestId('viewport-2d')
  const point = await svg.evaluate(
    (element, world) => {
      const node = element as SVGSVGElement
      const svgPoint = node.createSVGPoint()
      svgPoint.x = world.x
      svgPoint.y = -world.y
      const matrix = node.getScreenCTM()
      if (!matrix) throw new Error('The 2D viewport has no screen matrix')
      const screen = svgPoint.matrixTransform(matrix)
      return { x: screen.x, y: screen.y }
    },
    { x, y },
  )
  await page.mouse.click(point.x, point.y)
}

test('draws a room, previews coverage, and restores the project', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-seeded', '1')
    }
  })
  await page.goto('/')

  await clickWorld(page, 0, 0)
  await clickWorld(page, 4, 0)
  await clickWorld(page, 4, 3)
  await clickWorld(page, 0, 3)
  await page.keyboard.press('Enter')

  await expect(page.getByTestId('room-status')).toContainText(
    'Room: 4 vertices',
  )

  await page.getByTestId('tool-speaker').click()
  await clickWorld(page, 2, 0.5)
  await page.getByLabel('Yaw').fill('180')

  await page.getByTestId('tool-listener').click()
  await clickWorld(page, 2, 2)

  await expect(page.getByTestId('coverage-status')).toHaveText('Ready', {
    timeout: 15_000,
  })
  await expect(page.getByTestId('coverage-points')).not.toHaveText('—')

  await page.getByTestId('view-3d').click()
  await expect(page.getByTestId('viewport-3d')).toBeVisible()

  await expect(page.getByTestId('persistence-status')).toHaveText('Saved', {
    timeout: 10_000,
  })
  await page.reload()

  await expect(page.getByTestId('room-status')).toContainText(
    'Room: 4 vertices',
  )
  await expect(page.getByTestId('coverage-status')).toHaveText('Ready', {
    timeout: 15_000,
  })
})
