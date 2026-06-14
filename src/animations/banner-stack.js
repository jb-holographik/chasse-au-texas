import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { syncSmoothScroll } from '../utils/scroll'

let bannerScrollTrigger = null
let bannerNodes = null
const bannerStackSettings = {
  secondBannerOffsetEm: 2.2,
}

const segmentEase = gsap.parseEase('power2.inOut')

function getExitDistance() {
  return -window.innerHeight * 0.92
}

function updateBannerPointerEvents(travel, stepIndex, localT) {
  if (!bannerNodes) return

  const { banners, items } = bannerNodes
  const totalSteps = banners.length - 1
  const interactiveIndex =
    totalSteps <= 0
      ? 0
      : Math.min(stepIndex + (localT > 0.45 ? 1 : 0), banners.length - 1)

  banners.forEach((banner, index) => {
    const pointerEvents = index === interactiveIndex ? 'auto' : 'none'
    gsap.set(items[index], { pointerEvents })
    gsap.set(banner, { pointerEvents })
  })
}

function updateBannerStack(progress) {
  if (!bannerNodes) return

  const { banners } = bannerNodes
  const totalSteps = banners.length - 1
  if (totalSteps <= 0) return

  const travel = gsap.utils.clamp(0, totalSteps, progress * totalSteps)
  const stepIndex = Math.min(Math.floor(travel), totalSteps - 1)
  const localT = segmentEase(travel - stepIndex)
  const offsetEm = bannerStackSettings.secondBannerOffsetEm
  const exitY = getExitDistance()

  banners.forEach((banner, index) => {
    if (index < stepIndex) {
      gsap.set(banner, {
        y: exitY,
        opacity: 0.88,
        scale: 1,
      })
      return
    }

    if (index === stepIndex) {
      gsap.set(banner, {
        y: localT * exitY,
        opacity: 1 - localT * 0.12,
        scale: 1,
      })
      return
    }

    if (index === stepIndex + 1) {
      gsap.set(banner, {
        y: `${(1 - localT) * offsetEm}em`,
        scale: gsap.utils.interpolate(0.93, 1, localT),
        opacity: gsap.utils.interpolate(0.96, 1, localT),
      })
      return
    }

    const depth = index - stepIndex - 1
    gsap.set(banner, {
      y: `${offsetEm + (depth - 1) * 0.35}em`,
      scale: Math.max(0.9, 0.93 - (depth - 1) * 0.015),
      opacity: 0.96,
    })
  })

  updateBannerPointerEvents(travel, stepIndex, localT)
}

function setupBannerStackNodes(root) {
  const section = root.querySelector('.section_banners')
  if (!section) {
    return null
  }

  const banners = gsap.utils.toArray(
    root.querySelectorAll('.section_banners .banner')
  )
  const items = gsap.utils.toArray(
    root.querySelectorAll('.section_banners .banners-item')
  )
  const wrapper = section.querySelector('.banners-wrapper')
  const list = section.querySelector('.banners-list')

  if (!banners.length || !items.length || !wrapper || !list) {
    return null
  }

  return { section, wrapper, list, items, banners }
}

function applyBannerStackLayout(nodes) {
  const { section, wrapper, list, items, banners } = nodes

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
      y: index === 0 ? 0 : `${bannerStackSettings.secondBannerOffsetEm}em`,
      scale: index === 0 ? 1 : 0.93,
      opacity: 1,
      willChange: 'transform, opacity',
    })
  })

  updateBannerStack(0)
}

function mountBannerScrollTrigger() {
  if (!bannerNodes || bannerScrollTrigger) {
    return
  }

  const { section, banners } = bannerNodes
  if (banners.length <= 1) {
    return
  }

  bannerScrollTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'center center',
    end: () => `+=${(banners.length - 1) * window.innerHeight}`,
    pin: true,
    anticipatePin: 0,
    invalidateOnRefresh: true,
    onUpdate(self) {
      updateBannerStack(self.progress)
    },
  })
}

export function prepareBannerStackLayout(scope = document) {
  const root = scope?.querySelector ? scope : document
  const nodes = setupBannerStackNodes(root)
  if (!nodes) {
    return
  }

  gsap.registerPlugin(ScrollTrigger)
  bannerNodes = nodes
  applyBannerStackLayout(nodes)
}

export function finalizeBannerStack() {
  if (!bannerNodes) {
    return
  }

  mountBannerScrollTrigger()
  syncSmoothScroll()
}

export function initBannerStack(scope = document) {
  destroyBannerStack()

  const root = scope?.querySelector ? scope : document
  const nodes = setupBannerStackNodes(root)
  if (!nodes) {
    return
  }

  gsap.registerPlugin(ScrollTrigger)
  bannerNodes = nodes
  applyBannerStackLayout(nodes)
  mountBannerScrollTrigger()
  syncSmoothScroll()
}

export function destroyBannerStack() {
  if (bannerScrollTrigger) {
    bannerScrollTrigger.kill()
    bannerScrollTrigger = null
  }

  if (!bannerNodes) {
    return
  }

  const { section, wrapper, list, items, banners } = bannerNodes
  gsap.set(section, { clearProps: 'overflow,minHeight,display,alignItems' })
  gsap.set(wrapper, { clearProps: 'position,width,minHeight' })
  gsap.set(list, { clearProps: 'position,width,minHeight' })
  gsap.set(items, {
    clearProps:
      'position,top,left,width,yPercent,display,alignItems,justifyContent,zIndex,pointerEvents',
  })
  gsap.set(banners, {
    clearProps: 'yPercent,y,scale,opacity,willChange,pointerEvents',
  })

  banners.forEach((banner) => {
    banner.classList.remove('banner--static')
    banner.removeAttribute('tabindex')
    banner.removeAttribute('aria-hidden')
    banner.removeAttribute('role')
  })

  bannerNodes = null
}
