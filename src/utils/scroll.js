import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { isMobileViewport, MOBILE_MEDIA_QUERY } from './viewport'

let lenisInstance = null
let tickerCallback = null
let viewportListenerBound = false

function bindViewportScrollListener() {
  if (viewportListenerBound) {
    return
  }

  window.matchMedia(MOBILE_MEDIA_QUERY).addEventListener('change', () => {
    if (isMobileViewport()) {
      destroySmoothScroll()
      return
    }

    initSmoothScroll()
  })

  viewportListenerBound = true
}

export function initSmoothScroll() {
  bindViewportScrollListener()

  if (isMobileViewport()) {
    destroySmoothScroll()
    return null
  }

  if (lenisInstance) {
    return lenisInstance
  }

  gsap.registerPlugin(ScrollTrigger)

  const lenis = new Lenis({
    smoothWheel: true,
    syncTouch: true,
  })

  lenis.on('scroll', ScrollTrigger.update)

  tickerCallback = (time) => {
    lenis.raf(time * 1000)
  }

  gsap.ticker.add(tickerCallback)
  gsap.ticker.lagSmoothing(0)

  lenisInstance = lenis
  return lenis
}

export function destroySmoothScroll() {
  if (!lenisInstance) {
    return
  }

  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback)
    tickerCallback = null
  }

  lenisInstance.destroy()
  lenisInstance = null
}

export function syncSmoothScroll() {
  if (lenisInstance && typeof lenisInstance.resize === 'function') {
    lenisInstance.resize()
  }

  ScrollTrigger.refresh()
}

export function setScrollLocked(locked) {
  const root = document.documentElement

  if (locked) {
    if (lenisInstance) {
      lenisInstance.stop()
      return
    }

    root.classList.add('is-activite-lightbox-open')
    return
  }

  root.classList.remove('is-activite-lightbox-open')

  if (lenisInstance) {
    lenisInstance.start()
    syncSmoothScroll()
  }
}
