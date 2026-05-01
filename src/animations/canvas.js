/* global GPUBufferUsage, GPUShaderStage, GPUTextureUsage */
import barba from '@barba/core'

import shaderCode from '../shaders/background.wgsl?raw'
import {
  destroySmoothScroll,
  initSmoothScroll,
  syncSmoothScroll,
} from '../utils/scroll'
import { destroyBannerStack, initBannerStack } from './banner-stack'

function extractFirstUrl(backgroundImageValue) {
  if (!backgroundImageValue || backgroundImageValue === 'none') {
    return null
  }

  const match = backgroundImageValue.match(/url\((['"]?)(.*?)\1\)/)
  if (!match || !match[2]) {
    return null
  }

  return match[2]
}

function getCanvasBackgroundUrl(canvasHost) {
  const computed = window.getComputedStyle(canvasHost)
  const rawUrl = extractFirstUrl(computed.backgroundImage)
  if (!rawUrl) {
    return null
  }

  return new URL(rawUrl, window.location.href).href
}

function getOrCreateRuntimeCanvas(canvasHost) {
  const existingCanvas = canvasHost.querySelector(
    'canvas[data-webgpu-bg="true"]'
  )
  if (existingCanvas) {
    return existingCanvas
  }

  const runtimeCanvas = document.createElement('canvas')
  runtimeCanvas.dataset.webgpuBg = 'true'
  runtimeCanvas.id = 'bg-canvas'
  runtimeCanvas.setAttribute('aria-label', 'Animated background')
  runtimeCanvas.style.display = 'block'
  runtimeCanvas.style.width = '100%'
  runtimeCanvas.style.height = '100%'
  canvasHost.prepend(runtimeCanvas)
  return runtimeCanvas
}

function getOrCreateWebGpuError(canvasHost) {
  const existingError = canvasHost.querySelector('#webgpu-error')
  if (existingError) {
    return existingError
  }

  const errorEl = document.createElement('div')
  errorEl.id = 'webgpu-error'
  errorEl.setAttribute('role', 'status')
  errorEl.textContent = "WebGPU n'est pas disponible sur ce navigateur."
  canvasHost.append(errorEl)
  return errorEl
}

function showWebGpuError(errorEl) {
  if (errorEl) {
    errorEl.style.display = 'flex'
  }
}

export async function initCanvas() {
  const canvasHost = document.getElementById('canvas')
  if (!canvasHost) {
    return
  }

  const canvas = getOrCreateRuntimeCanvas(canvasHost)
  const errorEl = getOrCreateWebGpuError(canvasHost)

  if (!navigator.gpu) {
    showWebGpuError(errorEl)
    return
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    showWebGpuError(errorEl)
    return
  }

  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu')
  if (!context) {
    showWebGpuError(errorEl)
    return
  }
  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'opaque' })

  async function loadTex(src) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    await img.decode()
    const bitmap = await createImageBitmap(img)
    const texture = device.createTexture({
      size: [bitmap.width, bitmap.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })
    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
      bitmap.width,
      bitmap.height,
    ])
    return { texture, width: bitmap.width, height: bitmap.height }
  }

  const fallbackBackgroundUrl = `${window.location.origin}/images/background-1.avif`
  let currentBackgroundUrl =
    getCanvasBackgroundUrl(canvasHost) || fallbackBackgroundUrl

  let img1 = await loadTex(currentBackgroundUrl)
  let img2 = img1
  let isBackgroundUpdatePending = false
  let nextBackgroundCheckAt = 0

  canvasHost.style.backgroundImage = 'none'

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  const GRID_SIZE = 20
  const displacementData = new Float32Array(GRID_SIZE * GRID_SIZE * 2)
  const displacementTexture = device.createTexture({
    size: [GRID_SIZE, GRID_SIZE],
    format: 'rg32float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  })

  const UNIFORM_SIZE = 48
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  const shaderModule = device.createShaderModule({ code: shaderCode })

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'unfilterable-float' },
      },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    ],
  })

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  })

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  })

  function createBindGroup() {
    return device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: img1.texture.createView() },
        { binding: 2, resource: { buffer: uniformBuffer } },
        { binding: 3, resource: displacementTexture.createView() },
        { binding: 4, resource: img2.texture.createView() },
      ],
    })
  }

  let bindGroup = createBindGroup()

  function refreshBackgroundTextureIfNeeded() {
    const nextBackgroundUrl = getCanvasBackgroundUrl(canvasHost)

    if (
      !nextBackgroundUrl ||
      nextBackgroundUrl === currentBackgroundUrl ||
      isBackgroundUpdatePending
    ) {
      return
    }

    isBackgroundUpdatePending = true
    loadTex(nextBackgroundUrl)
      .then((nextTexture) => {
        img1 = nextTexture
        img2 = nextTexture
        bindGroup = createBindGroup()
        currentBackgroundUrl = nextBackgroundUrl
        canvasHost.style.backgroundImage = 'none'
      })
      .catch(() => {})
      .finally(() => {
        isBackgroundUpdatePending = false
      })
  }

  // --- State ---
  let pointerX = 0.5,
    pointerY = 0.5
  let prevPointerX = 0.5,
    prevPointerY = 0.5
  let smoothVelX = 0,
    smoothVelY = 0
  let lastTime = performance.now()

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(canvas.clientWidth * dpr)
    const h = Math.floor(canvas.clientHeight * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }
  syncCanvasSize()

  window.addEventListener('pointermove', (e) => {
    pointerX = e.clientX / canvas.clientWidth
    pointerY = e.clientY / canvas.clientHeight
  })

  // --- Background mix state ---
  let inverted = false
  let section2Visible = false
  let targetMix = 0
  let currentMix = 0
  let currentIO = null
  let mixLerpSpeed = 3.0

  function setupSectionObserver(scope) {
    if (currentIO) currentIO.disconnect()
    section2Visible = false
    const root = scope || document
    const section2 = root.querySelector('#section-2')
    if (!section2) return
    currentIO = new IntersectionObserver(
      ([entry]) => {
        section2Visible = entry.isIntersecting
      },
      { threshold: 0.3 }
    )
    currentIO.observe(section2)
  }

  function isPage2(path) {
    return path.includes('page-2')
  }

  inverted = isPage2(window.location.pathname)
  currentMix = inverted ? 1 : 0
  setupSectionObserver()

  function updateNav(path) {
    const onPage2 = isPage2(path)
    document.querySelectorAll('nav a').forEach((a) => {
      const href = a.getAttribute('href')
      a.classList.toggle(
        'active',
        (onPage2 && href === '/page-2.html') || (!onPage2 && href === '/')
      )
    })
  }

  // --- Grid distortion config ---
  const GRID_DECAY = 3.0
  const GRID_INTENSITY = 1.0
  const GRID_RADIUS = 1.3 * 0.05

  // --- Render loop ---
  const startTime = performance.now()
  const uniformData = new Float32Array(12)

  function frame() {
    syncCanvasSize()

    const now = performance.now()
    if (now >= nextBackgroundCheckAt) {
      refreshBackgroundTextureIfNeeded()
      nextBackgroundCheckAt = now + 500
    }

    const dt = Math.min((now - lastTime) / 1000, 0.016)
    lastTime = now
    const t = (now - startTime) / 1000
    const aspect = canvas.width / canvas.height

    // Compute target mix from page state + section visibility
    const baseMix = inverted ? 1 : 0
    const scrollMix = inverted ? 0 : 1
    targetMix = section2Visible ? scrollMix : baseMix

    currentMix += (targetMix - currentMix) * Math.min(dt * mixLerpSpeed, 1.0)

    // Mouse velocity
    const velX = dt > 0 ? (pointerX - prevPointerX) / dt : 0
    const velY = dt > 0 ? (pointerY - prevPointerY) / dt : 0
    smoothVelX = smoothVelX * 0.85 + velX * 0.15
    smoothVelY = smoothVelY * 0.85 + velY * 0.15

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const idx = (i * GRID_SIZE + j) * 2
        displacementData[idx] *= 1 - GRID_DECAY * dt
        displacementData[idx + 1] *= 1 - GRID_DECAY * dt

        const cellX = (j + 0.5) / GRID_SIZE
        const cellY = (i + 0.5) / GRID_SIZE
        const dx = aspect >= 1 ? (cellX - pointerX) * aspect : cellX - pointerX
        const dy = aspect >= 1 ? cellY - pointerY : (cellY - pointerY) / aspect
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < GRID_RADIUS * 2 && Math.abs(velX) + Math.abs(velY) > 0.01) {
          const influence = Math.exp(
            (-dist * dist) / (GRID_RADIUS * GRID_RADIUS)
          )
          displacementData[idx] +=
            smoothVelX * influence * GRID_INTENSITY * dt * 0.5
          displacementData[idx + 1] +=
            smoothVelY * influence * GRID_INTENSITY * dt * 0.5
        }
        displacementData[idx] = Math.max(-1, Math.min(1, displacementData[idx]))
        displacementData[idx + 1] = Math.max(
          -1,
          Math.min(1, displacementData[idx + 1])
        )
      }
    }

    device.queue.writeTexture(
      { texture: displacementTexture },
      displacementData.buffer,
      { bytesPerRow: GRID_SIZE * 2 * 4 },
      [GRID_SIZE, GRID_SIZE]
    )

    prevPointerX = pointerX
    prevPointerY = pointerY

    uniformData[0] = canvas.width
    uniformData[1] = canvas.height
    uniformData[2] = t
    uniformData[3] = currentMix
    uniformData[4] = img1.width
    uniformData[5] = img1.height
    uniformData[6] = img2.width
    uniformData[7] = img2.height
    uniformData[8] = GRID_SIZE
    uniformData[9] = 0

    device.queue.writeBuffer(uniformBuffer, 0, uniformData)

    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    })

    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup)
    passEncoder.draw(6)
    passEncoder.end()
    device.queue.submit([commandEncoder.finish()])
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  // --- Barba.js page transitions ---
  barba.init({
    transitions: [
      {
        name: 'fade',
        leave(data) {
          destroyBannerStack()
          destroySmoothScroll()

          const nextPath = data.next.url.path || data.next.url.href
          inverted = isPage2(nextPath)
          section2Visible = false
          if (currentIO) currentIO.disconnect()
          mixLerpSpeed = 8.0

          return data.current.container.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 500, easing: 'ease-in-out', fill: 'forwards' }
          ).finished
        },
        beforeEnter(data) {
          data.next.container.style.opacity = 0
        },
        enter(data) {
          const nextPath = data.next.url.path || data.next.url.href
          window.scrollTo(0, 0)
          updateNav(nextPath)

          return data.next.container.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
            easing: 'ease-in-out',
            fill: 'forwards',
          }).finished
        },
        after() {
          mixLerpSpeed = 3.0
          setupSectionObserver()
          initBannerStack()
          initSmoothScroll()
          syncSmoothScroll()
        },
      },
    ],
  })
}
