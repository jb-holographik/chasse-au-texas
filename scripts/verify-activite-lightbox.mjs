import { chromium, devices } from 'playwright'

const URL = 'http://localhost:3000/scripts/test-activite-slider.html?count=3'
const browser = await chromium.launch({ headless: true })

async function verifyLightbox(contextOptions, interaction) {
  const page = await browser.newPage(contextOptions)
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1000)

  const photo = page.locator('.swiper-slide-active .activite_img')
  await interaction(photo)
  await page.waitForTimeout(200)

  const result = await page.evaluate(() => ({
    isOpen: document
      .querySelector('.activite-photo-lightbox')
      ?.classList.contains('is-open'),
    hasImage: Boolean(
      document.querySelector('.activite-photo-lightbox__img')?.getAttribute('src')
    ),
  }))

  if (result.isOpen) {
    await page.locator('.activite-photo-lightbox__backdrop').click()
    await page.waitForTimeout(100)
    result.closesFromBackdrop = await page.evaluate(
      () =>
        !document
          .querySelector('.activite-photo-lightbox')
          ?.classList.contains('is-open')
    )
  }

  await page.close()
  return result
}

const desktop = await verifyLightbox(
  { viewport: { width: 1440, height: 900 } },
  (photo) => photo.click()
)
const android = await verifyLightbox(devices['Pixel 5'], (photo) => photo.tap())

const report = { desktop, android }
console.log(JSON.stringify(report, null, 2))

const ok =
  desktop.isOpen &&
  desktop.hasImage &&
  desktop.closesFromBackdrop &&
  android.isOpen &&
  android.hasImage &&
  android.closesFromBackdrop

await browser.close()
console.log(ok ? '\nPASS' : '\nFAIL')
process.exit(ok ? 0 : 1)
