import { chromium } from 'playwright'

const URL =
  'https://chasse-au-texas.webflow.io/activites/stand-de-tir-premium-tank-et-mitrailleuse'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3000)

const report = await page.evaluate(() => {
  const inner = document.querySelector('.activite_images-inner')
  if (!inner) return { error: 'no .activite_images-inner' }

  const slides = [...inner.querySelectorAll('.activite_images_img, .swiper-slide')]
  const swiperEl = inner.classList.contains('swiper') ? inner : inner.querySelector('.swiper')
  const swiper = swiperEl?.swiper

  const slideInfo = slides.map((slide, i) => {
    const style = getComputedStyle(slide)
    return {
      index: i,
      classes: slide.className,
      hidden: slide.hidden,
      width: slide.offsetWidth,
      height: slide.offsetHeight,
      position: style.position,
      transform: style.transform,
      left: style.left,
      widthCss: style.width,
    }
  })

  const innerStyle = getComputedStyle(inner)
  const wrapper = inner.querySelector('.swiper-wrapper')
  const wrapperStyle = wrapper ? getComputedStyle(wrapper) : null

  return {
    innerClasses: inner.className,
    innerSize: { w: inner.offsetWidth, h: inner.offsetHeight },
    innerOverflow: innerStyle.overflow,
    innerDisplay: innerStyle.display,
    wrapperTransform: wrapperStyle?.transform,
    wrapperWidth: wrapper?.offsetWidth,
    slideCount: slides.length,
    slides: slideInfo,
    hasSwiperInstance: Boolean(swiper),
    swiperParams: swiper
      ? {
          loop: swiper.params.loop,
          slidesPerView: swiper.params.slidesPerView,
          centeredSlides: swiper.params.centeredSlides,
          spaceBetween: swiper.params.spaceBetween,
          activeIndex: swiper.activeIndex,
          realIndex: swiper.realIndex,
          translate: swiper.translate,
          isBeginning: swiper.isBeginning,
          isEnd: swiper.isEnd,
        }
      : null,
    scriptSrc: [...document.querySelectorAll('script[src]')]
      .map((s) => s.src)
      .filter((src) => src.includes('main') || src.includes('activite') || src.includes('vite')),
  }
})

console.log(JSON.stringify(report, null, 2))

if (report.hasSwiperInstance) {
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page2.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
  await page2.waitForTimeout(3000)

  const afterNav = await page2.evaluate(async () => {
    const inner = document.querySelector('.activite_images-inner')
    const swiper = inner?.swiper
    if (!swiper) return { error: 'no swiper' }

    const snap = () => ({
      activeIndex: swiper.activeIndex,
      realIndex: swiper.realIndex,
      translate: swiper.translate,
      activeTransform: getComputedStyle(
        swiper.slides[swiper.activeIndex]
      ).transform,
    })

    const start = snap()
    swiper.slideNext()
    await new Promise((r) => setTimeout(r, 600))
    const afterNext = snap()
    swiper.slideNext()
    await new Promise((r) => setTimeout(r, 600))
    const afterNext2 = snap()

    return { start, afterNext, afterNext2 }
  })

  console.log('\nNavigation test:', JSON.stringify(afterNav, null, 2))
  await page2.close()
}

await browser.close()
