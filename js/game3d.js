// 0단계: Fullscreen 100% 3D Animal Crossing-style Mini Farm Adventure
// Features: Fullscreen entry + auto opening dialogue, 100% 3D characters & world,
// animated 3D dashed guiding path, and real item collection into Wooju's Inventory Bag!
import { FARM_SPOTS, BASE_CARDS, resolveSpotInteraction } from './data.js';
import { buildWooju3D, buildSpotCharacter3D, buildFarmWorld3D } from './models3d.js';

let THREE_MOD = null;
async function loadThree() {
  if (THREE_MOD) return THREE_MOD;
  THREE_MOD = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
  return THREE_MOD;
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
  constructor({
    audioEngine,
    onRewardStar = () => {},
    onConfetti = () => {},
    onToast = () => {},
    onOpenSequenceQuiz = () => {},
    onGoToParrotMode = () => {},
    onExitFullscreen = () => {},
  } = {}) {
    this.audio = audioEngine;
    this.onRewardStar = onRewardStar;
    this.onConfetti = onConfetti;
    this.onToast = onToast;
    this.onOpenSequenceQuiz = onOpenSequenceQuiz;
    this.onGoToParrotMode = onGoToParrotMode;
    this.onExitFullscreen = onExitFullscreen;

    this.mounted = false;
    this.entered = false;
    this.container = null;
    this.rafId = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    // Game progression & bag inventory
    this.currentSpotIndex = 0; // 0..11 (12 = finished)
    this.collectedSpotIds = new Set();
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueFinished = false;
    this.pendingSpotTrigger = null;

    // Wooju 3D avatar movement
    this.avatarPos = { x: 0, z: 15.2 };
    this.avatarAngle = Math.PI;
    this.walkTarget = null;
    this.joyVec = { x: 0, z: 0 };
    this.joyActive = false;

    // 3D refs
    this.THREE = null;
    this.wooju = null;
    this.spotEntries = [];
    this.clouds = [];
    this.activeRing = null;
    this.exclaimSprite = null;
    this.dashedTrail = [];
    this.tapRing = null;
    this.tapRingLife = 0;
    this.raycaster = null;
    this.groundMesh = null;
    this.clock = null;

    this._onResize = null;
    this._onPointerDown = null;
  }

  async mount(containerEl) {
    if (this.mounted) return;
    this.container = containerEl;
    this.mounted = true;
    document.body.classList.add('farm-fullscreen');

    this._renderShell();
    this._renderRibbon();
    this._updateBagBadge();
    this._bindJoystick();

    try {
      const THREE = await loadThree();
      if (!this.mounted) return;
      this.THREE = THREE;
      this._initThreeScene(THREE);
      this._startLoop();
    } catch (_) {
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
    document.body.classList.remove('farm-fullscreen');
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audio.stopAll();
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
    this.spotEntries = [];
    this.dashedTrail = [];
    this.clouds = [];
    this.scene = null;
    this.camera = null;
  }

  resetProgress() {
    this.audio.stopAll();
    this.currentSpotIndex = 0;
    this.collectedSpotIds.clear();
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueFinished = false;
    this.pendingSpotTrigger = null;
    this.avatarPos = { x: 0, z: 15.2 };
    this.walkTarget = null;
    if (this.wooju) {
      this.wooju.group.position.set(this.avatarPos.x, 0, this.avatarPos.z);
    }
    this._hideDialogue();
    this._hideFinale();
    this._closeBagModal();
    this._renderRibbon();
    this._updateBagBadge();
    this._updateSpotVisuals();
    this.onToast('🗺️ 처음부터 다시 농장 탐험을 시작해요!');
    // Automatically replay opening intro!
    if (this.entered) {
      setTimeout(() => {
        if (this.mounted && this.currentSpotIndex === 0) this._openDialogue(0, false);
      }, 350);
    }
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="farm-stage farm-stage-full" id="farmCanvasWrap">
        <!-- Floating Fullscreen Top HUD -->
        <div class="farm-float-top">
          <button class="farm-pill-btn farm-exit-btn" id="farmExitBtn">⬅️ 학습 메뉴</button>
          <div class="farm-ribbon" id="farmRibbon" aria-label="스토리 순서 띠"></div>
          <button class="farm-pill-btn farm-bag-btn" id="farmBagBtn">🎒 가방 <span id="farmBagCount">0/12</span></button>
          <button class="farm-pill-btn farm-reset-btn" id="farmResetBtn" title="처음부터">🔄</button>
        </div>

        <div class="farm-guide-pill" id="farmGuidePill">👆 노란 점선 길을 따라 반짝이는 친구에게 가보세요!</div>

        <!-- Entry Splash Overlay (tapping once unlocks iPad Safari audio & auto-starts Opening #1~#3!) -->
        <div class="farm-entry-overlay" id="farmEntryOverlay" style="${this.entered ? 'display:none;' : 'display:flex;'}">
          <div class="farm-entry-card">
            <div class="farm-entry-emoji">🏡🐷✨</div>
            <h2>우주의 3D 농장 탐험</h2>
            <p>The Dancing Pig · 동물의숲처럼 걸어 다니며<br/>순서대로 동물 친구들을 만나 선물을 모아보세요!</p>
            <button class="big-btn btn-star farm-enter-btn" id="farmEnterBtn">🚀 농장 들어가기!</button>
            <button class="mini-btn" id="farmEntryExitBtn" style="margin-top:4px;">⬅️ 1~4단계 학습 메뉴로 가기</button>
          </div>
        </div>

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

        <!-- 🎒 Wooju's Inventory Bag Modal -->
        <div class="farm-bag-modal" id="farmBagModal" style="display:none;">
          <div class="farm-bag-sheet">
            <div class="modal-head">
              <h2>🎒 우주의 농장 가방</h2>
              <button class="close-btn" id="farmBagCloseBtn">✕</button>
            </div>
            <p style="margin:0 0 10px;font-size:13px;color:#64748B;font-weight:600;">
              모은 선물을 톡! 누르면 그 친구의 영어 이야기를 다시 들을 수 있어요!
            </p>
            <div class="farm-bag-grid" id="farmBagGrid"></div>
          </div>
        </div>

        <!-- Finale Celebration Overlay -->
        <div class="farm-finale" id="farmFinale" style="display:none;">
          <div style="font-size:58px;">🐷💃🎉</div>
          <h3>농장 탐험 대성공!!</h3>
          <p>가방에 12개의 선물을 모두 모아서 브라운 아저씨를 활짝 웃게 해줬어요!</p>
          <div class="farm-finale-actions">
            <button class="big-btn btn-echo" id="farmFinaleQuizBtn">🧩 방금 만난 순서 퀴즈!</button>
            <button class="big-btn btn-listen" id="farmFinaleParrotBtn">🦜 2단계 앵무새로 말하기</button>
            <button class="big-btn btn-slow" id="farmFinaleAgainBtn">🔄 한 번 더 탐험하기</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#farmExitBtn').addEventListener('click', () => this.onExitFullscreen());
    this.container.querySelector('#farmEntryExitBtn').addEventListener('click', () => this.onExitFullscreen());
    this.container.querySelector('#farmResetBtn').addEventListener('click', () => this.resetProgress());
    this.container.querySelector('#farmBagBtn').addEventListener('click', () => this._openBagModal());
    this.container.querySelector('#farmBagCloseBtn').addEventListener('click', () => this._closeBagModal());
    this.container.querySelector('#farmFinaleQuizBtn').addEventListener('click', () => {
      this.onExitFullscreen();
      this.onOpenSequenceQuiz();
    });
    this.container.querySelector('#farmFinaleParrotBtn').addEventListener('click', () => this.onGoToParrotMode());
    this.container.querySelector('#farmFinaleAgainBtn').addEventListener('click', () => this.resetProgress());

    this.container.querySelector('#farmEnterBtn').addEventListener('click', () => {
      this.audio.unlock();
      this.entered = true;
      const overlay = this.container.querySelector('#farmEntryOverlay');
      if (overlay) overlay.style.display = 'none';
      // Start opening dialogue (#1~#3: The Dancing Pig / The farm is quiet / The animals are all in the barn) immediately upon entering!
      if (this.currentSpotIndex === 0) {
        this._openDialogue(0, false);
      }
    });
  }

  _updateBagBadge() {
    const countEl = this.container?.querySelector('#farmBagCount');
    if (countEl) countEl.textContent = `${this.collectedSpotIds.size}/${FARM_SPOTS.length}`;
  }

  _animateItemToBag(emoji) {
    const stage = this.container?.querySelector('#farmCanvasWrap');
    const bagBtn = this.container?.querySelector('#farmBagBtn');
    if (!stage || !bagBtn) return;

    const fly = document.createElement('div');
    fly.className = 'flying-item';
    fly.textContent = emoji;
    stage.appendChild(fly);

    const bagRect = bagBtn.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const targetX = bagRect.left - stageRect.left + bagRect.width / 2;
    const targetY = bagRect.top - stageRect.top + bagRect.height / 2;

    requestAnimationFrame(() => {
      fly.style.left = `${targetX}px`;
      fly.style.top = `${targetY}px`;
      fly.style.transform = 'translate(-50%, -50%) scale(0.45)';
      fly.style.opacity = '0.2';
    });

    setTimeout(() => {
      fly.remove();
      bagBtn.classList.add('bag-bounce');
      setTimeout(() => bagBtn.classList.remove('bag-bounce'), 420);
    }, 680);
  }

  _openBagModal() {
    const modal = this.container?.querySelector('#farmBagModal');
    const grid = this.container?.querySelector('#farmBagGrid');
    if (!modal || !grid) return;

    grid.innerHTML = FARM_SPOTS.map((spot, idx) => {
      const got = this.collectedSpotIds.has(spot.id);
      return `
        <button class="bag-slot ${got ? 'got' : ''}" data-bag-idx="${idx}" ${got ? '' : 'disabled'}>
          <div class="bag-slot-ico">${got ? spot.itemEmoji : '❓'}</div>
          <div class="bag-slot-name">${got ? spot.itemLabel : `${idx + 1}번 선물`}</div>
          <div class="bag-slot-who">${got ? `${spot.emoji} ${spot.name}` : '아직 못 만났어요'}</div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.bag-slot.got').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.bagIdx, 10);
        const spot = FARM_SPOTS[idx];
        const card = BASE_CARDS.find(c => c.id === spot.cardIds[0]);
        if (card) {
          this.audio.unlock();
          this.audio.playSegment(card.start, card.end);
          this.onToast(`${spot.emoji} ${spot.name}: ${spot.itemEmoji} ${spot.itemLabel}!`);
        }
      });
    });

    modal.style.display = 'flex';
  }

  _closeBagModal() {
    const modal = this.container?.querySelector('#farmBagModal');
    if (modal) modal.style.display = 'none';
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
        this._closeBagModal();
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
        guide.textContent = `👉 점선 길을 따라 ${this.currentSpotIndex + 1}번 ${next.emoji} ${next.name}에게 가볼까요!`;
      } else {
        guide.textContent = '🏆 12개 선물 완성! 가방을 열거나 농장을 자유롭게 산책해 보세요!';
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
    const w = wrap.clientWidth || window.innerWidth;
    const h = wrap.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#BAE6FD');
    this.scene.fog = new THREE.Fog('#BAE6FD', 28, 62);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 120);
    this.camera.position.set(this.avatarPos.x, 12.0, this.avatarPos.z + 11.5);
    this.camera.lookAt(this.avatarPos.x, 1.0, this.avatarPos.z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'farm-canvas';
    wrap.prepend(this.renderer.domElement);

    // Warm sunny lighting
    this.scene.add(new THREE.HemisphereLight('#FFFDF5', '#74C69D', 1.2));
    const dir = new THREE.DirectionalLight('#FFF7E0', 1.15);
    dir.position.set(14, 24, 16);
    this.scene.add(dir);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    // 1. 100% 3D Farm World
    const world = buildFarmWorld3D(THREE, this.scene);
    this.groundMesh = world.groundMesh;
    this.clouds = world.clouds;

    // 2. 100% 3D Wooju Explorer Avatar
    this.wooju = buildWooju3D(THREE);
    this.wooju.group.position.set(this.avatarPos.x, 0, this.avatarPos.z);
    this.scene.add(this.wooju.group);

    // 3. 12 Sequential 100% 3D Animal Characters + Props
    this.spotEntries = [];
    FARM_SPOTS.forEach((spot, idx) => {
      const built = buildSpotCharacter3D(THREE, spot.id);
      const baseY = spot.prop === 'stage' ? 0.40 : 0.0;
      built.group.position.set(spot.pos.x, baseY, spot.pos.z);
      // Face gently toward the center / front path
      built.group.rotation.y = Math.atan2(-spot.pos.x, -spot.pos.z + 3.0);

      // Generous invisible touch cylinder for easy 6yo tapping
      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.75, 3.4, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = 1.5;
      hitMesh.userData = { spotIndex: idx };
      built.group.add(hitMesh);

      // Completed checkmark floating badge
      const checkSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: createBadgeTexture(THREE, '✓', '#22C55E', '#FFFFFF'), transparent: true })
      );
      checkSprite.scale.set(0.85, 0.85, 1);
      checkSprite.position.set(0.9, 2.55, 0);
      checkSprite.visible = false;
      built.group.add(checkSprite);

      this.scene.add(built.group);
      this.spotEntries.push({ ...built, hitMesh, checkSprite, baseY, spot });
    });

    // 4. Active Golden Ring, Floating '!' & Animated 3D Dashed Guiding Path (따라가기 점선 길)
    this.activeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.82, 32),
      new THREE.MeshBasicMaterial({ color: '#FACC15', side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    this.activeRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.activeRing);

    this.exclaimSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: createBadgeTexture(THREE, '!', '#F59E0B', '#FFFFFF'), transparent: true })
    );
    this.exclaimSprite.scale.set(0.95, 0.95, 1);
    this.scene.add(this.exclaimSprite);

    // 16 glowing 3D capsule dashes forming a clear dotted/dashed path to the next animal!
    this.dashedTrail = [];
    const dashGeo = new THREE.CapsuleGeometry(0.11, 0.42, 4, 8);
    dashGeo.rotateX(Math.PI / 2); // lay flat along Z
    for (let i = 0; i < 16; i++) {
      const dashMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#FACC15' : '#FFFFFF', transparent: true, opacity: 0.92 });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      this.scene.add(dash);
      this.dashedTrail.push(dash);
    }

    // Tap ripple ring
    this.tapRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.58, 24),
      new THREE.MeshBasicMaterial({ color: '#6366F1', side: THREE.DoubleSide, transparent: true, opacity: 0 })
    );
    this.tapRing.rotation.x = -Math.PI / 2;
    this.tapRing.position.y = 0.08;
    this.scene.add(this.tapRing);

    this._updateSpotVisuals();

    this._onResize = () => {
      if (!this.renderer || !wrap) return;
      const nw = wrap.clientWidth || window.innerWidth;
      const nh = wrap.clientHeight || window.innerHeight;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', this._onResize);

    this._onPointerDown = (e) => {
      this.audio.unlock();
      if (!this.entered || this.activeDialogueSpot !== null) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);

      const spotTargets = this.spotEntries.map(m => m.hitMesh);
      const spotHits = this.raycaster.intersectObjects(spotTargets, false);
      if (spotHits.length > 0) {
        const idx = spotHits[0].object.userData.spotIndex;
        this._handleSpotTap(idx, false);
        return;
      }

      const groundHits = this.raycaster.intersectObject(this.groundMesh, false);
      if (groundHits.length > 0) {
        const pt = groundHits[0].point;
        const r = Math.hypot(pt.x, pt.z);
        const clamped = r > 16.0 ? { x: (pt.x / r) * 16.0, z: (pt.z / r) * 16.0 } : { x: pt.x, z: pt.z };
        this.walkTarget = clamped;
        this.pendingSpotTrigger = null;
        this._spawnTapRing(clamped.x, clamped.z);
      }
    };
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
  }

  _spawnTapRing(x, z) {
    if (!this.tapRing) return;
    this.tapRing.position.set(x, 0.08, z);
    this.tapRingLife = 1.0;
  }

  _updateSpotVisuals() {
    if (!this.spotEntries.length) return;
    this.spotEntries.forEach((m, idx) => {
      const done = idx < this.currentSpotIndex;
      m.checkSprite.visible = done;
      // Hide the 3D item prop once Wooju has collected it into the bag!
      if (m.itemMesh) {
        m.itemMesh.visible = !this.collectedSpotIds.has(m.spot.id);
      }
    });

    if (this.currentSpotIndex < FARM_SPOTS.length) {
      const target = FARM_SPOTS[this.currentSpotIndex];
      const baseY = this.spotEntries[this.currentSpotIndex].baseY;
      this.activeRing.visible = true;
      this.activeRing.position.set(target.pos.x, baseY + 0.08, target.pos.z);
      this.exclaimSprite.visible = true;
      this.exclaimSprite.position.set(target.pos.x, baseY + 3.15, target.pos.z);
      this.dashedTrail.forEach(d => { d.visible = true; });
    } else {
      this.activeRing.visible = false;
      this.exclaimSprite.visible = false;
      this.dashedTrail.forEach(d => { d.visible = false; });
    }
  }

  _handleSpotTap(spotIdx, immediate = false) {
    const decision = resolveSpotInteraction(spotIdx, this.currentSpotIndex, this.isListening);
    if (decision.action === 'busy') return;
    if (decision.action === 'locked') {
      const target = FARM_SPOTS[decision.redirectTo];
      this.onToast(`👉 점선 길을 따라 ${decision.redirectTo + 1}번 ${target.emoji} ${target.name} 친구에게 먼저 가볼까요!`);
      return;
    }

    const spot = FARM_SPOTS[spotIdx];
    const dist = Math.hypot(this.avatarPos.x - spot.pos.x, this.avatarPos.z - spot.pos.z);
    if (immediate || dist < 3.0) {
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
      this.dialogueFinished = false;
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
            actionBtn.textContent = '🎁 💃 댄스 선물 가방에 넣고 파티 완료!!';
          } else {
            actionBtn.textContent = `🎁 ${spot.itemEmoji} ${spot.itemLabel} 가방에 담기!`;
          }
        },
      });
    };

    replayBtn.onclick = () => playCards();
    actionBtn.onclick = () => {
      if (!this.dialogueFinished) return;
      this._hideDialogue();
      if (!isRevisit && spotIdx === this.currentSpotIndex) {
        this.collectedSpotIds.add(spot.id);
        this.currentSpotIndex += 1;
        this.onRewardStar(1);
        this.audio.playStarSFX();
        this.onConfetti(38);
        this._animateItemToBag(spot.itemEmoji);
        this._updateBagBadge();
        this._renderRibbon();
        this._updateSpotVisuals();

        if (this.currentSpotIndex >= FARM_SPOTS.length) {
          setTimeout(() => this._showFinale(), 550);
        } else {
          const next = FARM_SPOTS[this.currentSpotIndex];
          this.onToast(`🎒 ${spot.itemEmoji} ${spot.itemLabel} 가방에 쏙! 점선 따라 ${next.emoji} ${next.name}에게 가요!`);
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

      // Drifting 3D sky clouds
      this.clouds.forEach((c, i) => {
        c.position.x += dt * (0.28 + i * 0.06);
        if (c.position.x > 26) c.position.x = -26;
      });

      // 1. Wooju 3D Avatar Movement & Walking Limb Animation
      let moving = false;
      const speed = 7.5;
      if (this.entered && this.activeDialogueSpot === null) {
        if (Math.hypot(this.joyVec.x, this.joyVec.z) > 0.08) {
          const nx = this.avatarPos.x + this.joyVec.x * speed * dt;
          const nz = this.avatarPos.z + this.joyVec.z * speed * dt;
          if (Math.hypot(nx, nz) <= 16.2) {
            this.avatarPos.x = nx;
            this.avatarPos.z = nz;
          }
          this.avatarAngle = Math.atan2(this.joyVec.x, this.joyVec.z);
          moving = true;
        } else if (this.walkTarget) {
          const dx = this.walkTarget.x - this.avatarPos.x;
          const dz = this.walkTarget.z - this.avatarPos.z;
          const dist = Math.hypot(dx, dz);
          const stopDist = this.pendingSpotTrigger ? 2.3 : 0.25;
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

        // Proximity auto-trigger when walking up to the active animal
        if (moving && !this.pendingSpotTrigger && this.currentSpotIndex < FARM_SPOTS.length) {
          const active = FARM_SPOTS[this.currentSpotIndex];
          if (Math.hypot(this.avatarPos.x - active.pos.x, this.avatarPos.z - active.pos.z) < 2.35) {
            this.walkTarget = null;
            this._openDialogue(this.currentSpotIndex, false);
          }
        }
      }

      if (this.wooju) {
        this.wooju.group.position.x = this.avatarPos.x;
        this.wooju.group.position.z = this.avatarPos.z;
        this.wooju.group.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.16 : 0;
        this.wooju.group.rotation.y = this.avatarAngle;
        const swing = moving ? Math.sin(t * 11) * 0.65 : 0;
        this.wooju.leftLeg.rotation.x = swing;
        this.wooju.rightLeg.rotation.x = -swing;
        this.wooju.leftArm.rotation.x = -swing * 0.8;
        this.wooju.rightArm.rotation.x = swing * 0.8;
      }

      // 2. Animated 3D Dashed Guiding Path (따라가기 길 점선) from Wooju → Active Target!
      if (this.currentSpotIndex < FARM_SPOTS.length && this.dashedTrail.length) {
        const target = FARM_SPOTS[this.currentSpotIndex].pos;
        const dx = target.x - this.avatarPos.x;
        const dz = target.z - this.avatarPos.z;
        const dist = Math.hypot(dx, dz);
        const yaw = Math.atan2(dx, dz);
        // Flowing offset animates dashes moving forward toward the target animal
        const flow = (t * 0.65) % 1;

        this.dashedTrail.forEach((dash, i) => {
          const frac = (i + flow) / this.dashedTrail.length;
          if (dist < 2.4 || frac < 0.08 || frac > 0.92) {
            dash.visible = false;
            return;
          }
          dash.visible = true;
          dash.position.set(
            this.avatarPos.x + dx * frac,
            0.16 + Math.sin(t * 5 - i * 0.6) * 0.05,
            this.avatarPos.z + dz * frac
          );
          dash.rotation.y = yaw;
        });
      }

      if (this.activeRing && this.activeRing.visible) {
        const s = 1 + Math.sin(t * 4.5) * 0.1;
        this.activeRing.scale.set(s, s, 1);
      }
      if (this.exclaimSprite && this.exclaimSprite.visible && this.currentSpotIndex < FARM_SPOTS.length) {
        const baseY = this.spotEntries[this.currentSpotIndex].baseY;
        this.exclaimSprite.position.y = baseY + 3.15 + Math.sin(t * 5) * 0.22;
      }

      // 3. 3D Character Animations (idle breathing, speaking bounce, floating item spin, dancing pig!)
      this.spotEntries.forEach((m, idx) => {
        const isSpeaking = this.activeDialogueSpot === idx && this.isListening;
        const isDancingPig = idx === FARM_SPOTS.length - 1 && (this.currentSpotIndex >= FARM_SPOTS.length || isSpeaking);
        if (isDancingPig) {
          m.bodyRoot.position.y = Math.abs(Math.sin(t * 9)) * 0.48;
          m.bodyRoot.rotation.y = Math.sin(t * 6) * 0.55;
          m.bodyRoot.rotation.z = Math.sin(t * 9) * 0.14;
        } else if (isSpeaking) {
          m.bodyRoot.position.y = Math.abs(Math.sin(t * 7)) * 0.25;
          m.bodyRoot.rotation.z = Math.sin(t * 7) * 0.06;
        } else {
          m.bodyRoot.position.y = Math.sin(t * 2.2 + idx) * 0.04;
          m.bodyRoot.rotation.z = 0;
        }
        if (m.itemMesh && m.itemMesh.visible) {
          m.itemMesh.rotation.y = t * 1.8 + idx;
        }
      });

      if (this.tapRingLife > 0 && this.tapRing) {
        this.tapRingLife = Math.max(0, this.tapRingLife - dt * 2.5);
        const s = 1 + (1 - this.tapRingLife) * 1.4;
        this.tapRing.scale.set(s, s, 1);
        this.tapRing.material.opacity = this.tapRingLife * 0.7;
      }

      // 4. Camera: Gentle Orbit during Entry Splash, Smooth Animal Crossing Follow after entering
      if (!this.entered) {
        const angle = t * 0.18;
        this.camera.position.set(Math.sin(angle) * 20, 14.5, Math.cos(angle) * 20);
        this.camera.lookAt(0, 1.0, 0);
      } else {
        let focusX = this.avatarPos.x;
        let focusZ = this.avatarPos.z;
        let camHeight = 10.6;
        let camDist = 10.4;
        if (this.activeDialogueSpot !== null) {
          const sp = FARM_SPOTS[this.activeDialogueSpot].pos;
          focusX = sp.x;
          focusZ = sp.z;
          camHeight = 4.8;
          camDist = 6.2;
        }
        this.camera.position.x += (focusX - this.camera.position.x) * 0.08;
        this.camera.position.y += (camHeight - this.camera.position.y) * 0.08;
        this.camera.position.z += (focusZ + camDist - this.camera.position.z) * 0.08;
        this.camera.lookAt(focusX, 1.1, focusZ);
      }

      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(animate);
  }
}
