import { chromium } from 'playwright'

const URL = 'http://localhost:3000/scripts/test-activite-slider.html'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

const report = await page.evaluate(async () => {
  const inner = document.querySelector('.activite_images-inner')
  const swiper = inner?.swiper
  if (!swiper) return { error: 'no swiper' }

  const originalCount = inner.querySelectorAll(
    '.swiper-slide[data-swiper-slide-index]'
  ).length

  const innerRect = inner.getBoundingClientRect()
  const visibleSides = () => {
    const active = inner.querySelector('.swiper-slide-active')
    const activeRect = active?.getBoundingClientRect()
    let hasLeft = false
    let hasRight = false

    inner.querySelectorAll('.swiper-slide').forEach((slide) => {
      if (slide === active) return
      const rect = slide.getBoundingClientRect()
      const visible = rect.right > innerRect.left && rect.left < innerRect.right
      if (!visible) return
      if (rect.right <= (activeRect?.left ?? 0) + 4) hasLeft = true
      if (rect.left >= (activeRect?.right ?? 0) - 4) hasRight = true
    })

    return { hasLeft, hasRight, activeRect }
  }

  swiper.slideTo(originalCount - 1, 0)
  await new Promise((r) => setTimeout(r, 400))

  const atLast = {
    realIndex: swiper.realIndex,
    isEnd: swiper.isEnd,
    isBeginning: swiper.isBeginning,
    slidesPerView: swiper.params.slidesPerView,
    rewind: swiper.params.rewind,
    slidesPerViewDynamic: swiper.slidesPerViewDynamic(),
    ...visibleSides(),
  }

  swiper.slideNext()
  await new Promise((r) => setTimeout(r, 600))

  const afterNext = {
    realIndex: swiper.realIndex,
    isEnd: swiper.isEnd,
    ...visibleSides(),
  }

  return { atLast, afterNext }
})

console.log(JSON.stringify(report, null, 2))

const ok =
  report.atLast?.isEnd === true && report.afterNext?.realIndex === 0

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
