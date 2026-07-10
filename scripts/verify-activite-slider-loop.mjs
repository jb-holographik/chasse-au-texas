import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const reports = []

for (const requestedCount of [3, 4, 5, 6, 7]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const loopWarnings = []
  page.on('console', (message) => {
    if (message.text().includes('Swiper Loop Warning')) {
      loopWarnings.push(message.text())
    }
  })

  await page.goto(
    `http://localhost:3000/scripts/test-activite-slider.html?count=${requestedCount}`,
    { waitUntil: 'networkidle', timeout: 60000 }
  )
  await page.waitForTimeout(4000)

  const report = await page.evaluate(async () => {
    const inner = document.querySelector('.activite_images-inner')
    const swiper = inner?.swiper
    if (!swiper) return { error: 'no swiper' }

    const cmsCount = Number(inner.dataset.photoCount)
    const slideCount = inner.querySelectorAll('.swiper-slide').length
    const frameCount = inner.querySelectorAll('.activite_images_img').length

    swiper.slideToLoop(cmsCount - 1, 0)
    await new Promise((resolve) => setTimeout(resolve, 100))
    swiper.slideNext(0)
    await new Promise((resolve) => setTimeout(resolve, 100))

    const beforeDestroy = {
      cmsCount,
      slideCount,
      frameCount,
      loop: swiper.params.loop,
      slidesPerView: swiper.params.slidesPerView,
      realIndexAfterLast: swiper.realIndex,
    }

    window.activitePhotosTestApi.destroy()
    const frameCountAfterDestroy = inner.querySelectorAll(
      '.activite_images_img'
    ).length

    await window.activitePhotosTestApi.init()
    const frameCountAfterReinit = inner.querySelectorAll(
      '.activite_images_img'
    ).length

    return {
      ...beforeDestroy,
      frameCountAfterDestroy,
      frameCountAfterReinit,
      loopAfterReinit: inner.swiper?.params.loop,
    }
  })

  reports.push({ requestedCount, loopWarnings, ...report })
  await page.close()
}

console.log(JSON.stringify(reports, null, 2))

const ok = reports.every(
  (report) =>
    report.loopWarnings.length === 0 &&
    report.cmsCount === report.requestedCount &&
    report.slideCount === report.cmsCount &&
    report.frameCount === report.cmsCount &&
    report.loop === true &&
    report.slidesPerView === (report.cmsCount >= 5 ? 1.12 : 1) &&
    report.frameCountAfterDestroy === report.cmsCount &&
    report.frameCountAfterReinit === report.cmsCount &&
    report.loopAfterReinit === true &&
    report.realIndexAfterLast === 0
)

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
