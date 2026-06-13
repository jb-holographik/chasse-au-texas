const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

let formBound = false
let boundForm = null
let boundEmailInput = null
let boundSubmitHandler = null
let boundBlurHandler = null
let boundInputHandler = null

function isValidEmail(value) {
  return EMAIL_PATTERN.test((value || '').trim())
}

function upgradeMessageField() {
  const messageField = document.querySelector('#message')
  if (!messageField || messageField.tagName === 'TEXTAREA') {
    return messageField
  }

  const textarea = document.createElement('textarea')
  const attributes = [
    'id',
    'name',
    'class',
    'maxlength',
    'placeholder',
    'required',
    'data-name',
  ]

  attributes.forEach((attribute) => {
    const value = messageField.getAttribute(attribute)
    if (value !== null) {
      textarea.setAttribute(attribute, value)
    }
  })

  textarea.value = messageField.value
  textarea.rows = 5
  messageField.replaceWith(textarea)

  return textarea
}

function getOrCreateErrorElement(input) {
  const fieldBlock = input.closest('.form-block')
  const existingId = input.getAttribute('aria-describedby')

  if (existingId) {
    const existing = document.getElementById(existingId)
    if (existing?.classList.contains('form-error-inline')) {
      return existing
    }
  }

  const errorId = `${input.id || 'field'}-error`
  let errorEl = document.getElementById(errorId)

  if (!errorEl) {
    errorEl = document.createElement('div')
    errorEl.id = errorId
    errorEl.className = 'form-error-inline'
    errorEl.setAttribute('role', 'alert')

    if (fieldBlock) {
      fieldBlock.classList.add('form-block--with-error')
      fieldBlock.appendChild(errorEl)
    } else {
      input.insertAdjacentElement('afterend', errorEl)
    }
  }

  input.setAttribute('aria-describedby', errorId)
  return errorEl
}

function setEmailError(input, message) {
  const errorEl = getOrCreateErrorElement(input)
  errorEl.textContent = message
  input.classList.add('form-field--error')
  input.setAttribute('aria-invalid', 'true')
}

function clearEmailError(input) {
  const errorId = input.getAttribute('aria-describedby')
  if (errorId) {
    const errorEl = document.getElementById(errorId)
    if (errorEl?.classList.contains('form-error-inline')) {
      errorEl.textContent = ''
    }
  }
  input.classList.remove('form-field--error')
  input.setAttribute('aria-invalid', 'false')
}

function validateEmailField(input, { showEmptyError = false } = {}) {
  const value = (input.value || '').trim()
  if (!value) {
    if (showEmptyError) {
      setEmailError(input, 'Veuillez saisir votre adresse e-mail.')
      return false
    }
    clearEmailError(input)
    return true
  }

  if (!isValidEmail(value)) {
    setEmailError(input, 'Veuillez saisir une adresse e-mail valide.')
    return false
  }

  clearEmailError(input)
  return true
}

export function initReservationForm() {
  destroyReservationForm()

  const form = document.querySelector('#email-form')
  if (!form) return

  form.setAttribute('novalidate', 'novalidate')
  upgradeMessageField()

  const emailInput = document.querySelector('#email')
  if (!emailInput) return

  boundForm = form
  boundEmailInput = emailInput

  boundBlurHandler = () => {
    validateEmailField(emailInput)
  }

  boundInputHandler = () => {
    if (emailInput.classList.contains('form-field--error')) {
      validateEmailField(emailInput)
    }
  }

  boundSubmitHandler = (event) => {
    const isEmailValid = validateEmailField(emailInput, {
      showEmptyError: true,
    })
    if (!isEmailValid) {
      event.preventDefault()
      event.stopPropagation()
      emailInput.focus()
    }
  }

  emailInput.addEventListener('blur', boundBlurHandler)
  emailInput.addEventListener('input', boundInputHandler)
  form.addEventListener('submit', boundSubmitHandler)
  formBound = true
}

export function destroyReservationForm() {
  if (!formBound || !boundForm || !boundEmailInput) {
    formBound = false
    boundForm = null
    boundEmailInput = null
    return
  }

  boundEmailInput.removeEventListener('blur', boundBlurHandler)
  boundEmailInput.removeEventListener('input', boundInputHandler)
  boundForm.removeEventListener('submit', boundSubmitHandler)

  clearEmailError(boundEmailInput)

  formBound = false
  boundForm = null
  boundEmailInput = null
  boundBlurHandler = null
  boundInputHandler = null
  boundSubmitHandler = null
}
