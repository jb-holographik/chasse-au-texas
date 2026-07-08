import barba from '@barba/core'
import { gsap } from 'gsap'

import {
  destroySmoothScroll,
  initSmoothScroll,
  syncSmoothScroll,
} from '../utils/scroll'
import { destroyActivitePhotos, initActivitePhotos } from './activite-photos'
import {
  destroyBannerStack,
  finalizeBannerStack,
  prepareBannerStackLayout,
} from './banner-stack'
import { initFooterNavHover } from './footer-nav'
import { closeNavSubmenu, fixPageLinkHrefs, updateNavState } from './nav'
import { destroyReservationForm, initReservationForm } from './reservation-form'

const TRANSITION_DURATION = 650
const LEAVE_FADE = {
  duration: TRANSITION_DURATION / 1000,
  ease: 'power2.inOut',
}
const ENTER_FADE = {
  duration: 1.35,
  ease: 'power2.inOut',
}

const BACKDROP_FILTER_SELECTORS = [
  '.home',
  '.nav-block',
  '#nav-component',
  '.banner',
  '.card_category',
  '.formulaire-inner',
  '.button-cat',
]

function parseNextDocument(data) {
  if (data.next?.document) {
    return data.next.document
  }

  if (data.next?.html) {
    return new DOMParser().parseFromString(data.next.html, 'text/html')
  }

  return null
}

function updateDocumentMeta(nextDocument) {
  if (!nextDocument) return

  const nextTitle = nextDocument.querySelector('title')?.textContent
  if (nextTitle) {
    document.title = nextTitle
  }

  const descriptionSelector = 'meta[name="description"]'
  const currentDescription = document.querySelector(descriptionSelector)
  const nextDescription = nextDocument.querySelector(descriptionSelector)
  if (currentDescription && nextDescription) {
    currentDescription.setAttribute(
      'content',
      nextDescription.getAttribute('content') || ''
    )
  }
}

function fadeOpacity(element, from, to, options = LEAVE_FADE) {
  if (!element) {
    return Promise.resolve()
  }

  gsap.killTweensOf(element, 'opacity')
  gsap.set(element, { opacity: from })

  return gsap.to(element, { opacity: to, ...options }).then()
}

function getEventTargetElement(event) {
  const target = event.target
  if (target instanceof Element) {
    return target
  }

  if (target?.parentElement instanceof Element) {
    return target.parentElement
  }

  return null
}

function repairBackdropFilters(scope = document) {
  const roots = scope === document ? [document] : [document, scope]

  roots.forEach((root) => {
    BACKDROP_FILTER_SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach((element) => {
        element.style.removeProperty('-webkit-backdrop-filter')
        element.style.removeProperty('backdrop-filter')
      })
    })
  })

  void document.body.offsetHeight
}

function scheduleBackdropRepair(scope = document) {
  repairBackdropFilters(scope)
  requestAnimationFrame(() => {
    repairBackdropFilters(scope)
    requestAnimationFrame(() => repairBackdropFilters(scope))
  })
}

function ensureBarbaSchema() {
  const wrapper =
    document.getElementById('content') ||
    document.querySelector('.page-wrapper')
  const container = document.querySelector('main.main-wrapper')

  wrapper?.setAttribute('data-barba', 'wrapper')
  container?.setAttribute('data-barba', 'container')

  return { wrapper, container }
}

function shouldPreventBarbaNavigation(el) {
  if (el?.dataset?.navToggle === 'activities') return true
  if (el?.closest?.('[data-barba-prevent]')) return true

  const label = (el?.textContent || '').trim().toLowerCase()
  if (
    el?.classList?.contains('button-cat') &&
    label.includes('activit') &&
    el.closest('#nav-top-row, .nav_row')
  ) {
    return true
  }

  const href = el?.getAttribute('href')
  if (!href || href === '#' || href.startsWith('#')) {
    return true
  }

  return false
}

function reinitWebflow() {
  if (window.Webflow?.require) {
    window.Webflow.require('ix2')?.init()
  }
}

function reinitPageModules(scope = document) {
  fixPageLinkHrefs(document)
  initSmoothScroll()
  syncSmoothScroll()
  updateNavState()
  reinitWebflow()
  return Promise.all([
    initActivitePhotos(scope),
    Promise.resolve(initReservationForm()),
    Promise.resolve(initFooterNavHover()),
  ])
}

function destroyPageModules() {
  destroyBannerStack()
  destroyActivitePhotos()
  destroyReservationForm()
  destroySmoothScroll()
}

export function initPageTransitions() {
  ensureBarbaSchema()
  fixPageLinkHrefs(document)

  barba.hooks.before(() => {
    fixPageLinkHrefs(document)
  })

  barba.init({
    preventRunning: true,
    timeout: 10000,
    prevent: ({ el, event }) => {
      if (event?.defaultPrevented) return true
      return shouldPreventBarbaNavigation(el)
    },
    transitions: [
      {
        name: 'fade',
        async leave(data) {
          const container = data.current.container

          await fadeOpacity(container, 1, 0)

          closeNavSubmenu()
          destroyPageModules()
        },
        beforeEnter(data) {
          gsap.set(data.current.container, {
            display: 'none',
            pointerEvents: 'none',
          })
          window.scrollTo(0, 0)
          gsap.set(data.next.container, { opacity: 0 })

          if (data.next.container.querySelector('.section_banners')) {
            prepareBannerStackLayout(data.next.container)
          }
        },
        async enter(data) {
          updateDocumentMeta(parseNextDocument(data) || data.next.document)
          fixPageLinkHrefs(data.next.container)
          updateNavState()
          reinitWebflow()
          scheduleBackdropRepair(data.next.container)

          await fadeOpacity(data.next.container, 0, 1, ENTER_FADE)
          gsap.set(data.next.container, { clearProps: 'opacity' })
        },
        async after(data) {
          scheduleBackdropRepair(data.next.container)
          await reinitPageModules(data.next.container)

          if (data.next.container.querySelector('.section_banners')) {
            finalizeBannerStack()
          }
        },
      },
    ],
  })

  document.addEventListener(
    'mouseover',
    (event) => {
      const target = getEventTargetElement(event)
      if (!target) return

      const link = target.closest('a[href]')
      if (!link) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return

      try {
        const url = new URL(href, window.location.origin)
        if (url.origin === window.location.origin) {
          barba.prefetch(url.href)
        }
      } catch {
        // ignore invalid URLs
      }
    },
    true
  )
}

export function reinitAfterNavigation() {
  reinitPageModules()
}
