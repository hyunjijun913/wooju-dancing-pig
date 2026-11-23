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
 * Loads Wooju's 3D Animated Character Model (Kenney Mini-Character + Skeletal Animations)
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

  return {
    group,
    setAnim: ctrl.setAnim,
    updateMixer: ctrl.updateMixer,
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

  return {
    group,
    bodyRoot,
    itemMesh,
    setAnim: ctrl.setAnim,
    updateMixer: ctrl.updateMixer,
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

  // 1. Landmark Village Buildings (Quaternius & Kenney Fantasy Town)
  placeProp('assets/models/quaternius/Stable.glb', 6.2, -3.2, -18.2, 0);
  placeProp('assets/models/quaternius/Hay.glb', 1.4, -7.2, -16.2, 0.4);
  placeProp('assets/models/quaternius/Hay.glb', 1.2, -6.1, -15.4, -0.3);
  placeProp('assets/models/fantasy-town/windmill.glb', 8.2, 5.8, -17.8, -0.25);
  placeProp('assets/models/quaternius/House_1.glb', 5.8, -17.2, -8.2, Math.PI * 0.35);
  placeProp('assets/models/quaternius/House_2.glb', 5.8, 17.5, -5.8, -Math.PI * 0.35);
  placeProp('assets/models/quaternius/Gazebo.glb', 5.4, 0, -5.2, 0);
  placeProp('assets/models/quaternius/Well.glb', 2.8, -8.5, -14.8, 0.2);

  // 2. Market Stalls, Cart, Signpost, Pond Bridge & Stage Lanterns/Banners
  placeProp('assets/models/fantasy-town/stall-green.glb', 3.2, -15.2, -2.5, Math.PI * 0.45);
  placeProp('assets/models/fantasy-town/stall-red.glb', 3.2, 15.6, -1.2, -Math.PI * 0.45);
  placeProp('assets/models/fantasy-town/cart.glb', 2.1, 1.5, -15.8, 0.3);
  placeProp('assets/models/nature/sign.glb', 1.8, 2.4, 13.8, -0.3);
  placeProp('assets/models/nature/bridge_woodRound.glb', 1.3, 11.8, -11.0, 0.6);
  placeProp('assets/models/nature/lily_large.glb', 0.15, 10.6, -10.2, 0);
  placeProp('assets/models/nature/lily_large.glb', 0.15, 12.9, -11.8, 1.2);

  // Festive lanterns & banners around the central dance stage
  [[-3.2, -2.4], [3.2, -2.4], [-3.2, 2.4], [3.2, 2.4]].forEach(([lx, lz]) => {
    placeProp('assets/models/fantasy-town/lantern.glb', 2.6, lx, lz, 0);
  });
  placeProp('assets/models/fantasy-town/banner-red.glb', 2.8, -3.5, -3.5, 0.3);
  placeProp('assets/models/fantasy-town/banner-red.glb', 2.8, 3.5, -3.5, -0.3);

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
