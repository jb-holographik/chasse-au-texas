import './styles/style.css'
import { initBannerStack } from './animations/banner-stack'
import { initCanvas } from './animations/canvas'
import { initNavSubmenuToggle } from './animations/nav'
import { initSmoothScroll } from './utils/scroll'

console.log('Connection established')

initCanvas()
initBannerStack()
initNavSubmenuToggle()
initSmoothScroll()
