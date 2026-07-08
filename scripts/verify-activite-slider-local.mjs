import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:5173/scripts/test-activite-slider.html'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

const report = await page.evaluate(async () => {
  const inner = document.querySelector('.activite_images-inner')
  const swiper = inner?.swiper
  const slides = [...inner.querySelectorAll('.swiper-slide')]

  const getSlideState = (index) => {
    const slide = slides[index]
    const frame = slide?.querySelector('.activite_images_img')
    return {
      slideTransform: slide ? getComputedStyle(slide).transform : null,
      frameTransform: frame ? getComputedStyle(frame).transform : null,
      frameClasses: frame?.className || null,
      slideWidth: slide?.offsetWidth,
    }
  }

  const snap = () => ({
    translate: swiper?.translate,
    realIndex: swiper?.realIndex,
    active: getSlideState(swiper?.activeIndex ?? 0),
    next: getSlideState((swiper?.activeIndex ?? 0) + 1),
  })

  const start = snap()
  swiper?.slideNext()
  await new Promise((r) => setTimeout(r, 600))
  const afterNext = snap()

  return {
    innerWidth: inner?.offsetWidth,
    innerOverflow: inner ? getComputedStyle(inner).overflow : null,
    slideCount: slides.length,
    hasIsSecond: Boolean(inner?.querySelector('.is-second')),
    framesAreSlides: Boolean(inner?.querySelector('.activite_images_img.swiper-slide')),
    start,
    afterNext,
  }
})

console.log(JSON.stringify(report, null, 2))

const isNeutralTransform = (value) =>
  value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)'

const ok =
  report.slideCount >= 3 &&
  !report.hasIsSecond &&
  !report.framesAreSlides &&
  report.innerOverflow === 'hidden' &&
  isNeutralTransform(report.start.active.slideTransform) &&
  isNeutralTransform(report.start.active.frameTransform) &&
  isNeutralTransform(report.start.next.frameTransform) &&
  isNeutralTransform(report.afterNext.active.frameTransform) &&
  report.start.active.slideWidth === report.innerWidth

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
