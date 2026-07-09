import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const START_URL = `${BASE}/scripts/test-barba-slider-a.html`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(START_URL, { waitUntil: 'networkidle', timeout: 60000 })

await page.click('a[href="/scripts/test-barba-slider-b.html"]')
await page.waitForTimeout(2500)

const afterNav = await page.evaluate(() => {
  const inner = document.querySelector('.activite_images-inner')
  const swiper = inner?.swiper
  const opacity = inner
    ? Number.parseFloat(getComputedStyle(inner).opacity) || 1
    : 0
  const loading = inner?.classList.contains('is-photos-pending')
  const { width, height } = inner?.getBoundingClientRect() ?? {
    width: 0,
    height: 0,
  }

  return {
    hasInner: Boolean(inner),
    hasSwiper: Boolean(swiper && !swiper.destroyed),
    slideCount: inner?.querySelectorAll('.swiper-slide').length ?? 0,
    activeWidth: inner?.querySelector('.swiper-slide-active')?.offsetWidth ?? 0,
    innerWidth: width,
    innerHeight: height,
    opacity,
    loading,
    photosReady: inner?.dataset.photosReady === 'true',
  }
})

console.log(JSON.stringify(afterNav, null, 2))

const ok =
  afterNav.hasInner &&
  afterNav.hasSwiper &&
  afterNav.slideCount >= 5 &&
  afterNav.activeWidth > 0 &&
  afterNav.innerWidth > 0 &&
  afterNav.innerHeight > 0 &&
  afterNav.opacity > 0.9 &&
  !afterNav.loading &&
  afterNav.photosReady

console.log(ok ? '\nPASS' : '\nFAIL')

await browser.close()
process.exit(ok ? 0 : 1)
