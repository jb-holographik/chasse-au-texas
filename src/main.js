import './styles/style.css'
import { initActivitePhotos } from './animations/activite-photos'
import { initBannerStack } from './animations/banner-stack'
import { initFooterNavHover } from './animations/footer-nav'
import { initNavSubmenuToggle } from './animations/nav'
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
}

bootstrap()
