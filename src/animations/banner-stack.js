import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let bannerTimeline = null
let bannerNodes = null
let secondBannerControlRoot = null
const bannerStackSettings = {
  secondBannerOffsetEm: 2.2,
}

function removeSecondBannerControl() {
  if (!secondBannerControlRoot) {
    return
  }

  secondBannerControlRoot.remove()
  secondBannerControlRoot = null
}

function createSecondBannerControl(secondBanner) {
  removeSecondBannerControl()

  const controlRoot = document.createElement('div')
  controlRoot.setAttribute('data-banner-control', 'second-banner-offset')
  controlRoot.style.position = 'fixed'
  controlRoot.style.left = '1rem'
  controlRoot.style.bottom = '1rem'
  controlRoot.style.zIndex = '9999'
  controlRoot.style.padding = '0.75rem'
  controlRoot.style.borderRadius = '0.5rem'
  controlRoot.style.background = 'rgba(10, 10, 10, 0.75)'
  controlRoot.style.backdropFilter = 'blur(8px)'
  controlRoot.style.color = '#fff'
  controlRoot.style.fontSize = '12px'
  controlRoot.style.fontFamily = 'sans-serif'
  controlRoot.style.display = 'flex'
  controlRoot.style.flexDirection = 'column'
  controlRoot.style.gap = '0.5rem'

  const label = document.createElement('label')
  label.textContent = '2e banner Y (em)'

  const input = document.createElement('input')
  input.type = 'range'
  input.min = '-3'
  input.max = '3'
  input.step = '0.1'
  input.value = String(bannerStackSettings.secondBannerOffsetEm)

  const valueText = document.createElement('div')
  valueText.textContent = `${bannerStackSettings.secondBannerOffsetEm.toFixed(
    1
  )}em`

  input.addEventListener('input', (event) => {
    const target = event.target
    const nextValue = Number(target.value)
    bannerStackSettings.secondBannerOffsetEm = nextValue
    valueText.textContent = `${nextValue.toFixed(1)}em`
    gsap.set(secondBanner, { y: `${nextValue}em` })
  })

  label.appendChild(input)
  controlRoot.appendChild(label)
  controlRoot.appendChild(valueText)
  document.body.appendChild(controlRoot)
  secondBannerControlRoot = controlRoot
}

export function initBannerStack() {
  destroyBannerStack()

  const section = document.querySelector('.section_banners')
  if (!section) {
    return
  }

  const banners = gsap.utils.toArray('.section_banners .banner')
  const items = gsap.utils.toArray('.section_banners .banners-item')
  const wrapper = section.querySelector('.banners-wrapper')
  const list = section.querySelector('.banners-list')

  if (!banners.length || !items.length || !wrapper || !list) {
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  bannerNodes = { section, wrapper, list, items, banners }

  gsap.set(section, {
    overflow: 'hidden',
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
  })
  gsap.set(wrapper, {
    position: 'relative',
    width: '100%',
    minHeight: '100svh',
  })
  gsap.set(list, { position: 'relative', width: '100%', minHeight: '100svh' })
  gsap.set(items, {
    position: 'absolute',
    top: '50%',
    left: 0,
    width: '100%',
    yPercent: -50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  })

  banners.forEach((banner, index) => {
    gsap.set(items[index], { zIndex: banners.length - index })
    gsap.set(banner, {
      y: index === 0 ? '0em' : `${bannerStackSettings.secondBannerOffsetEm}em`,
      scale: index === 0 ? 1 : 0.9,
      willChange: 'transform',
    })
  })

  if (banners[1]) {
    createSecondBannerControl(banners[1])
  }

  if (banners.length === 1) {
    return
  }

  bannerTimeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'center center',
      end: () => `+=${window.innerHeight * banners.length}`,
      scrub: true,
      pin: true,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  })

  // Keep the first banner fully visible at section entry.
  bannerTimeline.to({}, { duration: 1 })

  for (let index = 0; index < banners.length - 1; index += 1) {
    bannerTimeline
      .to(
        banners[index],
        { y: () => -window.innerHeight, duration: 1 },
        index + 1
      )
      .to(banners[index + 1], { y: '0em', scale: 1, duration: 1 }, index + 1)
  }
}

export function destroyBannerStack() {
  if (bannerTimeline) {
    if (bannerTimeline.scrollTrigger) {
      bannerTimeline.scrollTrigger.kill()
    }
    bannerTimeline.kill()
    bannerTimeline = null
  }

  if (!bannerNodes) {
    removeSecondBannerControl()
    return
  }

  const { section, wrapper, list, items, banners } = bannerNodes
  gsap.set(section, { clearProps: 'overflow,minHeight,display,alignItems' })
  gsap.set(wrapper, { clearProps: 'position,width,minHeight' })
  gsap.set(list, { clearProps: 'position,width,minHeight' })
  gsap.set(items, {
    clearProps:
      'position,top,left,width,yPercent,display,alignItems,justifyContent,zIndex',
  })
  gsap.set(banners, { clearProps: 'yPercent,y,scale,willChange' })

  removeSecondBannerControl()
  bannerNodes = null
}
