// Real Artist-Crafted 3D GLB Models + Skeletal Animation Loader (Kenney & Quaternius CC0 Packs)

const GLTF_CACHE = new Map();
let loaderInstance = null;
let skeletonUtilsMod = null;

export async function initModelLoader() {
  if (loaderInstance && skeletonUtilsMod) return { loader: loaderInstance, SkeletonUtils: skeletonUtilsMod };
  const [{ GLTFLoader }, SkeletonUtils] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/utils/SkeletonUtils.js'),
  ]);
  loaderInstance = new GLTFLoader();
  skeletonUtilsMod = SkeletonUtils;
  return { loader: loaderInstance, SkeletonUtils: skeletonUtilsMod };
}

function loadGLTF(url) {
  if (GLTF_CACHE.has(url)) return GLTF_CACHE.get(url);
  const p = initModelLoader().then(({ loader }) => new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  }));
  GLTF_CACHE.set(url, p);
  return p;
}

/**
 * Clones a loaded GLTF scene (preserving SkinnedMesh bone bindings via SkeletonUtils),
 * enables shadows, and auto-normalizes its height to `targetHeight` standing on `y = 0`.
 */
function instantiateGLTF(THREE, gltf, targetHeight = 2.0, yOffset = 0) {
  const cloned = skeletonUtilsMod ? skeletonUtilsMod.clone(gltf.scene) : gltf.scene.clone(true);
  cloned.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.roughness = Math.max(0.45, m.roughness ?? 0.65);
        });
      }
    }
  });

  // Wrap inside a holder group so root armature tracks never overwrite normalization scale/offset
  const holder = new THREE.Group();
  holder.add(cloned);

  // If animations exist, sample frame 0 of idle so bounding box reflects actual posed height
  let mixer = null;
  const actions = {};
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(cloned);
    gltf.animations.forEach((clip) => {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });
    const idleKey = findClipKey(actions, ['idle', 'frog_idle', 'static']);
    if (idleKey) {
      actions[idleKey].play();
      mixer.update(0.001);
    }
  }

  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0.0001 && targetHeight > 0) {
    const s = targetHeight / size.y;
    holder.scale.setScalar(s);
    holder.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(holder);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    holder.position.x -= center.x;
    holder.position.z -= center.z;
    holder.position.y += (yOffset - box2.min.y);
  }

  return { holder, cloned, mixer, actions };
}

function findClipKey(actions, patterns) {
  const keys = Object.keys(actions);
  for (const pat of patterns) {
    const exact = keys.find(k => k === pat || k.endsWith('|' + pat));
    if (exact) return exact;
    const sub = keys.find(k => k.includes(pat));
    if (sub) return sub;
  }
  return keys[0] || null;
}

/**
 * Creates a smooth skeletal animation state controller for a character/animal.
 * States: 'idle' | 'walk' | 'run' | 'talk' | 'dance'
 */
function createAnimController(mixersList) {
  let currentState = null;
  const activeActions = new Map();

  const patternsForState = (state) => {
    switch (state) {
      case 'run':   return ['run', 'sprint', 'gallop', 'frog_jump', 'walk'];
      case 'walk':  return ['walk', 'frog_jump', 'gallop'];
      case 'dance': return ['dance', 'emote-yes', 'gesture-positive', 'jump', 'gallop_jump', 'frog_jump'];
      case 'talk':  return ['gesture-positive', 'emote-yes', 'eat', 'eating', 'dance', 'frog_jump', 'idle_2'];
      case 'idle':
      default:      return ['idle', 'frog_idle', 'static'];
    }
  };

  const setAnim = (state) => {
    if (state === currentState) return;
    currentState = state;
    const pats = patternsForState(state);
    mixersList.forEach(({ mixer, actions }, idx) => {
      if (!mixer) return;
      const key = findClipKey(actions, pats);
      if (!key) return;
      const nextAct = actions[key];
      const prevAct = activeActions.get(idx);
      if (prevAct === nextAct) return;
      nextAct.reset();
      nextAct.timeScale = state === 'run' ? 1.35 : 1.0;
      nextAct.play();
      if (prevAct) prevAct.crossFadeTo(nextAct, 0.18, false);
      activeActions.set(idx, nextAct);
    });
  };

  const updateMixer = (dt) => {
    mixersList.forEach(({ mixer }) => {
      if (mixer) mixer.update(dt);
    });
  };

  setAnim('idle');
  return { setAnim, updateMixer };
}

function makeCanvasTex(THREE, size, drawFn, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
  }
  return tex;
}

function createACGrassTexture(THREE) {
  return makeCanvasTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = '#75D450';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#84DF5E';
    for (let y = 0; y < s; y += 32) {
      for (let x = 0; x < s; x += 32) {
        const ox = ((y / 32) % 2) * 16;
        ctx.beginPath();
        ctx.moveTo(x + ox + 8, y + 6);
        ctx.lineTo(x + ox + 15, y + 18);
        ctx.lineTo(x + ox + 1, y + 18);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, 14);
}

function createACPathTexture(THREE) {
  return makeCanvasTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = '#EED09D';
    ctx.fillRect(0, 0, s, s);
    const stones = ['#E2BC80', '#F6E1B8', '#D7AE70'];
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = stones[i % stones.length];
      const rx = (i * 67 + 13) % s;
      const ry = (i * 43 + 29) % s;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 10 + (i % 7), 7 + (i % 5), (i % 5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 10);
}

/**
 * Helper to create a gleaming 3D Golden Crown mesh (reused for Wooju & 3-Star Mastered Animals)
 */
function createGoldCrownMesh(THREE, scale = 1.0) {
  const crown = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#FACC15',
    emissive: '#B45309',
    emissiveIntensity: 0.25,
    roughness: 0.25,
    metalness: 0.72,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: '#F43F5E',
    emissive: '#E11D48',
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.27, 0.18, 12), goldMat);
  crown.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), goldMat);
    spike.position.set(Math.cos(a) * 0.25, 0.18, Math.sin(a) * 0.25);
    crown.add(spike);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), gemMat);
  gem.position.set(0, 0.02, 0.31);
  crown.add(gem);
  crown.scale.setScalar(scale);
  return crown;
}

/**
 * Loads Wooju's 3D Animated Character Model (Kenney Mini-Character + Skeletal Animations)
 * Plus 5 unlockable 3D gear cosmetics!
 */
export function buildWooju3D(THREE) {
  const group = new THREE.Group();
  const mixers = [];
  const ctrl = createAnimController(mixers);

  loadGLTF('assets/models/mini-characters/character-male-b.glb').then((gltf) => {
    const inst = instantiateGLTF(THREE, gltf, 2.25, 0);
    group.add(inst.holder);
    mixers.push(inst);
    ctrl.setAnim('idle');
  }).catch(() => {});

  // --- Unlockable 3D Avatar Cosmetics (15 Items across head / back / aura!) ---
  const gearMeshes = {};
  const wingPairs = [];

  // [HEAD 1] Star Hat (별빛 꼬깔 모자)
  const starHat = new THREE.Group();
  const hatCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.85, 16),
    new THREE.MeshStandardMaterial({ color: '#4F46E5', roughness: 0.45 })
  );
  hatCone.position.y = 0.42;
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 0.07, 18),
    new THREE.MeshStandardMaterial({ color: '#6366F1', roughness: 0.5 })
  );
  const hatStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#F59E0B', emissiveIntensity: 0.55 })
  );
  hatStar.position.y = 0.88;
  starHat.add(hatCone, hatBrim, hatStar);
  starHat.position.set(0, 2.15, 0);
  starHat.visible = false;
  group.add(starHat);
  gearMeshes.star_hat = starHat;

  // [HEAD 2] Cowboy Hat (농부 카우보이 모자)
  const cowboyHat = new THREE.Group();
  const cbBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.07, 18),
    new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.7 })
  );
  const cbTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.44, 0.42, 14),
    new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.65 })
  );
  cbTop.position.y = 0.22;
  const cbBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.09, 14),
    new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.4 })
  );
  cbBand.position.y = 0.08;
  cowboyHat.add(cbBrim, cbTop, cbBand);
  cowboyHat.position.set(0, 2.16, 0);
  cowboyHat.visible = false;
  group.add(cowboyHat);
  gearMeshes.cowboy_hat = cowboyHat;

  // [HEAD 3] Unicorn Horn (유니콘 반짝이 뿔)
  const unicornHorn = new THREE.Group();
  const uHorn = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.72, 10),
    new THREE.MeshStandardMaterial({ color: '#F472B6', emissive: '#EC4899', emissiveIntensity: 0.45, roughness: 0.2 })
  );
  uHorn.position.set(0, 0.32, 0.22);
  uHorn.rotation.x = 0.32;
  const uBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.05, 8, 20),
    new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.3 })
  );
  uBand.rotation.x = Math.PI / 2;
  unicornHorn.add(uHorn, uBand);
  unicornHorn.position.set(0, 2.18, 0);
  unicornHorn.visible = false;
  group.add(unicornHorn);
  gearMeshes.unicorn_horn = unicornHorn;

  // [HEAD 4] Gold Crown (황금 왕관)
  const goldCrown = createGoldCrownMesh(THREE, 1.08);
  goldCrown.position.set(0, 2.28, 0);
  goldCrown.visible = false;
  group.add(goldCrown);
  gearMeshes.gold_crown = goldCrown;

  // [HEAD 5] Astronaut Helmet (우주 비행사 헬멧)
  const astroHelmet = new THREE.Group();
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 18, 14),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', transparent: true, opacity: 0.36, roughness: 0.1, metalness: 0.3 })
  );
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.08, 10, 20),
    new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.35 })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.32;
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8),
    new THREE.MeshStandardMaterial({ color: '#FACC15' })
  );
  antenna.position.set(0.48, 0.45, 0);
  const antTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#EF4444', emissive: '#EF4444', emissiveIntensity: 0.6 })
  );
  antTip.position.set(0.48, 0.65, 0);
  astroHelmet.add(visor, collar, antenna, antTip);
  astroHelmet.position.set(0, 1.88, 0);
  astroHelmet.visible = false;
  group.add(astroHelmet);
  gearMeshes.astro_helmet = astroHelmet;

  // [BACK 1] Hero Cape (히어로 망토)
  const heroCape = new THREE.Group();
  const capeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.15, 0.08),
    new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.55 })
  );
  capeMesh.position.set(0, -0.52, -0.05);
  heroCape.add(capeMesh);
  heroCape.position.set(0, 1.55, -0.34);
  heroCape.rotation.x = 0.25;
  heroCape.visible = false;
  group.add(heroCape);
  gearMeshes.hero_cape = heroCape;

  // Helper to build flapping wings (Fairy / Angel / Dragon)
  const makeWings = (color, emissive, w, h) => {
    const wg = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const left = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), mat);
    left.position.set(-w * 0.52, 0.1, 0);
    const right = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), mat);
    right.position.set(w * 0.52, 0.1, 0);
    const lPivot = new THREE.Group(); lPivot.add(left);
    const rPivot = new THREE.Group(); rPivot.add(right);
    wg.add(lPivot, rPivot);
    wg.position.set(0, 1.38, -0.38);
    wg.visible = false;
    group.add(wg);
    wingPairs.push({ root: wg, lPivot, rPivot });
    return wg;
  };

  // [BACK 2] Fairy Wings (요정 나비 날개)
  gearMeshes.fairy_wings = makeWings('#F472B6', '#EC4899', 0.85, 0.72);
  // [BACK 3] Angel Wings (천사 날개)
  gearMeshes.angel_wings = makeWings('#F8FAFC', '#BAE6FD', 1.05, 0.85);
  // [BACK 5] Dragon Wings (황금 드래곤 날개)
  gearMeshes.dragon_wings = makeWings('#F59E0B', '#D97706', 1.25, 0.92);

  // [BACK 4] Rocket Jetpack (로켓 제트팩 + 불꽃!)
  const jetpack = new THREE.Group();
  const tankMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.6, roughness: 0.28 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.35 });
  const flameMat = new THREE.MeshBasicMaterial({ color: '#FACC15', transparent: true, opacity: 0.9 });
  const flames = [];
  [-0.22, 0.22].forEach((tx) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.72, 12), tankMat);
    tank.position.set(tx, 0, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 12), capMat);
    cap.position.set(tx, 0.46, 0);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 8), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(tx, -0.58, 0);
    jetpack.add(tank, cap, flame);
    flames.push(flame);
  });
  jetpack.position.set(0, 1.25, -0.44);
  jetpack.visible = false;
  group.add(jetpack);
  gearMeshes.jetpack = jetpack;

  // [AURA 1] Magic Wand (별빛 마법봉)
  const magicWand = new THREE.Group();
  const wandStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.03, 0.75, 8),
    new THREE.MeshStandardMaterial({ color: '#A855F7', roughness: 0.3 })
  );
  const wandStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.19),
    new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#F59E0B', emissiveIntensity: 0.7 })
  );
  wandStar.position.y = 0.42;
  magicWand.add(wandStick, wandStar);
  magicWand.position.set(-0.62, 1.2, 0.26);
  magicWand.rotation.z = 0.32;
  magicWand.visible = false;
  group.add(magicWand);
  gearMeshes.magic_wand = magicWand;

  // [AURA 2] Golden Star Aura (황금 별 오라)
  const starAura = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const st = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14),
      new THREE.MeshStandardMaterial({ color: '#FDE047', emissive: '#F59E0B', emissiveIntensity: 0.65 })
    );
    st.position.set(Math.cos(a) * 0.92, 1.2, Math.sin(a) * 0.92);
    starAura.add(st);
  }
  starAura.visible = false;
  group.add(starAura);
  gearMeshes.star_aura = starAura;

  // [AURA 3] Fire Superstar Aura (불꽃 슈퍼스타)
  const fireAura = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1.05, 24),
    new THREE.MeshBasicMaterial({ color: '#F97316', side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
  );
  fireAura.rotation.x = -Math.PI / 2;
  fireAura.position.y = 0.08;
  fireAura.visible = false;
  group.add(fireAura);
  gearMeshes.fire_aura = fireAura;

  // [AURA 4] Rainbow Ring (무지개 발자국)
  const rainbowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.2, 28),
    new THREE.MeshBasicMaterial({ color: '#38BDF8', side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
  );
  rainbowRing.rotation.x = -Math.PI / 2;
  rainbowRing.position.y = 0.09;
  rainbowRing.visible = false;
  group.add(rainbowRing);
  gearMeshes.rainbow_ring = rainbowRing;

  // [AURA 5] Rainbow Mic + Sparkle Halo (무지개 마이크)
  const rainbowMic = new THREE.Group();
  const micHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.045, 0.45, 10),
    new THREE.MeshStandardMaterial({ color: '#FACC15', metalness: 0.7, roughness: 0.25 })
  );
  const micHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#EC4899', emissive: '#EC4899', emissiveIntensity: 0.45 })
  );
  micHead.position.y = 0.26;
  const haloRing = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.95, 24),
    new THREE.MeshBasicMaterial({ color: '#38BDF8', side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  haloRing.rotation.x = -Math.PI / 2;
  haloRing.position.set(-0.62, -1.08, -0.22);
  rainbowMic.add(micHandle, micHead, haloRing);
  rainbowMic.position.set(0.62, 1.15, 0.22);
  rainbowMic.rotation.z = -0.35;
  rainbowMic.visible = false;
  group.add(rainbowMic);
  gearMeshes.rainbow_mic = rainbowMic;

  const setGear = (equippedMap = {}) => {
    Object.entries(gearMeshes).forEach(([id, mesh]) => {
      mesh.visible = Boolean(equippedMap[id]);
    });
    if (gearMeshes.gold_crown.visible) {
      gearMeshes.gold_crown.position.y = (gearMeshes.star_hat.visible || gearMeshes.cowboy_hat.visible) ? 3.05 : 2.28;
    }
  };

  const updateCosmetics = (t, moving) => {
    if (starHat.visible) hatStar.rotation.y = t * 2.4;
    if (heroCape.visible) {
      heroCape.rotation.x = (moving ? 0.52 : 0.22) + Math.sin(t * (moving ? 10 : 3)) * 0.1;
    }
    if (goldCrown.visible) goldCrown.rotation.y = t * 1.1;
    wingPairs.forEach(({ root, lPivot, rPivot }) => {
      if (!root.visible) return;
      const flap = Math.sin(t * (moving ? 12 : 5)) * 0.42;
      lPivot.rotation.y = 0.35 + flap;
      rPivot.rotation.y = -0.35 - flap;
    });
    if (jetpack.visible) {
      flames.forEach((f, i) => {
        const s = moving ? (0.95 + Math.sin(t * 24 + i * 2) * 0.35) : (0.35 + Math.sin(t * 8 + i) * 0.12);
        f.scale.set(1, s, 1);
      });
    }
    if (magicWand.visible) wandStar.rotation.y = t * 3.0;
    if (starAura.visible) {
      starAura.rotation.y = t * 1.8;
      starAura.position.y = Math.sin(t * 3) * 0.12;
    }
    if (fireAura.visible) {
      const s = 1 + Math.sin(t * 9) * 0.12;
      fireAura.scale.set(s, s, 1);
    }
    if (rainbowRing.visible) {
      rainbowRing.material.color.setHSL((t * 0.4) % 1, 0.92, 0.58);
    }
    if (rainbowMic.visible) {
      const hue = (t * 0.35) % 1;
      haloRing.material.color.setHSL(hue, 0.9, 0.6);
      micHead.material.emissive.setHSL(hue, 0.9, 0.5);
    }
  };

  return {
    group,
    setAnim: ctrl.setAnim,
    updateMixer: ctrl.updateMixer,
    setGear,
    updateCosmetics,
  };
}

const SPOT_SPEC = {
  farmer: {
    chars: [{ url: 'assets/models/mini-characters/character-male-a.glb', h: 2.35, x: 0, z: 0 }],
    item:  { url: 'assets/models/food/apple.glb', h: 0.7, x: 0.85, y: 0.5, z: 0.4 },
  },
  frog: {
    chars: [{ url: 'assets/models/quaternius/Frog.glb', h: 1.45, x: 0, z: 0, y: 0.12 }],
    prop:  { url: 'assets/models/nature/lily_large.glb', h: 0.16, x: 0, z: 0 },
  },
  owl: {
    chars: [{ url: 'assets/models/cube-pets/animal-parrot.glb', h: 1.65, x: 0, z: 0, y: 0.72 }],
    prop:  { url: 'assets/models/nature/stump_roundDetailed.glb', h: 0.75, x: 0, z: 0 },
  },
  chicken: {
    chars: [{ url: 'assets/models/cube-pets/animal-chick.glb', h: 1.75, x: 0, z: 0 }],
    item:  { url: 'assets/models/food/egg.glb', h: 0.65, x: 0.9, y: 0.35, z: 0.35 },
  },
  rabbit: {
    chars: [{ url: 'assets/models/cube-pets/animal-bunny.glb', h: 1.9, x: 0, z: 0 }],
    item:  { url: 'assets/models/food/carrot.glb', h: 0.85, x: 0.9, y: 0.4, z: 0.35 },
  },
  cow: {
    chars: [{ url: 'assets/models/cube-pets/animal-cow.glb', h: 2.0, x: 0, z: 0 }],
    item:  { url: 'assets/models/food/soda-bottle.glb', h: 0.85, x: 1.0, y: 0.35, z: 0.4 },
  },
  horse_pony: {
    chars: [
      { url: 'assets/models/quaternius/Horse.glb', h: 2.55, x: -0.55, z: 0 },
      { url: 'assets/models/quaternius/Horse.glb', h: 1.85, x: 0.6, z: 0.15 },
    ],
    item: { url: 'assets/models/food/corn.glb', h: 0.8, x: 0.05, y: 0.45, z: 0.95 },
  },
  cat_mouse: {
    chars: [
      { url: 'assets/models/cube-pets/animal-cat.glb', h: 1.8, x: -0.45, z: 0 },
      { url: 'assets/models/cube-pets/animal-koala.glb', h: 1.2, x: 0.55, z: 0.2 },
    ],
    item: { url: 'assets/models/food/fish.glb', h: 0.75, x: 0.05, y: 0.55, z: 0.85 },
  },
  duck: {
    chars: [{ url: 'assets/models/cube-pets/animal-penguin.glb', h: 1.75, x: 0, z: 0 }],
    item:  { url: 'assets/models/food/pot-stew.glb', h: 0.85, x: 0.95, y: 0.3, z: 0.35 },
  },
  dog_goat: {
    chars: [
      { url: 'assets/models/cube-pets/animal-dog.glb', h: 1.8, x: -0.48, z: 0 },
      { url: 'assets/models/cube-pets/animal-deer.glb', h: 1.9, x: 0.5, z: 0.1 },
    ],
  },
  donkey_sheep: {
    chars: [
      { url: 'assets/models/quaternius/Donkey.glb', h: 2.25, x: -0.55, z: 0 },
      { url: 'assets/models/quaternius/Alpaca.glb', h: 2.1, x: 0.55, z: 0.1 },
    ],
  },
  pig_finale: {
    chars: [{ url: 'assets/models/cube-pets/animal-pig.glb', h: 2.15, x: 0, z: 0 }],
  },
};

/**
 * Loads artist-crafted 3D character(s) + 3D story item prop for each of the 12 spots.
 */
export function buildSpotCharacter3D(THREE, spotId) {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);
  const itemMesh = new THREE.Group();
  group.add(itemMesh);

  const mixers = [];
  const ctrl = createAnimController(mixers);
  const spec = SPOT_SPEC[spotId] || SPOT_SPEC.pig_finale;

  if (spec.prop) {
    loadGLTF(spec.prop.url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, spec.prop.h, 0);
      inst.holder.position.x += spec.prop.x || 0;
      inst.holder.position.z += spec.prop.z || 0;
      group.add(inst.holder);
    }).catch(() => {});
  }

  spec.chars.forEach((ch) => {
    loadGLTF(ch.url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, ch.h, ch.y || 0);
      inst.holder.position.x += ch.x || 0;
      inst.holder.position.z += ch.z || 0;
      bodyRoot.add(inst.holder);
      mixers.push(inst);
      ctrl.setAnim('idle');
    }).catch(() => {});
  });

  if (spec.item) {
    loadGLTF(spec.item.url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, spec.item.h, 0);
      itemMesh.position.set(spec.item.x || 0.8, spec.item.y || 0.4, spec.item.z || 0.3);
      itemMesh.add(inst.holder);
    }).catch(() => {});
  }

  // 2-Star Golden Sparkle Aura & 3-Star Golden Crown!
  const auraMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.25, 24),
    new THREE.MeshBasicMaterial({ color: '#FDE047', side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
  );
  auraMesh.rotation.x = -Math.PI / 2;
  auraMesh.position.y = 0.06;
  auraMesh.visible = false;
  group.add(auraMesh);

  const crownMesh = createGoldCrownMesh(THREE, 0.92);
  crownMesh.position.set(0, 2.45, 0);
  crownMesh.visible = false;
  group.add(crownMesh);

  const setMasteryVisual = (tier = 0) => {
    auraMesh.visible = tier >= 2;
    crownMesh.visible = tier >= 3;
  };

  const updateMasteryVisual = (t) => {
    if (crownMesh.visible) {
      crownMesh.rotation.y = t * 1.6;
      crownMesh.position.y = 2.42 + Math.sin(t * 3.5) * 0.08;
    }
    if (auraMesh.visible) {
      const s = 1 + Math.sin(t * 3) * 0.08;
      auraMesh.scale.set(s, s, 1);
    }
  };

  return {
    group,
    bodyRoot,
    itemMesh,
    crownMesh,
    auraMesh,
    setAnim: ctrl.setAnim,
    updateMixer: ctrl.updateMixer,
    setMasteryVisual,
    updateMasteryVisual,
  };
}

/**
 * Builds the 3D Farm Village using real artist-sculpted GLB buildings, windmills, cottages, stalls, trees, fences & flowers.
 */
export function buildFarmWorld3D(THREE, scene) {
  const grassTex = createACGrassTexture(THREE);
  const pathTex = createACPathTexture(THREE);

  // Sunlit grass island
  const groundMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(23.5, 25.0, 2.0, 56),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
  );
  groundMesh.position.y = -1.0;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Cobblestone / sandy circular village path
  const pathRing = new THREE.Mesh(
    new THREE.RingGeometry(10.2, 14.2, 56),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9, side: THREE.DoubleSide })
  );
  pathRing.rotation.x = -Math.PI / 2;
  pathRing.position.y = 0.02;
  pathRing.receiveShadow = true;
  scene.add(pathRing);

  const centerPath = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 12.8),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9 })
  );
  centerPath.rotation.x = -Math.PI / 2;
  centerPath.position.set(0, 0.025, 6.2);
  centerPath.receiveShadow = true;
  scene.add(centerPath);

  // Central Dance Stage Platform
  const stageDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.9, 0.38, 36),
    new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.75 })
  );
  stageDeck.position.set(0, 0.19, 0);
  stageDeck.castShadow = true;
  stageDeck.receiveShadow = true;
  scene.add(stageDeck);

  const stageTop = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.3, 0.06, 36),
    new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.8 })
  );
  stageTop.position.set(0, 0.40, 0);
  stageTop.receiveShadow = true;
  scene.add(stageTop);

  // Blue Pond at Zone 3 (Cat & Mouse fishing spot)
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.1, 32),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.18, metalness: 0.1 })
  );
  pond.position.set(11.8, 0.04, -11.0);
  scene.add(pond);

  // Helper to place static artist GLB buildings & props
  const placeProp = (url, h, x, z, rotY = 0, y = 0) => {
    loadGLTF(url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, h, y);
      inst.holder.position.x += x;
      inst.holder.position.z += z;
      inst.holder.rotation.y = rotY;
      scene.add(inst.holder);
    }).catch(() => {});
  };

  // 1. Base Cozy Farm Props (Landmark buildings are now built by Wooju via buildVillageBuildings3D!)
  placeProp('assets/models/quaternius/Hay.glb', 1.4, -7.2, -16.2, 0.4);
  placeProp('assets/models/quaternius/Hay.glb', 1.2, -6.1, -15.4, -0.3);
  placeProp('assets/models/nature/sign.glb', 1.8, 2.4, 13.8, -0.3);
  placeProp('assets/models/nature/bridge_woodRound.glb', 1.3, 11.8, -11.0, 0.6);
  placeProp('assets/models/nature/lily_large.glb', 0.15, 10.6, -10.2, 0);
  placeProp('assets/models/nature/lily_large.glb', 0.15, 12.9, -11.8, 1.2);

  // Festive lanterns around the central dance stage
  [[-3.2, -2.4], [3.2, -2.4], [-3.2, 2.4], [3.2, 2.4]].forEach(([lx, lz]) => {
    placeProp('assets/models/fantasy-town/lantern.glb', 2.6, lx, lz, 0);
  });

  // 3. Sculpted Trees Ringing the Village (Kenney Nature & Fantasy Town)
  const treeModels = [
    'assets/models/nature/tree_oak.glb',
    'assets/models/nature/tree_detailed.glb',
    'assets/models/nature/tree_fat.glb',
    'assets/models/fantasy-town/tree-high-round.glb',
  ];
  const treeSpots = [
    [-16.5, 9.2, 4.6], [-18.2, 2.5, 5.2], [-18.0, -3.8, 4.8], [-14.5, -14.2, 5.0],
    [-10.5, -17.2, 4.5], [10.5, -16.5, 5.2], [15.5, -12.5, 4.8], [18.2, -1.5, 5.0],
    [17.2, 5.5, 4.6], [15.2, 11.2, 5.1], [11.5, 15.2, 4.5], [-11.5, 15.2, 4.8],
  ];
  treeSpots.forEach(([tx, tz, th], i) => {
    placeProp(treeModels[i % treeModels.length], th, tx, tz, (i * 1.3) % (Math.PI * 2));
  });

  // 4. Sculpted Wooden Fences & Gate
  placeProp('assets/models/fantasy-town/fence-gate.glb', 2.2, 0, 17.5, 0);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.25) continue;
    placeProp('assets/models/fantasy-town/fence.glb', 1.5, Math.cos(a) * 18.2, Math.sin(a) * 18.2, -a + Math.PI / 2);
  }

  // 5. Sculpted Flowers, Mushrooms & Rocks
  const flowerModels = [
    'assets/models/nature/flower_redA.glb',
    'assets/models/nature/flower_yellowA.glb',
    'assets/models/nature/flower_purpleA.glb',
  ];
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const rad = i % 2 === 0 ? 6.8 : 15.5;
    placeProp(flowerModels[i % 3], 0.65, Math.cos(ang) * rad, Math.sin(ang) * rad, i);
  }
  [[-6.5, 5.5], [6.5, 5.5], [-7.5, -5.5], [7.5, -5.5]].forEach(([mx, mz], i) => {
    placeProp('assets/models/nature/mushroom_redGroup.glb', 0.7, mx, mz, i);
  });
  [[-14.2, 12.2], [14.2, 12.2], [13.8, -13.2]].forEach(([rx, rz], i) => {
    placeProp('assets/models/nature/rock_largeA.glb', 1.3, rx, rz, i * 1.1);
  });

  // Drifting 3D Sky Clouds
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 });
  [[-14, 10.5, -18], [10, 11.2, -20], [-2, 11.8, -24], [18, 10.2, -10]].forEach(([cx, cy, cz]) => {
    const cg = new THREE.Group();
    [[-1.0, 0, 0, 0.95], [0, 0.4, 0, 1.3], [1.1, 0.05, 0, 0.9]].forEach(([ox, oy, oz, r]) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      p.position.set(ox, oy, oz);
      cg.add(p);
    });
    cg.position.set(cx, cy, cz);
    scene.add(cg);
    clouds.push(cg);
  });

  return { groundMesh, clouds };
}

/**
 * v3 Living Farm Rewards: 12 real 3D objects that permanently materialize around the central
 * party banquet & dance stage as Wooju speaks each animal's English story lines!
 */
export function buildPartyRewards3D(THREE, scene) {
  const root = new THREE.Group();
  scene.add(root);

  const entries = new Map();
  const steamPuffs = [];
  const musicNotes = [];
  let spotlightCone = null;
  let trophyStar = null;

  const registerReward = (spotId, group) => {
    group.visible = false;
    root.add(group);
    entries.set(spotId, { group, popProgress: 1, active: false });
  };

  const attachGLB = (parent, url, h, x = 0, y = 0, z = 0, rotY = 0) => {
    loadGLTF(url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, h, y);
      inst.holder.position.x += x;
      inst.holder.position.z += z;
      inst.holder.rotation.y = rotY;
      parent.add(inst.holder);
    }).catch(() => {});
  };

  // Banquet table center right next to the central dance stage (4.9, 0, 2.2)
  const TX = 4.9;
  const TZ = 2.2;
  const TABLE_Y = 0.96;

  // 1. farmer -> Festive Wooden Party Banquet Table!
  const farmerGrp = new THREE.Group();
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.75, 0.14, 24),
    new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.72 })
  );
  tableTop.position.set(TX, TABLE_Y, TZ);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  const tableCloth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.48, 1.54, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.85 })
  );
  tableCloth.position.set(TX, TABLE_Y + 0.08, TZ);
  const tableLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.45, TABLE_Y, 14),
    new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.8 })
  );
  tableLeg.position.set(TX, TABLE_Y / 2, TZ);
  farmerGrp.add(tableTop, tableCloth, tableLeg);
  registerReward('farmer', farmerGrp);

  // 2. frog -> Sparkling Stone Fountain on opposite side of stage (-4.9, 0, 2.2)
  const frogGrp = new THREE.Group();
  attachGLB(frogGrp, 'assets/models/fantasy-town/fountain-round-detail.glb', 2.4, -4.9, 0, 2.2, 0);
  registerReward('frog', frogGrp);

  // 3. owl -> Glowing Golden Party Lanterns flanking the banquet table
  const owlGrp = new THREE.Group();
  attachGLB(owlGrp, 'assets/models/fantasy-town/lantern.glb', 2.3, TX - 2.1, 0, TZ + 1.4, 0);
  attachGLB(owlGrp, 'assets/models/fantasy-town/lantern.glb', 2.3, TX + 2.1, 0, TZ - 1.2, 0);
  registerReward('owl', owlGrp);

  // 4. chicken -> Real 3D Egg on the banquet table
  const chickenGrp = new THREE.Group();
  attachGLB(chickenGrp, 'assets/models/food/egg.glb', 0.62, TX - 0.85, TABLE_Y + 0.1, TZ + 0.45, 0.2);
  registerReward('chicken', chickenGrp);

  // 5. rabbit -> Real 3D Big Carrot on the banquet table
  const rabbitGrp = new THREE.Group();
  attachGLB(rabbitGrp, 'assets/models/food/carrot.glb', 0.82, TX - 0.55, TABLE_Y + 0.1, TZ - 0.65, 0.7);
  registerReward('rabbit', rabbitGrp);

  // 6. cow -> Real 3D Milk Bottle on the banquet table
  const cowGrp = new THREE.Group();
  attachGLB(cowGrp, 'assets/models/food/soda-bottle.glb', 0.85, TX + 0.75, TABLE_Y + 0.1, TZ - 0.55, 0);
  registerReward('cow', cowGrp);

  // 7. horse_pony -> Real 3D Golden Corn on the banquet table
  const horseGrp = new THREE.Group();
  attachGLB(horseGrp, 'assets/models/food/corn.glb', 0.8, TX + 0.85, TABLE_Y + 0.1, TZ + 0.55, -0.4);
  registerReward('horse_pony', horseGrp);

  // 8. cat_mouse -> Real 3D Fish Dish on the banquet table
  const catGrp = new THREE.Group();
  attachGLB(catGrp, 'assets/models/food/fish.glb', 0.78, TX, TABLE_Y + 0.1, TZ + 0.95, 0.3);
  registerReward('cat_mouse', catGrp);

  // 9. duck -> Real 3D Steaming Stew Pot right in the center of the banquet table!
  const duckGrp = new THREE.Group();
  attachGLB(duckGrp, 'assets/models/food/pot-stew.glb', 0.95, TX, TABLE_Y + 0.1, TZ - 0.05, 0);
  const puffMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.65 });
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), puffMat);
    puff.position.set(TX + (i % 2 === 0 ? -0.14 : 0.14), TABLE_Y + 1.15 + i * 0.35, TZ - 0.05);
    duckGrp.add(puff);
    steamPuffs.push({ mesh: puff, phase: i * 1.5 });
  }
  registerReward('duck', duckGrp);

  // 10. dog_goat -> Clean Sparkling Barn Flower Ring around the central stage!
  const dogGrp = new THREE.Group();
  const fUrls = [
    'assets/models/nature/flower_redA.glb',
    'assets/models/nature/flower_yellowA.glb',
    'assets/models/nature/flower_purpleA.glb',
  ];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    attachGLB(dogGrp, fUrls[i % 3], 0.85, Math.cos(ang) * 4.25, 0, Math.sin(ang) * 4.25, i);
  }
  registerReward('dog_goat', dogGrp);

  // 11. donkey_sheep -> Floating 3D Musical Notes above the dance stage!
  const donkeyGrp = new THREE.Group();
  const noteColors = ['#EC4899', '#FACC15', '#38BDF8', '#A855F7', '#4ADE80'];
  for (let i = 0; i < 5; i++) {
    const ng = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: noteColors[i],
      emissive: noteColors[i],
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 8), mat);
    stem.position.set(0.15, 0.3, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.06), mat);
    flag.position.set(0.26, 0.56, 0);
    ng.add(head, stem, flag);
    const a = (i / 5) * Math.PI * 2;
    ng.position.set(Math.cos(a) * 2.5, 2.8 + (i % 2) * 0.5, Math.sin(a) * 2.5);
    donkeyGrp.add(ng);
    musicNotes.push({ mesh: ng, baseAngle: a, baseY: 2.7 + (i % 3) * 0.35, idx: i });
  }
  registerReward('donkey_sheep', donkeyGrp);

  // 12. pig_finale -> Giant Rainbow Stage Spotlight + Spinning Golden Star Trophy + Banners!
  const pigGrp = new THREE.Group();
  spotlightCone = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 7.2, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#FDE047',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  spotlightCone.position.set(0, 4.0, 0);
  pigGrp.add(spotlightCone);

  trophyStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55),
    new THREE.MeshStandardMaterial({
      color: '#FACC15',
      emissive: '#F59E0B',
      emissiveIntensity: 0.65,
      metalness: 0.6,
      roughness: 0.2,
    })
  );
  trophyStar.position.set(0, 4.3, 0);
  pigGrp.add(trophyStar);
  attachGLB(pigGrp, 'assets/models/fantasy-town/banner-red.glb', 3.1, -4.1, 0, -1.8, 0.4);
  attachGLB(pigGrp, 'assets/models/fantasy-town/banner-red.glb', 3.1, 4.1, 0, -1.8, -0.4);
  registerReward('pig_finale', pigGrp);

  const syncMastery = (masteryMap = {}, popSpotId = null) => {
    entries.forEach((entry, spotId) => {
      const shouldShow = (masteryMap[spotId] || 0) >= 1;
      const wasActive = entry.active;
      entry.active = shouldShow;
      entry.group.visible = shouldShow;
      if (shouldShow && (!wasActive || spotId === popSpotId)) {
        entry.popProgress = 0.01;
        entry.group.scale.setScalar(0.01);
      } else if (shouldShow && entry.popProgress >= 1) {
        entry.group.scale.setScalar(1);
      }
    });
  };

  const update = (t, dt) => {
    entries.forEach((entry) => {
      if (entry.active && entry.popProgress < 1) {
        entry.popProgress = Math.min(1, entry.popProgress + dt * 2.4);
        // Overshoot bounce easing so newly earned 3D rewards pop into the farm!
        const p = entry.popProgress;
        const s = p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - ((p - 0.7) / 0.3) * 0.15;
        entry.group.scale.setScalar(Math.max(0.01, s));
      }
    });
    steamPuffs.forEach(({ mesh, phase }) => {
      const cycle = ((t * 0.7 + phase) % 1.4) / 1.4;
      mesh.position.y = TABLE_Y + 0.95 + cycle * 1.5;
      mesh.scale.setScalar(0.7 + cycle * 0.9);
      mesh.material.opacity = (1 - cycle) * 0.65;
    });
    musicNotes.forEach(({ mesh, baseAngle, baseY, idx }) => {
      const a = baseAngle + t * 0.55;
      mesh.position.x = Math.cos(a) * 2.6;
      mesh.position.z = Math.sin(a) * 2.6;
      mesh.position.y = baseY + Math.sin(t * 2.8 + idx) * 0.35;
      mesh.rotation.y = t * 1.4;
    });
    if (trophyStar && trophyStar.parent?.visible) {
      trophyStar.rotation.y = t * 1.8;
      trophyStar.position.y = 4.3 + Math.sin(t * 3) * 0.2;
    }
    if (spotlightCone && spotlightCone.parent?.visible) {
      const hue = (t * 0.18) % 1;
      spotlightCone.material.color.setHSL(hue, 0.9, 0.65);
    }
  };

  return { syncMastery, update };
}

/**
 * v4: 12 Unlockable 3D Village Buildings & Monumental Landmarks
 * Constructed permanently around the farm as Wooju's cumulative English speakCount grows (3 -> 100)!
 */
export function buildVillageBuildings3D(THREE, scene) {
  const root = new THREE.Group();
  scene.add(root);

  const entries = new Map();
  let rocketFlame = null;
  let windmillGroup = null;

  const register = (id, group) => {
    group.visible = false;
    root.add(group);
    entries.set(id, { group, popProgress: 1, active: false });
  };

  const attachGLB = (parent, url, h, x = 0, y = 0, z = 0, rotY = 0) => {
    loadGLTF(url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, h, y);
      inst.holder.position.x += x;
      inst.holder.position.z += z;
      inst.holder.rotation.y = rotY;
      parent.add(inst.holder);
    }).catch(() => {});
  };

  // 1. garden_arch (3 speaks) -> Lush entrance flower garden & mushrooms
  const g1 = new THREE.Group();
  const fUrls = [
    'assets/models/nature/flower_redA.glb',
    'assets/models/nature/flower_yellowA.glb',
    'assets/models/nature/flower_purpleA.glb',
  ];
  [[-2.5, 13.5], [-2.5, 11.5], [-2.5, 9.5], [2.5, 11.5], [2.5, 9.5], [2.5, 7.5]].forEach(([fx, fz], i) => {
    attachGLB(g1, fUrls[i % 3], 0.95, fx, 0, fz, i);
  });
  register('garden_arch', g1);

  // 2. magic_well (6 speaks) -> Wishing Well
  const g2 = new THREE.Group();
  attachGLB(g2, 'assets/models/quaternius/Well.glb', 3.0, -8.5, 0, -14.8, 0.2);
  register('magic_well', g2);

  // 3. green_stall (10 speaks) -> Green Fruit Market Stall
  const g3 = new THREE.Group();
  attachGLB(g3, 'assets/models/fantasy-town/stall-green.glb', 3.4, -15.2, 0, -2.5, Math.PI * 0.45);
  attachGLB(g3, 'assets/models/food/apple.glb', 0.65, -14.5, 1.05, -2.3, 0);
  register('green_stall', g3);

  // 4. red_stall (15 speaks) -> Red Snack Stall + Farm Cart
  const g4 = new THREE.Group();
  attachGLB(g4, 'assets/models/fantasy-town/stall-red.glb', 3.4, 15.6, 0, -1.2, -Math.PI * 0.45);
  attachGLB(g4, 'assets/models/fantasy-town/cart.glb', 2.2, 1.5, 0, -15.8, 0.3);
  register('red_stall', g4);

  // 5. fountain (20 speaks) -> Sparkling Plaza Fountain
  const g5 = new THREE.Group();
  attachGLB(g5, 'assets/models/fantasy-town/fountain-round-detail.glb', 2.8, 7.8, 0, 13.8, 0);
  register('fountain', g5);

  // 6. wooju_house (26 speaks) -> Wooju's Cozy Cottage
  const g6 = new THREE.Group();
  attachGLB(g6, 'assets/models/quaternius/House_1.glb', 6.0, -17.2, 0, -8.2, Math.PI * 0.35);
  register('wooju_house', g6);

  // 7. friend_villa (32 speaks) -> Animal Friends Villa
  const g7 = new THREE.Group();
  attachGLB(g7, 'assets/models/quaternius/House_2.glb', 6.0, 17.5, 0, -5.8, -Math.PI * 0.35);
  register('friend_villa', g7);

  // 8. gold_windmill (40 speaks) -> Golden Windmill
  const g8 = new THREE.Group();
  attachGLB(g8, 'assets/models/fantasy-town/windmill.glb', 8.5, 5.8, 0, -17.8, -0.25);
  windmillGroup = g8;
  register('gold_windmill', g8);

  // 9. star_gazebo (50 speaks) -> Starlight Gazebo Pavilion
  const g9 = new THREE.Group();
  attachGLB(g9, 'assets/models/quaternius/Gazebo.glb', 5.6, 0, 0, -5.4, 0);
  register('star_gazebo', g9);

  // 10. royal_barn (62 speaks) -> Royal Golden Barn Cathedral + Red Banners
  const g10 = new THREE.Group();
  attachGLB(g10, 'assets/models/quaternius/Stable.glb', 6.5, -3.2, 0, -18.2, 0);
  attachGLB(g10, 'assets/models/fantasy-town/banner-red.glb', 3.0, -6.2, 0, -16.0, 0.2);
  attachGLB(g10, 'assets/models/fantasy-town/banner-red.glb', 3.0, 0.0, 0, -16.0, -0.2);
  register('royal_barn', g10);

  // 11. rocket_pad (75 speaks) -> Giant 3D Wooju Space Rocket Launchpad!
  const g11 = new THREE.Group();
  const RX = -13.5, RZ = 12.2;
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.7, 0.4, 24),
    new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 })
  );
  pad.position.set(RX, 0.2, RZ);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.15, 4.6, 18),
    new THREE.MeshStandardMaterial({ color: '#F8FAFC', metalness: 0.3, roughness: 0.3 })
  );
  body.position.set(RX, 3.0, RZ);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.96, 1.8, 18),
    new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.35 })
  );
  nose.position.set(RX, 6.2, RZ);
  const win = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 14, 12),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#0284C7', emissiveIntensity: 0.5 })
  );
  win.position.set(RX + 0.72, 3.6, RZ + 0.55);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.5, 1.1),
      new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.4 })
    );
    fin.position.set(RX + Math.cos(a) * 1.15, 1.4, RZ + Math.sin(a) * 1.15);
    fin.rotation.y = -a + Math.PI / 2;
    g11.add(fin);
  }
  rocketFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 1.6, 12),
    new THREE.MeshBasicMaterial({ color: '#FACC15', transparent: true, opacity: 0.85 })
  );
  rocketFlame.rotation.x = Math.PI;
  rocketFlame.position.set(RX, 0.7, RZ);
  g11.add(pad, body, nose, win, rocketFlame);
  register('rocket_pad', g11);

  // 12. rainbow_arch (100 speaks) -> Legendary Giant 3D Rainbow Arch over the entire farm!
  const g12 = new THREE.Group();
  const rbColors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#A855F7'];
  rbColors.forEach((col, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(13.5 - i * 0.42, 0.22, 10, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.82 })
    );
    arc.position.set(0, 0.2, -3.5);
    g12.add(arc);
  });
  register('rainbow_arch', g12);

  const syncBuildings = (unlockedIds = [], popId = null) => {
    const set = new Set(unlockedIds);
    entries.forEach((entry, id) => {
      const show = set.has(id);
      const wasActive = entry.active;
      entry.active = show;
      entry.group.visible = show;
      if (show && (!wasActive || id === popId)) {
        entry.popProgress = 0.01;
        entry.group.scale.setScalar(0.01);
      } else if (show && entry.popProgress >= 1) {
        entry.group.scale.setScalar(1);
      }
    });
  };

  const update = (t, dt) => {
    entries.forEach((entry) => {
      if (entry.active && entry.popProgress < 1) {
        entry.popProgress = Math.min(1, entry.popProgress + dt * 2.0);
        const p = entry.popProgress;
        const s = p < 0.7 ? (p / 0.7) * 1.12 : 1.12 - ((p - 0.7) / 0.3) * 0.12;
        entry.group.scale.setScalar(Math.max(0.01, s));
      }
    });
    if (rocketFlame && rocketFlame.parent?.visible) {
      const s = 0.85 + Math.sin(t * 18) * 0.25;
      rocketFlame.scale.set(1, s, 1);
    }
  };

  return { syncBuildings, update };
}
