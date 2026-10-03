import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { PRODUCTS } from './catalog.mjs';
import { DURATION, POSTER_TIME, cameraState, floatState, seededRandom } from './motion.mjs';

const canvas = document.querySelector('#scene');
const stage = document.querySelector('#stage');
const capture = new URLSearchParams(location.search).has('capture');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const cards = [];
const ornaments = [];
const errors = [];
const scene = new THREE.Scene();
scene.background = new THREE.Color('#090c18');
scene.fog = new THREE.FogExp2('#090c18', 0.021);
let renderer;
let camera;
let mobile;
let currentTime = 0;
let playing = !capture && !motionPreference.matches;
let raf;
let previousTimestamp;

window.atelier = { ready: false, errors, duration: DURATION };

function basic(color, options = {}) {
  return new THREE.MeshBasicMaterial({ color, ...options });
}

function studioMaterial(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.28, clearcoat: 0.5, ...options });
}

function mesh(geometry, material, parent = scene) {
  const object = new THREE.Mesh(geometry, material);
  parent.add(object);
  return object;
}

function softLightTexture() {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 128;
  const ctx = surface.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(186,158,244,0.2)');
  gradient.addColorStop(0.4, 'rgba(122,104,205,0.08)');
  gradient.addColorStop(1, 'rgba(80,70,150,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(surface);
}

async function imageTexture(product) {
  const image = new Image();
  image.src = new URL(`./screens/${product.id}.webp`, import.meta.url).href;
  await image.decode();
  const surface = document.createElement('canvas');
  surface.width = 768;
  surface.height = 520;
  const ctx = surface.getContext('2d');
  ctx.fillStyle = '#171924';
  ctx.fillRect(0, 0, 768, 520);
  ctx.fillStyle = product.accent;
  ctx.beginPath(); ctx.arc(24, 25, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e2dfed';
  ctx.font = '500 17px Atelier, system-ui, sans-serif';
  ctx.fillText(product.title.toUpperCase(), 40, 31);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b1acc1';
  ctx.font = '500 15px Atelier, system-ui, sans-serif';
  ctx.fillText(`DAY ${product.day}`, 744, 31);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(8, 50, 752, 462, 10); ctx.clip();
  // Fit the actual screenshot instead of stretching a 3D game into a phone mockup.
  const ratio = Math.max(752 / image.naturalWidth, 462 / image.naturalHeight);
  const w = image.naturalWidth * ratio;
  const h = image.naturalHeight * ratio;
  ctx.drawImage(image, 8 + (752 - w) / 2, 50, w, h);
  ctx.restore();
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

async function createCard(product, index) {
  const group = new THREE.Group();
  group.name = product.id;
  const width = product.width;
  const height = width * 520 / 768;
  const shell = mesh(new RoundedBoxGeometry(width + 0.14, height + 0.14, 0.14, 3, 0.05), studioMaterial('#858398', { metalness: 0.78, roughness: 0.24 }), group);
  const face = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: await imageTexture(product), toneMapped: false }), group);
  face.position.z = 0.079;
  const lowerEdge = mesh(new THREE.BoxGeometry(width * 0.72, 0.011, 0.018), basic(product.accent), group);
  lowerEdge.position.set(0, -height / 2 - 0.035, 0.079);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softLightTexture(), color: product.accent, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.52 }));
  glow.position.z = -0.15;
  glow.scale.set(width * 1.6, height * 1.6, 1);
  group.add(glow);
  group.userData = { product, index, shell };
  scene.add(group);
  cards.push(group);
}

async function createName(word, targetWidth, y) {
  const data = await new SVGLoader().loadAsync(new URL(`./type/${word.toLowerCase()}.svg`, import.meta.url).href);
  const group = new THREE.Group();
  const material = studioMaterial('#ded9eb', { metalness: 0.88, roughness: 0.23, clearcoat: 0.8 });
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      mesh(new THREE.ExtrudeGeometry(shape, { depth: 24, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.4, bevelSegments: 3, curveSegments: 8, steps: 1 }), material, group);
    }
  }
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  for (const child of group.children) child.position.sub(center);
  const scale = targetWidth / size.x;
  group.scale.set(scale, -scale, scale);
  group.position.set(0.25, y, 1.6);
  group.rotation.y = -0.12;
  scene.add(group);
  return group;
}

function createStudio() {
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.05).texture;
  room.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 0.72;
  scene.add(new THREE.HemisphereLight('#e6dcff', '#181827', 1.0));
  const key = new THREE.DirectionalLight('#eee8ff', 2.1);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#9b89ff', 3.8);
  rim.position.set(6, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight('#92c8da', 1.6);
  fill.position.set(-6, -2, 2);
  scene.add(fill);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softLightTexture(), color: '#b49ddd', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  halo.position.set(0, 0, -8);
  halo.scale.set(17, 12, 1);
  scene.add(halo);

  const ringMaterial = studioMaterial('#a597ce', { roughness: 0.25, metalness: 0.8, emissive: '#3e2d66', emissiveIntensity: 0.25 });
  for (let index = 0; index < 3; index++) {
    const ring = mesh(new THREE.TorusGeometry(3.5 + index * 0.09, 0.012, 8, 160), ringMaterial);
    ring.position.set(0.2, 0, -6.0 - index * 0.08);
    ring.rotation.set(0.25 + index * 0.18, -0.4, 0.15);
    ring.userData.baseRotation = ring.rotation.clone();
    ornaments.push(ring);
  }

  const random = seededRandom();
  const dustGeometry = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i < 120; i++) points.push((random() - 0.5) * 24, (random() - 0.5) * 12, -4 - random() * 20);
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#b4abc9', size: 0.024, transparent: true, opacity: 0.6 })));

  const cubes = new THREE.InstancedMesh(new RoundedBoxGeometry(0.12, 0.12, 0.12, 1, 0.014), studioMaterial('#78718c'), 36);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 36; i++) {
    dummy.position.set((random() - 0.5) * 18, (random() - 0.5) * 9, -5 - random() * 11);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.updateMatrix();
    cubes.setMatrixAt(i, dummy.matrix);
  }
  scene.add(cubes);
}

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  mobile = width / height < 1.4;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = mobile ? 34 : 36;
  camera.updateProjectionMatrix();
  renderAt(currentTime);
}

function renderAt(time) {
  currentTime = time;
  const state = cameraState(time, mobile);
  camera.position.fromArray(state.position);
  camera.lookAt(...state.target);
  cards.forEach((card) => {
    const { product, index } = card.userData;
    const floating = floatState(time, index);
    card.position.fromArray(product.position);
    if (mobile) {
      card.position.x *= 0.69;
      card.position.y *= index < 4 ? 1.23 : 1.14;
      card.scale.setScalar(index < 4 ? 0.86 : 0.91);
    } else {
      card.scale.setScalar(1);
    }
    card.position.y += floating.y;
    card.rotation.set(product.rotation[0], product.rotation[1] + floating.yaw, product.rotation[2] + floating.roll);
  });
  ornaments.forEach((ring, index) => {
    ring.rotation.copy(ring.userData.baseRotation);
    ring.rotation.z += Math.sin(time / DURATION * Math.PI * 2 + index * 0.8) * 0.12;
  });
  renderer.render(scene, camera);
  const timeline = document.querySelector('#timeline');
  timeline.value = String(((time % DURATION) + DURATION) % DURATION);
  document.querySelector('#time').textContent = `${Number(timeline.value).toFixed(1)}秒`;
}

function tick(timestamp) {
  if (playing && previousTimestamp !== undefined) currentTime += Math.min((timestamp - previousTimestamp) / 1000, 0.1);
  previousTimestamp = timestamp;
  if (playing) renderAt(currentTime);
  raf = requestAnimationFrame(tick);
}

function setPlaying(value) {
  playing = value;
  previousTimestamp = undefined;
  const toggle = document.querySelector('#toggle');
  toggle.setAttribute('aria-pressed', String(!playing));
  toggle.textContent = playing ? '一時停止' : '再生';
}

async function init() {
  if (capture) document.body.classList.add('capture');
  await document.fonts.ready;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(capture ? 1 : Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  camera = new THREE.PerspectiveCamera(36, 2, 0.1, 120);
  createStudio();
  await Promise.all(PRODUCTS.map(createCard));
  await createName('IKKI', 1.85, 0.7);
  await createName('NISHIHARA', 5.6, -0.3);
  window.atelier.renderAt = renderAt;
  window.atelier.describe = () => ({
    products: cards.map(({ userData: { product } }) => product.id),
    camera: camera.position.toArray(),
    webgl: renderer.isWebGLRenderer,
    mobile,
    geometries: renderer.info.memory.geometries,
    triangles: renderer.info.render.triangles,
    playing,
  });
  new ResizeObserver(resize).observe(stage);
  resize();
  renderAt(motionPreference.matches ? POSTER_TIME : 0);
  document.querySelector('#toggle').addEventListener('click', () => setPlaying(!playing));
  document.querySelector('#timeline').addEventListener('input', (event) => {
    setPlaying(false);
    renderAt(Number(event.target.value));
  });
  motionPreference.addEventListener('change', () => {
    setPlaying(!capture && !motionPreference.matches);
    if (motionPreference.matches) renderAt(POSTER_TIME);
  });
  setPlaying(playing);
  window.atelier.ready = true;
  if (!capture) raf = requestAnimationFrame(tick);
  addEventListener('pagehide', () => cancelAnimationFrame(raf));
}

init().catch((error) => {
  errors.push(String(error));
  document.querySelector('#failure').hidden = false;
  console.error(error);
});
