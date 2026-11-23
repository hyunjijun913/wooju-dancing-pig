// 0단계: Animal Crossing-style 3D Mini Farm Adventure encoding exact story & script order (Cards #1..#25)
import { FARM_SPOTS, BASE_CARDS, resolveSpotInteraction } from './data.js';

let THREE_MOD = null;
async function loadThree() {
  if (THREE_MOD) return THREE_MOD;
  THREE_MOD = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
  return THREE_MOD;
}

/**
 * Draws an image into a crisp circular storybook medallion canvas texture (masks square/page edges).
 */
function createCircularMedallionTexture(THREE, imgUrl, borderColor = '#FFFFFF') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const drawPlaceholder = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF7ED';
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  };
  drawPlaceholder();

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    // Slight center zoom (1.08x) so any faint outer border is cleanly cropped
    const pad = -size * 0.04;
    ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.lineWidth = 12;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    tex.needsUpdate = true;
  };
  img.src = imgUrl;
  return tex;
}

function createBadgeTexture(THREE, text, bg = '#FACC15', fg = '#1E293B') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class FarmGame3D {
  constructor({ audioEngine, onRewardStar = () => {}, onConfetti = () => {}, onToast = () => {}, onOpenSequenceQuiz = () => {}, onGoToParrotMode = () => {} } = {}) {
    this.audio = audioEngine;
    this.onRewardStar = onRewardStar;
    this.onConfetti = onConfetti;
    this.onToast = onToast;
    this.onOpenSequenceQuiz = onOpenSequenceQuiz;
    this.onGoToParrotMode = onGoToParrotMode;

    this.mounted = false;
    this.container = null;
    this.rafId = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    // Game progression state
    this.currentSpotIndex = 0; // 0..11 (12 = finished)
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueFinished = false;
    this.pendingSpotTrigger = null;

    // Avatar movement
    this.avatarPos = { x: 0, z: 15.0 };
    this.avatarAngle = Math.PI;
    this.walkTarget = null;
    this.joyVec = { x: 0, z: 0 };
    this.joyActive = false;

    // 3D refs
    this.THREE = null;
    this.avatarGroup = null;
    this.spotMeshes = [];
    this.activeRing = null;
    this.exclaimSprite = null;
    this.breadcrumbDots = [];
    this.tapRing = null;
    this.tapRingLife = 0;
    this.raycaster = null;
    this.groundMesh = null;
    this.clock = null;

    // Bound listeners for clean unmount
    this._onResize = null;
    this._onPointerDown = null;
  }

  async mount(containerEl) {
    if (this.mounted) return;
    this.container = containerEl;
    this.mounted = true;

    this._renderShell();
    this._renderRibbon();
    this._bindJoystick();

    try {
      const THREE = await loadThree();
      if (!this.mounted) return;
      this.THREE = THREE;
      this._initThreeScene(THREE);
      this._startLoop();
    } catch (err) {
      const stage = this.container.querySelector('#farmCanvasWrap');
      if (stage) {
        const msg = document.createElement('div');
        msg.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;color:#334155;background:#E0F2FE;';
        msg.innerHTML = `
          <div style="font-size:46px;">🏡🐷</div>
          <h3 style="margin:8px 0;">3D 농장을 불러오지 못했어요</h3>
          <p style="font-size:14px;color:#64748B;">상단 <b>스토리 순서 띠</b>에서 동물 친구를 차례로 눌러 이야기를 들을 수 있어요!</p>
        `;
        stage.prepend(msg);
      }
    }
  }

  unmount() {
    this.mounted = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audio.stopAll();
    // Reset all interaction/dialogue state so re-mounting never softlocks
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueFinished = false;
    this.pendingSpotTrigger = null;
    this.walkTarget = null;
    this.joyActive = false;
    this.joyVec = { x: 0, z: 0 };

    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
    }
    if (this.renderer) {
      if (this._onPointerDown && this.renderer.domElement) {
        this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
      }
      this.renderer.forceContextLoss();
      this.renderer.dispose();
      this.renderer = null;
    }
    this.spotMeshes = [];
    this.breadcrumbDots = [];
    this.scene = null;
    this.camera = null;
  }

  resetProgress() {
    this.audio.stopAll();
    this.currentSpotIndex = 0;
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.avatarPos = { x: 0, z: 15.0 };
    this.walkTarget = null;
    if (this.avatarGroup) {
      this.avatarGroup.position.set(this.avatarPos.x, 0, this.avatarPos.z);
    }
    this._hideDialogue();
    this._hideFinale();
    this._renderRibbon();
    this._updateSpotVisuals();
    this.onToast('🗺️ 처음부터 다시 농장 탐험을 시작해요!');
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="farm-hud-top">
        <div class="farm-ribbon" id="farmRibbon" aria-label="스토리 순서 띠"></div>
        <button class="mini-btn" id="farmResetBtn" title="처음부터 다시 탐험">🔄 처음부터</button>
      </div>
      <div class="farm-stage" id="farmCanvasWrap">
        <div class="farm-guide-pill" id="farmGuidePill">👆 반짝이는 친구를 톡! 누르거나 걸어가 보세요!</div>

        <!-- Virtual Joystick (bottom-left) -->
        <div class="farm-joystick" id="farmJoystick" aria-label="이동 조이스틱">
          <div class="farm-joy-knob" id="farmJoyKnob"></div>
        </div>

        <!-- Animal Crossing-style Dialogue Overlay -->
        <div class="farm-dialogue" id="farmDialogue" style="display:none;">
          <div class="farm-dlg-head">
            <img id="farmDlgPortrait" class="farm-dlg-portrait" alt="" />
            <div class="farm-dlg-meta">
              <div class="farm-dlg-name" id="farmDlgName"></div>
              <div class="farm-dlg-sub" id="farmDlgSub"></div>
            </div>
            <button class="mini-btn" id="farmDlgReplayBtn">🔊 다시 듣기</button>
          </div>
          <div class="farm-dlg-icons" id="farmDlgIcons"></div>
          <div class="farm-dlg-en" id="farmDlgEn"></div>
          <button class="big-btn btn-star farm-dlg-next" id="farmDlgActionBtn" disabled>🎧 원어민 이야기를 끝까지 들어요...</button>
        </div>

        <!-- Finale Celebration Overlay -->
        <div class="farm-finale" id="farmFinale" style="display:none;">
          <div style="font-size:56px;">🐷💃🎉</div>
          <h3>농장 탐험 대성공!!</h3>
          <p>우주가 12명의 친구들을 순서대로 다 만나서 브라운 아저씨를 웃게 해줬어요!</p>
          <div class="farm-finale-actions">
            <button class="big-btn btn-echo" id="farmFinaleQuizBtn">🧩 방금 만난 순서 퀴즈!</button>
            <button class="big-btn btn-listen" id="farmFinaleParrotBtn">🦜 2단계 앵무새로 말하기</button>
            <button class="big-btn btn-slow" id="farmFinaleAgainBtn">🔄 한 번 더 탐험하기</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#farmResetBtn').addEventListener('click', () => this.resetProgress());
    this.container.querySelector('#farmFinaleQuizBtn').addEventListener('click', () => this.onOpenSequenceQuiz());
    this.container.querySelector('#farmFinaleParrotBtn').addEventListener('click', () => this.onGoToParrotMode());
    this.container.querySelector('#farmFinaleAgainBtn').addEventListener('click', () => this.resetProgress());
  }

  _renderRibbon() {
    const ribbon = this.container?.querySelector('#farmRibbon');
    if (!ribbon) return;
    ribbon.innerHTML = FARM_SPOTS.map((spot, idx) => {
      const done = idx < this.currentSpotIndex;
      const active = idx === this.currentSpotIndex;
      const cls = ['ribbon-chip', done ? 'done' : '', active ? 'active' : ''].join(' ');
      return `
        <button class="${cls}" data-spot-idx="${idx}" title="${idx + 1}. ${spot.name}">
          <span class="rb-emo">${spot.emoji}</span>
          ${done ? `<span class="rb-item">${spot.itemEmoji}</span>` : `<span class="rb-num">${idx + 1}</span>`}
        </button>
      `;
    }).join('');

    ribbon.querySelectorAll('.ribbon-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.unlock();
        this._hideFinale();
        const idx = parseInt(btn.dataset.spotIdx, 10);
        this._handleSpotTap(idx, true);
      });
    });

    const activeChip = ribbon.querySelector('.ribbon-chip.active');
    if (activeChip && activeChip.scrollIntoView) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    const guide = this.container.querySelector('#farmGuidePill');
    if (guide) {
      if (this.currentSpotIndex < FARM_SPOTS.length) {
        const next = FARM_SPOTS[this.currentSpotIndex];
        guide.textContent = `👉 ${this.currentSpotIndex + 1}번 친구: ${next.emoji} ${next.name}에게 가볼까요?`;
      } else {
        guide.textContent = '🏆 농장 탐험 완료! 자유롭게 산책해 보세요!';
      }
    }
  }

  _bindJoystick() {
    const base = this.container.querySelector('#farmJoystick');
    const knob = this.container.querySelector('#farmJoyKnob');
    if (!base || !knob) return;
    const maxR = 32;

    const updateKnob = (clientX, clientY) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joyVec.x = dx / maxR;
      this.joyVec.z = dy / maxR;
      if (dist > 4) {
        this.walkTarget = null;
        this.pendingSpotTrigger = null;
      }
    };

    base.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.audio.unlock();
      this.joyActive = true;
      base.setPointerCapture(e.pointerId);
      updateKnob(e.clientX, e.clientY);
    });
    base.addEventListener('pointermove', (e) => {
      if (!this.joyActive) return;
      e.stopPropagation();
      updateKnob(e.clientX, e.clientY);
    });
    const endJoy = (e) => {
      if (!this.joyActive) return;
      e.stopPropagation();
      this.joyActive = false;
      this.joyVec.x = 0;
      this.joyVec.z = 0;
      knob.style.transform = 'translate(0px, 0px)';
    };
    base.addEventListener('pointerup', endJoy);
    base.addEventListener('pointercancel', endJoy);
  }

  _initThreeScene(THREE) {
    const wrap = this.container.querySelector('#farmCanvasWrap');
    const w = wrap.clientWidth || 640;
    const h = wrap.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#C8E9FF');
    this.scene.fog = new THREE.Fog('#C8E9FF', 26, 56);

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 100);
    this.camera.position.set(this.avatarPos.x, 12.5, this.avatarPos.z + 11.5);
    this.camera.lookAt(this.avatarPos.x, 0.8, this.avatarPos.z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'farm-canvas';
    wrap.prepend(this.renderer.domElement);

    // Warm sunny lighting
    this.scene.add(new THREE.HemisphereLight('#FFFDF5', '#74C69D', 1.15));
    const dir = new THREE.DirectionalLight('#FFF6E0', 1.1);
    dir.position.set(12, 22, 14);
    this.scene.add(dir);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    this._buildEnvironment(THREE);
    this._buildWoojuAvatar(THREE);
    this._buildAnimalSpots(THREE);
    this._buildPathHelpers(THREE);
    this._updateSpotVisuals();

    this._onResize = () => {
      if (!this.renderer || !wrap) return;
      const nw = wrap.clientWidth || 640;
      const nh = wrap.clientHeight || 420;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', this._onResize);

    this._onPointerDown = (e) => {
      this.audio.unlock();
      if (this.activeDialogueSpot !== null) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);

      // 1. Check if user tapped any animal spot directly
      const spotTargets = this.spotMeshes.map(m => m.hitMesh);
      const spotHits = this.raycaster.intersectObjects(spotTargets, false);
      if (spotHits.length > 0) {
        const idx = spotHits[0].object.userData.spotIndex;
        this._handleSpotTap(idx, false);
        return;
      }

      // 2. Otherwise tap-to-walk on ground
      const groundHits = this.raycaster.intersectObject(this.groundMesh, false);
      if (groundHits.length > 0) {
        const pt = groundHits[0].point;
        const r = Math.hypot(pt.x, pt.z);
        const clamped = r > 15.8 ? { x: (pt.x / r) * 15.8, z: (pt.z / r) * 15.8 } : { x: pt.x, z: pt.z };
        this.walkTarget = clamped;
        this.pendingSpotTrigger = null;
        this._spawnTapRing(clamped.x, clamped.z);
      }
    };
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
  }

  _buildEnvironment(THREE) {
    // Cozy pastel grass island
    const grass = new THREE.Mesh(
      new THREE.CylinderGeometry(19, 19.8, 1.2, 48),
      new THREE.MeshLambertMaterial({ color: '#86EFAC' })
    );
    grass.position.y = -0.6;
    this.scene.add(grass);
    this.groundMesh = grass;

    // Warm cream-tan circular story path (radius 12.2)
    const pathRing = new THREE.Mesh(
      new THREE.RingGeometry(10.5, 13.8, 48),
      new THREE.MeshLambertMaterial({ color: '#FDE68A', side: THREE.DoubleSide })
    );
    pathRing.rotation.x = -Math.PI / 2;
    pathRing.position.y = 0.02;
    this.scene.add(pathRing);

    // Path connecting entry & central dance stage
    const centerPath = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 12.5),
      new THREE.MeshLambertMaterial({ color: '#FDE68A' })
    );
    centerPath.rotation.x = -Math.PI / 2;
    centerPath.position.set(0, 0.025, 6.2);
    this.scene.add(centerPath);

    // Central wooden dance stage (Zone 4)
    const stageDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.7, 0.35, 32),
      new THREE.MeshLambertMaterial({ color: '#D97706' })
    );
    stageDeck.position.set(0, 0.175, 0);
    this.scene.add(stageDeck);

    const stageTop = new THREE.Mesh(
      new THREE.CylinderGeometry(3.15, 3.15, 0.06, 32),
      new THREE.MeshLambertMaterial({ color: '#FEF3C7' })
    );
    stageTop.position.set(0, 0.36, 0);
    this.scene.add(stageTop);

    // Red Barn landmark in back (north)
    const barn = new THREE.Group();
    const barnBody = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 3.8, 4.4),
      new THREE.MeshLambertMaterial({ color: '#EF4444' })
    );
    barnBody.position.y = 1.9;
    barn.add(barnBody);
    const barnRoof = new THREE.Mesh(
      new THREE.ConeGeometry(5.2, 2.4, 4),
      new THREE.MeshLambertMaterial({ color: '#991B1B' })
    );
    barnRoof.rotation.y = Math.PI / 4;
    barnRoof.position.y = 5.0;
    barn.add(barnRoof);
    const barnDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.5, 0.2),
      new THREE.MeshLambertMaterial({ color: '#FEF3C7' })
    );
    barnDoor.position.set(0, 1.25, 2.2);
    barn.add(barnDoor);
    barn.position.set(-1.0, 0, -16.8);
    this.scene.add(barn);

    // Shimmering blue pond near Cat & Mouse (Zone 3)
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 0.08, 28),
      new THREE.MeshLambertMaterial({ color: '#38BDF8' })
    );
    pond.position.set(11.4, 0.03, -10.8);
    this.scene.add(pond);

    // Decorative rounded Animal Crossing-style trees & flowers around outer edge
    const treePositions = [
      [-15.5, 8], [-16.2, -4], [-13.5, -13.5], [7.5, -15.5],
      [15.8, -5], [15.5, 7], [11.5, 13.8], [-11.5, 14.2]
    ];
    const trunkMat = new THREE.MeshLambertMaterial({ color: '#92400E' });
    const leafMat1 = new THREE.MeshLambertMaterial({ color: '#22C55E' });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: '#4ADE80' });
    for (const [tx, tz] of treePositions) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 1.8, 10), trunkMat);
      trunk.position.y = 0.9;
      g.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.55, 14, 12), (tx + tz) % 2 === 0 ? leafMat1 : leafMat2);
      crown.position.y = 2.6;
      g.add(crown);
      g.position.set(tx, 0, tz);
      this.scene.add(g);
    }

    // Pastel flower clusters
    const flowerColors = ['#F472B6', '#FACC15', '#FB923C', '#C084FC'];
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const rad = i % 2 === 0 ? 7.2 : 15.2;
      const fl = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 8),
        new THREE.MeshLambertMaterial({ color: flowerColors[i % flowerColors.length] })
      );
      fl.position.set(Math.cos(ang) * rad, 0.22, Math.sin(ang) * rad);
      this.scene.add(fl);
    }
  }

  _buildWoojuAvatar(THREE) {
    const g = new THREE.Group();

    // Soft shadow disc
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 20),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    g.add(shadow);

    // Chibi blue hoodie body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.45, 8, 14),
      new THREE.MeshLambertMaterial({ color: '#3B82F6' })
    );
    body.position.y = 0.72;
    g.add(body);

    // Tiny yellow rocket backpack
    const pack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.48, 10),
      new THREE.MeshLambertMaterial({ color: '#FACC15' })
    );
    pack.position.set(0, 0.78, -0.42);
    g.add(pack);

    // Cute circular Wooju portrait sprite hovering nicely as head/badge
    const portraitTex = createCircularMedallionTexture(THREE, 'assets/wooju_avatar.png', '#38BDF8');
    const headSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: portraitTex, transparent: true }));
    headSprite.scale.set(1.55, 1.55, 1);
    headSprite.position.y = 1.85;
    g.add(headSprite);

    g.position.set(this.avatarPos.x, 0, this.avatarPos.z);
    this.scene.add(g);
    this.avatarGroup = g;
  }

  _buildAnimalSpots(THREE) {
    this.spotMeshes = [];
    FARM_SPOTS.forEach((spot, idx) => {
      const group = new THREE.Group();
      group.position.set(spot.pos.x, 0, spot.pos.z);

      const baseY = spot.prop === 'stage' ? 0.38 : 0.05;

      // Pedestal disc
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.25, 0.12, 24),
        new THREE.MeshLambertMaterial({ color: '#FFFFFF' })
      );
      disc.position.y = baseY;
      group.add(disc);

      // Circular portrait sprite
      const tex = createCircularMedallionTexture(THREE, spot.portrait, '#FDE68A');
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.scale.set(2.35, 2.35, 1);
      sprite.position.y = baseY + 1.45;
      group.add(sprite);

      // Invisible generous touch cylinder for easy 6yo tapping
      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.65, 3.2, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = baseY + 1.5;
      hitMesh.userData = { spotIndex: idx };
      group.add(hitMesh);

      // Completed checkmark badge (hidden until done)
      const checkSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: createBadgeTexture(THREE, '✓', '#22C55E', '#FFFFFF'), transparent: true })
      );
      checkSprite.scale.set(0.85, 0.85, 1);
      checkSprite.position.set(0.95, baseY + 2.35, 0);
      checkSprite.visible = false;
      group.add(checkSprite);

      this.scene.add(group);
      this.spotMeshes.push({ group, disc, sprite, hitMesh, checkSprite, baseY });
    });
  }

  _buildPathHelpers(THREE) {
    // Pulsing golden ring under active spot
    this.activeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.75, 32),
      new THREE.MeshBasicMaterial({ color: '#FACC15', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    this.activeRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.activeRing);

    // Floating '!' above active spot
    this.exclaimSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: createBadgeTexture(THREE, '!', '#F59E0B', '#FFFFFF'), transparent: true })
    );
    this.exclaimSprite.scale.set(0.95, 0.95, 1);
    this.scene.add(this.exclaimSprite);

    // Glowing breadcrumb dots pointing to active spot
    this.breadcrumbDots = [];
    for (let i = 0; i < 6; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        new THREE.MeshBasicMaterial({ color: '#FACC15' })
      );
      this.scene.add(dot);
      this.breadcrumbDots.push(dot);
    }

    // Tap ripple ring
    this.tapRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 24),
      new THREE.MeshBasicMaterial({ color: '#6366F1', side: THREE.DoubleSide, transparent: true, opacity: 0 })
    );
    this.tapRing.rotation.x = -Math.PI / 2;
    this.tapRing.position.y = 0.08;
    this.scene.add(this.tapRing);
  }

  _spawnTapRing(x, z) {
    if (!this.tapRing) return;
    this.tapRing.position.set(x, 0.08, z);
    this.tapRingLife = 1.0;
  }

  _updateSpotVisuals() {
    if (!this.spotMeshes.length) return;
    this.spotMeshes.forEach((m, idx) => {
      const done = idx < this.currentSpotIndex;
      const active = idx === this.currentSpotIndex;
      m.checkSprite.visible = done;
      m.disc.material.color.set(done ? '#BBF7D0' : (active ? '#FEF08A' : '#F1F5F9'));
      m.sprite.material.opacity = (done || active) ? 1.0 : 0.72;
    });

    if (this.currentSpotIndex < FARM_SPOTS.length) {
      const target = FARM_SPOTS[this.currentSpotIndex];
      const baseY = this.spotMeshes[this.currentSpotIndex].baseY;
      this.activeRing.visible = true;
      this.activeRing.position.set(target.pos.x, baseY + 0.08, target.pos.z);
      this.exclaimSprite.visible = true;
      this.exclaimSprite.position.set(target.pos.x, baseY + 3.05, target.pos.z);
      this.breadcrumbDots.forEach(d => { d.visible = true; });
    } else {
      this.activeRing.visible = false;
      this.exclaimSprite.visible = false;
      this.breadcrumbDots.forEach(d => { d.visible = false; });
    }
  }

  _handleSpotTap(spotIdx, immediate = false) {
    const decision = resolveSpotInteraction(spotIdx, this.currentSpotIndex, this.isListening);
    if (decision.action === 'busy') return;
    if (decision.action === 'locked') {
      const target = FARM_SPOTS[decision.redirectTo];
      this.onToast(`👉 먼저 ${decision.redirectTo + 1}번 ${target.emoji} ${target.name} 친구를 만나볼까요!`);
      return;
    }

    const spot = FARM_SPOTS[spotIdx];
    const dist = Math.hypot(this.avatarPos.x - spot.pos.x, this.avatarPos.z - spot.pos.z);
    if (immediate || dist < 2.8) {
      this.walkTarget = null;
      this._openDialogue(spotIdx, decision.action === 'revisit');
    } else {
      this.walkTarget = { x: spot.pos.x, z: spot.pos.z };
      this.pendingSpotTrigger = { spotIdx, isRevisit: decision.action === 'revisit' };
      this._spawnTapRing(spot.pos.x, spot.pos.z);
    }
  }

  _openDialogue(spotIdx, isRevisit = false) {
    const spot = FARM_SPOTS[spotIdx];
    const cards = spot.cardIds.map(id => BASE_CARDS.find(c => c.id === id)).filter(Boolean);
    this.activeDialogueSpot = spotIdx;
    this.isListening = true;
    this.dialogueFinished = false;

    const dlg = this.container.querySelector('#farmDialogue');
    const portrait = this.container.querySelector('#farmDlgPortrait');
    const nameEl = this.container.querySelector('#farmDlgName');
    const subEl = this.container.querySelector('#farmDlgSub');
    const iconsEl = this.container.querySelector('#farmDlgIcons');
    const enEl = this.container.querySelector('#farmDlgEn');
    const actionBtn = this.container.querySelector('#farmDlgActionBtn');
    const replayBtn = this.container.querySelector('#farmDlgReplayBtn');

    portrait.src = spot.portrait;
    nameEl.textContent = `${spotIdx + 1}번 친구 · ${spot.emoji} ${spot.name}`;
    subEl.textContent = `${spot.itemEmoji} ${spot.itemLabel}`;
    actionBtn.disabled = true;
    actionBtn.textContent = '🎧 원어민 이야기를 끝까지 들어요...';
    dlg.style.display = 'flex';

    const playCards = () => {
      this.isListening = true;
      actionBtn.disabled = true;
      actionBtn.textContent = '🎧 원어민 이야기를 끝까지 들어요...';
      this.audio.playSegmentSequence(cards, {
        onCardStart: (card) => {
          iconsEl.innerHTML = (card.icons || []).map(([em, lbl]) =>
            lbl ? `<span class="farm-icon-chip">${em} <small>${lbl}</small></span>` : `<span class="farm-icon-arrow">${em}</span>`
          ).join('');
          enEl.textContent = card.en;
        },
        onAllDone: () => {
          this.isListening = false;
          this.dialogueFinished = true;
          actionBtn.disabled = false;
          if (isRevisit) {
            actionBtn.textContent = '✅ 잘 들었어요! 산책 계속하기';
          } else if (spotIdx === FARM_SPOTS.length - 1) {
            actionBtn.textContent = '🎉 춤추는 돼지 파티 완료!!';
          } else {
            actionBtn.textContent = `🎁 ${spot.itemEmoji} ${spot.itemLabel} 받고 다음 친구로!`;
          }
        },
      });
    };

    replayBtn.onclick = () => playCards();
    actionBtn.onclick = () => {
      if (!this.dialogueFinished) return;
      this._hideDialogue();
      if (!isRevisit && spotIdx === this.currentSpotIndex) {
        this.currentSpotIndex += 1;
        this.onRewardStar(1);
        this.audio.playStarSFX();
        this.onConfetti(35);
        this._renderRibbon();
        this._updateSpotVisuals();

        if (this.currentSpotIndex >= FARM_SPOTS.length) {
          this._showFinale();
        } else {
          const next = FARM_SPOTS[this.currentSpotIndex];
          this.onToast(`🎁 ${spot.itemEmoji} 획득! 다음은 ${next.emoji} ${next.name}!`);
        }
      }
    };

    playCards();
  }

  _hideDialogue() {
    this.audio.stopAll();
    this.isListening = false;
    this.activeDialogueSpot = null;
    const dlg = this.container?.querySelector('#farmDialogue');
    if (dlg) dlg.style.display = 'none';
  }

  _showFinale() {
    this.audio.playApplauseSFX();
    this.audio.playFanfareSFX();
    this.onConfetti(90);
    const fin = this.container?.querySelector('#farmFinale');
    if (fin) fin.style.display = 'flex';
  }

  _hideFinale() {
    const fin = this.container?.querySelector('#farmFinale');
    if (fin) fin.style.display = 'none';
  }

  _startLoop() {
    const animate = () => {
      if (!this.mounted || !this.renderer) return;
      this.rafId = requestAnimationFrame(animate);

      const dt = Math.min(0.05, this.clock.getDelta());
      const t = this.clock.elapsedTime;

      // 1. Avatar Movement (only when dialogue not open)
      let moving = false;
      const speed = 7.2;
      if (this.activeDialogueSpot === null) {
        if (Math.hypot(this.joyVec.x, this.joyVec.z) > 0.08) {
          const nx = this.avatarPos.x + this.joyVec.x * speed * dt;
          const nz = this.avatarPos.z + this.joyVec.z * speed * dt;
          const r = Math.hypot(nx, nz);
          if (r <= 16.0) {
            this.avatarPos.x = nx;
            this.avatarPos.z = nz;
          }
          this.avatarAngle = Math.atan2(this.joyVec.x, this.joyVec.z);
          moving = true;
        } else if (this.walkTarget) {
          const dx = this.walkTarget.x - this.avatarPos.x;
          const dz = this.walkTarget.z - this.avatarPos.z;
          const dist = Math.hypot(dx, dz);
          const stopDist = this.pendingSpotTrigger ? 2.2 : 0.25;
          if (dist > stopDist) {
            this.avatarPos.x += (dx / dist) * speed * dt;
            this.avatarPos.z += (dz / dist) * speed * dt;
            this.avatarAngle = Math.atan2(dx, dz);
            moving = true;
          } else {
            this.walkTarget = null;
            if (this.pendingSpotTrigger) {
              const { spotIdx, isRevisit } = this.pendingSpotTrigger;
              this.pendingSpotTrigger = null;
              this._openDialogue(spotIdx, isRevisit);
            }
          }
        }

        // Proximity auto-trigger for the current active spot when walking with joystick
        if (moving && !this.pendingSpotTrigger && this.currentSpotIndex < FARM_SPOTS.length) {
          const active = FARM_SPOTS[this.currentSpotIndex];
          const d = Math.hypot(this.avatarPos.x - active.pos.x, this.avatarPos.z - active.pos.z);
          if (d < 2.25) {
            this.walkTarget = null;
            this._openDialogue(this.currentSpotIndex, false);
          }
        }
      }

      if (this.avatarGroup) {
        this.avatarGroup.position.x = this.avatarPos.x;
        this.avatarGroup.position.z = this.avatarPos.z;
        this.avatarGroup.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.22 : 0;
        this.avatarGroup.rotation.y = this.avatarAngle;
      }

      // 2. Active spot & character playful animations
      if (this.activeRing && this.activeRing.visible) {
        const s = 1 + Math.sin(t * 4.5) * 0.1;
        this.activeRing.scale.set(s, s, 1);
      }
      if (this.exclaimSprite && this.exclaimSprite.visible && this.currentSpotIndex < FARM_SPOTS.length) {
        const baseY = this.spotMeshes[this.currentSpotIndex].baseY;
        this.exclaimSprite.position.y = baseY + 3.05 + Math.sin(t * 5) * 0.2;
      }
      if (this.currentSpotIndex < FARM_SPOTS.length) {
        const target = FARM_SPOTS[this.currentSpotIndex].pos;
        this.breadcrumbDots.forEach((dot, i) => {
          const frac = (i + 1) / (this.breadcrumbDots.length + 1);
          dot.position.set(
            this.avatarPos.x + (target.x - this.avatarPos.x) * frac,
            0.22 + Math.sin(t * 5 + i * 0.8) * 0.08,
            this.avatarPos.z + (target.z - this.avatarPos.z) * frac
          );
        });
      }

      // Bounce speaking character (and dance the pig in finale!)
      this.spotMeshes.forEach((m, idx) => {
        const isSpeaking = this.activeDialogueSpot === idx && this.isListening;
        const isDancingPig = idx === FARM_SPOTS.length - 1 && (this.currentSpotIndex >= FARM_SPOTS.length || isSpeaking);
        if (isDancingPig) {
          m.sprite.position.y = m.baseY + 1.45 + Math.abs(Math.sin(t * 9)) * 0.45;
          m.sprite.material.rotation = Math.sin(t * 8) * 0.16;
        } else if (isSpeaking) {
          m.sprite.position.y = m.baseY + 1.45 + Math.abs(Math.sin(t * 7)) * 0.24;
          m.sprite.material.rotation = 0;
        } else {
          m.sprite.position.y = m.baseY + 1.45 + Math.sin(t * 2 + idx) * 0.06;
          m.sprite.material.rotation = 0;
        }
      });

      // Tap ripple decay
      if (this.tapRingLife > 0 && this.tapRing) {
        this.tapRingLife = Math.max(0, this.tapRingLife - dt * 2.5);
        const s = 1 + (1 - this.tapRingLife) * 1.4;
        this.tapRing.scale.set(s, s, 1);
        this.tapRing.material.opacity = this.tapRingLife * 0.7;
      }

      // 3. Smooth Animal Crossing quarter-view camera follow (zooms gently during dialogue)
      let focusX = this.avatarPos.x;
      let focusZ = this.avatarPos.z;
      let camHeight = 11.8;
      let camDist = 11.2;
      if (this.activeDialogueSpot !== null) {
        const sp = FARM_SPOTS[this.activeDialogueSpot].pos;
        focusX = sp.x;
        focusZ = sp.z;
        camHeight = 6.2;
        camDist = 7.4;
      }
      this.camera.position.x += (focusX - this.camera.position.x) * 0.08;
      this.camera.position.y += (camHeight - this.camera.position.y) * 0.08;
      this.camera.position.z += (focusZ + camDist - this.camera.position.z) * 0.08;
      this.camera.lookAt(focusX, 1.0, focusZ);

      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(animate);
  }
}
