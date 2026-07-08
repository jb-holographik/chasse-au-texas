import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:5173/scripts/test-activite-slider.html'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

const report = await page.evaluate(async () => {
  const inner = document.querySelector('.activite_images-inner')
  if (!inner) return { error: 'no inner' }

  const slides = [...inner.querySelectorAll('.swiper-slide')]
  const swiper = inner.swiper

  const snap = () => ({
    activeTransform: swiper
      ? getComputedStyle(swiper.slides[swiper.activeIndex]).transform
      : null,
    translate: swiper?.translate,
    realIndex: swiper?.realIndex,
  })

  const start = snap()
  swiper?.slideNext()
  await new Promise((r) => setTimeout(r, 600))
  const afterNext = snap()
  swiper?.slideNext()
  await new Promise((r) => setTimeout(r, 600))
  const afterNext2 = snap()

  return {
    innerClasses: inner.className,
    innerOverflow: getComputedStyle(inner).overflow,
    hiddenOutsideWrapper: [...inner.children].filter((node) =>
      node.matches('.activite_images_img')
    ).length,
    slideTransforms: slides.map((slide) => getComputedStyle(slide).transform),
    hasSwiper: Boolean(swiper),
    loop: swiper?.params?.loop,
    spaceBetween: swiper?.params?.spaceBetween,
    navigation: { start, afterNext, afterNext2 },
  }
})

console.log(JSON.stringify(report, null, 2))

const transformsOk = report.slideTransforms?.every(
  (t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'
)

const ok =
  report.hasSwiper &&
  report.hiddenOutsideWrapper === 0 &&
  transformsOk &&
  report.navigation?.start?.activeTransform === 'none'

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
