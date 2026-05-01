import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

let lenisInstance = null
let tickerCallback = null

export function initSmoothScroll() {
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
