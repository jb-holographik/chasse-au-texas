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
let detachedFrames = []

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

function detachInvalidFrames(inner, validFrames) {
  detachedFrames = getPhotoStackFrames(inner).filter(
    (frame) => !validFrames.includes(frame)
  )

  detachedFrames.forEach((frame) => {
    frame.hidden = true
    inner.parentElement?.appendChild(frame)
  })
}

function resetFrameForSwiper(frame) {
  gsap.set(frame, { clearProps: 'all' })
  frame.classList.remove('is-second', 'is-front', 'is-back')
  frame.removeAttribute('style')
  frame.hidden = false
}

function whenSlideImagesReady(frames) {
  const pendingImages = frames
    .map((frame) => frame.querySelector('img'))
    .filter((img) => img && !img.complete)

  if (pendingImages.length === 0) {
    return Promise.resolve()
  }

  return Promise.all(
    pendingImages.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        })
    )
  )
}

const MIN_LOOP_SLIDES = 8

function createSlide(frame, { clone = false } = {}) {
  const slide = document.createElement('div')
  slide.className = 'swiper-slide'

  if (clone) {
    const frameClone = frame.cloneNode(true)
    resetFrameForSwiper(frameClone)
    slide.appendChild(frameClone)
  } else {
    resetFrameForSwiper(frame)
    slide.appendChild(frame)
  }

  return slide
}

function addLoopBufferSlides(wrapper, frames) {
  const needed = Math.max(0, MIN_LOOP_SLIDES - wrapper.children.length)
  if (needed === 0) return

  const prependCount = Math.ceil(needed / 2)
  const appendCount = Math.floor(needed / 2)

  for (let i = 0; i < prependCount; i += 1) {
    const frameIndex = (frames.length - 1 - (i % frames.length) + frames.length) % frames.length
    wrapper.insertBefore(createSlide(frames[frameIndex], { clone: true }), wrapper.firstChild)
  }

  for (let i = 0; i < appendCount; i += 1) {
    const frameIndex = i % frames.length
    wrapper.appendChild(createSlide(frames[frameIndex], { clone: true }))
  }
}

function getSwiperLoopConfig(slideCount) {
  return {
    loop: slideCount > 1,
    loopAdditionalSlides: 2,
    slidesPerGroup: 1,
    slidesPerGroupAuto: false,
  }
}

function initSwiperMode(inner, frames) {
  detachInvalidFrames(inner, frames)

  inner.classList.add('is-swiper', 'swiper')
  swiperFramesParent = inner

  const wrapper = document.createElement('div')
  wrapper.className = 'swiper-wrapper'

  frames.forEach((frame, index) => {
    const slide = createSlide(frame)
    slide.dataset.swiperSlideIndex = String(index)
    wrapper.appendChild(slide)
  })

  addLoopBufferSlides(wrapper, frames)

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

  whenSlideImagesReady([...wrapper.querySelectorAll('.activite_images_img')]).then(() => {
    if (photoStackRoot !== inner || inner.dataset.photosReady !== 'true') {
      return
    }

    swiperInstance = new Swiper(inner, {
      modules: [Navigation, Pagination],
      slidesPerView: 1.12,
      centeredSlides: true,
      spaceBetween: 0,
      ...getSwiperLoopConfig(frames.length),
      pagination: {
        el: pagination,
        clickable: true,
        renderBullet: (index, className) => {
          if (index >= frames.length) return ''
          return `<span class="${className}" aria-label="Photo ${index + 1}"></span>`
        },
      },
      navigation: {
        nextEl: next,
        prevEl: prev,
      },
      on: {
        init: (swiper) => {
          swiper.loopFix()
        },
        slideChangeTransitionEnd: (swiper) => {
          swiper.loopFix()
        },
      },
    })
  })
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
    const restoreParent = swiperFramesParent || photoStackRoot
    const frames = [
      ...photoStackRoot.querySelectorAll('.activite_images_img'),
      ...detachedFrames,
    ]

    photoStackRoot.classList.remove('is-stacked', 'is-swiper', 'swiper')
    delete photoStackRoot.dataset.photosReady

    photoStackRoot
      .querySelectorAll(
        '.activite_images-pagination, .activite_images-prev, .activite_images-next'
      )
      .forEach((node) => node.remove())

    photoStackRoot.querySelectorAll('.swiper-slide').forEach((slide) => {
      const frame = slide.querySelector('.activite_images_img')
      const isOriginalSlide = slide.dataset.swiperSlideIndex !== undefined

      if (frame && isOriginalSlide) {
        resetFrameForSwiper(frame)
        restoreParent.appendChild(frame)
      }

      slide.remove()
    })

    const wrapper = photoStackRoot.querySelector('.swiper-wrapper')
    wrapper?.remove()

    swiperFramesParent = null

    detachedFrames.forEach((frame) => {
      photoStackRoot?.appendChild(frame)
    })
    detachedFrames = []

    frames.forEach((frame) => {
      resetFrameForSwiper(frame)
    })

    photoStackRoot = null
  }
}
