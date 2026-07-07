const RESERVATION_API_URL = import.meta.env.VITE_RESERVATION_API_URL || ''

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

const FORM_SUCCESS_MESSAGE = 'Merci, votre message a bien été envoyé !'
const FORM_ERROR_MESSAGE =
  "Il y a eu une erreur lors de l'envoi, réessayez ultérieurement."

let formBound = false
let boundForm = null
let boundFormContainer = null
let boundEmailInput = null
let boundSubmitHandler = null
let boundBlurHandler = null
let boundInputHandler = null
let isSubmitting = false

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

function setFieldError(input, message) {
  const errorEl = getOrCreateErrorElement(input)
  errorEl.textContent = message
  input.classList.add('form-field--error')
  input.setAttribute('aria-invalid', 'true')
}

function clearFieldError(input) {
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

function setEmailError(input, message) {
  setFieldError(input, message)
}

function clearEmailError(input) {
  clearFieldError(input)
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

function validateRequiredField(input, emptyMessage) {
  const value = (input.value || '').trim()
  if (!value) {
    setFieldError(input, emptyMessage)
    return false
  }

  clearFieldError(input)
  return true
}

function querySuccessEl(formContainer) {
  return (
    formContainer.querySelector('.w-form-done') ||
    formContainer.querySelector('.form-success')
  )
}

function queryErrorEl(formContainer) {
  return (
    formContainer.querySelector('.w-form-fail') ||
    formContainer.querySelector('.form-error')
  )
}

function resetFormState(formContainer) {
  if (!formContainer) return

  const form = formContainer.querySelector('form')
  const successEl = querySuccessEl(formContainer)
  const errorEl = queryErrorEl(formContainer)

  if (form) {
    form.style.display = ''
    form.reset()
  }

  if (successEl) {
    successEl.style.display = 'none'
    const messageEl = successEl.querySelector('div')
    if (messageEl) messageEl.textContent = FORM_SUCCESS_MESSAGE
  }
  if (errorEl) {
    errorEl.style.display = 'none'
    const messageEl = errorEl.querySelector('div')
    if (messageEl) messageEl.textContent = FORM_ERROR_MESSAGE
  }
}

function showFormSuccess(formContainer, message) {
  const form = formContainer.querySelector('form')
  const successEl = querySuccessEl(formContainer)
  const errorEl = queryErrorEl(formContainer)

  if (form) form.style.display = 'none'
  if (errorEl) errorEl.style.display = 'none'
  if (successEl) {
    successEl.style.display = 'block'
    const messageEl = successEl.querySelector('div')
    if (messageEl && message) {
      messageEl.textContent = message
    }
  }
}

function showFormError(formContainer, message) {
  const errorEl = queryErrorEl(formContainer)
  const successEl = querySuccessEl(formContainer)

  if (successEl) successEl.style.display = 'none'
  if (errorEl) {
    errorEl.style.display = 'block'
    const messageEl = errorEl.querySelector('div')
    if (messageEl && message) {
      messageEl.textContent = message
    }
  }
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    return { success: response.ok, message: text }
  }
}

function setSubmitButtonState(submitButton, isLoading) {
  if (!submitButton) return

  submitButton.disabled = isLoading
  submitButton.value = isLoading
    ? submitButton.dataset.wait || 'Envoi en cours...'
    : 'Envoyer'
}

async function submitReservationForm(form, formContainer) {
  const nameInput = form.querySelector('#name')
  const emailInput = form.querySelector('#email')
  const messageInput = form.querySelector('#message')
  const submitButton = form.querySelector('[type="submit"]')

  const isNameValid = validateRequiredField(
    nameInput,
    'Veuillez saisir votre nom.'
  )
  const isEmailValid = validateEmailField(emailInput, {
    showEmptyError: true,
  })
  const isMessageValid = validateRequiredField(
    messageInput,
    'Veuillez saisir votre message.'
  )

  if (!isNameValid || !isEmailValid || !isMessageValid) {
    const firstInvalid = [nameInput, emailInput, messageInput].find((input) =>
      input?.classList.contains('form-field--error')
    )
    firstInvalid?.focus()
    return
  }

  isSubmitting = true
  setSubmitButtonState(submitButton, true)

  if (!RESERVATION_API_URL) {
    showFormError(
      formContainer,
      "Le service d'envoi n'est pas configuré. Contactez le webmaster."
    )
    isSubmitting = false
    setSubmitButtonState(submitButton, false)
    return
  }

  try {
    const response = await fetch(RESERVATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: messageInput.value.trim(),
      }),
    })

    const result = await parseApiResponse(response)

    if (!response.ok || result.success !== true) {
      throw new Error(result.message || 'Form submission failed')
    }

    showFormSuccess(formContainer, FORM_SUCCESS_MESSAGE)
  } catch (error) {
    const fallbackMessage =
      error instanceof Error && error.message
        ? error.message
        : FORM_ERROR_MESSAGE

    showFormError(formContainer, fallbackMessage)
  } finally {
    isSubmitting = false
    setSubmitButtonState(submitButton, false)
  }
}

export function initReservationForm() {
  destroyReservationForm()

  const form = document.querySelector('#email-form')
  if (!form) return

  const formContainer =
    form.closest('.w-form') || form.closest('.formulaire-contact')
  if (!formContainer) return

  form.removeAttribute('action')
  form.removeAttribute('method')
  form.setAttribute('novalidate', 'novalidate')
  resetFormState(formContainer)
  upgradeMessageField()

  const emailInput = document.querySelector('#email')
  if (!emailInput) return

  boundForm = form
  boundFormContainer = formContainer
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
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    if (isSubmitting) return

    submitReservationForm(form, formContainer)
  }

  emailInput.addEventListener('blur', boundBlurHandler)
  emailInput.addEventListener('input', boundInputHandler)
  form.addEventListener('submit', boundSubmitHandler, true)
  formBound = true
}

export function destroyReservationForm() {
  if (!formBound || !boundForm || !boundEmailInput) {
    formBound = false
    boundForm = null
    boundFormContainer = null
    boundEmailInput = null
    isSubmitting = false
    return
  }

  boundEmailInput.removeEventListener('blur', boundBlurHandler)
  boundEmailInput.removeEventListener('input', boundInputHandler)
  boundForm.removeEventListener('submit', boundSubmitHandler, true)

  clearEmailError(boundEmailInput)
  resetFormState(boundFormContainer)

  formBound = false
  boundForm = null
  boundFormContainer = null
  boundEmailInput = null
  boundBlurHandler = null
  boundInputHandler = null
  boundSubmitHandler = null
  isSubmitting = false
}
