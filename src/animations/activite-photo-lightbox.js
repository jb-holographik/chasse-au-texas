import { setScrollLocked } from '../utils/scroll'
import { isMobileViewport } from '../utils/viewport'

const LIGHTBOX_ID = 'activite-photo-lightbox'
const PLACEHOLDER_SRC = 'placeholder.60f9b1840c.svg'
const CLICK_MOVE_THRESHOLD_PX = 8

let lightboxRoot = null
let lightboxImage = null
let lightboxCloseButton = null
let boundInner = null
let pointerStart = null
let keydownHandler = null
let pointerDownHandler = null
let pointerUpHandler = null
let closeHandler = null
let backdropHandler = null

function getPhotoImage(frame) {
  return frame?.querySelector('.activite_img, img') ?? null
}

function isValidPhotoFrame(frame) {
  const img = getPhotoImage(frame)
  if (!img) return false

  const src = (img.getAttribute('src') || img.currentSrc || '').trim()
  if (!src || src.includes(PLACEHOLDER_SRC)) return false
  if (img.classList.contains('w-dyn-bind-empty')) return false

  return true
}

function getPhotoFrameFromTarget(target) {
  const frame = target?.closest?.('.activite_images_img')
  if (!frame || !boundInner?.contains(frame)) return null
  if (!isValidPhotoFrame(frame)) return null
  return frame
}

function ensureLightbox() {
  if (lightboxRoot) return

  lightboxRoot = document.createElement('div')
  lightboxRoot.id = LIGHTBOX_ID
  lightboxRoot.className = 'activite-photo-lightbox'
  lightboxRoot.setAttribute('role', 'dialog')
  lightboxRoot.setAttribute('aria-modal', 'true')
  lightboxRoot.setAttribute('aria-label', 'Photo agrandie')
  lightboxRoot.hidden = true

  lightboxCloseButton = document.createElement('button')
  lightboxCloseButton.type = 'button'
  lightboxCloseButton.className = 'activite-photo-lightbox__close'
  lightboxCloseButton.setAttribute('aria-label', 'Fermer')
  lightboxCloseButton.innerHTML =
    '<span class="activite-photo-lightbox__close-icon" aria-hidden="true">&times;</span>'

  const backdrop = document.createElement('button')
  backdrop.type = 'button'
  backdrop.className = 'activite-photo-lightbox__backdrop'
  backdrop.setAttribute('aria-label', 'Fermer la photo agrandie')

  const content = document.createElement('div')
  content.className = 'activite-photo-lightbox__content'

  lightboxImage = document.createElement('img')
  lightboxImage.className = 'activite-photo-lightbox__img'
  lightboxImage.alt = ''

  content.appendChild(lightboxImage)
  lightboxRoot.append(backdrop, content, lightboxCloseButton)
  document.body.appendChild(lightboxRoot)

  closeHandler = () => closeActivitePhotoLightbox()
  backdropHandler = () => closeActivitePhotoLightbox()

  lightboxCloseButton.addEventListener('click', closeHandler)
  backdrop.addEventListener('click', backdropHandler)

  keydownHandler = (event) => {
    if (event.key === 'Escape') {
      closeActivitePhotoLightbox()
    }
  }
}

function lockPageScroll() {
  setScrollLocked(true)
}

function unlockPageScroll() {
  setScrollLocked(false)
}

function openLightbox(frame) {
  const img = getPhotoImage(frame)
  if (!img) return

  const src = (img.currentSrc || img.getAttribute('src') || '').trim()
  if (!src) return

  ensureLightbox()

  lightboxImage.src = src
  lightboxImage.alt = img.getAttribute('alt') || ''
  lightboxRoot.hidden = false
  lightboxRoot.classList.add('is-open')
  document.addEventListener('keydown', keydownHandler)
  lockPageScroll()

  if (!isMobileViewport()) {
    lightboxCloseButton.focus({ preventScroll: true })
  }
}

export function closeActivitePhotoLightbox() {
  if (!lightboxRoot?.classList.contains('is-open')) return

  lightboxRoot.classList.remove('is-open')
  lightboxRoot.hidden = true
  lightboxImage.removeAttribute('src')
  lightboxImage.alt = ''
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler)
  }

  if (document.activeElement === lightboxCloseButton) {
    lightboxCloseButton.blur()
  }

  unlockPageScroll()
}

function handlePointerDown(event) {
  if (event.button !== 0) return

  const frame = getPhotoFrameFromTarget(event.target)
  if (!frame) {
    pointerStart = null
    return
  }

  pointerStart = {
    x: event.clientX,
    y: event.clientY,
    frame,
  }
}

function handlePointerUp(event) {
  if (!pointerStart) return

  const { x, y, frame } = pointerStart
  pointerStart = null

  const deltaX = Math.abs(event.clientX - x)
  const deltaY = Math.abs(event.clientY - y)
  if (deltaX > CLICK_MOVE_THRESHOLD_PX || deltaY > CLICK_MOVE_THRESHOLD_PX) {
    return
  }

  const targetFrame = getPhotoFrameFromTarget(event.target)
  if (!targetFrame || targetFrame !== frame) return

  event.preventDefault()
  openLightbox(frame)
}

export function bindActivitePhotoLightbox(inner) {
  if (!inner || boundInner === inner) return

  unbindActivitePhotoLightbox()
  ensureLightbox()

  boundInner = inner
  pointerDownHandler = handlePointerDown
  pointerUpHandler = handlePointerUp

  inner.addEventListener('pointerdown', pointerDownHandler)
  inner.addEventListener('pointerup', pointerUpHandler)
  inner.classList.add('has-photo-lightbox')
}

export function unbindActivitePhotoLightbox() {
  closeActivitePhotoLightbox()

  if (boundInner && pointerDownHandler) {
    boundInner.removeEventListener('pointerdown', pointerDownHandler)
    boundInner.removeEventListener('pointerup', pointerUpHandler)
    boundInner.classList.remove('has-photo-lightbox')
  }

  boundInner = null
  pointerDownHandler = null
  pointerUpHandler = null
  pointerStart = null
}
