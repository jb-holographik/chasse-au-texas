struct Uniforms {
  resolution : vec2f,
  time : f32,
  mixFactor : f32,
  imageSize1 : vec2f,
  imageSize2 : vec2f,
  gridSize : f32,
  _pad : f32,
};

@group(0) @binding(0) var texSampler : sampler;
@group(0) @binding(1) var texImage1 : texture_2d<f32>;
@group(0) @binding(2) var<uniform> u : Uniforms;
@group(0) @binding(3) var dispTex : texture_2d<f32>;
@group(0) @binding(4) var texImage2 : texture_2d<f32>;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vi : u32) -> VSOut {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f( 1.0,  1.0),
  );
  let p = positions[vi];
  var out : VSOut;
  out.pos = vec4f(p, 0.0, 1.0);
  out.uv = p * 0.5 + 0.5;
  return out;
}

fn coverUV(uv : vec2f, canvasRes : vec2f, imgSize : vec2f) -> vec2f {
  let canvasAspect = canvasRes.x / canvasRes.y;
  let imgAspect = imgSize.x / imgSize.y;
  var scale : vec2f;
  if (canvasAspect > imgAspect) {
    scale = vec2f(1.0, imgAspect / canvasAspect);
  } else {
    scale = vec2f(canvasAspect / imgAspect, 1.0);
  }
  return (uv - 0.5) * scale + 0.5;
}

fn gridDistort(uv : vec2f, aspect : f32, gs : f32) -> vec2f {
  var cellsX : f32;
  var cellsY : f32;
  if (aspect > 1.0) {
    cellsX = gs;
    cellsY = max(gs / aspect, 1.0);
  } else {
    cellsX = max(gs * aspect, 1.0);
    cellsY = gs;
  }

  let cellIdxX = floor(uv.x * cellsX);
  let cellIdxY = floor(uv.y * cellsY);
  let gridCellUV = vec2f(
    (cellIdxX + 0.5) / cellsX,
    (cellIdxY + 0.5) / cellsY,
  );

  let dims = textureDimensions(dispTex);
  let texCoord = vec2i(
    clamp(i32(gridCellUV.x * f32(dims.x)), 0, i32(dims.x) - 1),
    clamp(i32(gridCellUV.y * f32(dims.y)), 0, i32(dims.y) - 1),
  );
  let displacement = textureLoad(dispTex, texCoord, 0).xy;
  let clamped = clamp(displacement, vec2f(-0.1), vec2f(0.1));
  return uv - clamped;
}

// Zoom blur sampling both images and crossfading
fn zoomBlur(baseUV : vec2f, canvasRes : vec2f, aspect : f32, mf : f32) -> vec4f {
  let center = vec2f(0.5, 0.5);
  let intensity = 5.0;
  let radius = intensity * 0.01;

  let delta = baseUV - center;
  let aspectDelta = vec2f(delta.x * aspect, delta.y);

  var weights = array<f32, 32>();
  var wSum = 0.0;
  for (var i = 0; i < 32; i++) {
    let t = (f32(i) / 31.0 - 0.5) * 2.0;
    let w = exp(-0.5 * t * t / 0.64);
    weights[i] = w;
    wSum += w;
  }

  var total = vec4f(0.0);
  for (var i = 0; i < 32; i++) {
    let nw = weights[i] / wSum;
    let scale = 1.0 + radius * (f32(i) / 31.0);
    let scaledDelta = aspectDelta / scale;
    let scaledCoord = vec2f(scaledDelta.x / aspect, scaledDelta.y) + center;

    let covUV1 = coverUV(scaledCoord, canvasRes, u.imageSize1);
    let covUV2 = coverUV(scaledCoord, canvasRes, u.imageSize2);
    let s1 = textureSample(texImage1, texSampler, covUV1);
    let s2 = textureSample(texImage2, texSampler, covUV2);
    total += mix(s1, s2, mf) * nw;
  }

  return total;
}

fn swirlOverlay(uv : vec2f, t : f32) -> f32 {
  let detail = 1.6;

  let freq1 = detail;
  let d1x = uv.x + sin(uv.y * freq1 * 1.7 + t * 0.8) * 0.12
                   + cos(uv.x * freq1 * 0.9 - t * 0.5) * 0.05;
  let d1y = uv.y + cos(uv.x * freq1 * 1.3 - t * 0.6) * 0.12
                   + sin(uv.y * freq1 * 1.1 + t * 0.7) * 0.05;
  let pattern1 = sin(d1x * freq1 * 2.1 + d1y * freq1 * 1.8 + t * 0.4);

  let freq2 = detail * 2.1;
  let d2x = d1x + cos(d1y * freq2 * 2.7 - t * 0.45) * 0.07
                 + sin(d1x * freq2 * 1.9 + t * 0.6) * 0.04;
  let d2y = d1y + sin(d1x * freq2 * 2.3 + t * 0.65) * 0.07
                 + cos(d1y * freq2 * 1.6 - t * 0.4) * 0.04;
  let pattern2 = cos(d2x * freq2 * 1.4 - d2y * freq2 * 1.9 + t * 0.35);

  let freq3 = detail * 3.7;
  let d3x = d2x + sin(d2y * freq3 * 1.8 + t * 0.85) * 0.04
                 + cos(d2x * freq3 * 1.3 - t * 0.55) * 0.025
                 + sin((d2x + d2y) * freq3 * 0.7 + t * 0.9) * 0.02;
  let d3y = d2y + cos(d2x * freq3 * 1.6 - t * 0.75) * 0.04
                 + sin(d2y * freq3 * 1.1 + t * 0.5) * 0.025
                 + cos((d2x + d2y) * freq3 * 0.8 - t * 0.95) * 0.02;
  let pattern3 = sin(d3x * freq3 * 1.1 + d3y * freq3 * 1.5 - t * 0.55);

  let combined = pattern1 * 0.45 + pattern2 * 0.35 + pattern3 * 0.2;
  let blendBias = (68.0 - 50.0) * 0.006;
  return smoothstep(0.3, 0.7, combined * 0.5 + 0.5 + blendBias);
}

fn vignette(uv : vec2f) -> f32 {
  let dist = distance(uv, vec2f(0.5));
  return 1.0 - smoothstep(0.2, 0.85, dist);
}

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4f {
  let uv = vec2f(input.uv.x, 1.0 - input.uv.y);
  let aspect = u.resolution.x / u.resolution.y;

  let dUV = gridDistort(uv, aspect, u.gridSize);
  let imgColor = zoomBlur(dUV, u.resolution, aspect, u.mixFactor);

  let swirl = swirlOverlay(dUV, u.time * 1.1);
  let colorA = vec3f(0.0);
  let colorB = vec3f(0.078);
  let swirlColor = mix(colorA, colorB, swirl);
  let shimmer = sin(u.time * 1.1 * 2.5 + (swirl * 2.0 - 1.0) * 8.0) * 0.015 + 1.0;
  let swirlFinal = swirlColor * shimmer;

  var rgb = mix(imgColor.rgb, swirlFinal, 0.57);
  rgb *= vignette(uv);

  return vec4f(rgb, 1.0);
}
