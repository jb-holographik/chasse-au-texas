import { gsap } from 'gsap'

let photoStackRoot = null
let clickHandler = null

const ANGLES = [-1, 1]
const OFFSET_X = ['-1em', '1em']

function getPhotoStackInner(scope = document) {
  const root = scope?.querySelector ? scope : document
  return root.querySelector('.activite_images-inner')
}

function getPhotoStackFrames(inner) {
  return gsap.utils.toArray('.activite_images_img', inner)
}

function applyStackLayout(frames, frontIndex) {
  frames.forEach((frame, index) => {
    const isFront = index === frontIndex
    gsap.set(frame, {
      xPercent: -50,
      x: OFFSET_X[index % OFFSET_X.length],
      rotate: ANGLES[index % ANGLES.length],
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
      rotate: isTarget ? 0 : ANGLES[index % ANGLES.length],
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

export function initActivitePhotos(scope = document) {
  const inner = getPhotoStackInner(scope)
  if (!inner) return

  const frames = getPhotoStackFrames(inner)
  if (frames.length < 2) return

  if (photoStackRoot === inner && inner.dataset.photosReady === 'true') {
    return
  }

  destroyActivitePhotos()

  photoStackRoot = inner
  inner.classList.add('is-stacked')
  inner.dataset.photosReady = 'true'

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

export function destroyActivitePhotos() {
  if (photoStackRoot && clickHandler) {
    photoStackRoot.removeEventListener('click', clickHandler)
    clickHandler = null
  }

  if (photoStackRoot) {
    const frames = getPhotoStackFrames(photoStackRoot)
    photoStackRoot.classList.remove('is-stacked')
    delete photoStackRoot.dataset.photosReady
    frames.forEach((frame) => {
      gsap.set(frame, { clearProps: 'x,xPercent,y,rotate,zIndex' })
      frame.classList.remove('is-back', 'is-front')
    })
    photoStackRoot = null
  }
}
