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
  return makeCanvasTex(THREE, 512, (ctx, s) => {
    // Dreamy bright pastel Animal Crossing apple-mint meadow grass!
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#88E874');
    grad.addColorStop(0.5, '#9DF28A');
    grad.addColorStop(1, '#84E370');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Soft pastel sunlit meadow patches
    for (let i = 0; i < 20; i++) {
      const rx = (i * 97 + 41) % s;
      const ry = (i * 67 + 23) % s;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(217, 249, 157, 0.36)' : 'rgba(134, 239, 172, 0.28)';
      ctx.beginPath();
      ctx.arc(rx, ry, 30 + (i % 4) * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cute soft rounded pastel clover-dots turf pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let y = 0; y < s; y += 36) {
      for (let x = 0; x < s; x += 36) {
        const ox = ((y / 36) % 2) * 18;
        ctx.beginPath();
        ctx.arc(x + ox + 10, y + 12, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tiny painted pastel daisies (white, pink, butter-yellow!)
    const daisyCols = ['#FFFFFF', '#FBCFE8', '#FEF08A'];
    for (let i = 0; i < 32; i++) {
      const cx = (i * 83 + 19) % s;
      const cy = (i * 113 + 37) % s;
      ctx.fillStyle = daisyCols[i % 3];
      ctx.beginPath();
      ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 18);
}

function createACPathTexture(THREE) {
  return makeCanvasTex(THREE, 512, (ctx, s) => {
    // Cozy warm milk-cream Animal Crossing pastel cobblestone path!
    ctx.fillStyle = '#FFF4DC';
    ctx.fillRect(0, 0, s, s);
    const stones = ['#FFE8C2', '#FFFFFF', '#FCE7F3', '#FEF3C7'];
    for (let i = 0; i < 76; i++) {
      const rx = (i * 79 + 17) % s;
      const ry = (i * 53 + 31) % s;
      const rw = 16 + (i % 8) * 2;
      const rh = 12 + (i % 5) * 2;
      ctx.fillStyle = 'rgba(217, 165, 110, 0.18)';
      ctx.beginPath();
      ctx.ellipse(rx + 2, ry + 3, rw, rh, (i % 5) * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = stones[i % stones.length];
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, (i % 5) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 14);
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

// --- v12: Irresistibly Cute Chibi 2-Head-Tall 3D Toy Characters (Animal Crossing / Sanrio Clay Style!) ---
function addCuteFace(THREE, parent, { headR = 0.62, y = 0, z = 0.54, cheekColor = '#FDA4AF', snout = null, beak = null, mouth = true } = {}) {
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.15 });
  const shineMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const cheekMat = new THREE.MeshBasicMaterial({ color: cheekColor, transparent: true, opacity: 0.72 });

  [-0.22, 0.22].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.145, 12, 10), eyeMat);
    eye.position.set(ex * (headR / 0.62), y + headR * 0.06, z);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.055, 8, 8), shineMat);
    shine.position.set(ex * (headR / 0.62) + 0.03, y + headR * 0.11, z + headR * 0.11);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.13, 10, 8), cheekMat);
    cheek.scale.set(1.25, 0.75, 0.45);
    cheek.position.set(ex * 1.48 * (headR / 0.62), y - headR * 0.12, z - 0.04);
    parent.add(eye, shine, cheek);
  });

  if (snout) {
    const sn = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 0.28, 12, 10),
      new THREE.MeshStandardMaterial({ color: snout.color || '#FBCFE8', roughness: 0.45 })
    );
    sn.scale.set(1.25, 0.85, 0.75);
    sn.position.set(0, y - headR * 0.1, z + headR * 0.16);
    parent.add(sn);
    if (snout.nostrils) {
      [-0.07, 0.07].forEach((nx) => {
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
        n.position.set(nx, y - headR * 0.08, z + headR * 0.34);
        parent.add(n);
      });
    }
  } else if (beak) {
    const bk = new THREE.Mesh(
      new THREE.ConeGeometry(headR * 0.22, headR * 0.36, 10),
      new THREE.MeshStandardMaterial({ color: beak.color || '#FB923C', roughness: 0.4 })
    );
    bk.rotation.x = Math.PI / 2;
    if (beak.flat) bk.scale.set(1.3, 1.0, 0.55);
    bk.position.set(0, y - headR * 0.08, z + headR * 0.16);
    parent.add(bk);
  } else if (mouth) {
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(headR * 0.11, 0.022, 6, 12, Math.PI),
      eyeMat
    );
    smile.rotation.z = Math.PI;
    smile.position.set(0, y - headR * 0.12, z + 0.03);
    parent.add(smile);
  }
}

function createCuteChibiActor(THREE, {
  bodyColor = '#FBCFE8',
  headColor = null,
  bellyColor = '#FFFDF7',
  scale = 1.0,
  decorate = () => {},
} = {}) {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45 });
  const headMat = new THREE.MeshStandardMaterial({ color: headColor || bodyColor, roughness: 0.45 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.5 });

  // Plump Chibi Torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 14), bodyMat);
  torso.scale.set(1.0, 1.05, 0.92);
  torso.position.y = 0.72;
  torso.castShadow = true;
  root.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), bellyMat);
  belly.scale.set(0.95, 0.95, 0.55);
  belly.position.set(0, 0.68, 0.32);
  root.add(belly);

  // Big Adorable Chibi Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.54, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 16), headMat);
  head.scale.set(1.06, 0.96, 1.0);
  head.castShadow = true;
  headGroup.add(head);
  root.add(headGroup);

  // Stubby Cute Limbs (animated in update!)
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.24, 6, 8), headMat);
  armL.position.set(-0.6, 0.85, 0.05);
  armL.rotation.z = 0.45;
  armL.castShadow = true;
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.24, 6, 8), headMat);
  armR.position.set(0.6, 0.85, 0.05);
  armR.rotation.z = -0.45;
  armR.castShadow = true;

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 6, 8), bodyMat);
  legL.position.set(-0.24, 0.22, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 6, 8), bodyMat);
  legR.position.set(0.24, 0.22, 0);
  legR.castShadow = true;

  root.add(armL, armR, legL, legR);

  const extras = decorate({ root, headGroup, torso, bodyMat, headMat }) || {};
  root.scale.setScalar(scale);

  let animState = 'idle';
  let phase = Math.random() * Math.PI * 2;
  const setAnim = (s) => { animState = s || 'idle'; };
  const update = (dt) => {
    phase += dt * (animState === 'run' ? 14 : (animState === 'dance' ? 10 : (animState === 'walk' ? 9 : (animState === 'talk' ? 8 : 2.6))));
    if (animState === 'walk' || animState === 'run') {
      const amp = animState === 'run' ? 0.85 : 0.55;
      legL.rotation.x = Math.sin(phase) * amp;
      legR.rotation.x = -Math.sin(phase) * amp;
      armL.rotation.x = -Math.sin(phase) * amp * 0.8;
      armR.rotation.x = Math.sin(phase) * amp * 0.8;
      root.position.y = Math.abs(Math.sin(phase)) * (animState === 'run' ? 0.35 : 0.16);
      headGroup.rotation.z = Math.sin(phase) * 0.08;
    } else if (animState === 'dance') {
      root.position.y = Math.abs(Math.sin(phase)) * 0.36;
      root.rotation.z = Math.sin(phase * 0.5) * 0.14;
      armL.rotation.z = 0.9 + Math.sin(phase) * 0.55;
      armR.rotation.z = -0.9 - Math.sin(phase) * 0.55;
      headGroup.rotation.z = Math.sin(phase) * 0.16;
    } else if (animState === 'talk') {
      root.position.y = Math.abs(Math.sin(phase)) * 0.14;
      headGroup.rotation.x = Math.sin(phase) * 0.12;
      armL.rotation.z = 0.65 + Math.sin(phase) * 0.28;
      armR.rotation.z = -0.65 - Math.sin(phase) * 0.28;
    } else {
      root.position.y = 0;
      root.rotation.z = 0;
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
      armL.rotation.x *= 0.85;
      armR.rotation.x *= 0.85;
      armL.rotation.z = 0.45 + Math.sin(phase) * 0.06;
      armR.rotation.z = -0.45 - Math.sin(phase) * 0.06;
      headGroup.rotation.z = Math.sin(phase * 0.7) * 0.05;
      headGroup.rotation.x = 0;
    }
    if (extras.tail) extras.tail.rotation.y = Math.sin(phase * 1.4) * 0.35;
  };

  return { root, setAnim, update };
}

/**
 * Builds Wooju's Adorable 2-Head-Tall Chibi 3D Explorer Avatar + 15 Unlockable 3D Gear Cosmetics!
 */
export function buildWooju3D(THREE) {
  const group = new THREE.Group();

  const chibi = createCuteChibiActor(THREE, {
    bodyColor: '#3B82F6', // Cozy blue overalls
    headColor: '#FFDFC4', // Warm peach skin
    bellyColor: '#60A5FA',
    scale: 0.98,
    decorate: ({ headGroup, torso }) => {
      addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56, cheekColor: '#FB7185' });
      // Fluffy chocolate-brown hair cap + cute bangs!
      const hairMat = new THREE.MeshStandardMaterial({ color: '#5C3A21', roughness: 0.65 });
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
      hairCap.position.y = 0.04;
      headGroup.add(hairCap);
      [-0.24, 0, 0.24].forEach((bx) => {
        const bang = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), hairMat);
        bang.position.set(bx, 0.34, 0.46);
        headGroup.add(bang);
      });
      // Cute yellow rocket star badge on Wooju's shirt!
      const badge = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14),
        new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#F59E0B', emissiveIntensity: 0.35 })
      );
      badge.position.set(0, 0.08, 0.52);
      torso.add(badge);
    },
  });
  group.add(chibi.root);

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
    setAnim: chibi.setAnim,
    updateMixer: chibi.update,
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

function buildChibiSpotActors(THREE, spotId) {
  const mkEar = (r, h, col, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }));
    m.position.set(x, y, z);
    m.rotation.z = rz;
    return m;
  };
  const actors = [];

  if (spotId === 'farmer') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#2563EB', headColor: '#FFDFC4', bellyColor: '#EF4444', scale: 1.05,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.08, 18), new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.65 }));
        brim.position.y = 0.42;
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.42, 16), new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.65 }));
        crown.position.y = 0.65;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.1, 16), new THREE.MeshStandardMaterial({ color: '#EF4444' }));
        band.position.y = 0.49;
        headGroup.add(brim, crown, band);
      },
    }));
  } else if (spotId === 'frog') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#4ADE80', headColor: '#4ADE80', bellyColor: '#DCFCE7', scale: 0.85,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.06, z: 0.55, cheekColor: '#F472B6' });
        [-0.32, 0.32].forEach(ex => {
          const bump = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshStandardMaterial({ color: '#4ADE80', roughness: 0.45 }));
          bump.position.set(ex, 0.52, 0.12);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#1E293B' }));
          pupil.position.set(ex, 0.55, 0.31);
          headGroup.add(bump, pupil);
        });
      },
    }));
  } else if (spotId === 'owl') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#B45309', headColor: '#D97706', bellyColor: '#FEF3C7', scale: 0.9,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: 0, z: 0.55, beak: { color: '#FACC15' } });
        [-0.38, 0.38].forEach((ex, i) => {
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 8), new THREE.MeshStandardMaterial({ color: '#92400E' }));
          tuft.position.set(ex, 0.58, 0);
          tuft.rotation.z = i === 0 ? 0.35 : -0.35;
          headGroup.add(tuft);
        });
      },
    }));
  } else if (spotId === 'chicken') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#FFFDF7', headColor: '#FFFDF7', bellyColor: '#FEF3C7', scale: 0.86,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: 0, z: 0.55, beak: { color: '#FB923C' } });
        [-0.12, 0, 0.12].forEach((cx, i) => {
          const comb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ color: '#EF4444' }));
          comb.position.set(cx, 0.64 + (i === 1 ? 0.08 : 0), 0.05);
          headGroup.add(comb);
        });
      },
    }));
  } else if (spotId === 'rabbit') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#FFF1F2', headColor: '#FFF1F2', bellyColor: '#FFFFFF', scale: 0.9,
      decorate: ({ headGroup, root }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56, cheekColor: '#F472B6' });
        headGroup.add(mkEar(0.14, 0.68, '#FFF1F2', -0.26, 0.82, 0, 0.12));
        headGroup.add(mkEar(0.14, 0.68, '#FFF1F2', 0.26, 0.82, 0, -0.12));
        headGroup.add(mkEar(0.08, 0.5, '#FBCFE8', -0.26, 0.82, 0.08, 0.12));
        headGroup.add(mkEar(0.08, 0.5, '#FBCFE8', 0.26, 0.82, 0.08, -0.12));
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#FFFFFF' }));
        tail.position.set(0, 0.62, -0.58);
        root.add(tail);
        return { tail };
      },
    }));
  } else if (spotId === 'cow') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#FFFFFF', headColor: '#FFFFFF', bellyColor: '#FFFBEB', scale: 0.98,
      decorate: ({ headGroup, torso }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: 0.02, z: 0.54, snout: { color: '#FBCFE8', nostrils: true } });
        headGroup.add(mkEar(0.12, 0.26, '#FFFFFF', -0.62, 0.22, 0, 1.1));
        headGroup.add(mkEar(0.12, 0.26, '#FFFFFF', 0.62, 0.22, 0, -1.1));
        [-0.25, 0.25].forEach(hx => {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#FDE68A' }));
          horn.position.set(hx, 0.62, 0.05);
          headGroup.add(horn);
        });
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshStandardMaterial({ color: '#334155' }));
        spot.position.set(0.32, 0.2, 0.35);
        torso.add(spot);
      },
    }));
  } else if (spotId === 'horse_pony') {
    [
      { x: -0.68, sc: 1.0, col: '#D97706', mane: '#78350F' },
      { x: 0.68, sc: 0.72, col: '#FDBA74', mane: '#92400E' },
    ].forEach(({ x, sc, col, mane }) => {
      const a = createCuteChibiActor(THREE, {
        bodyColor: col, headColor: col, bellyColor: '#FEF3C7', scale: sc,
        decorate: ({ headGroup }) => {
          addCuteFace(THREE, headGroup, { headR: 0.62, y: 0, z: 0.54, snout: { color: '#FEF3C7', nostrils: true } });
          headGroup.add(mkEar(0.11, 0.3, col, -0.35, 0.62, 0, 0.2));
          headGroup.add(mkEar(0.11, 0.3, col, 0.35, 0.62, 0, -0.2));
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshStandardMaterial({ color: mane }));
          m.position.set(0, 0.55, 0.22);
          headGroup.add(m);
        },
      });
      a.root.position.x = x;
      actors.push(a);
    });
  } else if (spotId === 'cat_mouse') {
    const cat = createCuteChibiActor(THREE, {
      bodyColor: '#FB923C', headColor: '#FB923C', bellyColor: '#FFF7ED', scale: 0.88,
      decorate: ({ headGroup, root }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56, cheekColor: '#F472B6' });
        [-0.36, 0.36].forEach((ex, i) => {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 6), new THREE.MeshStandardMaterial({ color: '#FB923C' }));
          ear.position.set(ex, 0.6, 0);
          ear.rotation.z = i === 0 ? 0.28 : -0.28;
          headGroup.add(ear);
        });
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 6, 8), new THREE.MeshStandardMaterial({ color: '#EA580C' }));
        tail.position.set(0, 0.65, -0.62);
        tail.rotation.x = 0.7;
        root.add(tail);
        return { tail };
      },
    });
    cat.root.position.x = -0.62;
    const mouse = createCuteChibiActor(THREE, {
      bodyColor: '#CBD5E1', headColor: '#CBD5E1', bellyColor: '#F8FAFC', scale: 0.62,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56, cheekColor: '#F472B6' });
        [-0.48, 0.48].forEach(ex => {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshStandardMaterial({ color: '#CBD5E1' }));
          ear.scale.set(1, 1, 0.35);
          ear.position.set(ex, 0.52, 0);
          const inner = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: '#FBCFE8' }));
          inner.scale.set(1, 1, 0.35);
          inner.position.set(ex, 0.52, 0.06);
          headGroup.add(ear, inner);
        });
      },
    });
    mouse.root.position.x = 0.62;
    actors.push(cat, mouse);
  } else if (spotId === 'duck') {
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#FDE047', headColor: '#FDE047', bellyColor: '#FEF9C3', scale: 0.86,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: 0, z: 0.54, beak: { color: '#F97316', flat: true } });
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: '#FACC15' }));
        tuft.position.set(0, 0.65, 0);
        headGroup.add(tuft);
      },
    }));
  } else if (spotId === 'dog_goat') {
    const dog = createCuteChibiActor(THREE, {
      bodyColor: '#E5B27A', headColor: '#E5B27A', bellyColor: '#FFFBEB', scale: 0.88,
      decorate: ({ headGroup, root }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.55, snout: { color: '#FFFBEB', nostrils: false } });
        headGroup.add(mkEar(0.15, 0.42, '#92400E', -0.62, 0.06, 0.05, 0.25));
        headGroup.add(mkEar(0.15, 0.42, '#92400E', 0.62, 0.06, 0.05, -0.25));
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.38, 6, 8), new THREE.MeshStandardMaterial({ color: '#92400E' }));
        tail.position.set(0, 0.62, -0.58);
        tail.rotation.x = 0.8;
        root.add(tail);
        return { tail };
      },
    });
    dog.root.position.x = -0.64;
    const goat = createCuteChibiActor(THREE, {
      bodyColor: '#F8FAFC', headColor: '#F8FAFC', bellyColor: '#FFFFFF', scale: 0.88,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56 });
        [-0.22, 0.22].forEach(hx => {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 8), new THREE.MeshStandardMaterial({ color: '#CBD5E1' }));
          horn.position.set(hx, 0.68, 0);
          headGroup.add(horn);
        });
      },
    });
    goat.root.position.x = 0.64;
    actors.push(dog, goat);
  } else if (spotId === 'donkey_sheep') {
    const donkey = createCuteChibiActor(THREE, {
      bodyColor: '#94A3B8', headColor: '#94A3B8', bellyColor: '#F1F5F9', scale: 0.9,
      decorate: ({ headGroup }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: 0, z: 0.54, snout: { color: '#F1F5F9', nostrils: true } });
        headGroup.add(mkEar(0.12, 0.58, '#94A3B8', -0.28, 0.78, 0, 0.18));
        headGroup.add(mkEar(0.12, 0.58, '#94A3B8', 0.28, 0.78, 0, -0.18));
      },
    });
    donkey.root.position.x = -0.68;
    const sheep = createCuteChibiActor(THREE, {
      bodyColor: '#FFFFFF', headColor: '#FFFBEB', bellyColor: '#FFFFFF', scale: 0.9,
      decorate: ({ headGroup, torso }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: -0.02, z: 0.56, cheekColor: '#F472B6' });
        const woolMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.85 });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), woolMat);
          puff.position.set(Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45);
          torso.add(puff);
        }
        const woolHat = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), woolMat);
        woolHat.position.set(0, 0.48, 0);
        headGroup.add(woolHat);
      },
    });
    sheep.root.position.x = 0.68;
    actors.push(donkey, sheep);
  } else {
    // 🐷 THE DANCING PIG (star of the story — peach-pink, rosy cheeks & curly 3D tail!)
    actors.push(createCuteChibiActor(THREE, {
      bodyColor: '#F9A8D4', headColor: '#F9A8D4', bellyColor: '#FCE7F3', scale: 1.04,
      decorate: ({ headGroup, root }) => {
        addCuteFace(THREE, headGroup, { headR: 0.62, y: 0.02, z: 0.54, snout: { color: '#F472B6', nostrils: true }, cheekColor: '#FB7185' });
        [-0.42, 0.42].forEach((ex, i) => {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 6), new THREE.MeshStandardMaterial({ color: '#F472B6' }));
          ear.position.set(ex, 0.55, 0.05);
          ear.rotation.z = i === 0 ? 0.55 : -0.55;
          headGroup.add(ear);
        });
        // Iconic curly pig tail ("the curl in his tail!")
        const tail = new THREE.Mesh(
          new THREE.TorusGeometry(0.18, 0.055, 8, 16, Math.PI * 1.65),
          new THREE.MeshStandardMaterial({ color: '#EC4899', roughness: 0.4 })
        );
        tail.position.set(0, 0.68, -0.62);
        root.add(tail);
        return { tail };
      },
    }));
  }

  return actors;
}

/**
 * Builds Adorable Chibi 3D Story Character(s) + 3D story item prop for each of the 12 spots.
 */
export function buildSpotCharacter3D(THREE, spotId) {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);
  const itemMesh = new THREE.Group();
  group.add(itemMesh);

  const spec = SPOT_SPEC[spotId] || SPOT_SPEC.pig_finale;
  const actors = buildChibiSpotActors(THREE, spotId);
  actors.forEach(a => bodyRoot.add(a.root));

  const setAnim = (s) => actors.forEach(a => a.setAnim(s));
  const updateMixer = (dt) => actors.forEach(a => a.update(dt));

  if (spec.prop) {
    loadGLTF(spec.prop.url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, spec.prop.h, 0);
      inst.holder.position.x += spec.prop.x || 0;
      inst.holder.position.z += spec.prop.z || 0;
      group.add(inst.holder);
    }).catch(() => {});
  }

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
    setAnim,
    updateMixer,
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

  // 0. Shimmering Turquoise Animal Crossing Island Ocean + Soft Foam Ring + Golden Sandy Beach!
  const oceanMesh = new THREE.Mesh(
    new THREE.CircleGeometry(105, 64),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.22, metalness: 0.15 })
  );
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.y = -0.65;
  scene.add(oceanMesh);

  const foamRing = new THREE.Mesh(
    new THREE.RingGeometry(36.2, 38.4, 64),
    new THREE.MeshBasicMaterial({ color: '#E0F2FE', side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
  );
  foamRing.rotation.x = -Math.PI / 2;
  foamRing.position.y = -0.58;
  scene.add(foamRing);

  const beachShelf = new THREE.Mesh(
    new THREE.CylinderGeometry(36.5, 38.0, 1.4, 64),
    new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.92 })
  );
  beachShelf.position.y = -0.92;
  beachShelf.receiveShadow = true;
  scene.add(beachShelf);

  // Distant Pastel Horizon Islands for scenic depth!
  const hillMat = new THREE.MeshStandardMaterial({ color: '#86EFAC', roughness: 0.95 });
  [[-55, -52, 16, 8], [48, -58, 20, 10], [62, 12, 14, 7], [-60, 22, 15, 7]].forEach(([hx, hz, hr, hh]) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(hr, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
    hill.scale.set(1, hh / hr, 1);
    hill.position.set(hx, -0.7, hz);
    scene.add(hill);
  });

  // 1. Spacious Sunlit Grass Island (radius 32 -> 2.7x bigger meadow!)
  const groundMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(32.5, 34.0, 2.0, 64),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  groundMesh.position.y = -1.0;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Cobblestone circular village promenade + central plaza + cross walkways
  const pathRing = new THREE.Mesh(
    new THREE.RingGeometry(14.5, 19.6, 64),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.88, side: THREE.DoubleSide })
  );
  pathRing.rotation.x = -Math.PI / 2;
  pathRing.position.y = 0.025;
  pathRing.receiveShadow = true;
  scene.add(pathRing);

  const centerPath = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 22.0),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.88 })
  );
  centerPath.rotation.x = -Math.PI / 2;
  centerPath.position.set(0, 0.03, 9.5);
  centerPath.receiveShadow = true;
  scene.add(centerPath);

  const plazaCircle = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 48),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.88 })
  );
  plazaCircle.rotation.x = -Math.PI / 2;
  plazaCircle.position.set(0, 0.022, 0);
  plazaCircle.receiveShadow = true;
  scene.add(plazaCircle);

  // Central Dance Stage Platform — Cute Strawberry-Cream & Lemon Pastel Party Stage!
  const stageDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 4.2, 0.42, 40),
    new THREE.MeshStandardMaterial({ color: '#FDA4AF', roughness: 0.6 })
  );
  stageDeck.position.set(0, 0.21, 0);
  stageDeck.castShadow = true;
  stageDeck.receiveShadow = true;
  scene.add(stageDeck);

  const stageTop = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.5, 0.08, 40),
    new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.7 })
  );
  stageTop.position.set(0, 0.43, 0);
  stageTop.receiveShadow = true;
  scene.add(stageTop);

  const stageTrim = new THREE.Mesh(
    new THREE.TorusGeometry(3.65, 0.11, 10, 40),
    new THREE.MeshStandardMaterial({ color: '#FDE047', emissive: '#F59E0B', emissiveIntensity: 0.15, roughness: 0.3 })
  );
  stageTrim.rotation.x = Math.PI / 2;
  stageTrim.position.set(0, 0.45, 0);
  scene.add(stageTrim);

  // Cute Pastel Bunting Pennants (삼각 가랜드 깃발!) strung between the 4 stage lanterns!
  const buntingCols = ['#F472B6', '#FDE047', '#38BDF8', '#A78BFA', '#4ADE80', '#FB923C'];
  const lanternCorners = [[-3.6, -2.8], [3.6, -2.8], [3.6, 2.8], [-3.6, 2.8]];
  for (let c = 0; c < 4; c++) {
    const [x1, z1] = lanternCorners[c];
    const [x2, z2] = lanternCorners[(c + 1) % 4];
    for (let k = 1; k <= 5; k++) {
      const f = k / 6;
      const sag = Math.sin(f * Math.PI) * 0.45;
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.42, 3),
        new THREE.MeshStandardMaterial({ color: buntingCols[(c * 5 + k) % buntingCols.length], roughness: 0.5 })
      );
      flag.rotation.x = Math.PI;
      flag.position.set(x1 + (x2 - x1) * f, 2.55 - sag, z1 + (z2 - z1) * f);
      scene.add(flag);
    }
  }

  // Sparkling Blue Pond at Zone 3 (Cat & Mouse fishing spot — scaled to spacious island!)
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.4, 0.1, 36),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.14, metalness: 0.18 })
  );
  pond.position.set(17.2, 0.04, -15.8);
  scene.add(pond);
  const pondRim = new THREE.Mesh(
    new THREE.RingGeometry(4.35, 4.95, 36),
    new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.9, side: THREE.DoubleSide })
  );
  pondRim.rotation.x = -Math.PI / 2;
  pondRim.position.set(17.2, 0.03, -15.8);
  scene.add(pondRim);

  // Helper to place static artist GLB props
  const placeProp = (url, h, x, z, rotY = 0, y = 0) => {
    loadGLTF(url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, h, y);
      inst.holder.position.x += x;
      inst.holder.position.z += z;
      inst.holder.rotation.y = rotY;
      scene.add(inst.holder);
    }).catch(() => {});
  };

  // Base Cozy Farm Props
  placeProp('assets/models/quaternius/Hay.glb', 1.5, -10.5, -22.5, 0.4);
  placeProp('assets/models/quaternius/Hay.glb', 1.3, -9.0, -21.5, -0.3);
  placeProp('assets/models/nature/sign.glb', 2.0, 3.2, 20.8, -0.3);
  placeProp('assets/models/nature/bridge_woodRound.glb', 1.6, 17.2, -15.8, 0.6);
  placeProp('assets/models/nature/lily_large.glb', 0.18, 15.6, -14.8, 0);
  placeProp('assets/models/nature/lily_large.glb', 0.18, 18.8, -16.8, 1.2);

  // Festive lanterns around the central dance stage
  [[-3.6, -2.8], [3.6, -2.8], [-3.6, 2.8], [3.6, 2.8]].forEach(([lx, lz]) => {
    placeProp('assets/models/fantasy-town/lantern.glb', 2.7, lx, lz, 0);
  });

  // Lush Sculpted Forest Ring around the Spacious Island (24 trees!)
  const treeModels = [
    'assets/models/nature/tree_oak.glb',
    'assets/models/nature/tree_detailed.glb',
    'assets/models/nature/tree_fat.glb',
    'assets/models/fantasy-town/tree-high-round.glb',
  ];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    // Keep front entrance path clear
    if (Math.abs(a - Math.PI / 2) < 0.22) continue;
    const rad = 28.5 + (i % 3) * 1.4;
    const h = 4.8 + (i % 4) * 0.65;
    placeProp(treeModels[i % treeModels.length], h, Math.cos(a) * rad, Math.sin(a) * rad, i * 1.1);
  }

  // Sculpted Wooden Fences & Welcome Gate around the outer meadow
  placeProp('assets/models/fantasy-town/fence-gate.glb', 2.5, 0, 26.8, 0);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.18) continue;
    placeProp('assets/models/fantasy-town/fence.glb', 1.6, Math.cos(a) * 27.2, Math.sin(a) * 27.2, -a + Math.PI / 2);
  }

  // Abundant Animal Crossing Meadow Flowers, Mushrooms & Boulders
  const flowerModels = [
    'assets/models/nature/flower_redA.glb',
    'assets/models/nature/flower_yellowA.glb',
    'assets/models/nature/flower_purpleA.glb',
  ];
  for (let i = 0; i < 42; i++) {
    const ang = (i / 42) * Math.PI * 2;
    const rad = i % 3 === 0 ? 9.5 : (i % 3 === 1 ? 22.8 : 25.4);
    placeProp(flowerModels[i % 3], 0.72, Math.cos(ang) * rad, Math.sin(ang) * rad, i);
  }
  [[-9.5, 8.2], [9.5, 8.2], [-10.5, -8.5], [10.5, -8.5], [-21.5, 12.0], [21.5, 11.5]].forEach(([mx, mz], i) => {
    placeProp('assets/models/nature/mushroom_redGroup.glb', 0.8, mx, mz, i);
  });
  [[-22.5, 16.5], [22.5, 16.5], [20.5, -18.5], [-23.0, -16.0]].forEach(([rx, rz], i) => {
    placeProp('assets/models/nature/rock_largeA.glb', 1.5, rx, rz, i * 1.1);
  });

  // Soft Puffy 3D Sky Clouds drifting high above the island
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.92 });
  [[-22, 14.5, -26], [16, 15.5, -30], [-4, 16.2, -34], [26, 14.0, -14], [-28, 15.0, 6]].forEach(([cx, cy, cz]) => {
    const cg = new THREE.Group();
    [[-1.4, 0, 0, 1.2], [0, 0.5, 0, 1.65], [1.45, 0.08, 0, 1.15]].forEach(([ox, oy, oz, r]) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      p.position.set(ox, oy, oz);
      cg.add(p);
    });
    cg.position.set(cx, cy, cz);
    scene.add(cg);
    clouds.push(cg);
  });

  // Wooju's Always-Present Cozy 3D Home in its own landscaped yard near the entrance!
  const woojuHouseGroup = new THREE.Group();
  const HOUSE_X = -8.8;
  const HOUSE_Z = 21.2;
  const DOOR_POS = { x: -7.1, z: 18.8 };
  woojuHouseGroup.position.set(HOUSE_X, 0, HOUSE_Z);
  woojuHouseGroup.rotation.y = Math.PI * 0.18;
  loadGLTF('assets/models/quaternius/House_1.glb').then((gltf) => {
    const inst = instantiateGLTF(THREE, gltf, 5.8, 0);
    woojuHouseGroup.add(inst.holder);
  }).catch(() => {});
  const houseHitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 5.4, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  houseHitMesh.position.y = 2.7;
  houseHitMesh.userData = { isWoojuHouse: true };
  woojuHouseGroup.add(houseHitMesh);

  const houseBadge = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createTreasureMedallionTex(THREE, '🏡', '#DCFCE7'), transparent: true })
  );
  houseBadge.scale.set(1.45, 1.45, 1);
  houseBadge.position.set(0, 6.3, 0);
  woojuHouseGroup.add(houseBadge);
  scene.add(woojuHouseGroup);

  const doorMat = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.06, 1.05),
    new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.85 })
  );
  doorMat.position.set(DOOR_POS.x, 0.04, DOOR_POS.z);
  doorMat.rotation.y = Math.PI * 0.18;
  doorMat.userData = { isWoojuHouse: true };
  scene.add(doorMat);

  const doorRing = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.32, 24),
    new THREE.MeshBasicMaterial({ color: '#4ADE80', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  doorRing.rotation.x = -Math.PI / 2;
  doorRing.position.set(DOOR_POS.x, 0.06, DOOR_POS.z);
  scene.add(doorRing);

  // Iconic Animal Crossing Cute Red Mailbox + Pastel Flower Pots right outside Wooju's House!
  const mbPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8), new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.6 }));
  mbPost.position.set(HOUSE_X + 3.2, 0.58, HOUSE_Z - 1.2);
  const mbBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, 0.65), new THREE.MeshStandardMaterial({ color: '#F43F5E', roughness: 0.4 }));
  mbBox.position.set(HOUSE_X + 3.2, 1.22, HOUSE_Z - 1.2);
  const mbFlag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), new THREE.MeshStandardMaterial({ color: '#FACC15' }));
  mbFlag.position.set(HOUSE_X + 3.45, 1.35, HOUSE_Z - 1.2);
  scene.add(mbPost, mbBox, mbFlag);

  // Cute Pastel Cotton-Candy Pink Blossom Trees & Fluttering Pastel Butterflies!
  const pinkLeafMat = new THREE.MeshStandardMaterial({ color: '#F9A8D4', roughness: 0.72 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#A16207', roughness: 0.8 });
  [[-12.5, 19.0], [12.5, 19.5], [-19.5, -14.5], [19.5, -13.5], [0, -22.5]].forEach(([bx, bz]) => {
    const bt = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.2, 10), trunkMat);
    tr.position.y = 1.1;
    tr.castShadow = true;
    [[0, 2.8, 0, 1.45], [-0.95, 2.4, 0.35, 0.95], [0.95, 2.45, -0.3, 1.0]].forEach(([cx, cy, cz, cr]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 14, 12), pinkLeafMat);
      puff.position.set(cx, cy, cz);
      puff.castShadow = true;
      bt.add(puff);
    });
    bt.add(tr);
    bt.position.set(bx, 0, bz);
    scene.add(bt);
  });

  // 12 Fluttering Pastel Butterflies around the island!
  const butterflies = [];
  const bfCols = ['#FDE047', '#F472B6', '#38BDF8', '#C084FC', '#FFFFFF'];
  for (let i = 0; i < 12; i++) {
    const bfg = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: bfCols[i % bfCols.length], side: THREE.DoubleSide });
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), mat);
    wl.position.x = -0.14;
    const wr = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), mat);
    wr.position.x = 0.14;
    const lp = new THREE.Group(); lp.add(wl);
    const rp = new THREE.Group(); rp.add(wr);
    bfg.add(lp, rp);
    const ang = (i / 12) * Math.PI * 2;
    const rad = 7.5 + (i % 4) * 4.2;
    bfg.position.set(Math.cos(ang) * rad, 1.6 + (i % 3) * 0.5, Math.sin(ang) * rad);
    scene.add(bfg);
    butterflies.push({ group: bfg, lp, rp, ang, rad, baseY: 1.5 + (i % 3) * 0.55, idx: i });
  }

  return {
    groundMesh,
    clouds,
    butterflies,
    woojuHouse: {
      hitMeshes: [houseHitMesh, doorMat],
      doorPos: DOOR_POS,
      exitPos: { x: -5.2, z: 16.4 },
      doorRing,
    },
  };
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

  // Construction FX: golden magic ring + rising cartoon dust puffs
  const fxGroup = new THREE.Group();
  fxGroup.visible = false;
  const fxRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.1, 32),
    new THREE.MeshBasicMaterial({ color: '#FACC15', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  fxRing.rotation.x = -Math.PI / 2;
  fxRing.position.y = 0.14;
  fxGroup.add(fxRing);

  const fxPuffs = [];
  const puffMat = new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.95, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), puffMat.clone());
    p.position.set(Math.cos(a) * 1.9, 0.7, Math.sin(a) * 1.9);
    fxGroup.add(p);
    fxPuffs.push({ mesh: p, angle: a });
  }
  scene.add(fxGroup);
  let activeFx = null; // { id, x, z, elapsed, duration }

  const register = (id, group, focusPos) => {
    // Position group at its exact world location so scale/rise animations happen IN PLACE!
    group.position.set(focusPos.x, 0, focusPos.z);
    group.visible = false;
    root.add(group);
    entries.set(id, { group, focusPos, buildProgress: 1, active: false });
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

  // Helper: cute floating 3D signpost badge above landmarks so Wooju immediately spots every building!
  const addLandmarkBadge = (parent, emoji, y = 4.6) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: createTreasureMedallionTex(THREE, emoji, '#FEF9C3'), transparent: true })
    );
    sp.scale.set(1.25, 1.25, 1);
    sp.position.set(0, y, 0);
    parent.add(sp);
  };

  // 1. garden_arch (3 speaks) -> Unmistakable 3D Floral Archway right over the entrance path!
  const g1 = new THREE.Group();
  const archWoodMat = new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.65 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.6 });
  // Twin wooden pillars flanking the entrance path
  [-2.3, 2.3].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.6, 12), archWoodMat);
    post.position.set(px, 1.8, 0);
    post.castShadow = true;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.65, 12), new THREE.MeshStandardMaterial({ color: '#EA580C', roughness: 0.6 }));
    pot.position.set(px, 0.32, 0.55);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), leafMat);
    bush.position.set(px, 0.9, 0.55);
    g1.add(post, pot, bush);
  });
  // Lush green archway spanning across the path
  const archCurve = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.32, 10, 28, Math.PI), leafMat);
  archCurve.position.set(0, 3.4, 0);
  archCurve.castShadow = true;
  g1.add(archCurve);
  // Colorful 3D blossoms all along the arch!
  const blossomCols = ['#F43F5E', '#FACC15', '#EC4899', '#A855F7', '#38BDF8', '#FB923C'];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI;
    const fl = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshStandardMaterial({ color: blossomCols[i % blossomCols.length], emissive: blossomCols[i % blossomCols.length], emissiveIntensity: 0.25 })
    );
    fl.position.set(Math.cos(a) * 2.3, 3.4 + Math.sin(a) * 2.3, 0.22);
    g1.add(fl);
  }
  // Extra 3D flower clusters flanking the path
  const fUrls = [
    'assets/models/nature/flower_redA.glb',
    'assets/models/nature/flower_yellowA.glb',
    'assets/models/nature/flower_purpleA.glb',
  ];
  [[-2.8, 1.6], [2.8, 1.6], [-2.8, -1.6], [2.8, -1.6]].forEach(([fx, fz], i) => {
    attachGLB(g1, fUrls[i % 3], 1.15, fx, 0, fz, i);
  });
  addLandmarkBadge(g1, '🌷', 6.4);
  register('garden_arch', g1, { x: 0, z: 12.2 });

  // 2. magic_well (6 speaks) -> Wishing Well
  const g2 = new THREE.Group();
  attachGLB(g2, 'assets/models/quaternius/Well.glb', 3.4, 0, 0, 0, 0.2);
  addLandmarkBadge(g2, '🪣', 4.2);
  register('magic_well', g2, { x: -12.0, z: -21.0 });

  // 3. green_stall (10 speaks) -> Green Fruit Market Stall
  const g3 = new THREE.Group();
  attachGLB(g3, 'assets/models/fantasy-town/stall-green.glb', 3.8, 0, 0, 0, Math.PI * 0.45);
  attachGLB(g3, 'assets/models/food/apple.glb', 0.75, 0.7, 1.05, 0.2, 0);
  addLandmarkBadge(g3, '🍏', 4.5);
  register('green_stall', g3, { x: -22.5, z: -3.5 });

  // 4. red_stall (15 speaks) -> Red Snack Stall + Farm Cart
  const g4 = new THREE.Group();
  attachGLB(g4, 'assets/models/fantasy-town/stall-red.glb', 3.8, 0, 0, 0, -Math.PI * 0.45);
  attachGLB(g4, 'assets/models/fantasy-town/cart.glb', 2.4, -2.0, 0, 2.4, 0.3);
  addLandmarkBadge(g4, '🍿', 4.5);
  register('red_stall', g4, { x: 22.8, z: -2.0 });

  // 5. fountain (20 speaks) -> Sparkling Plaza Fountain
  const g5 = new THREE.Group();
  attachGLB(g5, 'assets/models/fantasy-town/fountain-round-detail.glb', 3.2, 0, 0, 0, 0);
  addLandmarkBadge(g5, '⛲', 4.1);
  register('fountain', g5, { x: 11.5, z: 20.0 });

  // 6. wooju_house (26 speaks) -> Wooju's Garden Villa
  const g6 = new THREE.Group();
  attachGLB(g6, 'assets/models/quaternius/House_1.glb', 6.4, 0, 0, 0, Math.PI * 0.35);
  addLandmarkBadge(g6, '🏡', 7.0);
  register('wooju_house', g6, { x: -24.0, z: -11.5 });

  // 7. friend_villa (32 speaks) -> Animal Friends Villa
  const g7 = new THREE.Group();
  attachGLB(g7, 'assets/models/quaternius/House_2.glb', 6.4, 0, 0, 0, -Math.PI * 0.35);
  addLandmarkBadge(g7, '🏠', 7.0);
  register('friend_villa', g7, { x: 24.5, z: -8.5 });

  // 8. gold_windmill (40 speaks) -> Golden Windmill
  const g8 = new THREE.Group();
  attachGLB(g8, 'assets/models/fantasy-town/windmill.glb', 9.2, 0, 0, 0, -0.25);
  addLandmarkBadge(g8, '🌬️', 9.6);
  register('gold_windmill', g8, { x: 8.5, z: -24.5 });

  // 9. star_gazebo (50 speaks) -> Starlight Gazebo Pavilion
  const g9 = new THREE.Group();
  attachGLB(g9, 'assets/models/quaternius/Gazebo.glb', 6.0, 0, 0, 0, 0);
  addLandmarkBadge(g9, '🏛️', 6.6);
  register('star_gazebo', g9, { x: 0, z: -9.5 });

  // 10. royal_barn (62 speaks) -> Royal Golden Barn Cathedral + Red Banners
  const g10 = new THREE.Group();
  attachGLB(g10, 'assets/models/quaternius/Stable.glb', 7.0, 0, 0, 0, 0);
  attachGLB(g10, 'assets/models/fantasy-town/banner-red.glb', 3.2, -3.2, 0, 2.4, 0.2);
  attachGLB(g10, 'assets/models/fantasy-town/banner-red.glb', 3.2, 3.2, 0, 2.4, -0.2);
  addLandmarkBadge(g10, '🏰', 7.6);
  register('royal_barn', g10, { x: -4.8, z: -25.0 });

  // 11. rocket_pad (75 speaks) -> Giant 3D Wooju Space Rocket Launchpad!
  const g11 = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.9, 0.45, 24),
    new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 })
  );
  pad.position.set(0, 0.22, 0);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.2, 4.8, 18),
    new THREE.MeshStandardMaterial({ color: '#F8FAFC', metalness: 0.3, roughness: 0.3 })
  );
  body.position.set(0, 3.1, 0);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(1.02, 1.9, 18),
    new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.35 })
  );
  nose.position.set(0, 6.4, 0);
  const win = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 14, 12),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#0284C7', emissiveIntensity: 0.5 })
  );
  win.position.set(0.75, 3.7, 0.58);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.4 })
    );
    fin.position.set(Math.cos(a) * 1.2, 1.45, Math.sin(a) * 1.2);
    fin.rotation.y = -a + Math.PI / 2;
    g11.add(fin);
  }
  rocketFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 1.7, 12),
    new THREE.MeshBasicMaterial({ color: '#FACC15', transparent: true, opacity: 0.85 })
  );
  rocketFlame.rotation.x = Math.PI;
  rocketFlame.position.set(0, 0.72, 0);
  g11.add(pad, body, nose, win, rocketFlame);
  addLandmarkBadge(g11, '🚀', 8.2);
  register('rocket_pad', g11, { x: -19.5, z: 17.5 });

  // 12. rainbow_arch (100 speaks) -> Legendary Giant 3D Rainbow Arch over the entire island!
  const g12 = new THREE.Group();
  const rbColors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#A855F7'];
  rbColors.forEach((col, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(20.0 - i * 0.52, 0.28, 10, 56, Math.PI),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.84 })
    );
    arc.position.set(0, 0.2, 0);
    g12.add(arc);
  });
  register('rainbow_arch', g12, { x: 0, z: -5.0 });

  const getFocusPos = (id) => entries.get(id)?.focusPos || { x: 0, z: 0 };

  const syncBuildings = (unlockedIds = [], constructId = null) => {
    const set = new Set(unlockedIds);
    entries.forEach((entry, id) => {
      const show = set.has(id);
      const wasActive = entry.active;
      entry.active = show;
      entry.group.visible = show;
      if (show && (id === constructId || !wasActive)) {
        if (id === constructId) {
          // Dramatic rising construction animation from underground + dust puffs!
          entry.buildProgress = 0.0;
          entry.group.position.y = -4.5;
          entry.group.scale.set(0.3, 0.1, 0.3);
          activeFx = {
            id,
            x: entry.focusPos.x,
            z: entry.focusPos.z,
            elapsed: 0,
            duration: 2.3,
          };
          fxGroup.position.set(entry.focusPos.x, 0, entry.focusPos.z);
          fxGroup.visible = true;
        } else {
          entry.buildProgress = 1;
          entry.group.position.y = 0;
          entry.group.scale.set(1, 1, 1);
        }
      }
    });
  };

  const update = (t, dt) => {
    entries.forEach((entry) => {
      if (entry.active && entry.buildProgress < 1) {
        entry.buildProgress = Math.min(1, entry.buildProgress + dt * 0.58);
        const p = entry.buildProgress;
        if (p < 0.25) {
          // Hammering dust phase before rising
          entry.group.position.y = -4.2;
          entry.group.scale.set(0.4, 0.08, 0.4);
        } else if (p < 0.82) {
          // Smooth rise from the ground with squash & stretch!
          const r = (p - 0.25) / 0.57;
          const ease = 1 - Math.pow(1 - r, 3);
          entry.group.position.y = -4.2 * (1 - ease);
          const sx = 0.7 + ease * 0.38;
          const sy = 0.25 + ease * 0.92;
          entry.group.scale.set(sx, sy, sx);
        } else {
          // Juicy bounce settle!
          const b = (p - 0.82) / 0.18;
          entry.group.position.y = 0;
          const sx = 1.08 - b * 0.08;
          const sy = 1.17 - b * 0.17;
          entry.group.scale.set(sx, sy, sx);
        }
      }
    });

    if (activeFx) {
      activeFx.elapsed += dt;
      const frac = Math.min(1, activeFx.elapsed / activeFx.duration);
      fxRing.rotation.z = t * 3.5;
      fxRing.scale.setScalar(1 + Math.sin(t * 10) * 0.12);
      fxRing.material.opacity = (1 - frac) * 0.9;
      fxPuffs.forEach(({ mesh, angle }, i) => {
        const cyc = (activeFx.elapsed * 1.9 + i * 0.22) % 1;
        const rad = 1.6 + cyc * 1.8;
        mesh.position.set(Math.cos(angle + t * 1.4) * rad, 0.4 + cyc * 2.4, Math.sin(angle + t * 1.4) * rad);
        mesh.scale.setScalar(0.55 + Math.sin(cyc * Math.PI) * 0.85);
        mesh.material.opacity = (1 - frac) * (1 - cyc * 0.7) * 0.9;
      });
      if (activeFx.elapsed >= activeFx.duration) {
        fxGroup.visible = false;
        activeFx = null;
      }
    }

    if (rocketFlame && rocketFlame.parent?.visible) {
      const s = 0.85 + Math.sin(t * 18) * 0.25;
      rocketFlame.scale.set(1, s, 1);
    }
  };

  return { syncBuildings, update, getFocusPos };
}

// --- v7/v8.3/v12.1: Exact-Match Animal Crossing Grounded 3D Outdoor Decorations ---
// Only map real 3D GLB models that visually match the bag icon 1:1!
const TREASURE_GLB_MAP = {
  tr_gold_egg:    { url: 'assets/models/food/egg.glb',                 h: 0.78, style: 'picnic' },
  tr_big_carrot:  { url: 'assets/models/food/carrot.glb',              h: 0.95, style: 'picnic' },
  tr_dia_corn:    { url: 'assets/models/food/corn.glb',                h: 0.95, style: 'picnic' },
  tr_magic_stew:  { url: 'assets/models/food/pot-stew.glb',            h: 1.08, style: 'picnic' },
  tr_legend_fish: { url: 'assets/models/food/fish.glb',                h: 0.98, style: 'picnic' },
  tr_star_mush:   { url: 'assets/models/nature/mushroom_redGroup.glb', h: 1.1,  style: 'ground' },
  tr_crystal_flw: { url: 'assets/models/nature/flower_purpleA.glb',    h: 1.1,  style: 'ground' },
  tr_sunflower:   { url: 'assets/models/nature/flower_yellowA.glb',    h: 1.18, style: 'ground' },
  tr_tulip_pot:   { url: 'assets/models/nature/flower_redA.glb',       h: 1.1,  style: 'pot'    },
};

function createTreasureMedallionTex(THREE, emoji, bgHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(80, 80, 68, 0, Math.PI * 2);
  ctx.fillStyle = bgHex;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.font = '82px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 80, 86);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Crisp die-cut toy sticker texture (no clunky circle/easel — exact bag icon standing naturally on grass!)
function createDieCutStickerTex(THREE, emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.font = '164px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Soft white toy-sticker outline so it pops cleanly against green grass
  ctx.lineWidth = 22;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeText(emoji, 128, 138);
  ctx.fillText(emoji, 128, 138);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildGroundedTreasure3D(THREE, item) {
  const g = new THREE.Group();
  let animTarget = null;
  let animKind = 'none';

  // 1. Exact 1:1 matching Artist GLB Models resting naturally on grass, pot, or cozy picnic cloth!
  const glbSpec = TREASURE_GLB_MAP[item.id];
  if (glbSpec) {
    let itemY = 0;
    if (glbSpec.style === 'picnic') {
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.04, 1.55),
        new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.9 })
      );
      cloth.position.y = 0.02;
      cloth.receiveShadow = true;
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.05, 1.3),
        new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.9 })
      );
      border.position.y = 0.025;
      g.add(cloth, border);
      itemY = 0.06;
    } else if (glbSpec.style === 'pot') {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.3, 0.48, 14),
        new THREE.MeshStandardMaterial({ color: '#EA580C', roughness: 0.7 })
      );
      pot.position.y = 0.24;
      pot.castShadow = true;
      g.add(pot);
      itemY = 0.45;
    }
    loadGLTF(glbSpec.url).then((gltf) => {
      const inst = instantiateGLTF(THREE, gltf, glbSpec.h, itemY);
      g.add(inst.holder);
    }).catch(() => {});
    return { group: g, animTarget, animKind, popProgress: 0.01 };
  }

  // 2. Exact-match sculpted 3D landmarks (ONLY when geometry truly matches the bag item!)
  if (item.id === 'tr_sakura_tree') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 10), new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.85 }));
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    const pinkMat = new THREE.MeshStandardMaterial({ color: '#F9A8D4', roughness: 0.75 });
    [[0, 2.2, 0, 1.15], [-0.7, 1.9, 0.3, 0.75], [0.7, 1.95, -0.2, 0.8]].forEach(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), pinkMat);
      c.position.set(x, y, z);
      c.castShadow = true;
      g.add(c);
    });
    g.add(trunk);
  } else if (item.id === 'tr_fairy_house') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 1.1, 14), new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.8 }));
    stem.position.y = 0.55;
    stem.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.05, 16), new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.55 }));
    cap.position.y = 1.55;
    cap.castShadow = true;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.1), new THREE.MeshStandardMaterial({ color: '#92400E' }));
    door.position.set(0, 0.3, 0.72);
    g.add(stem, cap, door);
  } else if (item.id === 'tr_ufo_model') {
    const hover = new THREE.Group();
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.55, 0.32, 18), new THREE.MeshStandardMaterial({ color: '#CBD5E1', metalness: 0.65, roughness: 0.25 }));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 10), new THREE.MeshStandardMaterial({ color: '#38BDF8', emissive: '#0284C7', emissiveIntensity: 0.45 }));
    dome.position.y = 0.22;
    hover.add(saucer, dome);
    hover.position.y = 1.35;
    g.add(hover);
    animTarget = hover;
    animKind = 'hover';
  } else if (item.id === 'tr_saturn_ring') {
    const hover = new THREE.Group();
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 14), new THREE.MeshStandardMaterial({ color: '#FDBA74', roughness: 0.45 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.12, 8, 28), new THREE.MeshStandardMaterial({ color: '#FEF08A', roughness: 0.35 }));
    ring.rotation.x = Math.PI * 0.42;
    hover.add(planet, ring);
    hover.position.y = 1.25;
    g.add(hover);
    animTarget = hover;
    animKind = 'hover';
  } else if (item.id === 'tr_crystal_castle') {
    const cMat = new THREE.MeshStandardMaterial({ color: '#BAE6FD', emissive: '#38BDF8', emissiveIntensity: 0.22, roughness: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#6366F1', roughness: 0.35 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), cMat);
    base.position.y = 0.55;
    base.castShadow = true;
    g.add(base);
    [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]].forEach(([tx, tz]) => {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.7, 10), cMat);
      tw.position.set(tx, 0.85, tz);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 10), roofMat);
      rf.position.set(tx, 2.0, tz);
      g.add(tw, rf);
    });
  } else if (item.id === 'tr_carousel') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.25, 16), new THREE.MeshStandardMaterial({ color: '#F472B6', roughness: 0.5 }));
    base.position.y = 0.125;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 10), new THREE.MeshStandardMaterial({ color: '#FACC15', metalness: 0.5 }));
    pole.position.y = 1.0;
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.75, 16), new THREE.MeshStandardMaterial({ color: '#FEF08A', roughness: 0.45 }));
    top.position.y = 2.0;
    g.add(base, pole, top);
    animTarget = g;
    animKind = 'spin';
  } else {
    // 3. Exact Bag-Match Cute Grounded Toy Standee (crisp die-cut icon + soft ground shadow — 100% identical to bag!)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 20),
      new THREE.MeshBasicMaterial({ color: '#15803D', transparent: true, opacity: 0.22 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: createDieCutStickerTex(THREE, item.emoji), transparent: true })
    );
    const sz = item.rarity === 'legendary' ? 2.0 : (item.rarity === 'epic' ? 1.8 : 1.55);
    sprite.scale.set(sz, sz, 1);
    sprite.position.set(0, sz * 0.48, 0);
    g.add(shadow, sprite);
    if (item.rarity === 'legendary' || item.rarity === 'epic') {
      const sparkleRing = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 0.88, 24),
        new THREE.MeshBasicMaterial({ color: item.rarity === 'legendary' ? '#FACC15' : '#C084FC', side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
      );
      sparkleRing.rotation.x = -Math.PI / 2;
      sparkleRing.position.y = 0.04;
      g.add(sparkleRing);
    }
  }

  return { group: g, animTarget, animKind, popProgress: 0.01 };
}

export function buildPlacedTreasures3D(THREE, scene, treasureCatalog = []) {
  const root = new THREE.Group();
  scene.add(root);
  const byId = new Map(treasureCatalog.map(t => [t.id, t]));
  const placedMeshes = new Map();

  const syncPlaced = (placedList = [], popId = null) => {
    const keepIds = new Set(placedList.map(p => p.id));
    for (const [id, entry] of placedMeshes.entries()) {
      if (!keepIds.has(id)) {
        root.remove(entry.group);
        placedMeshes.delete(id);
      }
    }
    placedList.forEach(({ id, x, z }) => {
      const item = byId.get(id);
      if (!item) return;
      let entry = placedMeshes.get(id);
      if (!entry) {
        entry = buildGroundedTreasure3D(THREE, item);
        const hitMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(1.05, 1.05, 2.2, 10),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 1.1;
        hitMesh.userData = { placedTreasureId: id };
        entry.group.add(hitMesh);
        entry.hitMesh = hitMesh;
        root.add(entry.group);
        placedMeshes.set(id, entry);
      }
      entry.group.position.set(x, 0, z);
      if (id === popId) {
        entry.popProgress = 0.01;
        entry.group.scale.setScalar(0.01);
      }
    });
  };

  const getHitMeshes = () => [...placedMeshes.values()].map(e => e.hitMesh).filter(Boolean);

  const update = (t, dt) => {
    let idx = 0;
    placedMeshes.forEach((entry) => {
      idx += 1;
      if (entry.popProgress < 1) {
        entry.popProgress = Math.min(1, entry.popProgress + dt * 2.8);
        const p = entry.popProgress;
        const s = p < 0.7 ? (p / 0.7) * 1.18 : 1.18 - ((p - 0.7) / 0.3) * 0.18;
        entry.group.scale.setScalar(Math.max(0.01, s));
      }
      if (entry.animTarget && entry.animKind === 'hover') {
        entry.animTarget.rotation.y = t * 1.2 + idx;
        entry.animTarget.position.y = 1.15 + Math.sin(t * 2.5 + idx) * 0.1;
      } else if (entry.animTarget && entry.animKind === 'spin') {
        entry.animTarget.rotation.y = t * 0.7;
      }
    });
  };

  return { syncPlaced, update, getHitMeshes };
}

// --- v8: Animal Crossing-style 3D My-Home Room (Wallpapers, Floors, 40 3D Furniture & 3 Room Sizes) ---
function createRoomPatternTex(THREE, { bg = '#BAE6FD', fg = '#FFFFFF', pattern = 'dots' } = {}, repeat = 4) {
  return makeCanvasTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = fg;
    if (pattern === 'planks') {
      ctx.fillRect(0, 0, s, 4);
      ctx.fillRect(0, s / 2, s, 4);
      ctx.fillRect(s / 2, 0, 4, s / 2);
      ctx.fillRect(s / 4, s / 2, 4, s / 2);
    } else if (pattern === 'stripes') {
      for (let x = 0; x < s; x += 48) {
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, 0, 20, s);
      }
      ctx.globalAlpha = 1;
    } else if (pattern === 'check') {
      const cell = s / 4;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if ((x + y) % 2 === 0) {
            ctx.globalAlpha = 0.45;
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }
      ctx.globalAlpha = 1;
    } else if (pattern === 'rainbow') {
      const cols = ['#FCA5A5', '#FDBA74', '#FDE047', '#86EFAC', '#93C5FD', '#D8B4FE'];
      const band = s / cols.length;
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, i * band, s, band);
      });
    } else if (pattern === 'stars') {
      for (let i = 0; i < 16; i++) {
        const x = (i * 53 + 21) % s;
        const y = (i * 71 + 17) % s;
        const r = 6 + (i % 3) * 4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pattern === 'clouds') {
      ctx.globalAlpha = 0.72;
      [[64, 70, 26], [92, 66, 30], [120, 72, 24], [180, 180, 24], [206, 176, 28], [230, 182, 22]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else if (pattern === 'diamonds') {
      ctx.globalAlpha = 0.35;
      for (let y = 32; y < s; y += 64) {
        for (let x = 32; x < s; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, y - 20);
          ctx.lineTo(x + 20, y);
          ctx.lineTo(x, y + 20);
          ctx.lineTo(x - 20, y);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else {
      // dots
      ctx.globalAlpha = 0.4;
      for (let y = 32; y < s; y += 64) {
        for (let x = 32; x < s; x += 64) {
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }, repeat);
}

function buildFurnitureMesh3D(THREE, item) {
  const g = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({ color: item.color || '#60A5FA', roughness: 0.55 });
  const accMat = new THREE.MeshStandardMaterial({ color: item.accent || '#FFFFFF', roughness: 0.45 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.7 });
  const addBox = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  switch (item.shape) {
    case 'bed':
      addBox(2.2, 0.45, 3.0, woodMat, 0, 0.25, 0);
      addBox(2.0, 0.45, 2.7, mainMat, 0, 0.65, 0.1);
      addBox(1.5, 0.28, 0.65, accMat, 0, 0.96, -0.95); // pillow
      addBox(2.25, 1.35, 0.22, woodMat, 0, 0.72, -1.42); // headboard
      break;
    case 'sofa':
      addBox(2.4, 0.65, 1.2, mainMat, 0, 0.35, 0);
      addBox(2.4, 0.95, 0.32, mainMat, 0, 0.9, -0.45);
      addBox(0.32, 0.85, 1.2, accMat, -1.08, 0.55, 0);
      addBox(0.32, 0.85, 1.2, accMat, 1.08, 0.55, 0);
      break;
    case 'table':
      addBox(2.0, 0.16, 1.4, mainMat, 0, 0.95, 0);
      [[-0.85, -0.55], [0.85, -0.55], [-0.85, 0.55], [0.85, 0.55]].forEach(([lx, lz]) => {
        addBox(0.14, 0.95, 0.14, woodMat, lx, 0.475, lz);
      });
      addBox(0.7, 0.35, 0.7, accMat, 0, 1.2, 0);
      break;
    case 'shelf':
      addBox(1.9, 2.4, 0.65, mainMat, 0, 1.2, 0);
      [0.55, 1.2, 1.85].forEach((sy, i) => {
        addBox(1.6, 0.35, 0.48, i % 2 === 0 ? accMat : woodMat, 0, sy, 0.12);
      });
      break;
    case 'piano':
      addBox(2.2, 1.35, 1.0, mainMat, 0, 0.68, 0);
      addBox(2.0, 0.12, 0.45, accMat, 0, 0.98, 0.48); // keys
      break;
    case 'tv':
      addBox(1.8, 0.55, 0.8, woodMat, 0, 0.28, 0);
      addBox(1.6, 1.05, 0.25, mainMat, 0, 1.12, 0);
      addBox(1.38, 0.82, 0.08, accMat, 0, 1.12, 0.14);
      break;
    case 'tank':
      addBox(1.8, 0.65, 0.9, woodMat, 0, 0.32, 0);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.0, 0.82),
        new THREE.MeshStandardMaterial({ color: '#38BDF8', transparent: true, opacity: 0.52, roughness: 0.1 })
      );
      glass.position.set(0, 1.15, 0);
      g.add(glass);
      addBox(0.35, 0.22, 0.15, accMat, -0.25, 1.15, 0);
      addBox(0.28, 0.18, 0.12, accMat, 0.35, 1.28, 0.1);
      break;
    case 'arcade':
      addBox(1.3, 2.2, 1.1, mainMat, 0, 1.1, 0);
      addBox(1.05, 0.75, 0.1, accMat, 0, 1.55, 0.54);
      addBox(1.25, 0.18, 0.45, accMat, 0, 1.02, 0.62);
      break;
    case 'tent':
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.4, 6), mainMat);
      cone.position.y = 1.2;
      cone.castShadow = true;
      g.add(cone);
      addBox(0.65, 1.0, 0.2, accMat, 0, 0.5, 1.05);
      break;
    case 'tree':
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.6, 12), accMat);
      pot.position.y = 0.3;
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.0, 10), mainMat);
      foliage.position.y = 1.55;
      foliage.castShadow = true;
      g.add(pot, foliage);
      break;
    case 'lamp':
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.32, 1.75, 12), woodMat);
      stand.position.y = 0.88;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 12),
        new THREE.MeshStandardMaterial({ color: item.color, emissive: item.accent, emissiveIntensity: 0.65 })
      );
      bulb.position.y = 1.95;
      g.add(stand, bulb);
      break;
    case 'rug':
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.08, 24), mainMat);
      rug.position.y = 0.05;
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.09, 24), accMat);
      inner.position.y = 0.06;
      g.add(rug, inner);
      break;
    case 'cabinet':
      addBox(1.4, 2.0, 1.0, mainMat, 0, 1.0, 0);
      addBox(1.15, 0.75, 0.12, accMat, 0, 1.4, 0.49);
      addBox(1.15, 0.75, 0.12, accMat, 0, 0.52, 0.49);
      break;
    case 'plush':
    default:
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.35, 16), mainMat);
      cushion.position.y = 0.18;
      cushion.castShadow = true;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), accMat);
      body.position.y = 0.82;
      body.castShadow = true;
      g.add(cushion, body);
      break;
  }

  // Cute crisp emoji badge floating gently above so 6yo recognizes every furniture/toy instantly!
  const badge = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createTreasureMedallionTex(THREE, item.emoji, '#FFFDF7'), transparent: true })
  );
  badge.scale.set(0.95, 0.95, 1);
  badge.position.set(0, item.shape === 'rug' ? 0.85 : 2.35, 0);
  g.add(badge);

  return { group: g, badge, popProgress: 0.01 };
}

export function buildMyHome3D(THREE, scene, { wallpapers = [], floors = [], furniture = [] } = {}) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const wallById = new Map(wallpapers.map(w => [w.id, w]));
  const floorById = new Map(floors.map(f => [f.id, f]));
  const furnById = new Map(furniture.map(f => [f.id, f]));

  const roomShell = new THREE.Group();
  group.add(roomShell);

  const floorMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.88 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.85 });

  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 10), floorMat);
  floorMesh.position.y = -0.2;
  floorMesh.receiveShadow = true;
  roomShell.add(floorMesh);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.4, 6.2, 0.4), wallMat);
  backWall.position.set(0, 2.9, -5.2);
  backWall.receiveShadow = true;
  roomShell.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.2, 10.4), wallMat);
  leftWall.position.set(-5.2, 2.9, 0);
  leftWall.receiveShadow = true;
  roomShell.add(leftWall);

  // Sunny window on back wall
  const winGroup = new THREE.Group();
  const winFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.1, 0.16),
    new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.5 })
  );
  const winGlass = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.7, 0.18),
    new THREE.MeshBasicMaterial({ color: '#BAE6FD' })
  );
  winGroup.add(winFrame, winGlass);
  winGroup.position.set(0, 3.3, -4.95);
  roomShell.add(winGroup);

  // Indoor Exit Doormat right at the front edge of the room (walk onto it or tap to exit to farm!)
  const exitMat = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.07, 1.05),
    new THREE.MeshStandardMaterial({ color: '#10B981', roughness: 0.85 })
  );
  exitMat.position.set(0, 0.04, 4.15);
  exitMat.userData = { isHomeExitMat: true };
  group.add(exitMat);

  const exitBadge = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createTreasureMedallionTex(THREE, '🚪', '#DCFCE7'), transparent: true })
  );
  exitBadge.scale.set(1.0, 1.0, 1);
  exitBadge.position.set(0, 1.15, 4.15);
  exitBadge.userData = { isHomeExitMat: true };
  group.add(exitBadge);

  // Placed 3D furniture container
  const furnRoot = new THREE.Group();
  group.add(furnRoot);
  const placedMap = new Map();
  let currentHalfSize = 4.2;

  const syncRoomStyle = (wallId, floorId, roomSize = 10) => {
    const wSpec = wallById.get(wallId) || wallpapers[0];
    const fSpec = floorById.get(floorId) || floors[0];

    if (wallMat.map) wallMat.map.dispose();
    wallMat.map = createRoomPatternTex(THREE, wSpec, 4);
    wallMat.needsUpdate = true;

    if (floorMat.map) floorMat.map.dispose();
    floorMat.map = createRoomPatternTex(THREE, fSpec, 4);
    floorMat.needsUpdate = true;

    const scaleXZ = roomSize / 10;
    roomShell.scale.set(scaleXZ, 1, scaleXZ);
    currentHalfSize = (roomSize / 2) - 0.9;
    const exitZ = currentHalfSize - 0.1;
    exitMat.position.set(0, 0.04, exitZ);
    exitBadge.position.set(0, 1.15, exitZ);
  };

  const syncFurniture = (placedList = [], popId = null) => {
    const keepIds = new Set(placedList.map(p => p.id));
    for (const [id, entry] of placedMap.entries()) {
      if (!keepIds.has(id)) {
        furnRoot.remove(entry.group);
        placedMap.delete(id);
      }
    }
    placedList.forEach(({ id, x, z, rot = 0 }) => {
      const item = furnById.get(id);
      if (!item) return;
      let entry = placedMap.get(id);
      if (!entry) {
        entry = buildFurnitureMesh3D(THREE, item);
        const hitMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 2.4, 10),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = 1.2;
        hitMesh.userData = { placedFurnId: id };
        entry.group.add(hitMesh);
        entry.hitMesh = hitMesh;
        furnRoot.add(entry.group);
        placedMap.set(id, entry);
      }
      entry.group.position.set(x, 0, z);
      entry.group.rotation.y = rot;
      if (id === popId) {
        entry.popProgress = 0.01;
        entry.group.scale.setScalar(0.01);
      }
    });
  };

  const getHitMeshes = () => [...placedMap.values()].map(e => e.hitMesh).filter(Boolean);

  const update = (t, dt) => {
    let i = 0;
    placedMap.forEach((entry) => {
      i += 1;
      if (entry.popProgress < 1) {
        entry.popProgress = Math.min(1, entry.popProgress + dt * 2.8);
        const p = entry.popProgress;
        const s = p < 0.7 ? (p / 0.7) * 1.18 : 1.18 - ((p - 0.7) / 0.3) * 0.18;
        entry.group.scale.setScalar(Math.max(0.01, s));
      }
      if (entry.badge) {
        entry.badge.position.y = (entry.badge.position.y > 1.5 ? 2.35 : 0.85) + Math.sin(t * 2.8 + i) * 0.07;
      }
    });
  };

  return {
    group,
    floorMesh,
    exitMeshes: [exitMat, exitBadge],
    getExitPos: () => ({ x: 0, z: currentHalfSize - 0.1 }),
    syncRoomStyle,
    syncFurniture,
    update,
    getHalfSize: () => currentHalfSize,
    getHitMeshes,
  };
}

// --- v9 (#2): Dynamic Day / Sunset / Starry Night (+ Fireflies & Stars) / Cherry Blossom Petals ---
export function buildAtmosphere3D(THREE, parentGroup) {
  const root = new THREE.Group();
  parentGroup.add(root);

  // Night Stars Dome
  const starsGroup = new THREE.Group();
  const starMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + (i % 5) * 0.13;
    const rad = 26 + (i % 4) * 5;
    const y = 14 + (i % 7) * 2.4;
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + (i % 3) * 0.08), starMat);
    st.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    starsGroup.add(st);
  }
  starsGroup.visible = false;
  root.add(starsGroup);

  // Glowing Night Fireflies + Stage Lantern Glow Bulbs
  const firefliesGroup = new THREE.Group();
  const ffList = [];
  const ffMat = new THREE.MeshBasicMaterial({ color: '#FDE047' });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 5 + (i % 5) * 2.4;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), ffMat);
    m.position.set(Math.cos(a) * r, 1.4 + (i % 3) * 0.9, Math.sin(a) * r);
    firefliesGroup.add(m);
    ffList.push({ mesh: m, a, r, baseY: 1.2 + (i % 4) * 0.65, idx: i });
  }
  // Warm glowing orbs inside the 4 stage lanterns at night!
  [[-3.2, -2.4], [3.2, -2.4], [-3.2, 2.4], [3.2, 2.4]].forEach(([lx, lz]) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#FDE047', transparent: true, opacity: 0.9 })
    );
    bulb.position.set(lx, 2.15, lz);
    firefliesGroup.add(bulb);
  });
  firefliesGroup.visible = false;
  root.add(firefliesGroup);

  // Drifting Pink Cherry Blossom Petals
  const petalsGroup = new THREE.Group();
  const petalList = [];
  const petalMat = new THREE.MeshBasicMaterial({ color: '#FBCFE8', side: THREE.DoubleSide });
  for (let i = 0; i < 36; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.18), petalMat);
    const px = ((i * 73) % 34) - 17;
    const pz = ((i * 47) % 34) - 17;
    const py = 1 + (i % 10) * 1.4;
    p.position.set(px, py, pz);
    petalsGroup.add(p);
    petalList.push({ mesh: p, speed: 0.7 + (i % 4) * 0.28, drift: 0.6 + (i % 3) * 0.35, idx: i });
  }
  petalsGroup.visible = false;
  root.add(petalsGroup);

  let mode = 'day'; // 'day' | 'sunset' | 'night' | 'blossom'

  const PRESETS = {
    day:     { sky: '#9BD8FF', fog: '#BFE8FF', hemiSky: '#FFFDF5', hemiGnd: '#68C456', hemiInt: 0.95, sunCol: '#FFF5D6', sunInt: 1.35 },
    sunset:  { sky: '#FDBA74', fog: '#FED7AA', hemiSky: '#FFEDD5', hemiGnd: '#D97706', hemiInt: 0.85, sunCol: '#FB923C', sunInt: 1.45 },
    night:   { sky: '#1E1B4B', fog: '#312E81', hemiSky: '#818CF8', hemiGnd: '#1E293B', hemiInt: 0.65, sunCol: '#C7D2FE', sunInt: 0.75 },
    blossom: { sky: '#FBCFE8', fog: '#FCE7F3', hemiSky: '#FFF1F2', hemiGnd: '#86EFAC', hemiInt: 0.98, sunCol: '#FFF5D6', sunInt: 1.3 },
  };

  const applyMode = (newMode, { scene, hemiLight, dirLight, inHome = false } = {}) => {
    mode = PRESETS[newMode] ? newMode : 'day';
    const p = PRESETS[mode];
    starsGroup.visible = mode === 'night';
    firefliesGroup.visible = mode === 'night';
    petalsGroup.visible = mode === 'blossom';
    if (!inHome && scene) {
      scene.background = new THREE.Color(p.sky);
      scene.fog = new THREE.Fog(p.fog, 34, 88);
    }
    if (hemiLight) {
      hemiLight.color.set(p.hemiSky);
      hemiLight.groundColor.set(p.hemiGnd);
      hemiLight.intensity = p.hemiInt;
    }
    if (dirLight) {
      dirLight.color.set(p.sunCol);
      dirLight.intensity = p.sunInt;
    }
  };

  const update = (t, dt) => {
    if (firefliesGroup.visible) {
      ffList.forEach(({ mesh, a, r, baseY, idx }) => {
        const ang = a + t * 0.18 * (idx % 2 === 0 ? 1 : -1);
        mesh.position.set(Math.cos(ang) * r, baseY + Math.sin(t * 2.4 + idx) * 0.45, Math.sin(ang) * r);
      });
    }
    if (petalsGroup.visible) {
      petalList.forEach(({ mesh, speed, drift, idx }) => {
        mesh.position.y -= dt * speed;
        mesh.position.x += Math.sin(t * 1.4 + idx) * dt * drift;
        mesh.rotation.x += dt * 1.6;
        mesh.rotation.z += dt * 1.2;
        if (mesh.position.y < 0.2) mesh.position.y = 13.5;
      });
    }
  };

  return { applyMode, update, getMode: () => mode };
}

// --- v9 (#3): Floating Golden Present Balloon Surprise Event (Animal Crossing style!) ---
export function buildGoldenBalloon3D(THREE, parentGroup) {
  const group = new THREE.Group();
  group.visible = false;

  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 16, 14),
    new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#D97706', emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.45 })
  );
  balloon.scale.set(1, 1.18, 1);
  balloon.position.y = 1.6;

  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6),
    new THREE.MeshBasicMaterial({ color: '#FFFFFF' })
  );
  string.position.y = 0.55;

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85),
    new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.4 })
  );
  box.position.y = -0.2;
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.18, 0.9),
    new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.3 })
  );
  ribbon.position.y = -0.2;

  // Generous invisible touch target so 6yo can easily pop it!
  const hitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.9, 10, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.position.y = 0.9;
  hitMesh.userData = { isGoldenBalloon: true };

  group.add(balloon, string, box, ribbon, hitMesh);
  parentGroup.add(group);

  let active = false;
  let cooldown = 18; // First balloon appears ~18s after entering!
  let dir = 1;

  const spawn = () => {
    active = true;
    dir = Math.random() > 0.5 ? 1 : -1;
    const z = -6 + Math.random() * 14;
    group.position.set(-18 * dir, 4.6, z);
    group.visible = true;
  };

  const pop = () => {
    active = false;
    group.visible = false;
    cooldown = 32;
  };

  const update = (t, dt, canSpawn) => {
    if (!active) {
      if (canSpawn) {
        cooldown -= dt;
        if (cooldown <= 0) spawn();
      }
      return false;
    }
    group.position.x += dir * dt * 2.15;
    group.position.y = 4.6 + Math.sin(t * 2.6) * 0.45;
    group.rotation.y = Math.sin(t * 1.5) * 0.2;
    if (Math.abs(group.position.x) > 20) {
      active = false;
      group.visible = false;
      cooldown = 26;
    }
    return true;
  };

  return { group, hitMesh, pop, update, isActive: () => active };
}

// --- v11: Grand Stage-Clear Monuments (Unlocked permanently when finishing the 3D Stage Show!) ---
export function buildStageMonuments3D(THREE, parentGroup) {
  const root = new THREE.Group();
  parentGroup.add(root);
  const monuments = new Map();
  let airBalloon = null;
  let diaCrown = null;

  // 1st Clear: Giant Golden Superstar Pig Trophy Monument right beside the plaza!
  const m1 = new THREE.Group();
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.9, 18), new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.5 }));
  base1.position.y = 0.45;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.45, 1.4, 18), new THREE.MeshStandardMaterial({ color: '#FACC15', emissive: '#D97706', emissiveIntensity: 0.35, metalness: 0.72, roughness: 0.2 }));
  cup.position.y = 1.65;
  const starTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.65), new THREE.MeshStandardMaterial({ color: '#FEF08A', emissive: '#F59E0B', emissiveIntensity: 0.6 }));
  starTop.position.y = 2.9;
  m1.add(base1, cup, starTop);
  m1.position.set(-7.5, 0, -5.5);
  m1.visible = false;
  root.add(m1);
  monuments.set('mon_gold_trophy', m1);

  // 2nd Clear: Giant Pastel Heart Hot-Air Balloon floating joyfully over the island!
  const m2 = new THREE.Group();
  const bal = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 16), new THREE.MeshStandardMaterial({ color: '#F472B6', emissive: '#EC4899', emissiveIntensity: 0.2, roughness: 0.4 }));
  bal.scale.set(1, 1.15, 1);
  bal.position.y = 3.2;
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.26, 10, 28), new THREE.MeshStandardMaterial({ color: '#FEF08A', roughness: 0.4 }));
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 3.2;
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.7 }));
  basket.position.y = -0.3;
  m2.add(bal, stripe, basket);
  m2.position.set(10, 9.5, -10);
  m2.visible = false;
  root.add(m2);
  airBalloon = m2;
  monuments.set('mon_heart_balloon', m2);

  // 3rd Clear: Legendary Spinning Diamond Crown Spire!
  const m3 = new THREE.Group();
  const base3 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.85, 1.0, 20), new THREE.MeshStandardMaterial({ color: '#E0F2FE', roughness: 0.35 }));
  base3.position.y = 0.5;
  diaCrown = createGoldCrownMesh(THREE, 2.2);
  diaCrown.position.y = 2.2;
  m3.add(base3, diaCrown);
  m3.position.set(7.5, 0, -5.5);
  m3.visible = false;
  root.add(m3);
  monuments.set('mon_dia_crown', m3);

  const syncMonuments = (unlockedIds = []) => {
    const set = new Set(unlockedIds);
    monuments.forEach((grp, id) => {
      grp.visible = set.has(id);
    });
  };

  const update = (t) => {
    if (airBalloon && airBalloon.visible) {
      const a = t * 0.12;
      airBalloon.position.x = Math.cos(a) * 14;
      airBalloon.position.z = Math.sin(a) * 14 - 4;
      airBalloon.position.y = 9.5 + Math.sin(t * 1.4) * 0.8;
      airBalloon.rotation.y = -a;
    }
    if (diaCrown && diaCrown.parent?.visible) {
      diaCrown.rotation.y = t * 1.2;
      diaCrown.position.y = 2.2 + Math.sin(t * 2.5) * 0.18;
    }
  };

  return { syncMonuments, update };
}
