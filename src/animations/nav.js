export function initNavSubmenuToggle() {
  function getButtonLabel(button) {
    return (button.textContent || '').trim().toLowerCase()
  }

  function findButtonByLabel(buttons, keyword) {
    return buttons.find((button) => getButtonLabel(button).includes(keyword))
  }

  const nav =
    document.getElementById('nav-component') ||
    document.querySelector('.nav-block')
  if (!nav || nav.dataset.navBound === '1') return

  const topRow =
    nav.querySelector('#nav-top-row') || nav.querySelector('.nav_row')
  const submenu =
    nav.querySelector('#nav-submenu') ||
    nav.querySelector('[data-nav-submenu]') ||
    nav.querySelector('.nav_submenu') ||
    nav.querySelector('.nav-submenu') ||
    null

  if (!topRow) return

  const topButtons = Array.from(topRow.querySelectorAll('.button-cat'))
  const aboutButton = findButtonByLabel(topButtons, 'qui')
  const activitiesButton = findButtonByLabel(topButtons, 'activit')

  const path = window.location.pathname.toLowerCase()
  const isAboutPage =
    path.includes('qui-sommes-nous') || path.includes('qui-sommes')

  if (aboutButton) {
    aboutButton.classList.toggle('is-active', isAboutPage)
  }

  if (!activitiesButton) {
    nav.dataset.navBound = '1'
    return
  }

  let isSubmenuOpen = false

  function applySubmenuState() {
    if (submenu) {
      submenu.style.display = isSubmenuOpen ? 'flex' : 'none'
    }
    activitiesButton.classList.toggle('is-active', isSubmenuOpen)
    nav.classList.toggle('is-open', isSubmenuOpen)
    activitiesButton.setAttribute('aria-expanded', String(isSubmenuOpen))
  }

  isSubmenuOpen = false
  applySubmenuState()

  nav.dataset.navBound = '1'

  activitiesButton.addEventListener('click', (e) => {
    e.preventDefault()
    isSubmenuOpen = !isSubmenuOpen
    applySubmenuState()
  })

  document.addEventListener('click', (e) => {
    if (isSubmenuOpen && !nav.contains(e.target)) {
      isSubmenuOpen = false
      applySubmenuState()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (isSubmenuOpen && e.key === 'Escape') {
      isSubmenuOpen = false
      applySubmenuState()
    }
  })
}
