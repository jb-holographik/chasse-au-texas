const RECIPIENT_EMAIL = 'misericorde.studio@gmail.com'
const FORM_SUBMIT_URL = `https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

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

function resetFormState(formContainer) {
  if (!formContainer) return

  const form = formContainer.querySelector('form')
  const successEl = formContainer.querySelector('.w-form-done')
  const errorEl = formContainer.querySelector('.w-form-fail')

  if (form) {
    form.style.display = ''
    form.reset()
  }

  if (successEl) successEl.style.display = 'none'
  if (errorEl) errorEl.style.display = 'none'
}

function showFormSuccess(formContainer) {
  const form = formContainer.querySelector('form')
  const successEl = formContainer.querySelector('.w-form-done')
  const errorEl = formContainer.querySelector('.w-form-fail')

  if (form) form.style.display = 'none'
  if (errorEl) errorEl.style.display = 'none'
  if (successEl) successEl.style.display = 'block'
}

function showFormError(formContainer) {
  const errorEl = formContainer.querySelector('.w-form-fail')
  const successEl = formContainer.querySelector('.w-form-done')

  if (successEl) successEl.style.display = 'none'
  if (errorEl) errorEl.style.display = 'block'
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

  try {
    const response = await fetch(FORM_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: messageInput.value.trim(),
        _replyto: emailInput.value.trim(),
        _subject: 'Nouvelle réservation — Chasse au Texas',
        _template: 'table',
      }),
    })

    if (!response.ok) {
      throw new Error('Form submission failed')
    }

    showFormSuccess(formContainer)
  } catch {
    showFormError(formContainer)
  } finally {
    isSubmitting = false
    setSubmitButtonState(submitButton, false)
  }
}

export function initReservationForm() {
  destroyReservationForm()

  const form = document.querySelector('#email-form')
  if (!form) return

  const formContainer = form.closest('.w-form')
  if (!formContainer) return

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

    if (isSubmitting) return

    submitReservationForm(form, formContainer)
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
    boundFormContainer = null
    boundEmailInput = null
    isSubmitting = false
    return
  }

  boundEmailInput.removeEventListener('blur', boundBlurHandler)
  boundEmailInput.removeEventListener('input', boundInputHandler)
  boundForm.removeEventListener('submit', boundSubmitHandler)

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
