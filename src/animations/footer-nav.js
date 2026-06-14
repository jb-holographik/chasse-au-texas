import { gsap } from 'gsap'

import { isMobileViewport } from '../utils/viewport'

const PATH_SAMPLE_STEP = 2
const HOVER_DURATION = 0.4
const DIM_OPACITY = 0.1

export function initFooterNavHover() {
  if (isMobileViewport()) return

  const footer = document.querySelector('.footer')
  if (!footer || footer.dataset.footerNavHoverBound === '1') return

  const links = Array.from(footer.querySelectorAll('.nav-link'))
  if (!links.length) return

  const linkIndex = new Map(links.map((link, index) => [link, index]))

  let activeLink = null
  let lastIndex = null
  let lastX = null
  let lastY = null
  let isTracking = false

  gsap.set(links, { opacity: 1 })

  function pointInRect(x, y, rect) {
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    )
  }

  function orientation(ax, ay, bx, by, cx, cy) {
    const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by)
    if (Math.abs(value) < 1e-10) return 0
    return value > 0 ? 1 : 2
  }

  function onSegment(px, py, qx, qy, rx, ry) {
    return (
      px <= Math.max(qx, rx) &&
      px >= Math.min(qx, rx) &&
      py <= Math.max(qy, ry) &&
      py >= Math.min(qy, ry)
    )
  }

  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const o1 = orientation(ax, ay, bx, by, cx, cy)
    const o2 = orientation(ax, ay, bx, by, dx, dy)
    const o3 = orientation(cx, cy, dx, dy, ax, ay)
    const o4 = orientation(cx, cy, dx, dy, bx, by)

    if (o1 !== o2 && o3 !== o4) return true
    if (o1 === 0 && onSegment(ax, ay, cx, cy, bx, by)) return true
    if (o2 === 0 && onSegment(ax, ay, dx, dy, bx, by)) return true
    if (o3 === 0 && onSegment(cx, cy, ax, ay, dx, dy)) return true
    if (o4 === 0 && onSegment(cx, cy, bx, by, dx, dy)) return true

    return false
  }

  function segmentIntersectsRect(x1, y1, x2, y2, rect) {
    if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true

    const edges = [
      [rect.left, rect.top, rect.right, rect.top],
      [rect.right, rect.top, rect.right, rect.bottom],
      [rect.right, rect.bottom, rect.left, rect.bottom],
      [rect.left, rect.bottom, rect.left, rect.top],
    ]

    return edges.some(([ex1, ey1, ex2, ey2]) =>
      segmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)
    )
  }

  function getHitRect(link) {
    const hitTarget = link.closest('.nav-item') ?? link
    return hitTarget.getBoundingClientRect()
  }

  function indexAtPoint(x, y) {
    for (let index = links.length - 1; index >= 0; index -= 1) {
      if (pointInRect(x, y, getHitRect(links[index]))) return index
    }

    return null
  }

  function samplePath(x1, y1, x2, y2) {
    const distance = Math.hypot(x2 - x1, y2 - y1)
    const steps = Math.max(1, Math.ceil(distance / PATH_SAMPLE_STEP))
    const points = []

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      points.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      })
    }

    return points
  }

  function interpolateIndices(fromIndex, toIndex) {
    const indices = []
    const step = fromIndex < toIndex ? 1 : -1

    for (
      let index = fromIndex;
      step > 0 ? index <= toIndex : index >= toIndex;
      index += step
    ) {
      indices.push(index)
    }

    return indices
  }

  function appendInterpolatedRange(chain, fromIndex, toIndex) {
    interpolateIndices(fromIndex, toIndex).forEach((index) => {
      if (!chain.includes(index)) chain.push(index)
    })
  }

  function detectIndicesAlongSegment(x1, y1, x2, y2) {
    const detected = new Set()

    samplePath(x1, y1, x2, y2).forEach((point) => {
      const index = indexAtPoint(point.x, point.y)
      if (index !== null) detected.add(index)
    })

    links.forEach((link, index) => {
      if (segmentIntersectsRect(x1, y1, x2, y2, getHitRect(link))) {
        detected.add(index)
      }
    })

    return Array.from(detected).sort((a, b) => a - b)
  }

  function resolveIndexChain(x1, y1, x2, y2, currentIndex) {
    const detected = detectIndicesAlongSegment(x1, y1, x2, y2)
    const chain = []
    let previousIndex = lastIndex

    detected.forEach((index) => {
      if (previousIndex !== null && Math.abs(index - previousIndex) > 1) {
        appendInterpolatedRange(chain, previousIndex, index)
      } else if (!chain.includes(index)) {
        chain.push(index)
      }
      previousIndex = index
    })

    if (currentIndex !== null) {
      if (previousIndex !== null && currentIndex !== previousIndex) {
        appendInterpolatedRange(chain, previousIndex, currentIndex)
      } else if (!chain.includes(currentIndex)) {
        chain.push(currentIndex)
      }
    }

    if (!chain.length && lastIndex !== null && currentIndex !== null) {
      return interpolateIndices(lastIndex, currentIndex)
    }

    if (!chain.length && currentIndex !== null) {
      return [currentIndex]
    }

    return chain
  }

  function isHoveringIn(link) {
    return gsap.getTweensOf(link).some((tween) => {
      return tween.isActive() && tween.data?.footerNav === 'in'
    })
  }

  function clearLinkTweensForHoverIn(link) {
    gsap.getTweensOf(link).forEach((tween) => {
      if (!tween.isActive()) return
      if (tween.data?.footerNav === 'in') return
      tween.kill()
    })
  }

  function dimUnlessActive(link) {
    if (activeLink === link) return

    gsap.to(link, {
      opacity: DIM_OPACITY,
      duration: HOVER_DURATION,
      ease: 'power1.out',
      overwrite: false,
      data: { footerNav: 'dim' },
    })
  }

  function playHoverIn(link) {
    if (!link) return

    footer.classList.add('is-nav-hover')
    if (isHoveringIn(link)) return

    clearLinkTweensForHoverIn(link)

    gsap.to(link, {
      opacity: 1,
      duration: HOVER_DURATION,
      ease: 'power1.out',
      overwrite: false,
      data: { footerNav: 'in' },
      onComplete: () => dimUnlessActive(link),
    })
  }

  function dimInactiveLinks() {
    links.forEach((link) => {
      if (link === activeLink || isHoveringIn(link)) return

      const opacity = gsap.getProperty(link, 'opacity')
      if (opacity <= DIM_OPACITY + 0.01) return

      gsap.to(link, {
        opacity: DIM_OPACITY,
        duration: HOVER_DURATION,
        ease: 'power1.out',
        overwrite: false,
        data: { footerNav: 'dim' },
      })
    })
  }

  function setActiveLink(link) {
    activeLink = link
    lastIndex = link ? linkIndex.get(link) ?? null : null
  }

  function playHoverOut() {
    if (!footer.classList.contains('is-nav-hover') && activeLink === null)
      return

    activeLink = null
    lastIndex = null
    footer.classList.remove('is-nav-hover')

    links.forEach((link) => {
      gsap.killTweensOf(link)
      gsap.to(link, {
        opacity: 1,
        duration: HOVER_DURATION,
        ease: 'power1.out',
        data: { footerNav: 'out' },
      })
    })
  }

  function applyPointerPosition(x, y) {
    const currentIndex = indexAtPoint(x, y)
    const indexChain =
      lastX === null || lastY === null
        ? currentIndex !== null
          ? [currentIndex]
          : []
        : resolveIndexChain(lastX, lastY, x, y, currentIndex)

    if (!indexChain.length && currentIndex === null) {
      if (footer.classList.contains('is-nav-hover') || activeLink !== null) {
        playHoverOut()
      }
      lastX = x
      lastY = y
      return
    }

    indexChain.forEach((index) => {
      playHoverIn(links[index])
    })

    const targetIndex = currentIndex ?? indexChain.at(-1) ?? null
    if (targetIndex !== null) {
      setActiveLink(links[targetIndex])
    }

    dimInactiveLinks()

    lastX = x
    lastY = y
  }

  function startTracking(event) {
    isTracking = true
    applyPointerPosition(event.clientX, event.clientY)
  }

  function stopTracking() {
    isTracking = false
    lastX = null
    lastY = null
    playHoverOut()
  }

  footer.addEventListener('pointerenter', startTracking)
  footer.addEventListener('pointerleave', stopTracking)
  footer.addEventListener('pointermove', (event) => {
    if (!isTracking) return
    applyPointerPosition(event.clientX, event.clientY)
  })

  footer.dataset.footerNavHoverBound = '1'
}
