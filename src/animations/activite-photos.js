import { gsap } from 'gsap'
import Swiper from 'swiper'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const SLIDER_THRESHOLD = 3
const PLACEHOLDER_SRC = 'placeholder.60f9b1840c.svg'
const OFFSET_X = ['-1em', '1em']

let photoStackRoot = null
let clickHandler = null
let swiperInstance = null
let swiperFramesParent = null

function getPhotoStackInner(scope = document) {
  const root = scope?.querySelector ? scope : document
  return root.querySelector('.activite_images-inner')
}

function getPhotoStackFrames(inner) {
  return gsap.utils.toArray('.activite_images_img', inner)
}

function isValidPhotoFrame(frame) {
  const img = frame.querySelector('.activite_img, img')
  if (!img) return false

  const src = (img.getAttribute('src') || img.currentSrc || '').trim()
  if (!src || src.includes(PLACEHOLDER_SRC)) return false
  if (img.classList.contains('w-dyn-bind-empty')) return false

  return true
}

function getVisiblePhotoFrames(inner) {
  const frames = getPhotoStackFrames(inner)

  frames.forEach((frame) => {
    frame.hidden = false
  })

  const validFrames = frames.filter(isValidPhotoFrame)
  frames
    .filter((frame) => !validFrames.includes(frame))
    .forEach((frame) => {
      frame.hidden = true
    })

  return validFrames
}

function applyStackLayout(frames, frontIndex) {
  frames.forEach((frame, index) => {
    const isFront = index === frontIndex
    gsap.set(frame, {
      xPercent: -50,
      x: OFFSET_X[index % OFFSET_X.length],
      rotate: 0,
      zIndex: isFront ? 2 : 1,
    })
    frame.classList.toggle('is-back', !isFront)
    frame.classList.toggle('is-front', isFront)
  })
}

function bringToFront(frames, targetIndex) {
  const frontIndex = frames.findIndex((frame) =>
    frame.classList.contains('is-front')
  )
  if (frontIndex === targetIndex) return

  frames.forEach((frame, index) => {
    const isTarget = index === targetIndex
    gsap.to(frame, {
      rotate: 0,
      y: 0,
      zIndex: isTarget ? 2 : 1,
      duration: 0.45,
      ease: 'power2.out',
      onStart: () => {
        frame.classList.toggle('is-back', !isTarget)
        frame.classList.toggle('is-front', isTarget)
      },
    })
  })
}

function initStackMode(inner, frames) {
  inner.classList.add('is-stacked')
  applyStackLayout(frames, 0)

  clickHandler = (event) => {
    const frame = event.target.closest('.activite_images_img.is-back')
    if (!frame || !inner.contains(frame)) return
    const targetIndex = frames.indexOf(frame)
    if (targetIndex === -1) return
    bringToFront(frames, targetIndex)
  }

  inner.addEventListener('click', clickHandler)
}

function refreshSwiperLoop(swiper) {
  if (!swiper || swiper.destroyed || !swiper.params.loop) return
  swiper.update()
  swiper.loopFix()
}

function bindSwiperImageUpdates(swiper, frames) {
  const refresh = () => refreshSwiperLoop(swiper)

  frames.forEach((frame) => {
    const img = frame.querySelector('img')
    if (!img) return
    if (img.complete) return
    img.addEventListener('load', refresh, { once: true })
  })

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => refresh())
    frames.forEach((frame) => observer.observe(frame))
    swiper.on('destroy', () => observer.disconnect())
  }
}

function initSwiperMode(inner, frames) {
  inner.classList.add('is-swiper', 'swiper')
  swiperFramesParent = frames[0]?.parentElement || inner

  const wrapper = document.createElement('div')
  wrapper.className = 'swiper-wrapper'

  frames.forEach((frame) => {
    frame.classList.add('swiper-slide')
    wrapper.appendChild(frame)
  })

  inner.appendChild(wrapper)

  const pagination = document.createElement('div')
  pagination.className = 'activite_images-pagination swiper-pagination'
  inner.appendChild(pagination)

  const prev = document.createElement('button')
  prev.type = 'button'
  prev.className = 'activite_images-prev swiper-button-prev'
  prev.setAttribute('aria-label', 'Photo précédente')

  const next = document.createElement('button')
  next.type = 'button'
  next.className = 'activite_images-next swiper-button-next'
  next.setAttribute('aria-label', 'Photo suivante')

  inner.append(prev, next)

  swiperInstance = new Swiper(inner, {
    modules: [Navigation, Pagination],
    slidesPerView: 1,
    centeredSlides: true,
    spaceBetween: 16,
    loop: true,
    loopAdditionalSlides: 1,
    loopPreventsSliding: false,
    grabCursor: true,
    speed: 500,
    roundLengths: true,
    observer: true,
    observeParents: true,
    observeSlideChildren: true,
    pagination: {
      el: pagination,
      clickable: true,
      renderBullet: (index, className) =>
        `<span class="${className}" aria-label="Photo ${index + 1}"></span>`,
    },
    navigation: {
      prevEl: prev,
      nextEl: next,
    },
    on: {
      init: (swiper) => {
        requestAnimationFrame(() => refreshSwiperLoop(swiper))
      },
      resize: (swiper) => {
        refreshSwiperLoop(swiper)
      },
    },
  })

  bindSwiperImageUpdates(swiperInstance, frames)
}

export function initActivitePhotos(scope = document) {
  const inner = getPhotoStackInner(scope)
  if (!inner) return

  const frames = getVisiblePhotoFrames(inner)
  if (frames.length === 0) return

  if (photoStackRoot === inner && inner.dataset.photosReady === 'true') {
    return
  }

  destroyActivitePhotos()

  photoStackRoot = inner
  inner.dataset.photosReady = 'true'

  if (frames.length >= SLIDER_THRESHOLD) {
    initSwiperMode(inner, frames)
    return
  }

  if (frames.length < 2) return

  initStackMode(inner, frames)
}

export function destroyActivitePhotos() {
  if (swiperInstance) {
    swiperInstance.destroy(true, true)
    swiperInstance = null
  }

  if (photoStackRoot && clickHandler) {
    photoStackRoot.removeEventListener('click', clickHandler)
    clickHandler = null
  }

  if (photoStackRoot) {
    const frames = getPhotoStackFrames(photoStackRoot)
    photoStackRoot.classList.remove('is-stacked', 'is-swiper', 'swiper')
    delete photoStackRoot.dataset.photosReady

    photoStackRoot
      .querySelectorAll(
        '.activite_images-pagination, .activite_images-prev, .activite_images-next'
      )
      .forEach((node) => node.remove())

    const wrapper = photoStackRoot.querySelector('.swiper-wrapper')
    if (wrapper) {
      const restoreParent = swiperFramesParent || photoStackRoot
      frames.forEach((frame) => {
        frame.classList.remove('swiper-slide')
        restoreParent.appendChild(frame)
      })
      wrapper.remove()
    }
    swiperFramesParent = null

    frames.forEach((frame) => {
      gsap.set(frame, { clearProps: 'x,xPercent,y,rotate,zIndex' })
      frame.classList.remove('is-back', 'is-front', 'swiper-slide')
      frame.hidden = false
    })

    photoStackRoot = null
  }
}
