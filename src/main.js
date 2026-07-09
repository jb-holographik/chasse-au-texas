import './activite-photos-boot.js'
import './styles/style.css'
import { initActivitePhotos } from './animations/activite-photos'
import { initBannerStack } from './animations/banner-stack'
import { initFooterNavHover } from './animations/footer-nav'
import { initNavSubmenuToggle, updateNavState } from './animations/nav'
import { initPageTransitions } from './animations/page-transition'
import { initReservationForm } from './animations/reservation-form'
import { initSmoothScroll } from './utils/scroll'

async function bootstrap() {
  initNavSubmenuToggle()
  initFooterNavHover()
  initSmoothScroll()

  initPageTransitions()

  initBannerStack()
  initActivitePhotos()
  initReservationForm()

  // Re-apply after any older bundle that may have initialized first (Webflow + Netlify).
  queueMicrotask(() => updateNavState())
  requestAnimationFrame(() => updateNavState())
}

bootstrap()
