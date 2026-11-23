// Procedural Animal Crossing-style 3D chibi characters & farm world models (100% 3D, zero 2D photo circles)

function addEyes(THREE, parent, y, z, spread = 0.16, size = 0.055) {
  const eyeMat = new THREE.MeshLambertMaterial({ color: '#1E293B' });
  const cheekMat = new THREE.MeshLambertMaterial({ color: '#FDA4AF' });
  const eyeGeo = new THREE.SphereGeometry(size, 10, 10);
  const cheekGeo = new THREE.SphereGeometry(size * 0.9, 8, 8);
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * spread, y, z);
    parent.add(eye);
    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.scale.set(1.2, 0.7, 0.5);
    cheek.position.set(side * (spread + 0.08), y - 0.08, z - 0.02);
    parent.add(cheek);
  });
}

function addShadowDisc(THREE, parent, radius = 0.75) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  parent.add(shadow);
}

/**
 * Cute 6-year-old Wooju chibi 3D explorer with blue hoodie, yellow rocket pack & animated limbs.
 */
export function buildWooju3D(THREE) {
  const group = new THREE.Group();
  addShadowDisc(THREE, group, 0.72);

  const skinMat = new THREE.MeshLambertMaterial({ color: '#FED7AA' });
  const hairMat = new THREE.MeshLambertMaterial({ color: '#1E293B' });
  const hoodieMat = new THREE.MeshLambertMaterial({ color: '#3B82F6' });
  const pantsMat = new THREE.MeshLambertMaterial({ color: '#1D4ED8' });
  const shoeMat = new THREE.MeshLambertMaterial({ color: '#EF4444' });
  const rocketMat = new THREE.MeshLambertMaterial({ color: '#FACC15' });
  const finMat = new THREE.MeshLambertMaterial({ color: '#F97316' });

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.14, 0.25, 6, 10);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.36, 0);
  const llMesh = new THREE.Mesh(legGeo, pantsMat);
  llMesh.position.y = -0.1;
  leftLeg.add(llMesh);
  const lShoe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), shoeMat);
  lShoe.scale.set(1, 0.7, 1.3);
  lShoe.position.set(0, -0.28, 0.05);
  leftLeg.add(lShoe);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.36, 0);
  const rlMesh = new THREE.Mesh(legGeo, pantsMat);
  rlMesh.position.y = -0.1;
  rightLeg.add(rlMesh);
  const rShoe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), shoeMat);
  rShoe.scale.set(1, 0.7, 1.3);
  rShoe.position.set(0, -0.28, 0.05);
  rightLeg.add(rShoe);
  group.add(rightLeg);

  // Chibi Hoodie Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.32, 8, 14), hoodieMat);
  torso.position.y = 0.78;
  group.add(torso);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.12, 0.24, 6, 10);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 0.94, 0);
  const laMesh = new THREE.Mesh(armGeo, hoodieMat);
  laMesh.position.y = -0.14;
  leftArm.add(laMesh);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), skinMat);
  lHand.position.y = -0.3;
  leftArm.add(lHand);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 0.94, 0);
  const raMesh = new THREE.Mesh(armGeo, hoodieMat);
  raMesh.position.y = -0.14;
  rightArm.add(raMesh);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), skinMat);
  rHand.position.y = -0.3;
  rightArm.add(rHand);
  group.add(rightArm);

  // Rocket Backpack
  const pack = new THREE.Group();
  const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.44, 12), rocketMat);
  pack.add(rBody);
  const rNose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 12), finMat);
  rNose.position.y = 0.32;
  pack.add(rNose);
  pack.position.set(0, 0.85, -0.42);
  group.add(pack);

  // Big cute Animal Crossing head
  const head = new THREE.Group();
  head.position.y = 1.48;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 16), skinMat);
  head.add(face);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.485, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hair.position.y = 0.03;
  head.add(hair);
  // Cute bangs tuft
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), hairMat);
  tuft.position.set(0, 0.32, 0.36);
  head.add(tuft);
  addEyes(THREE, head, 0.02, 0.41, 0.16, 0.055);
  group.add(head);

  return { group, leftLeg, rightLeg, leftArm, rightArm, head };
}

/**
 * Builds a cute, unmistakable 100% 3D Animal Crossing-style character (+ story item prop) for each of the 12 spots.
 */
export function buildSpotCharacter3D(THREE, spotId) {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);
  let itemMesh = null;

  const mat = (color) => new THREE.MeshLambertMaterial({ color });

  switch (spotId) {
    case 'farmer': {
      addShadowDisc(THREE, group, 0.9);
      const overalls = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.5, 8, 14), mat('#2563EB'));
      overalls.position.y = 0.82;
      bodyRoot.add(overalls);
      const shirt = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), mat('#F87171'));
      shirt.scale.set(1.02, 0.65, 1.02);
      shirt.position.y = 1.08;
      bodyRoot.add(shirt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 14), mat('#FED7AA'));
      head.position.y = 1.62;
      bodyRoot.add(head);
      addEyes(THREE, bodyRoot, 1.64, 0.39, 0.15, 0.05);
      // Straw hat
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.78, 0.09, 20), mat('#FDE047'));
      brim.position.y = 1.98;
      bodyRoot.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.34, 16), mat('#FACC15'));
      crown.position.y = 2.18;
      bodyRoot.add(crown);
      // Little sad raincloud above farmer (itemMesh turns golden/hidden when happy)
      const cloud = new THREE.Group();
      [[-0.22, 0, 0], [0.22, 0, 0], [0, 0.14, 0]].forEach(([cx, cy, cz]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), mat('#93C5FD'));
        puff.position.set(cx, cy, cz);
        cloud.add(puff);
      });
      cloud.position.set(0, 2.75, 0);
      bodyRoot.add(cloud);
      itemMesh = cloud;
      break;
    }

    case 'frog': {
      // Lily pad + cute plump green frog with big top eyes
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 22), mat('#22C55E'));
      pad.position.y = 0.05;
      group.add(pad);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 14), mat('#4ADE80'));
      body.scale.set(1.15, 0.85, 1.05);
      body.position.y = 0.56;
      bodyRoot.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mat('#FEF08A'));
      belly.position.set(0, 0.48, 0.25);
      bodyRoot.add(belly);
      [-0.24, 0.24].forEach((ex) => {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat('#4ADE80'));
        bump.position.set(ex, 1.04, 0.22);
        bodyRoot.add(bump);
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), mat('#FFFFFF'));
        white.position.set(ex, 1.06, 0.34);
        bodyRoot.add(white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat('#1E293B'));
        pupil.position.set(ex, 1.06, 0.43);
        bodyRoot.add(pupil);
      });
      break;
    }

    case 'owl': {
      // Tree stump + fluffy brown baby owl + glowing idea lightbulb
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 0.65, 14), mat('#92400E'));
      stump.position.y = 0.325;
      group.add(stump);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), mat('#B45309'));
      body.scale.set(1.0, 1.15, 0.95);
      body.position.y = 1.22;
      bodyRoot.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mat('#FEF3C7'));
      belly.position.set(0, 1.12, 0.22);
      bodyRoot.add(belly);
      [-0.2, 0.2].forEach((ex) => {
        const ring = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat('#FFFFFF'));
        ring.position.set(ex, 1.44, 0.4);
        bodyRoot.add(ring);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat('#1E293B'));
        pupil.position.set(ex, 1.44, 0.53);
        bodyRoot.add(pupil);
      });
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), mat('#F59E0B'));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.32, 0.56);
      bodyRoot.add(beak);
      // Glowing lightbulb idea prop
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), mat('#FEF08A'));
      bulb.position.set(0.75, 1.95, 0.15);
      bodyRoot.add(bulb);
      itemMesh = bulb;
      break;
    }

    case 'chicken': {
      addShadowDisc(THREE, group, 0.85);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), mat('#FFFFFF'));
      body.scale.set(0.95, 0.9, 1.15);
      body.position.y = 0.65;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), mat('#FFFFFF'));
      head.position.set(0, 1.25, 0.25);
      bodyRoot.add(head);
      addEyes(THREE, bodyRoot, 1.28, 0.56, 0.14, 0.045);
      const comb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat('#EF4444'));
      comb.scale.set(0.5, 1.2, 1.4);
      comb.position.set(0, 1.62, 0.25);
      bodyRoot.add(comb);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 8), mat('#F59E0B'));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.2, 0.65);
      bodyRoot.add(beak);
      // Nest + Egg prop
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.12, 8, 16), mat('#D97706'));
      nest.rotation.x = Math.PI / 2;
      nest.position.set(0.85, 0.14, 0.35);
      group.add(nest);
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), mat('#FEF3C7'));
      egg.scale.set(0.85, 1.18, 0.85);
      egg.position.set(0.85, 0.34, 0.35);
      bodyRoot.add(egg);
      itemMesh = egg;
      break;
    }

    case 'rabbit': {
      addShadowDisc(THREE, group, 0.85);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.36, 8, 14), mat('#FFF7ED'));
      body.position.y = 0.62;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), mat('#FFF7ED'));
      head.position.y = 1.26;
      bodyRoot.add(head);
      addEyes(THREE, bodyRoot, 1.28, 0.37, 0.15, 0.05);
      // Tall cute bunny ears
      [-0.17, 0.17].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 6, 10), mat('#FFF7ED'));
        ear.position.set(ex, 1.92, -0.02);
        ear.rotation.z = ex < 0 ? 0.14 : -0.14;
        bodyRoot.add(ear);
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.42, 6, 8), mat('#FBCFE8'));
        inner.position.set(ex, 1.9, 0.05);
        inner.rotation.z = ex < 0 ? 0.14 : -0.14;
        bodyRoot.add(inner);
      });
      // Big 3D orange carrot prop
      const carrot = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 12), mat('#F97316'));
      cBody.rotation.x = Math.PI;
      carrot.add(cBody);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 8), mat('#22C55E'));
      leaf.position.y = 0.55;
      carrot.add(leaf);
      carrot.position.set(0.78, 0.65, 0.38);
      carrot.rotation.z = -0.35;
      bodyRoot.add(carrot);
      itemMesh = carrot;
      break;
    }

    case 'cow': {
      addShadowDisc(THREE, group, 1.05);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.65, 8, 14), mat('#FFFFFF'));
      body.rotation.x = Math.PI / 2;
      body.position.y = 0.82;
      bodyRoot.add(body);
      // Black cow spots
      const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), mat('#1E293B'));
      spot1.position.set(0.36, 0.96, -0.1);
      bodyRoot.add(spot1);
      const spot2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), mat('#1E293B'));
      spot2.position.set(-0.34, 0.88, 0.15);
      bodyRoot.add(spot2);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 14), mat('#FFFFFF'));
      head.position.set(0, 1.32, 0.68);
      bodyRoot.add(head);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat('#FBCFE8'));
      snout.scale.set(1.25, 0.78, 0.8);
      snout.position.set(0, 1.18, 1.02);
      bodyRoot.add(snout);
      addEyes(THREE, bodyRoot, 1.42, 1.05, 0.16, 0.05);
      // Milk bottle prop
      const milk = new THREE.Group();
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 12), mat('#F8FAFC'));
      milk.add(bottle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12), mat('#38BDF8'));
      cap.position.y = 0.32;
      milk.add(cap);
      milk.position.set(0.95, 0.34, 0.45);
      bodyRoot.add(milk);
      itemMesh = milk;
      break;
    }

    case 'horse_pony': {
      addShadowDisc(THREE, group, 1.15);
      // Horse (left) + smaller Pony (right)
      [[-0.45, 1.0, '#92400E', '#451A03'], [0.48, 0.72, '#D97706', '#78350F']].forEach(([ox, sc, col, maneCol]) => {
        const h = new THREE.Group();
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.55, 8, 12), mat(col));
        b.rotation.x = Math.PI / 2;
        b.position.y = 0.85;
        h.add(b);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.65, 10), mat(col));
        neck.position.set(0, 1.32, 0.35);
        neck.rotation.x = 0.3;
        h.add(neck);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), mat(col));
        hd.scale.set(0.9, 0.95, 1.3);
        hd.position.set(0, 1.66, 0.58);
        h.add(hd);
        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.25), mat(maneCol));
        mane.position.set(0, 1.48, 0.16);
        h.add(mane);
        addEyes(THREE, h, 1.72, 0.86, 0.14, 0.045);
        h.scale.setScalar(sc);
        h.position.x = ox;
        bodyRoot.add(h);
      });
      // Golden Corn prop
      const corn = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.48, 8, 10), mat('#FACC15'));
      corn.position.set(0, 0.55, 0.95);
      corn.rotation.z = 0.3;
      bodyRoot.add(corn);
      itemMesh = corn;
      break;
    }

    case 'cat_mouse': {
      addShadowDisc(THREE, group, 1.05);
      // Orange tabby cat
      const cat = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.35, 8, 12), mat('#FB923C'));
      cBody.position.y = 0.62;
      cat.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 14), mat('#FB923C'));
      cHead.position.y = 1.24;
      cat.add(cHead);
      [-0.22, 0.22].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 6), mat('#EA580C'));
        ear.position.set(ex, 1.66, 0);
        cat.add(ear);
      });
      addEyes(THREE, cat, 1.26, 0.36, 0.15, 0.05);
      cat.position.x = -0.45;
      bodyRoot.add(cat);

      // Cute gray mouse beside cat
      const mouse = new THREE.Group();
      const mBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), mat('#94A3B8'));
      mBody.position.y = 0.4;
      mouse.add(mBody);
      [-0.22, 0.22].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), mat('#CBD5E1'));
        ear.scale.set(1, 1, 0.4);
        ear.position.set(ex, 0.72, 0);
        mouse.add(ear);
      });
      addEyes(THREE, mouse, 0.44, 0.28, 0.1, 0.04);
      mouse.position.set(0.55, 0, 0.25);
      bodyRoot.add(mouse);

      // Blue 3D Fish prop
      const fish = new THREE.Group();
      const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat('#38BDF8'));
      fBody.scale.set(1.4, 0.85, 0.6);
      fish.add(fBody);
      const fTail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 6), mat('#0284C7'));
      fTail.rotation.z = Math.PI / 2;
      fTail.position.x = -0.36;
      fish.add(fTail);
      fish.position.set(0.05, 1.45, 0.62);
      bodyRoot.add(fish);
      itemMesh = fish;
      break;
    }

    case 'duck': {
      addShadowDisc(THREE, group, 0.85);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 14), mat('#FDE047'));
      body.scale.set(1, 0.88, 1.18);
      body.position.y = 0.56;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), mat('#FDE047'));
      head.position.set(0, 1.16, 0.22);
      bodyRoot.add(head);
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.3), mat('#F97316'));
      bill.position.set(0, 1.08, 0.62);
      bodyRoot.add(bill);
      addEyes(THREE, bodyRoot, 1.24, 0.54, 0.14, 0.045);
      // White chef hat
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mat('#FFFFFF'));
      hat.position.set(0, 1.62, 0.2);
      bodyRoot.add(hat);
      // Cooking pot prop
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.45, 14), mat('#475569'));
      pot.position.set(0.85, 0.28, 0.35);
      bodyRoot.add(pot);
      itemMesh = pot;
      break;
    }

    case 'dog_goat': {
      addShadowDisc(THREE, group, 1.1);
      // Golden Puppy (left)
      const dog = new THREE.Group();
      const dBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.34, 8, 12), mat('#F59E0B'));
      dBody.position.y = 0.55;
      dog.add(dBody);
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), mat('#F59E0B'));
      dHead.position.y = 1.12;
      dog.add(dHead);
      [-0.32, 0.32].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 6, 8), mat('#B45309'));
        ear.position.set(ex, 1.08, 0.02);
        dog.add(ear);
      });
      addEyes(THREE, dog, 1.15, 0.32, 0.13, 0.045);
      dog.position.x = -0.45;
      bodyRoot.add(dog);

      // Fluffy White Goat (right)
      const goat = new THREE.Group();
      const gBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.34, 8, 12), mat('#F8FAFC'));
      gBody.position.y = 0.55;
      goat.add(gBody);
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), mat('#F8FAFC'));
      gHead.position.y = 1.1;
      goat.add(gHead);
      [-0.14, 0.14].forEach((ex) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 8), mat('#CBD5E1'));
        horn.position.set(ex, 1.48, 0);
        goat.add(horn);
      });
      addEyes(THREE, goat, 1.12, 0.31, 0.12, 0.045);
      goat.position.x = 0.45;
      bodyRoot.add(goat);

      // Straw Broom prop
      const broom = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8), mat('#92400E'));
      handle.position.y = 0.65;
      broom.add(handle);
      const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 10), mat('#FDE047'));
      bristles.position.y = 0.2;
      broom.add(bristles);
      broom.position.set(0, 0.1, 0.68);
      broom.rotation.z = 0.22;
      bodyRoot.add(broom);
      itemMesh = broom;
      break;
    }

    case 'donkey_sheep': {
      addShadowDisc(THREE, group, 1.1);
      // Gray Donkey (left)
      const donkey = new THREE.Group();
      const dkBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.38, 8, 12), mat('#94A3B8'));
      dkBody.position.y = 0.62;
      donkey.add(dkBody);
      const dkHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), mat('#94A3B8'));
      dkHead.position.y = 1.22;
      donkey.add(dkHead);
      [-0.14, 0.14].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 6, 8), mat('#64748B'));
        ear.position.set(ex, 1.66, 0);
        donkey.add(ear);
      });
      addEyes(THREE, donkey, 1.24, 0.31, 0.12, 0.045);
      donkey.position.x = -0.48;
      bodyRoot.add(donkey);

      // Fluffy Cloud Sheep (right)
      const sheep = new THREE.Group();
      const wool = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), mat('#FFFFFF'));
      wool.position.y = 0.62;
      sheep.add(wool);
      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), mat('#334155'));
      sHead.position.set(0, 0.96, 0.36);
      sheep.add(sHead);
      addEyes(THREE, sheep, 1.0, 0.62, 0.11, 0.04);
      sheep.position.x = 0.48;
      bodyRoot.add(sheep);

      // Floating Golden Music Note prop
      const note = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat('#EC4899'));
      note.position.set(0, 1.75, 0.4);
      bodyRoot.add(note);
      itemMesh = note;
      break;
    }

    case 'pig_finale':
    default: {
      addShadowDisc(THREE, group, 0.95);
      const pink = mat('#F9A8D4');
      const hotPink = mat('#F472B6');
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.64, 18, 16), pink);
      body.scale.set(1.05, 0.98, 1.08);
      body.position.y = 0.85;
      bodyRoot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 16), pink);
      head.position.set(0, 1.56, 0.18);
      bodyRoot.add(head);
      // Iconic pig snout
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.18, 14), hotPink);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 1.48, 0.64);
      bodyRoot.add(snout);
      addEyes(THREE, bodyRoot, 1.66, 0.58, 0.17, 0.055);
      // Cute floppy ears
      [-0.32, 0.32].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 8), hotPink);
        ear.position.set(ex, 1.98, 0.14);
        ear.rotation.z = ex < 0 ? 0.55 : -0.55;
        bodyRoot.add(ear);
      });
      // Iconic 3D Curly Tail!
      const tail = new THREE.Mesh(new THREE.TorusKnotGeometry(0.15, 0.045, 36, 8, 2, 3), hotPink);
      tail.position.set(0, 0.82, -0.72);
      bodyRoot.add(tail);
      // Sparkle star above dancing pig
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), mat('#FACC15'));
      star.position.set(0, 2.38, 0.15);
      bodyRoot.add(star);
      itemMesh = star;
      break;
    }
  }

  return { group, bodyRoot, itemMesh };
}

/**
 * Builds the cozy Animal Crossing-style 3D farm environment (barn, fences, garden, pond, trees, clouds, central stage).
 */
export function buildFarmWorld3D(THREE, scene) {
  const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

  // Lush rounded grass island
  const groundMesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 21.5, 1.6, 48), mat('#86EFAC'));
  groundMesh.position.y = -0.8;
  scene.add(groundMesh);

  // Soft outer rim hill
  const rim = new THREE.Mesh(new THREE.TorusGeometry(20.1, 0.7, 10, 48), mat('#4ADE80'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.15;
  scene.add(rim);

  // Warm cream-tan circular story path
  const pathRing = new THREE.Mesh(
    new THREE.RingGeometry(10.4, 14.0, 48),
    mat('#FDE68A', { side: THREE.DoubleSide })
  );
  pathRing.rotation.x = -Math.PI / 2;
  pathRing.position.y = 0.02;
  scene.add(pathRing);

  // Entry path to central stage
  const centerPath = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 12.6), mat('#FDE68A'));
  centerPath.rotation.x = -Math.PI / 2;
  centerPath.position.set(0, 0.025, 6.2);
  scene.add(centerPath);

  // Central Wooden Dance Stage (Zone 4)
  const stageDeck = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.36, 32), mat('#D97706'));
  stageDeck.position.set(0, 0.18, 0);
  scene.add(stageDeck);
  const stageTop = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.06, 32), mat('#FEF3C7'));
  stageTop.position.set(0, 0.38, 0);
  scene.add(stageTop);
  // Festive party posts around stage
  [[-2.8, -2.2], [2.8, -2.2], [-2.8, 2.2], [2.8, 2.2]].forEach(([px, pz], i) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 8), mat('#92400E'));
    post.position.set(px, 1.5, pz);
    scene.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), mat(['#FACC15', '#F472B6', '#38BDF8', '#4ADE80'][i]));
    bulb.position.set(px, 2.85, pz);
    scene.add(bulb);
  });

  // Detailed Red Barn in north background
  const barn = new THREE.Group();
  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(7.6, 4.2, 4.8), mat('#EF4444'));
  barnBody.position.y = 2.1;
  barn.add(barnBody);
  const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.6, 4), mat('#991B1B'));
  barnRoof.rotation.y = Math.PI / 4;
  barnRoof.position.y = 5.4;
  barn.add(barnRoof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.22), mat('#FEF3C7'));
  door.position.set(0, 1.4, 2.42);
  barn.add(door);
  // White X trim on barn door
  const trim1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.1, 0.28), mat('#FFFFFF'));
  trim1.position.set(0, 1.4, 2.44);
  trim1.rotation.z = 0.65;
  barn.add(trim1);
  const trim2 = trim1.clone();
  trim2.rotation.z = -0.65;
  barn.add(trim2);
  barn.position.set(-0.8, 0, -17.4);
  scene.add(barn);

  // Shimmering Blue Pond near Cat & Mouse
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.09, 28), mat('#38BDF8'));
  pond.position.set(11.6, 0.03, -11.0);
  scene.add(pond);

  // Wooden Perimeter Fences
  const fenceMat = mat('#B45309');
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.28) continue; // leave front entry open
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.15, 0.24), fenceMat);
    post.position.set(Math.cos(a) * 16.9, 0.58, Math.sin(a) * 16.9);
    scene.add(post);
  }

  // Rounded Animal Crossing Trees
  const treeCoords = [
    [-16.2, 8.5], [-17.0, -3.5], [-14.2, -13.8], [7.8, -16.2],
    [16.5, -4.5], [16.2, 7.5], [12.0, 14.2], [-12.0, 14.5]
  ];
  const trunkMat = mat('#92400E');
  const crownMats = [mat('#22C55E'), mat('#4ADE80'), mat('#16A34A')];
  treeCoords.forEach(([tx, tz], idx) => {
    const tg = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 2.0, 10), trunkMat);
    trunk.position.y = 1.0;
    tg.add(trunk);
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.65, 14, 12), crownMats[idx % 3]);
    c1.position.y = 2.8;
    tg.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), crownMats[(idx + 1) % 3]);
    c2.position.set(0.8, 2.4, 0.4);
    tg.add(c2);
    tg.position.set(tx, 0, tz);
    scene.add(tg);
  });

  // Fluffy Drifting 3D Sky Clouds
  const clouds = [];
  const cloudMat = mat('#FFFFFF');
  [[-12, 11.5, -14], [10, 12.2, -16], [-2, 13.0, -20], [16, 11.8, -6]].forEach(([cx, cy, cz]) => {
    const cg = new THREE.Group();
    [[-0.9, 0, 0, 0.9], [0, 0.35, 0, 1.2], [1.0, 0.05, 0, 0.85]].forEach(([ox, oy, oz, r]) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), cloudMat);
      p.position.set(ox, oy, oz);
      cg.add(p);
    });
    cg.position.set(cx, cy, cz);
    scene.add(cg);
    clouds.push(cg);
  });

  // Colorful Flower Clusters
  const flowerCols = ['#F472B6', '#FACC15', '#FB923C', '#C084FC', '#FFFFFF'];
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2;
    const rad = i % 2 === 0 ? 6.8 : 15.4;
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), mat(flowerCols[i % flowerCols.length]));
    fl.position.set(Math.cos(ang) * rad, 0.22, Math.sin(ang) * rad);
    scene.add(fl);
  }

  return { groundMesh, clouds };
}
