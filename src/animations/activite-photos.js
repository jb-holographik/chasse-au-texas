import { prepareActivitePhotosLayout } from '../activite-photos-boot.js'
import {
  bindActivitePhotoLightbox,
  unbindActivitePhotoLightbox,
} from './activite-photo-lightbox'
import { gsap } from 'gsap'
import Swiper from 'swiper'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

const SLIDER_THRESHOLD = 3
const PLACEHOLDER_SRC = 'placeholder.60f9b1840c.svg'
const OFFSET_X = ['-1em', '1em']
const STACK_ROTATE = [-1, 1]
const CMS_RETRY_ATTEMPTS = 12
const CMS_RETRY_DELAY_MS = 50
const IMAGE_READY_TIMEOUT_MS = 4000

let photoStackRoot = null
let swiperInstance = null
let swiperFramesParent = null
let detachedFrames = []
let initToken = 0

function getPhotoStackInner(scope = document) {
  const root = scope?.querySelector ? scope : document
  return root.querySelector('.activite_images-inner')
}

function getPhotoStackFrames(inner) {
  return gsap.utils.toArray('.activite_images_img', inner)
}

function getImageSrc(frame) {
  const img = frame?.querySelector('.activite_img, img')
  if (!img) return ''

  return (img.getAttribute('src') || img.currentSrc || '').trim()
}

function isValidPhotoFrame(frame) {
  const src = getImageSrc(frame)
  if (!src || src.includes(PLACEHOLDER_SRC)) return false

  const img = frame.querySelector('.activite_img, img')
  if (img?.classList.contains('w-dyn-bind-empty')) return false

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

async function getVisiblePhotoFramesWhenReady(inner) {
  for (let attempt = 0; attempt < CMS_RETRY_ATTEMPTS; attempt += 1) {
    const frames = getVisiblePhotoFrames(inner)
    if (frames.length > 0) {
      return frames
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, CMS_RETRY_DELAY_MS)
    })
  }

  return getVisiblePhotoFrames(inner)
}

function whenVisible(element) {
  return new Promise((resolve) => {
    const check = () => {
      if (!element.isConnected) {
        resolve()
        return
      }

      const { width, height } = element.getBoundingClientRect()
      const opacity = Number.parseFloat(getComputedStyle(element).opacity) || 1

      if (width > 0 && height > 0 && opacity > 0.01) {
        resolve()
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

function isImageReady(img) {
  return Boolean(img?.complete || img?.naturalWidth > 0)
}

function whenImageReady(img) {
  if (!img || isImageReady(img)) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      resolve()
    }

    const timeoutId = window.setTimeout(done, IMAGE_READY_TIMEOUT_MS)

    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })

    const check = () => {
      if (!img.isConnected) {
        done()
        return
      }

      if (isImageReady(img)) {
        done()
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

function whenSlideImagesReady(frames) {
  const pendingImages = frames
    .map((frame) => frame.querySelector('.activite_img, img'))
    .filter((img) => img && !isImageReady(img))

  if (pendingImages.length === 0) {
    return Promise.resolve()
  }

  return Promise.all(pendingImages.map((img) => whenImageReady(img)))
}

function refreshSwiper(inner) {
  if (!swiperInstance || swiperInstance.destroyed || photoStackRoot !== inner) {
    return false
  }

  swiperInstance.params.spaceBetween = getEmPx(inner)
  swiperInstance.update()
  if (swiperInstance.params.loop) {
    swiperInstance.loopFix()
  }

  return true
}

function applyStackLayout(frames, frontIndex) {
  frames.forEach((frame, index) => {
    const isFront = index === frontIndex
    gsap.set(frame, {
      xPercent: -50,
      x: OFFSET_X[index % OFFSET_X.length],
      rotate: STACK_ROTATE[index % STACK_ROTATE.length],
      zIndex: isFront ? 2 : 1,
    })
    frame.classList.toggle('is-back', !isFront)
    frame.classList.toggle('is-front', isFront)
  })
}

function initStackMode(inner, frames) {
  inner.classList.add('is-stacked')
  applyStackLayout(frames, 0)
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

  const img = frame.querySelector('img')
  if (img) {
    img.setAttribute('draggable', 'false')
    img.loading = 'eager'
  }
}

function createSlide(frame) {
  const slide = document.createElement('div')
  slide.className = 'swiper-slide'

  resetFrameForSwiper(frame)
  slide.appendChild(frame)

  return slide
}

function getSwiperLoopConfig(slideCount) {
  return {
    loop: slideCount > 1,
    // Swiper 14 needs five slides for a centered 1.12-slide loop. With three
    // or four CMS photos, keep one centered slide so loop mode remains valid
    // without cloning content.
    slidesPerView: slideCount >= 5 ? 1.12 : 1,
    slidesPerGroup: 1,
    slidesPerGroupAuto: false,
  }
}

function getEmPx(element) {
  return parseFloat(getComputedStyle(element).fontSize) || 16
}

async function initSwiperMode(inner, frames, token) {
  detachInvalidFrames(inner, frames)

  inner.classList.add('is-swiper', 'swiper', 'is-swiper-loading')
  swiperFramesParent = inner

  const wrapper = document.createElement('div')
  wrapper.className = 'swiper-wrapper'

  frames.forEach((frame, index) => {
    const slide = createSlide(frame)
    slide.dataset.swiperSlideIndex = String(index)
    wrapper.appendChild(slide)
  })

  inner.appendChild(wrapper)

  const prev = document.createElement('button')
  prev.type = 'button'
  prev.className = 'activite_images-prev swiper-button-prev'
  prev.setAttribute('aria-label', 'Photo précédente')

  const next = document.createElement('button')
  next.type = 'button'
  next.className = 'activite_images-next swiper-button-next'
  next.setAttribute('aria-label', 'Photo suivante')

  inner.append(prev, next)

  await whenSlideImagesReady([
    ...wrapper.querySelectorAll('.activite_images_img'),
  ])

  if (token !== initToken || photoStackRoot !== inner) {
    return
  }

  await whenVisible(inner)

  if (token !== initToken || photoStackRoot !== inner) {
    return
  }

  swiperInstance = new Swiper(inner, {
    modules: [Navigation],
    centeredSlides: true,
    spaceBetween: getEmPx(inner),
    grabCursor: true,
    observer: true,
    observeParents: true,
    ...getSwiperLoopConfig(frames.length),
    navigation: {
      nextEl: next,
      prevEl: prev,
    },
    on: {
      init: (swiper) => {
        swiper.loopFix()
        revealActivitePhotos(inner)
      },
      resize: (swiper) => {
        swiper.params.spaceBetween = getEmPx(inner)
        swiper.update()
        if (swiper.params.loop) {
          swiper.loopFix()
        }
      },
      slideChangeTransitionEnd: (swiper) => {
        swiper.loopFix()
      },
    },
  })

  requestAnimationFrame(() => {
    if (swiperInstance?.destroyed || photoStackRoot !== inner) return
    refreshSwiper(inner)
    revealActivitePhotos(inner)
  })
}

function revealActivitePhotos(inner) {
  inner.classList.remove('is-photos-pending', 'is-swiper-loading')
}

export async function initActivitePhotos(scope = document) {
  const inner = getPhotoStackInner(scope)
  if (!inner) return

  if (inner.dataset.photosReady === 'true') {
    if (photoStackRoot === inner && refreshSwiper(inner)) {
      revealActivitePhotos(inner)
      bindActivitePhotoLightbox(inner)
      return
    }

    if (
      inner.classList.contains('is-swiper') ||
      inner.classList.contains('is-stacked') ||
      inner.classList.contains('is-single')
    ) {
      revealActivitePhotos(inner)
      bindActivitePhotoLightbox(inner)
      return
    }
  }

  if (photoStackRoot === inner && refreshSwiper(inner)) {
    revealActivitePhotos(inner)
    bindActivitePhotoLightbox(inner)
    return
  }

  destroyActivitePhotos()
  prepareActivitePhotosLayout(scope)

  const token = ++initToken
  const frames = await getVisiblePhotoFramesWhenReady(inner)

  if (token !== initToken || !inner.isConnected) {
    return
  }

  if (frames.length === 0) {
    return
  }

  photoStackRoot = inner
  inner.dataset.photosReady = 'true'
  inner.dataset.photoCount = String(frames.length)

  if (frames.length >= SLIDER_THRESHOLD) {
    await initSwiperMode(inner, frames, token)
    bindActivitePhotoLightbox(inner)
    return
  }

  if (frames.length < 2) {
    inner.classList.add('is-single')
    revealActivitePhotos(inner)
    bindActivitePhotoLightbox(inner)
    return
  }

  await whenVisible(inner)

  if (token !== initToken || photoStackRoot !== inner) {
    return
  }

  initStackMode(inner, frames)
  revealActivitePhotos(inner)
  bindActivitePhotoLightbox(inner)
}

export function destroyActivitePhotos() {
  initToken += 1
  unbindActivitePhotoLightbox()

  if (swiperInstance) {
    swiperInstance.destroy(true, true)
    swiperInstance = null
  }

  if (photoStackRoot) {
    const restoreParent = swiperFramesParent || photoStackRoot
    const frames = [
      ...photoStackRoot.querySelectorAll('.activite_images_img'),
      ...detachedFrames,
    ]

    photoStackRoot.classList.remove(
      'is-stacked',
      'is-single',
      'is-swiper',
      'swiper',
      'is-swiper-loading',
      'is-photos-pending'
    )
    delete photoStackRoot.dataset.photosReady
    delete photoStackRoot.dataset.photoCount

    photoStackRoot
      .querySelectorAll('.activite_images-prev, .activite_images-next')
      .forEach((node) => node.remove())

    photoStackRoot.querySelectorAll('.swiper-slide').forEach((slide) => {
      const frame = slide.querySelector('.activite_images_img')

      if (frame) {
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
