export function initNavSubmenuToggle() {
  function getButtonLabel(button) {
    return (button.textContent || '').trim().toLowerCase()
  }

  function findButtonByLabel(buttons, keyword) {
    return buttons.find((button) => getButtonLabel(button).includes(keyword))
  }

  function normalizePath(pathname) {
    const decodedPath = decodeURIComponent(pathname || '')
    return decodedPath.toLowerCase().replace(/\/+$/, '') || '/'
  }

  function normalizeComparable(value) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  function splitTokens(value) {
    return normalizeComparable(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function hasTokenAsPathSegment(path, token) {
    if (!token) return false
    return new RegExp(`(?:^|/)${escapeRegex(token)}(?:/|$)`).test(path)
  }

  function extractCategorySlugFromHref(href) {
    if (!href) return null
    try {
      const path = normalizeComparable(new URL(href, window.location.origin).pathname)
      const match = path.match(/\/(?:categorie|category)\/([^/?#]+)/)
      return match?.[1] || null
    } catch {
      return null
    }
  }

  function getPageCategoryHints(nav) {
    const hints = new Set()
    const main = document.querySelector('main') || document.body
    const activityCategoryLabel = main.querySelector(
      '.section_activite .activite_heading .eyebrow'
    )

    if (activityCategoryLabel) {
      splitTokens(activityCategoryLabel.textContent || '').forEach((token) =>
        hints.add(token)
      )
      return Array.from(hints)
    }

    const categoryLinks = Array.from(
      main.querySelectorAll('a[href*="/categorie/"], a[href*="/category/"]')
    ).filter(
      (link) =>
        !link.closest(
          '#nav-component, .nav-block, #nav-submenu, .nav_submenu, .nav-submenu, nav, header, footer'
        ) && !nav.contains(link)
    )

    const currentCategoryLink = categoryLinks.find(
      (link) =>
        link.getAttribute('aria-current') === 'page' ||
        link.classList.contains('w--current')
    )

    let selectedCategoryLink = currentCategoryLink || null

    if (!selectedCategoryLink && categoryLinks.length > 0) {
      const allElements = Array.from(main.querySelectorAll('*'))
      const elementIndex = new Map(
        allElements.map((element, index) => [element, index])
      )
      const heading = main.querySelector('h1')
      const headingIndex = heading ? elementIndex.get(heading) ?? 0 : 0

      selectedCategoryLink = categoryLinks
        .slice()
        .sort((a, b) => {
          const indexA = elementIndex.get(a) ?? Number.MAX_SAFE_INTEGER
          const indexB = elementIndex.get(b) ?? Number.MAX_SAFE_INTEGER
          const beforeA = indexA <= headingIndex ? 0 : 1
          const beforeB = indexB <= headingIndex ? 0 : 1
          if (beforeA !== beforeB) return beforeA - beforeB
          return Math.abs(indexA - headingIndex) - Math.abs(indexB - headingIndex)
        })[0]
    }

    if (selectedCategoryLink) {
      const slug = extractCategorySlugFromHref(
        selectedCategoryLink.getAttribute('href')
      )
      if (slug) hints.add(slug)
      splitTokens(selectedCategoryLink.textContent || '').forEach((token) =>
        hints.add(token)
      )
    }

    const mainHeading = main.querySelector('h1')
    if (mainHeading) {
      let sibling = mainHeading.previousElementSibling
      let maxSteps = 0
      while (sibling && maxSteps < 3) {
        splitTokens(sibling.textContent || '').forEach((token) => hints.add(token))
        sibling = sibling.previousElementSibling
        maxSteps += 1
      }
    }

    return Array.from(hints)
  }

  function getButtonTokens(button) {
    const explicitSlug =
      button.getAttribute('data-category-slug') ||
      button.getAttribute('data-slug') ||
      ''
    const label = getButtonLabel(button)
    const buttonPath = resolveButtonPath(button) || ''

    return Array.from(new Set(splitTokens(`${explicitSlug} ${label} ${buttonPath}`)))
  }

  function resolveButtonPath(button) {
    const href = button.getAttribute('href')
    if (!href || href.startsWith('#')) return null

    try {
      const url = new URL(href, window.location.origin)
      return normalizePath(url.pathname)
    } catch {
      return null
    }
  }

  function isPathMatch(currentPath, targetPath) {
    if (!targetPath) return false
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
  }

  function findActiveSubmenuButton(buttons, currentPath, pageCategoryHints = []) {
    const comparablePath = normalizeComparable(currentPath)
    const hintSet = new Set(pageCategoryHints)
    let bestMatch = null
    let bestScore = 0

    buttons.forEach((button) => {
      const buttonPath = resolveButtonPath(button)
      if (isPathMatch(currentPath, buttonPath)) {
        const pathScore = (buttonPath || '').length + 1000
        if (pathScore > bestScore) {
          bestScore = pathScore
          bestMatch = button
        }
        return
      }

      const buttonTokens = getButtonTokens(button)
      const tokenScore = buttonTokens.reduce((score, token) => {
        if (hasTokenAsPathSegment(comparablePath, token))
          return score + token.length + 4
        if (comparablePath.includes(token)) return score + token.length
        return score
      }, 0)
      const hintScore = buttonTokens.reduce((score, token) => {
        return hintSet.has(token) ? score + token.length + 6 : score
      }, 0)
      const combinedScore = tokenScore + hintScore

      if (combinedScore > bestScore) {
        bestScore = combinedScore
        bestMatch = button
      }
    })

    return bestMatch
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
  const submenuButtons = submenu
    ? Array.from(submenu.querySelectorAll('.button-cat'))
    : []

  const path = normalizePath(window.location.pathname)
  const comparablePath = normalizeComparable(path)
  const isAboutPage =
    comparablePath.includes('qui-sommes-nous') ||
    comparablePath.includes('qui-sommes')
  const isActivitiesContext =
    comparablePath.includes('activit') ||
    comparablePath.includes('categorie') ||
    comparablePath.includes('category')

  if (aboutButton) {
    aboutButton.classList.toggle('is-active', isAboutPage)
  }

  const pageCategoryHints = getPageCategoryHints(nav)
  const activeSubmenuButton = findActiveSubmenuButton(
    submenuButtons,
    path,
    pageCategoryHints
  )

  submenuButtons.forEach((button) => {
    button.classList.toggle('is-active', button === activeSubmenuButton)
  })

  if (!activitiesButton) {
    nav.dataset.navBound = '1'
    return
  }

  let isSubmenuOpen = false

  function applySubmenuState() {
    if (submenu) {
      submenu.style.display = isSubmenuOpen ? 'flex' : 'none'
    }
    activitiesButton.classList.toggle(
      'is-active',
      isSubmenuOpen || isActivitiesContext
    )
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
