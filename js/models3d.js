// High-craft Animal Crossing-style 3D procedural textures, chibi characters & cozy farm world

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

// Iconic Animal Crossing soft triangle/clover grass texture
function createACGrassTexture(THREE) {
  return makeCanvasTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = '#7ED957';
    ctx.fillRect(0, 0, s, s);
    // Subtle warm sunlit patches
    ctx.fillStyle = '#8BE264';
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
    ctx.fillStyle = '#6AC946';
    for (let i = 0; i < 28; i++) {
      const rx = (i * 53) % s;
      const ry = (i * 97) % s;
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 12);
}

// Cozy Animal Crossing warm sandy dirt & soft stone path texture
function createACPathTexture(THREE) {
  return makeCanvasTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = '#F3D5A5';
    ctx.fillRect(0, 0, s, s);
    const stones = ['#E9C48B', '#F8E3BE', '#DFB678'];
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = stones[i % stones.length];
      const rx = (i * 67 + 13) % s;
      const ry = (i * 43 + 29) % s;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 10 + (i % 7), 7 + (i % 5), (i % 5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 8);
}

// Warm painted wood plank texture
function createWoodTexture(THREE, base = '#C68B59', grain = '#A86F3E') {
  return makeCanvasTex(THREE, 128, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = grain;
    for (let y = 0; y < s; y += 16) {
      ctx.fillRect(0, y, s, 2);
    }
  }, 2);
}

// Expressive Animal Crossing-style eyes with glossy white catchlights & soft blush cheeks
function addACEyes(THREE, parent, y, z, spread = 0.16, size = 0.062) {
  const blackMat = new THREE.MeshStandardMaterial({ color: '#1E1B2E', roughness: 0.15, metalness: 0.1 });
  const glintMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const cheekMat = new THREE.MeshStandardMaterial({ color: '#FF9EB5', roughness: 0.8 });

  const eyeGeo = new THREE.SphereGeometry(size, 12, 12);
  const glintGeo = new THREE.SphereGeometry(size * 0.36, 8, 8);
  const cheekGeo = new THREE.SphereGeometry(size * 0.95, 10, 10);

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, blackMat);
    eye.scale.set(0.95, 1.18, 0.8);
    eye.position.set(side * spread, y, z);
    parent.add(eye);

    // Bright Nintendo-style eye catchlight
    const glint = new THREE.Mesh(glintGeo, glintMat);
    glint.position.set(side * spread + 0.02, y + 0.025, z + size * 0.72);
    parent.add(glint);

    // Warm rosy blush
    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.scale.set(1.25, 0.7, 0.45);
    cheek.position.set(side * (spread + 0.095), y - 0.085, z - 0.02);
    parent.add(cheek);
  });
}

function enableShadows(root) {
  root.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.visible !== false) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function toyMat(THREE, color, roughness = 0.65) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

/**
 * Adorable Animal Crossing-proportioned 3D Wooju Explorer
 */
export function buildWooju3D(THREE) {
  const group = new THREE.Group();

  const skin = toyMat(THREE, '#FFE0BD', 0.6);
  const hair = toyMat(THREE, '#2B263B', 0.55);
  const hoodie = toyMat(THREE, '#4F8CFF', 0.7);
  const collar = toyMat(THREE, '#FFFFFF', 0.7);
  const shorts = toyMat(THREE, '#334155', 0.75);
  const shoe = toyMat(THREE, '#FF5C5C', 0.55);
  const rocket = toyMat(THREE, '#FFD43B', 0.4);
  const rocketTip = toyMat(THREE, '#FF7A2F', 0.45);

  // Stubby cute legs
  const legGeo = new THREE.CapsuleGeometry(0.14, 0.24, 8, 12);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.36, 0);
  const ll = new THREE.Mesh(legGeo, shorts);
  ll.position.y = -0.08;
  leftLeg.add(ll);
  const lShoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), shoe);
  lShoe.scale.set(1.0, 0.72, 1.35);
  lShoe.position.set(0, -0.26, 0.06);
  leftLeg.add(lShoe);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.36, 0);
  const rl = new THREE.Mesh(legGeo, shorts);
  rl.position.y = -0.08;
  rightLeg.add(rl);
  const rShoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), shoe);
  rShoe.scale.set(1.0, 0.72, 1.35);
  rShoe.position.set(0, -0.26, 0.06);
  rightLeg.add(rShoe);
  group.add(rightLeg);

  // Pear-shaped Animal Crossing torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.32, 10, 16), hoodie);
  torso.position.y = 0.76;
  group.add(torso);
  const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 10, 20), collar);
  hoodRim.rotation.x = Math.PI / 2;
  hoodRim.position.y = 1.06;
  group.add(hoodRim);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.12, 0.24, 8, 10);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 0.94, 0);
  const la = new THREE.Mesh(armGeo, hoodie);
  la.position.y = -0.13;
  leftArm.add(la);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skin);
  lHand.position.y = -0.3;
  leftArm.add(lHand);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 0.94, 0);
  const ra = new THREE.Mesh(armGeo, hoodie);
  ra.position.y = -0.13;
  rightArm.add(ra);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skin);
  rHand.position.y = -0.3;
  rightArm.add(rHand);
  group.add(rightArm);

  // Cute Yellow Rocket Backpack
  const pack = new THREE.Group();
  pack.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.44, 14), rocket));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 14), rocketTip);
  nose.position.y = 0.33;
  pack.add(nose);
  const windowRing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), toyMat(THREE, '#38BDF8', 0.2));
  windowRing.rotation.x = Math.PI / 2;
  windowRing.position.set(0, 0.05, -0.17);
  pack.add(windowRing);
  pack.position.set(0, 0.84, -0.44);
  group.add(pack);

  // Big Expressive Animal Crossing Head
  const head = new THREE.Group();
  head.position.y = 1.54;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.50, 22, 18), skin);
  head.add(face);
  // Cute round ears
  [-0.48, 0.48].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), skin);
    ear.position.set(ex, -0.02, 0);
    head.add(ear);
  });
  // Layered soft bob hair + bangs
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.525, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hair
  );
  hairCap.position.y = 0.04;
  head.add(hairCap);
  [-0.18, 0, 0.18].forEach((bx, i) => {
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), hair);
    bang.scale.set(1.0, 0.85, 0.7);
    bang.position.set(bx, 0.31 - (i === 1 ? 0.03 : 0), 0.41);
    head.add(bang);
  });
  // Tiny cute nose
  const noseDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), toyMat(THREE, '#FDBA74', 0.6));
  noseDot.position.set(0, -0.02, 0.49);
  head.add(noseDot);
  addACEyes(THREE, head, 0.03, 0.44, 0.17, 0.062);
  group.add(head);

  enableShadows(group);
  return { group, leftLeg, rightLeg, leftArm, rightArm, head };
}

/**
 * Builds high-craft Animal Crossing chibi 3D characters for all 12 story spots.
 */
export function buildSpotCharacter3D(THREE, spotId) {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);
  let itemMesh = null;
  const m = (col, r = 0.65) => toyMat(THREE, col, r);

  switch (spotId) {
    case 'farmer': {
      // Denim overalls + warm plaid-style red shirt + straw hat with ribbon
      const overalls = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.48, 10, 16), m('#3B82F6'));
      overalls.position.y = 0.82;
      bodyRoot.add(overalls);
      const shirt = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 14), m('#EF5350'));
      shirt.scale.set(1.03, 0.62, 1.03);
      shirt.position.y = 1.1;
      bodyRoot.add(shirt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), m('#FFE0BD', 0.6));
      head.position.y = 1.66;
      bodyRoot.add(head);
      addACEyes(THREE, bodyRoot, 1.68, 0.43, 0.16, 0.058);
      // Straw hat + red ribbon
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.86, 0.1, 24), m('#FDE047', 0.8));
      brim.position.y = 2.04;
      bodyRoot.add(brim);
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.48, 0.11, 18), m('#EF4444'));
      ribbon.position.y = 2.13;
      bodyRoot.add(ribbon);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.46, 0.34, 18), m('#FACC15', 0.8));
      crown.position.y = 2.28;
      bodyRoot.add(crown);
      // Cute 3D Raincloud above sad farmer
      const cloud = new THREE.Group();
      [[-0.24, 0, 0], [0.24, 0, 0], [0, 0.15, 0]].forEach(([cx, cy, cz]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), m('#93C5FD', 0.8));
        puff.position.set(cx, cy, cz);
        cloud.add(puff);
      });
      cloud.position.set(0, 2.9, 0);
      bodyRoot.add(cloud);
      itemMesh = cloud;
      break;
    }

    case 'frog': {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.09, 24), m('#22C55E', 0.6));
      pad.position.y = 0.05;
      group.add(pad);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 16), m('#4ADE80', 0.5));
      body.scale.set(1.15, 0.86, 1.05);
      body.position.y = 0.58;
      bodyRoot.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), m('#FEF9C3'));
      belly.position.set(0, 0.50, 0.24);
      bodyRoot.add(belly);
      [-0.25, 0.25].forEach((ex) => {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), m('#4ADE80', 0.5));
        bump.position.set(ex, 1.06, 0.20);
        bodyRoot.add(bump);
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), m('#FFFFFF', 0.3));
        white.position.set(ex, 1.08, 0.33);
        bodyRoot.add(white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), m('#1E1B2E', 0.15));
        pupil.position.set(ex, 1.08, 0.43);
        bodyRoot.add(pupil);
      });
      break;
    }

    case 'owl': {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 0.65, 16), m('#9A6136', 0.85));
      stump.position.y = 0.325;
      group.add(stump);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.56, 18, 16), m('#B46A3C'));
      body.scale.set(1.0, 1.15, 0.96);
      body.position.y = 1.24;
      bodyRoot.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), m('#FEF3C7'));
      belly.position.set(0, 1.14, 0.22);
      bodyRoot.add(belly);
      // Wings
      [-0.52, 0.52].forEach((wx) => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), m('#92400E'));
        wing.scale.set(0.55, 1.3, 0.9);
        wing.position.set(wx, 1.18, 0);
        bodyRoot.add(wing);
      });
      [-0.21, 0.21].forEach((ex) => {
        const ring = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 12), m('#FFFFFF', 0.4));
        ring.position.set(ex, 1.46, 0.40);
        bodyRoot.add(ring);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), m('#1E1B2E', 0.15));
        pupil.position.set(ex, 1.46, 0.54);
        bodyRoot.add(pupil);
      });
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 8), m('#F59E0B'));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.32, 0.58);
      bodyRoot.add(beak);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), m('#FEF08A', 0.2));
      bulb.position.set(0.78, 1.98, 0.15);
      bodyRoot.add(bulb);
      itemMesh = bulb;
      break;
    }

    case 'chicken': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.56, 18, 16), m('#FFFDF7'));
      body.scale.set(0.95, 0.9, 1.18);
      body.position.y = 0.66;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 14), m('#FFFDF7'));
      head.position.set(0, 1.28, 0.25);
      bodyRoot.add(head);
      addACEyes(THREE, bodyRoot, 1.32, 0.58, 0.15, 0.05);
      // Red scalloped comb
      [-0.08, 0.04, 0.16].forEach((cz, i) => {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.11 - i * 0.015, 10, 10), m('#EF4444'));
        c.position.set(0, 1.66 - i * 0.03, 0.22 + cz);
        bodyRoot.add(c);
      });
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 10), m('#F59E0B'));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.22, 0.68);
      bodyRoot.add(beak);
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.13, 10, 18), m('#D97706', 0.85));
      nest.rotation.x = Math.PI / 2;
      nest.position.set(0.88, 0.14, 0.35);
      group.add(nest);
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), m('#FEF3C7', 0.35));
      egg.scale.set(0.85, 1.2, 0.85);
      egg.position.set(0.88, 0.36, 0.35);
      bodyRoot.add(egg);
      itemMesh = egg;
      break;
    }

    case 'rabbit': {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.38, 10, 16), m('#FFF7ED'));
      body.position.y = 0.64;
      bodyRoot.add(body);
      const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.41, 0.38, 16), m('#F472B6'));
      shirt.position.y = 0.64;
      bodyRoot.add(shirt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 16), m('#FFF7ED'));
      head.position.y = 1.32;
      bodyRoot.add(head);
      addACEyes(THREE, bodyRoot, 1.34, 0.40, 0.16, 0.055);
      [-0.18, 0.18].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.58, 8, 12), m('#FFF7ED'));
        ear.position.set(ex, 2.0, -0.02);
        ear.rotation.z = ex < 0 ? 0.14 : -0.14;
        bodyRoot.add(ear);
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.44, 6, 10), m('#FBCFE8'));
        inner.position.set(ex, 1.98, 0.06);
        inner.rotation.z = ex < 0 ? 0.14 : -0.14;
        bodyRoot.add(inner);
      });
      const carrot = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 14), m('#FB923C', 0.5));
      cBody.rotation.x = Math.PI;
      carrot.add(cBody);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.4, 8), m('#22C55E'));
      leaf.position.y = 0.58;
      carrot.add(leaf);
      carrot.position.set(0.82, 0.68, 0.38);
      carrot.rotation.z = -0.35;
      bodyRoot.add(carrot);
      itemMesh = carrot;
      break;
    }

    case 'cow': {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.68, 10, 16), m('#FFFFFF'));
      body.rotation.x = Math.PI / 2;
      body.position.y = 0.84;
      bodyRoot.add(body);
      [[0.36, 0.98, -0.1, 0.27], [-0.34, 0.88, 0.16, 0.25]].forEach(([sx, sy, sz, r]) => {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m('#27272A'));
        sp.position.set(sx, sy, sz);
        bodyRoot.add(sp);
      });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 16), m('#FFFFFF'));
      head.position.set(0, 1.36, 0.68);
      bodyRoot.add(head);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 12), m('#FBCFE8'));
      snout.scale.set(1.25, 0.78, 0.8);
      snout.position.set(0, 1.20, 1.04);
      bodyRoot.add(snout);
      addACEyes(THREE, bodyRoot, 1.46, 1.06, 0.17, 0.055);
      // Cute golden cowbell
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), m('#FACC15', 0.3));
      bell.position.set(0, 0.92, 0.85);
      bodyRoot.add(bell);
      // Milk bottle prop
      const milk = new THREE.Group();
      milk.add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.58, 14), m('#F8FAFC', 0.25)));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.11, 12), m('#38BDF8', 0.35));
      cap.position.y = 0.34;
      milk.add(cap);
      milk.position.set(0.98, 0.36, 0.45);
      bodyRoot.add(milk);
      itemMesh = milk;
      break;
    }

    case 'horse_pony': {
      [[-0.48, 1.0, '#A16207', '#451A03'], [0.50, 0.74, '#D97706', '#78350F']].forEach(([ox, sc, col, maneCol]) => {
        const h = new THREE.Group();
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.56, 10, 14), m(col));
        b.rotation.x = Math.PI / 2;
        b.position.y = 0.86;
        h.add(b);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.65, 12), m(col));
        neck.position.set(0, 1.34, 0.35);
        neck.rotation.x = 0.3;
        h.add(neck);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), m(col));
        hd.scale.set(0.92, 0.96, 1.32);
        hd.position.set(0, 1.68, 0.58);
        h.add(hd);
        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.56, 0.26), m(maneCol));
        mane.position.set(0, 1.50, 0.16);
        h.add(mane);
        addACEyes(THREE, h, 1.74, 0.88, 0.15, 0.05);
        h.scale.setScalar(sc);
        h.position.x = ox;
        bodyRoot.add(h);
      });
      const corn = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.50, 8, 12), m('#FACC15', 0.45));
      corn.position.set(0, 0.58, 0.96);
      corn.rotation.z = 0.3;
      bodyRoot.add(corn);
      itemMesh = corn;
      break;
    }

    case 'cat_mouse': {
      const cat = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.36, 10, 14), m('#FB923C'));
      cBody.position.y = 0.64;
      cat.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), m('#FB923C'));
      cHead.position.y = 1.28;
      cat.add(cHead);
      [-0.24, 0.24].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.30, 8), m('#EA580C'));
        ear.position.set(ex, 1.72, 0);
        cat.add(ear);
      });
      addACEyes(THREE, cat, 1.30, 0.38, 0.16, 0.055);
      cat.position.x = -0.46;
      bodyRoot.add(cat);

      const mouse = new THREE.Group();
      const mBody = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), m('#94A3B8'));
      mBody.position.y = 0.42;
      mouse.add(mBody);
      [-0.24, 0.24].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), m('#CBD5E1'));
        ear.scale.set(1, 1, 0.42);
        ear.position.set(ex, 0.76, 0);
        mouse.add(ear);
      });
      addACEyes(THREE, mouse, 0.46, 0.30, 0.11, 0.045);
      mouse.position.set(0.58, 0, 0.25);
      bodyRoot.add(mouse);

      const fish = new THREE.Group();
      const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), m('#38BDF8', 0.3));
      fBody.scale.set(1.42, 0.85, 0.6);
      fish.add(fBody);
      const fTail = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.28, 6), m('#0284C7', 0.3));
      fTail.rotation.z = Math.PI / 2;
      fTail.position.x = -0.38;
      fish.add(fTail);
      fish.position.set(0.05, 1.52, 0.65);
      bodyRoot.add(fish);
      itemMesh = fish;
      break;
    }

    case 'duck': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 16), m('#FDE047'));
      body.scale.set(1, 0.88, 1.18);
      body.position.y = 0.58;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.40, 16, 14), m('#FDE047'));
      head.position.set(0, 1.20, 0.22);
      bodyRoot.add(head);
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.32), m('#F97316', 0.5));
      bill.position.set(0, 1.12, 0.64);
      bodyRoot.add(bill);
      addACEyes(THREE, bodyRoot, 1.28, 0.56, 0.15, 0.05);
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), m('#FFFFFF'));
      hat.position.set(0, 1.66, 0.20);
      bodyRoot.add(hat);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.35, 0.46, 16), m('#475569', 0.4));
      pot.position.set(0.88, 0.28, 0.35);
      bodyRoot.add(pot);
      itemMesh = pot;
      break;
    }

    case 'dog_goat': {
      const dog = new THREE.Group();
      const dBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.36, 10, 14), m('#F59E0B'));
      dBody.position.y = 0.56;
      dog.add(dBody);
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 14), m('#F59E0B'));
      dHead.position.y = 1.16;
      dog.add(dHead);
      [-0.34, 0.34].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.28, 6, 10), m('#B45309'));
        ear.position.set(ex, 1.12, 0.02);
        dog.add(ear);
      });
      addACEyes(THREE, dog, 1.18, 0.34, 0.14, 0.05);
      dog.position.x = -0.46;
      bodyRoot.add(dog);

      const goat = new THREE.Group();
      const gBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.36, 10, 14), m('#F8FAFC'));
      gBody.position.y = 0.56;
      goat.add(gBody);
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 14), m('#F8FAFC'));
      gHead.position.y = 1.14;
      goat.add(gHead);
      [-0.15, 0.15].forEach((ex) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), m('#CBD5E1'));
        horn.position.set(ex, 1.54, 0);
        goat.add(horn);
      });
      addACEyes(THREE, goat, 1.16, 0.33, 0.13, 0.05);
      goat.position.x = 0.46;
      bodyRoot.add(goat);

      const broom = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.28, 8), m('#92400E'));
      handle.position.y = 0.66;
      broom.add(handle);
      const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.44, 12), m('#FDE047'));
      bristles.position.y = 0.22;
      broom.add(bristles);
      broom.position.set(0, 0.1, 0.70);
      broom.rotation.z = 0.22;
      bodyRoot.add(broom);
      itemMesh = broom;
      break;
    }

    case 'donkey_sheep': {
      const donkey = new THREE.Group();
      const dkBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.40, 10, 14), m('#94A3B8'));
      dkBody.position.y = 0.64;
      donkey.add(dkBody);
      const dkHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 14), m('#94A3B8'));
      dkHead.position.y = 1.26;
      donkey.add(dkHead);
      [-0.15, 0.15].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.44, 6, 8), m('#64748B'));
        ear.position.set(ex, 1.72, 0);
        donkey.add(ear);
      });
      addACEyes(THREE, donkey, 1.28, 0.33, 0.13, 0.05);
      donkey.position.x = -0.48;
      bodyRoot.add(donkey);

      const sheep = new THREE.Group();
      // Multi-puff cloud wool!
      [[0, 0.64, 0, 0.44], [-0.25, 0.68, 0.15, 0.28], [0.25, 0.68, 0.15, 0.28], [0, 0.85, -0.12, 0.30]].forEach(([wx, wy, wz, r]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m('#FFFFFF', 0.85));
        puff.position.set(wx, wy, wz);
        sheep.add(puff);
      });
      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 12), m('#334155'));
      sHead.position.set(0, 1.0, 0.38);
      sheep.add(sHead);
      addACEyes(THREE, sheep, 1.04, 0.64, 0.12, 0.045);
      sheep.position.x = 0.50;
      bodyRoot.add(sheep);

      const note = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), m('#EC4899', 0.3));
      note.position.set(0, 1.82, 0.42);
      bodyRoot.add(note);
      itemMesh = note;
      break;
    }

    case 'pig_finale':
    default: {
      const pink = m('#F9A8D4', 0.55);
      const hotPink = m('#F472B6', 0.5);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 18), pink);
      body.scale.set(1.06, 0.98, 1.08);
      body.position.y = 0.86;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.50, 20, 18), pink);
      head.position.set(0, 1.60, 0.18);
      bodyRoot.add(head);
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.20, 16), hotPink);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 1.52, 0.66);
      bodyRoot.add(snout);
      addACEyes(THREE, bodyRoot, 1.70, 0.60, 0.18, 0.062);
      [-0.34, 0.34].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 10), hotPink);
        ear.position.set(ex, 2.04, 0.14);
        ear.rotation.z = ex < 0 ? 0.55 : -0.55;
        bodyRoot.add(ear);
      });
      // Iconic 3D Curly Tail!
      const tail = new THREE.Mesh(new THREE.TorusKnotGeometry(0.16, 0.048, 40, 8, 2, 3), hotPink);
      tail.position.set(0, 0.84, -0.74);
      bodyRoot.add(tail);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), m('#FACC15', 0.25));
      star.position.set(0, 2.45, 0.15);
      bodyRoot.add(star);
      itemMesh = star;
      break;
    }
  }

  enableShadows(group);
  return { group, bodyRoot, itemMesh };
}

/**
 * Builds an authentic Animal Crossing: New Horizons-inspired sunlit 3D farm village!
 */
export function buildFarmWorld3D(THREE, scene) {
  const grassTex = createACGrassTexture(THREE);
  const pathTex = createACPathTexture(THREE);
  const woodTex = createWoodTexture(THREE, '#C68B59', '#9E6234');

  // Soft sunlit grass island with iconic AC triangle grass texture
  const groundMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(21.5, 23.0, 2.0, 56),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 })
  );
  groundMesh.position.y = -1.0;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Rolling green distant rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(21.6, 0.95, 12, 56),
    toyMat(THREE, '#65C449', 0.9)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.22;
  rim.receiveShadow = true;
  scene.add(rim);

  // Warm stone/dirt circular Animal Crossing village path
  const pathRing = new THREE.Mesh(
    new THREE.RingGeometry(10.3, 14.1, 56),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9, side: THREE.DoubleSide })
  );
  pathRing.rotation.x = -Math.PI / 2;
  pathRing.position.y = 0.02;
  pathRing.receiveShadow = true;
  scene.add(pathRing);

  const centerPath = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 12.8),
    new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9 })
  );
  centerPath.rotation.x = -Math.PI / 2;
  centerPath.position.set(0, 0.025, 6.2);
  centerPath.receiveShadow = true;
  scene.add(centerPath);

  // Central Wooden Dance Stage with wood-grain deck & festive light poles
  const stageDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.7, 4.0, 0.38, 36),
    new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 })
  );
  stageDeck.position.set(0, 0.19, 0);
  stageDeck.castShadow = true;
  stageDeck.receiveShadow = true;
  scene.add(stageDeck);

  const stageTop = new THREE.Mesh(
    new THREE.CylinderGeometry(3.35, 3.35, 0.06, 36),
    toyMat(THREE, '#FEF3C7', 0.85)
  );
  stageTop.position.set(0, 0.40, 0);
  stageTop.receiveShadow = true;
  scene.add(stageTop);

  [[-2.9, -2.3], [2.9, -2.3], [-2.9, 2.3], [2.9, 2.3]].forEach(([px, pz], i) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.8, 10), toyMat(THREE, '#9A6136', 0.85));
    post.position.set(px, 1.55, pz);
    post.castShadow = true;
    scene.add(post);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({
        color: ['#FACC15', '#F472B6', '#38BDF8', '#4ADE80'][i],
        emissive: ['#F59E0B', '#EC4899', '#0284C7', '#16A34A'][i],
        emissiveIntensity: 0.35,
        roughness: 0.3,
      })
    );
    bulb.position.set(px, 3.0, pz);
    scene.add(bulb);
  });

  // Cozy Detailed Red Barn (north landmark) with hay bales & hayloft window
  const barn = new THREE.Group();
  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.5, 5.2), toyMat(THREE, '#E5484D', 0.78));
  barnBody.position.y = 2.25;
  barn.add(barnBody);
  const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(6.3, 2.8, 4), toyMat(THREE, '#881337', 0.75));
  barnRoof.rotation.y = Math.PI / 4;
  barnRoof.position.y = 5.85;
  barn.add(barnRoof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.24), toyMat(THREE, '#FFFBEB', 0.8));
  door.position.set(0, 1.5, 2.62);
  barn.add(door);
  const trim1 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 3.3, 0.30), toyMat(THREE, '#FFFFFF', 0.7));
  trim1.position.set(0, 1.5, 2.65);
  trim1.rotation.z = 0.65;
  barn.add(trim1);
  const trim2 = trim1.clone();
  trim2.rotation.z = -0.65;
  barn.add(trim2);
  // Hayloft window
  const loft = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.24), toyMat(THREE, '#FEF08A', 0.4));
  loft.position.set(0, 3.65, 2.62);
  barn.add(loft);
  // Cute round hay bales outside barn
  [[-4.8, 0.65, 1.8], [-3.7, 0.65, 2.4]].forEach(([hx, hy, hz]) => {
    const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.9, 14), toyMat(THREE, '#FACC15', 0.9));
    hay.rotation.z = Math.PI / 2;
    hay.position.set(hx, hy, hz);
    barn.add(hay);
  });
  barn.position.set(-0.6, 0, -17.8);
  enableShadows(barn);
  scene.add(barn);

  // Shimmering Blue Pond with Stone Border near Cat & Mouse
  const pondBorder = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.28, 10, 28), toyMat(THREE, '#CBD5E1', 0.85));
  pondBorder.rotation.x = Math.PI / 2;
  pondBorder.position.set(11.6, 0.08, -11.0);
  scene.add(pondBorder);
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(3.05, 3.05, 0.1, 28),
    new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.18, metalness: 0.1 })
  );
  pond.position.set(11.6, 0.04, -11.0);
  scene.add(pond);

  // Connected Animal Crossing Wooden Perimeter Fences (posts + horizontal rails)
  const fenceMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
  const fenceCount = 26;
  const fenceR = 17.6;
  for (let i = 0; i < fenceCount; i++) {
    const a1 = (i / fenceCount) * Math.PI * 2;
    const a2 = ((i + 1) / fenceCount) * Math.PI * 2;
    if (Math.abs(a1 - Math.PI / 2) < 0.25) continue;
    const x1 = Math.cos(a1) * fenceR, z1 = Math.sin(a1) * fenceR;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.25, 8), fenceMat);
    post.position.set(x1, 0.62, z1);
    post.castShadow = true;
    scene.add(post);

    if (Math.abs(a2 - Math.PI / 2) >= 0.25) {
      const x2 = Math.cos(a2) * fenceR, z2 = Math.sin(a2) * fenceR;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const midX = (x1 + x2) / 2, midZ = (z1 + z2) / 2;
      const yaw = Math.atan2(x2 - x1, z2 - z1);
      [0.45, 0.9].forEach((ry) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, len), fenceMat);
        rail.position.set(midX, ry, midZ);
        rail.rotation.y = yaw;
        rail.castShadow = true;
        scene.add(rail);
      });
    }
  }

  // Iconic Animal Crossing Fluffy Fruit Trees (3-puff foliage + cute apples/oranges!)
  const treeCoords = [
    [-16.4, 8.8], [-17.4, -3.5], [-14.4, -14.2], [8.0, -16.5],
    [16.8, -4.5], [16.5, 7.8], [12.4, 14.5], [-12.4, 14.8]
  ];
  const trunkMat = toyMat(THREE, '#9A6136', 0.88);
  const foliageMats = [toyMat(THREE, '#34B44A', 0.78), toyMat(THREE, '#4AC759', 0.78), toyMat(THREE, '#289E3E', 0.78)];
  const fruitMats = [toyMat(THREE, '#FF5C5C', 0.35), toyMat(THREE, '#FFA94D', 0.35)];

  treeCoords.forEach(([tx, tz], idx) => {
    const tg = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.56, 2.2, 12), trunkMat);
    trunk.position.y = 1.1;
    tg.add(trunk);
    // 3 lush layered puffs (iconic AC silhouette)
    const puffCoords = [[0, 3.05, 0, 1.65], [-0.95, 2.55, 0.35, 1.15], [0.95, 2.6, -0.25, 1.15], [0, 3.85, -0.1, 1.15]];
    puffCoords.forEach(([px, py, pz, r], pIdx) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), foliageMats[(idx + pIdx) % 3]);
      puff.position.set(px, py, pz);
      tg.add(puff);
    });
    // Cute hanging fruits!
    const fMat = fruitMats[idx % 2];
    [[-0.85, 2.25, 1.1], [0.75, 2.45, 1.05], [0.1, 3.15, 1.35]].forEach(([fx, fy, fz]) => {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), fMat);
      fruit.position.set(fx, fy, fz);
      tg.add(fruit);
    });
    tg.position.set(tx, 0, tz);
    enableShadows(tg);
    scene.add(tg);
  });

  // Real 5-Petal Animal Crossing Flowers!
  const petalCols = ['#FF85A1', '#FFD43B', '#FFA94D', '#C084FC', '#FFFFFF'];
  const centerMat = toyMat(THREE, '#FACC15', 0.5);
  const stemMat = toyMat(THREE, '#22C55E', 0.8);
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const rad = i % 2 === 0 ? 6.6 : 15.6;
    const fg = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6), stemMat);
    stem.position.y = 0.19;
    fg.add(stem);
    const pMat = toyMat(THREE, petalCols[i % petalCols.length], 0.6);
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), pMat);
      pet.scale.set(1, 0.45, 1);
      pet.position.set(Math.cos(pa) * 0.14, 0.38, Math.sin(pa) * 0.14);
      fg.add(pet);
    }
    const cen = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), centerMat);
    cen.position.y = 0.40;
    fg.add(cen);
    fg.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    scene.add(fg);
  }

  // Fluffy Drifting 3D Sky Clouds (lowered slightly so they frame the horizon camera!)
  const clouds = [];
  const cloudMat = toyMat(THREE, '#FFFFFF', 0.9);
  [[-14, 9.5, -18], [10, 10.5, -20], [-2, 11.2, -24], [18, 9.8, -10], [-20, 10.0, -8]].forEach(([cx, cy, cz]) => {
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
