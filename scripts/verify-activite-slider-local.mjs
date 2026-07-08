import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:5173/scripts/test-activite-slider.html'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

const report = await page.evaluate(() => {
  const inner = document.querySelector('.activite_images-inner')
  const swiper = inner?.swiper
  const active = inner?.querySelector('.swiper-slide-active')
  const activeFrame = active?.querySelector('.activite_images_img')
  const slides = [...inner.querySelectorAll('.swiper-slide')]

  const getFrameBg = (slide) => {
    const frame = slide?.querySelector('.activite_images_img')
    return frame ? getComputedStyle(frame).backgroundColor : null
  }

  const activeRect = active?.getBoundingClientRect()
  const innerRect = inner?.getBoundingClientRect()

  const visibleOutside = slides
    .filter((slide) => !slide.classList.contains('swiper-slide-active'))
    .map((slide) => {
      const rect = slide.getBoundingClientRect()
      const leftOutside = rect.left < (activeRect?.left ?? 0)
      const rightOutside = rect.right > (activeRect?.right ?? 0)
      return { leftOutside, rightOutside, width: rect.width }
    })

  return {
    centeredSlides: swiper?.params?.centeredSlides,
    slidesPerView: swiper?.params?.slidesPerView,
    innerOverflow: inner ? getComputedStyle(inner).overflow : null,
    activeFrameBg: activeFrame
      ? getComputedStyle(activeFrame).backgroundColor
      : null,
    inactiveFrameBg: getFrameBg(slides.find((s) => !s.classList.contains('swiper-slide-active'))),
    activeSlideWidth: active?.offsetWidth,
    innerWidth: inner?.offsetWidth,
    hasSidePeek: visibleOutside.some((s) => s.leftOutside || s.rightOutside),
    visibleOutside,
  }
})

console.log(JSON.stringify(report, null, 2))

const beige = 'rgb(236, 220, 195)'
const ok =
  report.centeredSlides === true &&
  Number(report.slidesPerView) > 1 &&
  report.innerOverflow === 'visible' &&
  report.activeFrameBg === beige &&
  report.inactiveFrameBg === 'rgba(0, 0, 0, 0)' &&
  report.hasSidePeek

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
