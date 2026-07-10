import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const reports = []

for (const requestedCount of [3, 4, 5, 6, 7, 8, 9]) {
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

    const originalLoopFix = swiper.loopFix.bind(swiper)
    let loopFixCallCount = 0
    swiper.loopFix = (...args) => {
      loopFixCallCount += 1
      return originalLoopFix(...args)
    }

    swiper.slideNext(0)
    await new Promise((resolve) => setTimeout(resolve, 100))
    const realIndexAfterLast = swiper.realIndex
    const loopFixCallsForNext = loopFixCallCount

    loopFixCallCount = 0
    swiper.slidePrev(0)
    await new Promise((resolve) => setTimeout(resolve, 100))

    const beforeDestroy = {
      cmsCount,
      slideCount,
      frameCount,
      loop: swiper.params.loop,
      slidesPerView: swiper.params.slidesPerView,
      centeredSlides: swiper.params.centeredSlides,
      realIndexAfterLast,
      loopFixCallsForNext,
      realIndexAfterPrevious: swiper.realIndex,
      loopFixCallsForPrevious: loopFixCallCount,
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

  if (requestedCount <= 4) {
    const slider = page.locator('.activite_images-inner')
    await slider.scrollIntoViewIfNeeded()
    const box = await slider.boundingBox()
    const initialSlideIndex = await page.evaluate(
      () =>
        document.querySelector('.swiper-slide-active')?.dataset.swiperSlideIndex
    )
    const slidePositions = []

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    for (const distance of [12, 24, 36, 48]) {
      await page.mouse.move(
        box.x + box.width / 2 - distance,
        box.y + box.height / 2
      )
      await page.waitForTimeout(10)
      slidePositions.push(
        await page.evaluate((slideIndex) => {
          const swiper = document.querySelector('.activite_images-inner')?.swiper
          const slide = [...(swiper?.slides || [])].find(
            (item) => item.dataset.swiperSlideIndex === slideIndex
          )
          return slide?.getBoundingClientRect().left ?? null
        }, initialSlideIndex)
      )
    }
    await page.mouse.up()

    report.dragPositions = slidePositions
    report.dragStaysNearby = slidePositions.every(
      (left) =>
        left !== null &&
        left > -box.width &&
        left < page.viewportSize().width + box.width
    )
  }

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
    report.centeredSlides === (report.cmsCount > 3) &&
    report.frameCountAfterDestroy === report.cmsCount &&
    report.frameCountAfterReinit === report.cmsCount &&
    report.loopAfterReinit === true &&
    (report.cmsCount > 4 || report.dragStaysNearby === true) &&
    report.realIndexAfterLast === 0 &&
    report.loopFixCallsForNext === 1 &&
    report.realIndexAfterPrevious === report.cmsCount - 1 &&
    report.loopFixCallsForPrevious === 1
)

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
