# Three-Slide Loop Buffer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer les espaces latéraux des sliders à trois photos avec une séquence physique `A B C A B C`, sans saut ni accumulation de clones.

**Architecture:** `activite-photos.js` créera trois slides buffers marquées uniquement lorsque le CMS fournit exactement trois frames. Swiper recevra alors six slides et pourra utiliser son loop centré natif. Le démontage Barba restaurera exclusivement les trois frames originales et supprimera les buffers.

**Tech Stack:** JavaScript ES modules, Swiper 14, Playwright, Vite.

---

### Task 1: Régression navigateur pour le buffer à trois photos

**Files:**
- Modify: `scripts/verify-activite-slider-loop.mjs`
- Test fixture: `scripts/test-activite-slider.html`

- [ ] **Step 1: Écrire les assertions qui décrivent le comportement souhaité**

Dans le rapport de chaque page, collecter :

```js
const bufferSlides = [
  ...inner.querySelectorAll('[data-activite-loop-buffer="true"]'),
]
const physicalSlideCount = inner.querySelectorAll('.swiper-slide').length
const visibleSides = () => {
  const active = inner.querySelector('.swiper-slide-active')
  const activeRect = active.getBoundingClientRect()
  const innerRect = inner.getBoundingClientRect()
  const visible = [...inner.querySelectorAll('.swiper-slide')].filter((slide) => {
    if (slide === active) return false
    const rect = slide.getBoundingClientRect()
    return rect.right > innerRect.left && rect.left < innerRect.right
  })
  return {
    hasLeft: visible.some(
      (slide) => slide.getBoundingClientRect().right <= activeRect.left + 4
    ),
    hasRight: visible.some(
      (slide) => slide.getBoundingClientRect().left >= activeRect.right - 4
    ),
  }
}
```

Ajouter les attentes :

```js
report.physicalSlideCount === (report.cmsCount === 3 ? 6 : report.cmsCount)
report.bufferCount === (report.cmsCount === 3 ? 3 : 0)
report.frameCountAfterDestroy === report.cmsCount
report.frameCountAfterReinit ===
  (report.cmsCount === 3 ? 6 : report.cmsCount)
report.cmsCount !== 3 ||
  (report.centeredSlides &&
    report.slidesPerView === 1.12 &&
    report.hasLeft &&
    report.hasRight)
```

- [ ] **Step 2: Exécuter le test et constater l’échec**

Run:

```bash
node scripts/verify-activite-slider-loop.mjs
```

Expected: `FAIL` pour trois photos, avec 3 slides physiques, aucun buffer et `centeredSlides: false`.

- [ ] **Step 3: Commit du test rouge**

```bash
git add scripts/verify-activite-slider-loop.mjs scripts/test-activite-slider.html
git commit -m "Teste le buffer des sliders à trois photos"
```

### Task 2: Créer et nettoyer les slides buffers

**Files:**
- Modify: `src/animations/activite-photos.js`
- Test: `scripts/verify-activite-slider-loop.mjs`

- [ ] **Step 1: Étendre la création de slide avec un marqueur buffer**

```js
function createSlide(frame, { buffer = false } = {}) {
  const slide = document.createElement('div')
  slide.className = 'swiper-slide'

  const slideFrame = buffer ? frame.cloneNode(true) : frame
  resetFrameForSwiper(slideFrame)
  slide.appendChild(slideFrame)

  if (buffer) {
    slide.dataset.activiteLoopBuffer = 'true'
  }

  return slide
}
```

- [ ] **Step 2: Ajouter exactement trois buffers dans l’ordre CMS**

```js
function addThreePhotoLoopBuffers(wrapper, frames) {
  if (frames.length !== 3) return

  frames.forEach((frame) => {
    wrapper.appendChild(createSlide(frame, { buffer: true }))
  })
}
```

Appeler cette fonction après l’ajout des slides originales et avant
`inner.appendChild(wrapper)`.

- [ ] **Step 3: Configurer le loop selon le nombre logique de photos**

```js
function getSwiperLoopConfig(slideCount) {
  const hasThreePhotoBuffer = slideCount === 3
  const hasCenteredPeek = hasThreePhotoBuffer || slideCount >= 5

  return {
    loop: slideCount > 1,
    slidesPerView: hasCenteredPeek ? 1.12 : 1,
    centeredSlides: hasCenteredPeek,
    slidesPerGroup: 1,
    slidesPerGroupAuto: false,
  }
}
```

- [ ] **Step 4: Exclure les buffers de la restauration Barba**

Dans `destroyActivitePhotos()` :

```js
const isBuffer = slide.dataset.activiteLoopBuffer === 'true'

if (frame && !isBuffer) {
  resetFrameForSwiper(frame)
  restoreParent.appendChild(frame)
}
```

Les slides buffers sont ensuite supprimées avec leur wrapper.

- [ ] **Step 5: Exécuter les tests**

Run:

```bash
node scripts/verify-activite-slider-loop.mjs
node scripts/verify-activite-lightbox.mjs
npm run build
```

Expected:

```text
PASS
PASS
✓ built
```

- [ ] **Step 6: Vérifier la page publiée après déploiement**

Sur `nilgai-a-lapproche`, vérifier en viewport mobile et desktop :

```js
({
  cmsCount: 3,
  physicalSlides: 6,
  buffers: 3,
  loop: true,
  slidesPerView: 1.12,
  centeredSlides: true,
})
```

Le drag doit conserver une slide active visible et les côtés gauche/droit ne
doivent jamais être vides.

- [ ] **Step 7: Commit de l’implémentation**

```bash
git add src/animations/activite-photos.js scripts/verify-activite-slider-loop.mjs
git commit -m "Ajoute un buffer cyclique aux sliders à trois photos"
```
