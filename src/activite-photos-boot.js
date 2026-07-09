const BOOT_STYLE_ID = 'activite-photos-boot'

const BOOT_CSS = `
.section_activite:not(.is-category):not(.is-about) .activite_images-inner {
  display: block;
  position: relative;
  width: 100%;
  max-width: 100%;
  margin-inline: auto;
  height: min(52svh, max(280px, calc(100cqw * 10 / 16)));
  overflow: hidden;
  box-sizing: border-box;
}

.section_activite:not(.is-category):not(.is-about)
  .activite_images-inner:not(.is-swiper):not(.is-stacked):not(.is-single),
.section_activite:not(.is-category):not(.is-about)
  .activite_images-inner.is-photos-pending {
  visibility: hidden;
}
`

function ensureBootStyles() {
  if (document.getElementById(BOOT_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = BOOT_STYLE_ID
  style.textContent = BOOT_CSS
  document.head.appendChild(style)
}

export function prepareActivitePhotosLayout(scope = document) {
  ensureBootStyles()

  const root = scope?.querySelector ? scope : document
  root
    .querySelectorAll(
      '.section_activite:not(.is-category):not(.is-about) .activite_images-inner'
    )
    .forEach((inner) => {
      if (
        inner.classList.contains('is-swiper') ||
        inner.classList.contains('is-stacked') ||
        inner.classList.contains('is-single')
      ) {
        return
      }

      inner.classList.add('is-photos-pending')
    })
}

ensureBootStyles()
prepareActivitePhotosLayout()
