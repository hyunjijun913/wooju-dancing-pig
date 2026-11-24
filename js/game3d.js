// 0단계 (v4): Living 3D Farm Collector RPG — 12 Village Buildings, 24 Treasure Drops,
// 15 3D Wooju Gear Cosmetics, 16 Achievements & 3-Star Animal Parade!
import {
  FARM_SPOTS,
  BASE_CARDS,
  VILLAGE_BUILDINGS,
  TREASURE_ITEMS,
  WOOJU_GEAR,
  FARM_ACHIEVEMENTS,
  FARM_STORAGE_KEY,
  resolveSpotInteraction,
  computeFarmProgress,
  applySpotMastery,
  getUnlockedBuildings,
  getNextBuildingGoal,
  getUnlockedGear,
  getUnlockedAchievements,
  rollTreasureDrop,
  countMasteredSpots,
} from './data.js';
import {
  buildWooju3D,
  buildSpotCharacter3D,
  buildFarmWorld3D,
  buildPartyRewards3D,
  buildVillageBuildings3D,
} from './models3d.js';

let THREE_MOD = null;
async function loadThree() {
  if (THREE_MOD) return THREE_MOD;
  THREE_MOD = await import('three');
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
  ctx.font = 'bold 58px sans-serif';
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
    getTotalStars = () => 0,
    onRewardStar = () => {},
    onConfetti = () => {},
    onToast = () => {},
    onOpenSequenceQuiz = () => {},
    onGoToParrotMode = () => {},
    onExitFullscreen = () => {},
  } = {}) {
    this.audio = audioEngine;
    this.getTotalStars = getTotalStars;
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

    // v3/v4 Persistent RPG state
    this.mastery = {}; // { [spotId]: 0..3 }
    this.equippedGear = {}; // { [gearId]: boolean }
    this.speakCount = 0;
    this.perfectCount = 0;
    this.treasures = []; // owned treasure IDs (up to 24)
    this.paradeEnabled = true;
    this.bagTab = 'collection'; // 'collection' | 'buildings' | 'treasures' | 'wardrobe' | 'achievements'
    this.hasNewBadge = false;
    this.pendingChest = null;

    // Runtime dialogue & navigation state
    this.currentSpotIndex = 0;
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueMode = 'repeat'; // 'repeat' | 'hint' | 'memory'
    this.dialogueListened = false;
    this.voiceFilled = false;
    this.pendingSpotTrigger = null;

    // Wooju 3D avatar movement & parade breadcrumb trail
    this.avatarPos = { x: 0, z: 15.2 };
    this.avatarAngle = Math.PI;
    this.walkTarget = null;
    this.joyVec = { x: 0, z: 0 };
    this.joyActive = false;
    this.woojuTrail = [];

    // 3D refs
    this.THREE = null;
    this.wooju = null;
    this.partyRewards = null;
    this.villageBuildings = null;
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
    this._typeTimer = null;
  }

  _loadRpgState() {
    try {
      const raw = localStorage.getItem(FARM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.mastery = parsed.mastery && typeof parsed.mastery === 'object' ? parsed.mastery : {};
        this.equippedGear = parsed.equippedGear && typeof parsed.equippedGear === 'object' ? parsed.equippedGear : {};
        this.speakCount = Number.isFinite(parsed.speakCount) ? parsed.speakCount : 0;
        this.perfectCount = Number.isFinite(parsed.perfectCount) ? parsed.perfectCount : 0;
        this.treasures = Array.isArray(parsed.treasures) ? parsed.treasures : [];
      }
    } catch (_) {
      this.mastery = {};
      this.equippedGear = {};
      this.speakCount = 0;
      this.perfectCount = 0;
      this.treasures = [];
    }
    const prog = computeFarmProgress(this.mastery);
    this.currentSpotIndex = prog.nextSpotIndex;
  }

  _saveRpgState() {
    try {
      localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify({
        mastery: this.mastery,
        equippedGear: this.equippedGear,
        speakCount: this.speakCount,
        perfectCount: this.perfectCount,
        treasures: this.treasures,
      }));
    } catch (_) {}
  }

  _getExtraStats() {
    return {
      speakCount: this.speakCount,
      perfectCount: this.perfectCount,
      treasures: this.treasures,
    };
  }

  async mount(containerEl) {
    if (this.mounted) return;
    this.container = containerEl;
    this.mounted = true;
    document.body.classList.add('farm-fullscreen');

    this._loadRpgState();
    this._renderShell();
    this._renderRibbon();
    this._updateBagBadge();
    this._updateParadeBtn();
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
    clearInterval(this._typeTimer);
    this._typeTimer = null;
    this.audio.stopAll();
    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueListened = false;
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
    this.partyRewards = null;
    this.villageBuildings = null;
    this.scene = null;
    this.camera = null;
  }

  resetProgress(skipConfirm = false) {
    if (!skipConfirm && typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm('지금까지 모은 3D 농장 건물·보물·3성 왕관 기록을 처음부터 다시 시작할까요?');
      if (!ok) return;
    }
    this.audio.stopAll();
    this.mastery = {};
    this.equippedGear = {};
    this.speakCount = 0;
    this.perfectCount = 0;
    this.treasures = [];
    this.currentSpotIndex = 0;
    this._saveRpgState();

    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueListened = false;
    this.pendingSpotTrigger = null;
    this.avatarPos = { x: 0, z: 15.2 };
    this.woojuTrail = [];
    this.walkTarget = null;

    if (this.wooju) {
      this.wooju.group.position.set(this.avatarPos.x, 0, this.avatarPos.z);
      this.wooju.setGear(this.equippedGear);
    }
    if (this.partyRewards) this.partyRewards.syncMastery(this.mastery);
    if (this.villageBuildings) this.villageBuildings.syncBuildings([]);

    this.spotEntries.forEach((m) => {
      m.curX = m.homeX;
      m.curZ = m.homeZ;
      m.group.position.x = m.homeX;
      m.group.position.z = m.homeZ;
      if (m.setMasteryVisual) m.setMasteryVisual(0);
    });

    this._hideDialogue();
    this._hideFinale();
    this._closeBagModal();
    this._renderRibbon();
    this._updateBagBadge();
    this._updateParadeBtn();
    this._updateSpotVisuals();
    this.onToast('🗺️ 처음부터 다시 3D 농장 모험을 시작해요!');

    if (this.entered) {
      setTimeout(() => {
        if (this.mounted && this.currentSpotIndex === 0) this._openDialogue(0, false);
      }, 350);
    }
  }

  _renderShell() {
    const prog = computeFarmProgress(this.mastery);
    const entrySub = prog.metCount > 0
      ? `지금까지 선물 ${prog.metCount}/12개 · 👑 혼자 외우기 ${prog.masteredCount}마리 달성 중!`
      : '동물 친구들의 영어를 따라 말하고 외우면<br/>3D 파티장 선물과 황금 왕관, 우주 장비가 생겨나요!';

    this.container.innerHTML = `
      <div class="farm-stage farm-stage-full" id="farmCanvasWrap">
        <!-- Floating Fullscreen Top HUD -->
        <div class="farm-float-top">
          <button class="farm-pill-btn farm-exit-btn" id="farmExitBtn">⬅️ 학습 메뉴</button>
          <div class="farm-ribbon" id="farmRibbon" aria-label="스토리 순서 띠"></div>
          <button class="farm-pill-btn farm-parade-btn" id="farmParadeBtn" title="3성 동물 기차" style="display:none;">🐾 기차 ON</button>
          <button class="farm-pill-btn farm-reset-btn" id="farmResetBtn" title="처음부터">🔄</button>
        </div>

        <div class="farm-guide-pill" id="farmGuidePill">👆 노란 점선 길을 따라 반짝이는 친구에게 가보세요!</div>
        <div class="farm-goal-pill" id="farmGoalPill">🗣️ 0회 · 다음 건물: 🌷 꽃길 정원 (3회)</div>

        <!-- Floating Speech Bubble projected right above a nearby 3D villager -->
        <button class="farm-hover-bubble" id="farmHoverBubble" style="display:none;">
          <span id="farmHoverText">💬 말 걸기!</span>
        </button>

        <!-- Entry Splash Overlay -->
        <div class="farm-entry-overlay" id="farmEntryOverlay" style="${this.entered ? 'display:none;' : 'display:flex;'}">
          <div class="farm-entry-card">
            <div class="farm-entry-emoji">🏡🐷👑</div>
            <h2>우주의 3D 농장 모험</h2>
            <p>${entrySub}</p>
            <button class="big-btn btn-star farm-enter-btn" id="farmEnterBtn">🚀 농장 들어가기!</button>
            <button class="mini-btn" id="farmEntryExitBtn" style="margin-top:4px;">⬅️ 1~4단계 학습 메뉴로 가기</button>
          </div>
        </div>

        <!-- Virtual Joystick (bottom-left) -->
        <div class="farm-joystick" id="farmJoystick" aria-label="이동 조이스틱">
          <div class="farm-joy-knob" id="farmJoyKnob"></div>
        </div>

        <!-- Prominent Bottom-Right 🎒 Collection & Wardrobe FAB -->
        <button class="farm-pocket-fab" id="farmBagBtn" aria-label="도감과 옷장 열기">
          <span class="pocket-new-dot" id="farmGearNewDot" style="display:none;">NEW!</span>
          <span class="pocket-ico">🎒</span>
          <span class="pocket-label">도감·옷장 <b id="farmBagCount">0/12</b></span>
          <span class="pocket-preview" id="farmBagPreview">👑 0마리</span>
        </button>

        <!-- v3 RPG 3-Tier Speaking Challenge Dialogue -->
        <div class="farm-dialogue ac-bubble" id="farmDialogue" style="display:none;">
          <div class="ac-name-tag" id="farmDlgName">🐔 닭</div>
          <button class="farm-dlg-close" id="farmDlgCloseBtn" aria-label="닫기">✕</button>

          <!-- 3 Challenge Tier Tabs -->
          <div class="farm-tier-tabs" id="farmTierTabs">
            <button class="farm-tier-tab active" data-tier-mode="repeat">☀️ 따라하기 ⭐</button>
            <button class="farm-tier-tab" data-tier-mode="hint">🌅 힌트·주고받기 ⭐⭐</button>
            <button class="farm-tier-tab" data-tier-mode="memory">🌙 혼자 외우기 👑</button>
          </div>

          <div class="farm-dlg-head">
            <img id="farmDlgPortrait" class="farm-dlg-portrait" alt="" />
            <div class="farm-dlg-meta">
              <div class="farm-dlg-stars" id="farmDlgStars">☆☆☆</div>
              <div class="farm-dlg-en" id="farmDlgEn"></div>
              <div class="farm-dlg-ko" id="farmDlgKo"></div>
            </div>
            <div class="farm-dlg-audio-btns">
              <button class="mini-btn" id="farmDlgReplayBtn">🔊 듣기</button>
              <button class="mini-btn" id="farmDlgChunkBtn" style="display:none;">✂️ 2단 콤보</button>
            </div>
          </div>

          <div class="farm-dlg-icons" id="farmDlgIcons"></div>

          <!-- Live Sustained-Speech Magic Gauge -->
          <div class="farm-magic-gauge" id="farmMagicGauge">
            <span class="magic-label" id="farmMagicLabel">🎙️ 영어로 말하면 마법이 차올라요!</span>
            <div class="magic-track">
              <div class="magic-fill" id="farmMagicFill"></div>
            </div>
            <span class="magic-pct" id="farmMagicPct">0%</span>
          </div>

          <!-- Hybrid Judge / Reward Buttons (3-way: Repeat/Hint, Solo 3★, Perfect Treasure!) -->
          <div class="farm-judge-row farm-judge-row-3">
            <button class="big-btn btn-star farm-judge-btn" id="farmJudgeNormalBtn">⭐ 따라 말했어요!</button>
            <button class="big-btn btn-crown farm-judge-btn" id="farmJudgeCrownBtn">👑 혼자 외웠어요!</button>
            <button class="big-btn btn-perfect farm-judge-btn" id="farmJudgePerfectBtn">💎 토씨 안 틀림!!</button>
          </div>
        </div>

        <!-- 🎁 Interactive Treasure Chest Pop-up Modal -->
        <div class="farm-chest-modal" id="farmChestModal" style="display:none;">
          <div class="farm-chest-card" id="farmChestCard">
            <div class="chest-title" id="chestTitle">💎 퍼펙트 보물상자 도착!!</div>
            <button class="chest-box-btn" id="chestBoxBtn" aria-label="보물상자 열기">🎁</button>
            <div class="chest-sub" id="chestSub">반짝이는 상자를 톡! 눌러서 열어보세요!</div>
            <div class="chest-reveal" id="chestReveal" style="display:none;">
              <div class="chest-rarity" id="chestRarity">✨ 희귀 보물</div>
              <div class="chest-item-ico" id="chestItemIco">🏆</div>
              <div class="chest-item-name" id="chestItemName">춤추는 돼지 트로피</div>
              <button class="big-btn btn-star" id="chestCloseBtn" style="margin-top:10px;width:100%;">🎒 도감에 쏙 넣기!</button>
            </div>
          </div>
        </div>

        <!-- 🎒 5-Tab Collection Codex + Buildings + Treasures + Wardrobe + Achievements -->
        <div class="farm-bag-modal" id="farmBagModal" style="display:none;">
          <div class="farm-bag-sheet">
            <div class="modal-head">
              <h2>🎒 우주의 대모험 컬렉션</h2>
              <button class="close-btn" id="farmBagCloseBtn">✕</button>
            </div>
            <div class="bag-tab-bar bag-tab-bar-5">
              <button class="bag-tab active" data-bag-tab="collection">🐾 도감 <span id="farmBagModalCount">0/12</span></button>
              <button class="bag-tab" data-bag-tab="buildings">🏗️ 건물 <span id="farmBuildModalCount">0/12</span></button>
              <button class="bag-tab" data-bag-tab="treasures">💎 보물 <span id="farmTrModalCount">0/24</span></button>
              <button class="bag-tab" data-bag-tab="wardrobe">👕 옷장 <span id="farmGearModalCount">0/15</span></button>
              <button class="bag-tab" data-bag-tab="achievements">🏆 업적 <span id="farmAchModalCount">0/16</span></button>
            </div>
            <div id="farmBagContent"></div>
          </div>
        </div>

        <!-- Finale Celebration Overlay -->
        <div class="farm-finale" id="farmFinale" style="display:none;">
          <div style="font-size:58px;">🐷💃🎉</div>
          <h3>12개 파티 선물 완성!!</h3>
          <p>중앙 파티 테이블과 무대가 완성됐어요! 이제 동물 친구들에게 <b>👑 혼자 외우기(3성)</b>에 도전해서 황금 왕관 기차를 만들어 볼까요?</p>
          <div class="farm-finale-actions">
            <button class="big-btn btn-star" id="farmFinaleRoamBtn">🐾 자유 산책 &amp; 3성 도전!</button>
            <button class="big-btn btn-echo" id="farmFinaleQuizBtn">🧩 순서 퀴즈</button>
            <button class="big-btn btn-listen" id="farmFinaleParrotBtn">🎤 4단계 발표회 통녹음</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#farmExitBtn').addEventListener('click', () => this.onExitFullscreen());
    this.container.querySelector('#farmEntryExitBtn').addEventListener('click', () => this.onExitFullscreen());
    this.container.querySelector('#farmResetBtn').addEventListener('click', () => this.resetProgress(false));
    this.container.querySelector('#farmBagBtn').addEventListener('click', () => this._openBagModal());
    this.container.querySelector('#farmBagCloseBtn').addEventListener('click', () => this._closeBagModal());
    this.container.querySelector('#farmDlgCloseBtn').addEventListener('click', () => this._hideDialogue());
    this.container.querySelector('#chestBoxBtn').addEventListener('click', () => this._revealPendingChest());
    this.container.querySelector('#chestCloseBtn').addEventListener('click', () => this._closeChestModal());

    this.container.querySelector('#farmParadeBtn').addEventListener('click', () => {
      this.paradeEnabled = !this.paradeEnabled;
      this._updateParadeBtn();
      this.onToast(this.paradeEnabled
        ? '🐾 3성 동물 친구들이 우주 뒤를 기차처럼 따라와요!'
        : '🏡 동물 친구들이 자기 자리로 돌아가 쉬어요!');
    });

    this.container.querySelectorAll('.bag-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.bagTab = btn.dataset.bagTab;
        this._renderBagModalContent();
      });
    });

    this.container.querySelector('#farmFinaleRoamBtn').addEventListener('click', () => this._hideFinale());
    this.container.querySelector('#farmFinaleQuizBtn').addEventListener('click', () => {
      this.onExitFullscreen();
      this.onOpenSequenceQuiz();
    });
    this.container.querySelector('#farmFinaleParrotBtn').addEventListener('click', () => this.onGoToParrotMode());

    this.container.querySelector('#farmEnterBtn').addEventListener('click', () => {
      this.audio.unlock();
      this.entered = true;
      const overlay = this.container.querySelector('#farmEntryOverlay');
      if (overlay) overlay.style.display = 'none';
      if (this.currentSpotIndex === 0) {
        this._openDialogue(0, false);
      } else {
        this.onToast('🏡 우주의 농장에 돌아왔어요! 친구들과 3성 왕관에 도전해 볼까요!');
      }
    });
  }

  _updateParadeBtn() {
    const btn = this.container?.querySelector('#farmParadeBtn');
    if (!btn) return;
    const masters = countMasteredSpots(this.mastery);
    if (masters > 0) {
      btn.style.display = 'inline-flex';
      btn.textContent = this.paradeEnabled ? `🐾 기차 ${masters}` : `🐾 기차 OFF`;
      btn.classList.toggle('parade-on', this.paradeEnabled);
    } else {
      btn.style.display = 'none';
    }
  }

  _updateBagBadge() {
    const prog = computeFarmProgress(this.mastery);
    const extra = this._getExtraStats();
    const unlockedBuildings = getUnlockedBuildings(this.speakCount);
    const unlockedGear = getUnlockedGear(this.mastery, this.getTotalStars(), extra);
    const unlockedAch = getUnlockedAchievements(this.mastery, this.getTotalStars(), extra);

    const setTxt = (sel, txt) => {
      const el = this.container?.querySelector(sel);
      if (el) el.textContent = txt;
    };
    setTxt('#farmBagCount', `${prog.metCount}/${FARM_SPOTS.length}`);
    setTxt('#farmBagModalCount', `${prog.metCount}/${FARM_SPOTS.length}`);
    setTxt('#farmBuildModalCount', `${unlockedBuildings.length}/${VILLAGE_BUILDINGS.length}`);
    setTxt('#farmTrModalCount', `${this.treasures.length}/${TREASURE_ITEMS.length}`);
    setTxt('#farmGearModalCount', `${unlockedGear.length}/${WOOJU_GEAR.length}`);
    setTxt('#farmAchModalCount', `${unlockedAch.length}/${FARM_ACHIEVEMENTS.length}`);
    setTxt('#farmBagPreview', `🏗️${unlockedBuildings.length} · 💎${this.treasures.length} · 👕${unlockedGear.length}`);

    const newDot = this.container?.querySelector('#farmGearNewDot');
    if (newDot) newDot.style.display = this.hasNewBadge ? 'inline-block' : 'none';

    const goalPill = this.container?.querySelector('#farmGoalPill');
    if (goalPill) {
      const nextB = getNextBuildingGoal(this.speakCount);
      if (nextB) {
        const rem = nextB.reqSpeaks - this.speakCount;
        goalPill.textContent = `🗣️ 말하기 ${this.speakCount}회 · 다음 건물: ${nextB.emoji} ${nextB.name} (${rem}번 남음!)`;
      } else {
        goalPill.textContent = `🏆 12개 마을 건물 올클리어!! (말하기 ${this.speakCount}회 · 💎 보물 ${this.treasures.length}/24)`;
      }
    }
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

  _openBagModal(initialTab = null) {
    if (initialTab) this.bagTab = initialTab;
    this.hasNewBadge = false;
    this._updateBagBadge();
    this._renderBagModalContent();
    const modal = this.container?.querySelector('#farmBagModal');
    if (modal) modal.style.display = 'flex';
  }

  _renderBagModalContent() {
    const contentEl = this.container?.querySelector('#farmBagContent');
    if (!contentEl) return;

    this.container.querySelectorAll('.bag-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bagTab === this.bagTab);
    });

    const totalStars = this.getTotalStars();
    const extra = this._getExtraStats();
    const masters = countMasteredSpots(this.mastery);
    const unlockedBuildings = new Set(getUnlockedBuildings(this.speakCount));
    const ownedTreasures = new Set(this.treasures);
    const unlockedGear = new Set(getUnlockedGear(this.mastery, totalStars, extra));
    const unlockedAch = new Set(getUnlockedAchievements(this.mastery, totalStars, extra));

    const getProgressVal = (reqType) => {
      switch (reqType) {
        case 'stars': return totalStars;
        case 'masters': return masters;
        case 'speaks': return this.speakCount;
        case 'perfects': return this.perfectCount;
        case 'treasures': return this.treasures.length;
        case 'buildings': return unlockedBuildings.size;
        default: return 0;
      }
    };

    if (this.bagTab === 'collection') {
      contentEl.innerHTML = `
        <p class="bag-hint">선물을 톡! 누르면 영어 이야기를 들려줘요. <b>👑 3성(혼자 외우기)</b>을 달성하면 동물 친구가 우주 뒤를 기차처럼 따라다녀요!</p>
        <div class="farm-bag-grid">
          ${FARM_SPOTS.map((spot, idx) => {
            const tier = this.mastery[spot.id] || 0;
            const got = tier >= 1;
            const starStr = tier === 3 ? '👑👑👑' : (tier === 2 ? '⭐⭐☆' : (tier === 1 ? '⭐☆☆' : '☆☆☆'));
            return `
              <button class="bag-slot ${got ? 'got' : ''} ${tier >= 3 ? 'mastered' : ''}" data-bag-idx="${idx}" ${got ? '' : 'disabled'}>
                <div class="bag-slot-stars">${starStr}</div>
                <div class="bag-slot-ico">${got ? spot.itemEmoji : '❓'}</div>
                <div class="bag-slot-name">${got ? spot.itemLabel : `${idx + 1}번 선물`}</div>
                <div class="bag-slot-who">${got ? `${spot.emoji} ${spot.name}` : '아직 못 만났어요'}</div>
              </button>
            `;
          }).join('')}
        </div>
      `;
      contentEl.querySelectorAll('.bag-slot.got').forEach(btn => {
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
      return;
    }

    if (this.bagTab === 'buildings') {
      contentEl.innerHTML = `
        <p class="bag-hint">영어로 누적 말하기 횟수가 쌓일 때마다 <b>3D 농장에 진짜 건물과 랜드마크</b>가 지어져요! (현재 누적: <b>${this.speakCount}회</b>)</p>
        <div class="farm-bag-grid">
          ${VILLAGE_BUILDINGS.map((b) => {
            const built = unlockedBuildings.has(b.id);
            return `
              <div class="bag-slot ${built ? 'got mastered' : ''}">
                <div class="bag-slot-stars">${built ? '🏗️ 완성!' : `${Math.min(this.speakCount, b.reqSpeaks)}/${b.reqSpeaks}회`}</div>
                <div class="bag-slot-ico">${built ? b.emoji : '🔒'}</div>
                <div class="bag-slot-name">${b.name}</div>
                <div class="bag-slot-who">${b.desc}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      return;
    }

    if (this.bagTab === 'treasures') {
      const rarityLbl = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' };
      contentEl.innerHTML = `
        <p class="bag-hint"><b>💎 토씨 안 틀림!!</b>을 달성하거나 영어로 <b>5번 말할 때마다</b> 보물상자가 나와요! 24개 희귀 보물을 모두 모아보세요!</p>
        <div class="farm-bag-grid">
          ${TREASURE_ITEMS.map((tr) => {
            const got = ownedTreasures.has(tr.id);
            return `
              <div class="bag-slot ${got ? `got rarity-${tr.rarity}` : ''}">
                <div class="bag-slot-stars">${got ? rarityLbl[tr.rarity] : '???'}</div>
                <div class="bag-slot-ico">${got ? tr.emoji : '🎁'}</div>
                <div class="bag-slot-name">${got ? tr.name : '숨겨진 보물'}</div>
                <div class="bag-slot-who">${got ? tr.cat : '상자를 열어보세요'}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      return;
    }

    if (this.bagTab === 'wardrobe') {
      const slots = [
        { key: 'head', title: '🎩 머리·모자 (5종)' },
        { key: 'back', title: '🦋 날개·망토·제트팩 (5종)' },
        { key: 'aura', title: '🪄 마법봉·오라·마이크 (5종)' },
      ];
      contentEl.innerHTML = `
        <p class="bag-hint">머리·날개·오라를 <b>동시에 3개까지 장착</b>할 수 있어요! 해금된 장비를 톡! 눌러서 입어보세요!</p>
        ${slots.map(sl => `
          <div class="wardrobe-slot-title">${sl.title}</div>
          <div class="farm-gear-grid">
            ${WOOJU_GEAR.filter(g => g.slot === sl.key).map(g => {
              const unlocked = unlockedGear.has(g.id);
              const equipped = unlocked && Boolean(this.equippedGear[g.id]);
              const curVal = getProgressVal(g.reqType);
              const progText = unlocked
                ? (equipped ? '✨ 장착 중!' : '👆 눌러서 장착!')
                : `${g.desc} (${Math.min(curVal, g.reqCount)}/${g.reqCount})`;
              return `
                <button class="gear-card ${unlocked ? 'unlocked' : 'locked'} ${equipped ? 'equipped' : ''}" data-gear-id="${g.id}" data-gear-slot="${g.slot}" ${unlocked ? '' : 'disabled'}>
                  <div class="gear-ico">${unlocked ? g.emoji : '🔒'}</div>
                  <div class="gear-name">${g.name}</div>
                  <div class="gear-status">${progText}</div>
                </button>
              `;
            }).join('')}
          </div>
        `).join('')}
      `;

      contentEl.querySelectorAll('.gear-card.unlocked').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.gearId;
          const slot = btn.dataset.gearSlot;
          const willEquip = !this.equippedGear[id];
          // Unequip other items in the same slot so Wooju wears 1 clean item per slot (head/back/aura)
          if (willEquip) {
            WOOJU_GEAR.filter(x => x.slot === slot).forEach(x => { this.equippedGear[x.id] = false; });
          }
          this.equippedGear[id] = willEquip;
          this._saveRpgState();
          if (this.wooju?.setGear) this.wooju.setGear(this.equippedGear);
          this.audio.playChimeSFX();
          const g = WOOJU_GEAR.find(x => x.id === id);
          if (g) {
            this.onToast(willEquip
              ? `${g.emoji} ${g.name} 장착 완료! 3D 우주 캐릭터를 보세요!`
              : `${g.emoji} ${g.name}을 벗었어요!`);
          }
          this._renderBagModalContent();
        });
      });
      return;
    }

    if (this.bagTab === 'achievements') {
      contentEl.innerHTML = `
        <p class="bag-hint">우주의 영어 모험 기록! 16개 업적 뱃지를 모두 빛나게 채워보세요!</p>
        <div class="farm-gear-grid">
          ${FARM_ACHIEVEMENTS.map(a => {
            const done = unlockedAch.has(a.id);
            const curVal = getProgressVal(a.reqType);
            return `
              <div class="gear-card ${done ? 'unlocked equipped' : 'locked'}">
                <div class="gear-ico">${done ? a.emoji : '🔒'}</div>
                <div class="gear-name">${a.name}</div>
                <div class="gear-status">${done ? '🏆 달성 완료!' : `${a.desc} (${Math.min(curVal, a.reqCount)}/${a.reqCount})`}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  _openChestModal(reasonTitle, { preferHigherRarity = false } = {}) {
    const drop = rollTreasureDrop(this.treasures, { preferHigherRarity });
    this.pendingChest = drop;

    const modal = this.container?.querySelector('#farmChestModal');
    const titleEl = this.container?.querySelector('#chestTitle');
    const boxBtn = this.container?.querySelector('#chestBoxBtn');
    const subEl = this.container?.querySelector('#chestSub');
    const revealEl = this.container?.querySelector('#chestReveal');
    if (!modal || !boxBtn || !revealEl) return;

    titleEl.textContent = reasonTitle || '🎁 반짝이는 보물상자 도착!!';
    boxBtn.style.display = 'inline-grid';
    subEl.style.display = 'block';
    revealEl.style.display = 'none';
    modal.style.display = 'flex';
  }

  _revealPendingChest() {
    if (!this.pendingChest) return;
    const { item, isDuplicate } = this.pendingChest;
    this.pendingChest = null;

    if (!isDuplicate && !this.treasures.includes(item.id)) {
      this.treasures.push(item.id);
      this.hasNewBadge = true;
      this._saveRpgState();
    }

    const boxBtn = this.container?.querySelector('#chestBoxBtn');
    const subEl = this.container?.querySelector('#chestSub');
    const revealEl = this.container?.querySelector('#chestReveal');
    const rarityEl = this.container?.querySelector('#chestRarity');
    const icoEl = this.container?.querySelector('#chestItemIco');
    const nameEl = this.container?.querySelector('#chestItemName');
    const rarityNames = { common: '⭐ 일반 보물', rare: '💙 희귀 보물!', epic: '💜 영웅 보물!!', legendary: '🌈 전설의 보물!!!' };

    if (boxBtn) boxBtn.style.display = 'none';
    if (subEl) subEl.style.display = 'none';
    if (rarityEl) {
      rarityEl.textContent = isDuplicate ? '✨ 보너스 전설 보물! (별 +3!)' : rarityNames[item.rarity];
      rarityEl.className = `chest-rarity rarity-${item.rarity}`;
    }
    if (icoEl) icoEl.textContent = item.emoji;
    if (nameEl) nameEl.textContent = item.name;
    if (revealEl) revealEl.style.display = 'flex';

    if (isDuplicate) this.onRewardStar(3);
    this.audio.playFanfareSFX();
    this.onConfetti(90);
    this._updateBagBadge();
  }

  _closeChestModal() {
    const modal = this.container?.querySelector('#farmChestModal');
    if (modal) modal.style.display = 'none';
  }

  _closeBagModal() {
    const modal = this.container?.querySelector('#farmBagModal');
    if (modal) modal.style.display = 'none';
  }

  _renderRibbon() {
    const ribbon = this.container?.querySelector('#farmRibbon');
    if (!ribbon) return;
    ribbon.innerHTML = FARM_SPOTS.map((spot, idx) => {
      const tier = this.mastery[spot.id] || 0;
      const done = tier >= 1;
      const mastered = tier >= 3;
      const active = idx === this.currentSpotIndex;
      const cls = ['ribbon-chip', done ? 'done' : '', mastered ? 'mastered' : '', active ? 'active' : ''].join(' ');
      const badge = mastered ? '👑' : (done ? spot.itemEmoji : String(idx + 1));
      return `
        <button class="${cls}" data-spot-idx="${idx}" title="${idx + 1}. ${spot.name}">
          <span class="rb-emo">${spot.emoji}</span>
          <span class="${done ? 'rb-item' : 'rb-num'}">${badge}</span>
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
      const masters = countMasteredSpots(this.mastery);
      if (this.currentSpotIndex < FARM_SPOTS.length) {
        const next = FARM_SPOTS[this.currentSpotIndex];
        guide.textContent = `👉 점선 길을 따라 ${this.currentSpotIndex + 1}번 ${next.emoji} ${next.name}에게 가서 영어로 말해요!`;
      } else if (masters < FARM_SPOTS.length) {
        guide.textContent = `👑 혼자 외우기 ${masters}/12마리! 친구에게 말 걸어 황금 왕관 동물 기차를 모아보세요!`;
      } else {
        guide.textContent = '🏆 12마리 모두 👑 황금 왕관 완성!! 우주는 최고의 영어 마법사!';
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
    this.scene.background = new THREE.Color('#9BD8FF');
    this.scene.fog = new THREE.Fog('#BFE8FF', 34, 88);

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 140);
    this.camera.position.set(this.avatarPos.x, 5.8, this.avatarPos.z + 11.5);
    this.camera.lookAt(this.avatarPos.x, 1.7, this.avatarPos.z - 1.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.domElement.className = 'farm-canvas';
    wrap.prepend(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight('#FFFDF5', '#68C456', 0.95));
    const dir = new THREE.DirectionalLight('#FFF5D6', 1.35);
    dir.position.set(16, 26, 18);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 2;
    dir.shadow.camera.far = 75;
    dir.shadow.camera.left = -24;
    dir.shadow.camera.right = 24;
    dir.shadow.camera.top = 24;
    dir.shadow.camera.bottom = -24;
    dir.shadow.bias = -0.0005;
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight('#FFE4B5', 0.35);
    fill.position.set(-14, 10, -12);
    this.scene.add(fill);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    // 1. 100% 3D Farm World
    const world = buildFarmWorld3D(THREE, this.scene);
    this.groundMesh = world.groundMesh;
    this.clouds = world.clouds;

    // 1b. v3/v4 Living Party Feast & 12 Unlockable Village Buildings
    this.partyRewards = buildPartyRewards3D(THREE, this.scene);
    this.partyRewards.syncMastery(this.mastery);
    this.villageBuildings = buildVillageBuildings3D(THREE, this.scene);
    this.villageBuildings.syncBuildings(getUnlockedBuildings(this.speakCount));

    // 2. 100% 3D Wooju Explorer Avatar + Equipped 3D Gear
    this.wooju = buildWooju3D(THREE);
    this.wooju.group.position.set(this.avatarPos.x, 0, this.avatarPos.z);
    this.wooju.setGear(this.equippedGear);
    this.scene.add(this.wooju.group);

    // 3. 12 Sequential 100% 3D Living Villagers
    this.spotEntries = [];
    FARM_SPOTS.forEach((spot, idx) => {
      const built = buildSpotCharacter3D(THREE, spot.id);
      const baseY = spot.prop === 'stage' ? 0.40 : 0.0;
      built.group.position.set(spot.pos.x, baseY, spot.pos.z);
      built.group.rotation.y = Math.atan2(-spot.pos.x, -spot.pos.z + 3.0);

      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.75, 3.4, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = 1.5;
      hitMesh.userData = { spotIndex: idx };
      built.group.add(hitMesh);

      const checkSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: createBadgeTexture(THREE, '★', '#22C55E', '#FFFFFF'), transparent: true })
      );
      checkSprite.scale.set(0.85, 0.85, 1);
      checkSprite.position.set(0.9, 2.55, 0);
      checkSprite.visible = false;
      built.group.add(checkSprite);

      if (built.setMasteryVisual) built.setMasteryVisual(this.mastery[spot.id] || 0);

      this.scene.add(built.group);
      this.spotEntries.push({
        ...built,
        hitMesh,
        checkSprite,
        baseY,
        spot,
        curX: spot.pos.x,
        curZ: spot.pos.z,
        homeX: spot.pos.x,
        homeZ: spot.pos.z,
        wanderRadius: spot.prop === 'stage' ? 1.5 : 1.75,
        wanderTarget: null,
        wanderTimer: 0.8 + (idx % 4) * 0.7,
        isMoving: false,
      });
    });

    // 4. Active Golden Ring, Floating '!' & Animated 3D Dashed Guiding Path
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

    this.dashedTrail = [];
    const dashGeo = new THREE.CapsuleGeometry(0.11, 0.42, 4, 8);
    dashGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const dashMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#FACC15' : '#FFFFFF', transparent: true, opacity: 0.92 });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      this.scene.add(dash);
      this.dashedTrail.push(dash);
    }

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
    this.spotEntries.forEach((m) => {
      const tier = this.mastery[m.spot.id] || 0;
      // Show green star badge for 1~2 stars (3 stars gets the gleaming 3D Golden Crown!)
      m.checkSprite.visible = tier >= 1 && tier < 3;
      if (m.itemMesh) {
        m.itemMesh.visible = tier === 0;
      }
      if (m.setMasteryVisual) m.setMasteryVisual(tier);
    });

    if (this.currentSpotIndex < FARM_SPOTS.length) {
      const entry = this.spotEntries[this.currentSpotIndex];
      this.activeRing.visible = true;
      this.activeRing.position.set(entry.curX, entry.baseY + 0.08, entry.curZ);
      this.exclaimSprite.visible = true;
      this.exclaimSprite.position.set(entry.curX, entry.baseY + 3.15, entry.curZ);
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

    const entry = this.spotEntries[spotIdx];
    const tx = entry ? entry.curX : FARM_SPOTS[spotIdx].pos.x;
    const tz = entry ? entry.curZ : FARM_SPOTS[spotIdx].pos.z;
    const dist = Math.hypot(this.avatarPos.x - tx, this.avatarPos.z - tz);
    if (immediate || dist < 3.2) {
      this.walkTarget = null;
      this._openDialogue(spotIdx, decision.action === 'revisit');
    } else {
      this.walkTarget = { x: tx, z: tz };
      this.pendingSpotTrigger = { spotIdx, isRevisit: decision.action === 'revisit' };
      this._spawnTapRing(tx, tz);
    }
  }

  _typewriterCaption(el, text) {
    clearInterval(this._typeTimer);
    el.textContent = '';
    let i = 0;
    this._typeTimer = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(this._typeTimer);
        this._typeTimer = null;
      }
    }, 24);
  }

  _startMagicGaugeForDialogue(cards) {
    const gaugeEl = this.container?.querySelector('#farmMagicGauge');
    const labelEl = this.container?.querySelector('#farmMagicLabel');
    const fillEl = this.container?.querySelector('#farmMagicFill');
    const pctEl = this.container?.querySelector('#farmMagicPct');
    const normalBtn = this.container?.querySelector('#farmJudgeNormalBtn');
    const crownBtn = this.container?.querySelector('#farmJudgeCrownBtn');
    if (!gaugeEl || !fillEl || !pctEl || !labelEl) return;

    this.voiceFilled = false;
    fillEl.style.width = '0%';
    pctEl.textContent = '0%';
    gaugeEl.classList.remove('filled');
    normalBtn?.classList.remove('pulse-ready');
    crownBtn?.classList.remove('pulse-ready');
    labelEl.textContent = this.dialogueMode === 'memory'
      ? '🌙 그림만 보고 영어로 크게 말해보세요!'
      : '🎙️ 이제 우주 차례! 영어로 따라 말해요!';

    // Scale required speech duration gently (0.7s ~ 1.4s) so 6yo isn't fatigued but can't 1-frame scream
    const totalDur = cards.reduce((s, c) => s + Math.max(1.5, (c.end - c.start)), 0);
    const targetSpeechSec = Math.max(0.7, Math.min(1.4, totalDur * 0.16));

    this.audio.startVoiceGauge({
      targetSpeechSec,
      onProgress: (pct) => {
        fillEl.style.width = `${pct}%`;
        pctEl.textContent = `${pct}%`;
      },
      onFilled: () => {
        this.voiceFilled = true;
        gaugeEl.classList.add('filled');
        labelEl.textContent = '✨ 마법 주문 충전 완료!! 아래 보상 버튼을 눌러요!';
        if (this.dialogueMode === 'memory') crownBtn?.classList.add('pulse-ready');
        else normalBtn?.classList.add('pulse-ready');
      },
      onMicDenied: () => {
        labelEl.textContent = '🎤 크게 말하고 아래 보상 버튼을 눌러주세요!';
        pctEl.textContent = '✨';
      },
    });
  }

  _openDialogue(spotIdx, isRevisit = false) {
    const spot = FARM_SPOTS[spotIdx];
    const cards = spot.cardIds.map(id => BASE_CARDS.find(c => c.id === id)).filter(Boolean);
    const currentTier = this.mastery[spot.id] || 0;

    this.activeDialogueSpot = spotIdx;
    this.isListening = false;
    this.dialogueListened = false;
    // Smart default challenge mode: 0★ -> repeat, 1★ -> hint, 2★+ -> memory!
    this.dialogueMode = currentTier === 0 ? 'repeat' : (currentTier === 1 ? 'hint' : 'memory');

    const hoverEl = this.container?.querySelector('#farmHoverBubble');
    if (hoverEl) hoverEl.style.display = 'none';

    const dlg = this.container.querySelector('#farmDialogue');
    const portrait = this.container.querySelector('#farmDlgPortrait');
    const nameEl = this.container.querySelector('#farmDlgName');
    const starsEl = this.container.querySelector('#farmDlgStars');
    const iconsEl = this.container.querySelector('#farmDlgIcons');
    const enEl = this.container.querySelector('#farmDlgEn');
    const koEl = this.container.querySelector('#farmDlgKo');
    const replayBtn = this.container.querySelector('#farmDlgReplayBtn');
    const chunkBtn = this.container.querySelector('#farmDlgChunkBtn');
    const normalBtn = this.container.querySelector('#farmJudgeNormalBtn');
    const crownBtn = this.container.querySelector('#farmJudgeCrownBtn');
    const perfectBtn = this.container.querySelector('#farmJudgePerfectBtn');

    portrait.src = spot.portrait;
    nameEl.textContent = `${spot.emoji} ${spot.name} (${spotIdx + 1}/12)`;
    starsEl.textContent = currentTier === 3 ? '👑👑👑 혼자 외우기 마스터!' : (currentTier === 2 ? '⭐⭐☆ (다음: 👑 왕관 도전!)' : (currentTier === 1 ? '⭐☆☆ (다음: ⭐⭐ 힌트 도전!)' : '☆☆☆ 첫 만남!'));

    const firstChunkedCard = cards.find(c => Array.isArray(c.chunks) && c.chunks.length >= 2);
    if (chunkBtn) chunkBtn.style.display = firstChunkedCard ? 'inline-flex' : 'none';

    const renderIcons = (card, hideLabels) => {
      iconsEl.innerHTML = (card.icons || []).map(([em, lbl]) =>
        lbl
          ? `<span class="farm-icon-chip">${em}${hideLabels ? '' : ` <small>${lbl}</small>`}</span>`
          : `<span class="farm-icon-arrow">${em}</span>`
      ).join('');
    };

    const runChallengeMode = (modeKey) => {
      this.dialogueMode = modeKey;
      this.audio.stopAll();
      this.isListening = false;

      this.container.querySelectorAll('.farm-tier-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tierMode === modeKey);
      });

      if (modeKey === 'repeat') {
        normalBtn.textContent = currentTier === 0 ? `⭐ 따라 말했어요! (${spot.itemEmoji} 받기)` : '⭐ 따라 말했어요!';
        crownBtn.textContent = '👑 혼자 다 외웠어요!';
        this.isListening = true;
        normalBtn.disabled = currentTier === 0;
        if (currentTier === 0) normalBtn.textContent = '🎧 먼저 원어민 말을 들어요...';
        this.audio.playSegmentSequence(cards, {
          onCardStart: (card) => {
            renderIcons(card, false);
            this._typewriterCaption(enEl, card.en);
            koEl.textContent = card.ko || '';
          },
          onAllDone: () => {
            this.isListening = false;
            this.dialogueListened = true;
            normalBtn.disabled = false;
            normalBtn.textContent = currentTier === 0
              ? `⭐ 따라 말했어요! (${spot.itemEmoji} 3D 선물 받기!)`
              : '⭐ 따라 말했어요!';
            this._startMagicGaugeForDialogue(cards);
          },
        });
      } else if (modeKey === 'hint') {
        normalBtn.disabled = false;
        normalBtn.textContent = '⭐⭐ 힌트로 성공!';
        crownBtn.textContent = '👑 혼자 다 외웠어요!';
        const mainCard = firstChunkedCard || cards[0];
        renderIcons(mainCard, true);
        if (firstChunkedCard) {
          enEl.textContent = `${firstChunkedCard.chunks[0].en}  👉  ???`;
          koEl.textContent = '🤝 앞부분을 듣고 뒷부분을 우주가 이어 말해요!';
          this.isListening = true;
          this.audio.playSegment(firstChunkedCard.chunks[0].start, firstChunkedCard.chunks[0].end, {
            rate: 0.95,
            onDone: () => {
              this.isListening = false;
              this._startMagicGaugeForDialogue(cards);
            },
          });
        } else {
          enEl.textContent = '👂 첫 1초 힌트를 듣고 이어 말해요!';
          koEl.textContent = '';
          this.isListening = true;
          this.audio.playSegment(mainCard.start, Math.min(mainCard.end, mainCard.start + 1.05), {
            rate: 1.0,
            onDone: () => {
              this.isListening = false;
              this._startMagicGaugeForDialogue(cards);
            },
          });
        }
      } else {
        // 'memory' — 3-Star Golden Crown Challenge!
        normalBtn.disabled = false;
        normalBtn.textContent = '⭐ 힌트 보고 말했어요';
        crownBtn.textContent = '👑 안 보고 혼자 외웠어요!!';
        // Show icons from all cards in this spot without Korean labels
        iconsEl.innerHTML = cards.map(c =>
          (c.icons || []).map(([em]) => `<span class="farm-icon-chip">${em}</span>`).join('')
        ).join('<span class="farm-icon-arrow">·</span>');
        enEl.textContent = '🌙 그림만 보고 영어로 말해보세요!';
        koEl.textContent = '성공하면 👑 황금 왕관을 쓰고 우주 뒤를 따라와요!';
        this._startMagicGaugeForDialogue(cards);
      }
    };

    this.container.querySelectorAll('.farm-tier-tab').forEach(btn => {
      btn.onclick = () => runChallengeMode(btn.dataset.tierMode);
    });

    replayBtn.onclick = () => {
      this.audio.stopVoiceGauge();
      this.isListening = true;
      this.audio.playSegmentSequence(cards, {
        onCardStart: (card) => {
          renderIcons(card, this.dialogueMode === 'memory');
          if (this.dialogueMode !== 'memory') {
            this._typewriterCaption(enEl, card.en);
            koEl.textContent = card.ko || '';
          }
        },
        onAllDone: () => {
          this.isListening = false;
          this._startMagicGaugeForDialogue(cards);
        },
      });
    };

    if (chunkBtn && firstChunkedCard) {
      chunkBtn.onclick = () => {
        this.audio.stopVoiceGauge();
        this.isListening = true;
        renderIcons(firstChunkedCard, false);
        enEl.textContent = `✂️ 1조각: ${firstChunkedCard.chunks[0].en}`;
        koEl.textContent = firstChunkedCard.chunks[0].ko || '';
        this.audio.playSegment(firstChunkedCard.chunks[0].start, firstChunkedCard.chunks[0].end, {
          rate: 0.92,
          onDone: () => {
            setTimeout(() => {
              if (this.activeDialogueSpot !== spotIdx) return;
              enEl.textContent = `✂️ 2조각: ${firstChunkedCard.chunks[1].en}`;
              koEl.textContent = firstChunkedCard.chunks[1].ko || '';
              this.audio.playSegment(firstChunkedCard.chunks[1].start, firstChunkedCard.chunks[1].end, {
                rate: 0.92,
                onDone: () => {
                  this.isListening = false;
                  this._startMagicGaugeForDialogue(cards);
                },
              });
            }, 900);
          },
        });
      };
    }

    normalBtn.onclick = () => {
      const tier = this.dialogueMode === 'hint' ? 2 : 1;
      this._claimSpotReward(spotIdx, tier, { isPerfect: false });
    };

    crownBtn.onclick = () => {
      this._claimSpotReward(spotIdx, 3, { isPerfect: false });
    };

    if (perfectBtn) {
      perfectBtn.onclick = () => {
        this._claimSpotReward(spotIdx, 3, { isPerfect: true });
      };
    }

    dlg.style.display = 'flex';
    runChallengeMode(this.dialogueMode);
  }

  _claimSpotReward(spotIdx, targetTier, { isPerfect = false } = {}) {
    const spot = FARM_SPOTS[spotIdx];
    const prevBuildings = new Set(getUnlockedBuildings(this.speakCount));
    const prevUnlockedGear = new Set(getUnlockedGear(this.mastery, this.getTotalStars(), this._getExtraStats()));
    const prevAch = new Set(getUnlockedAchievements(this.mastery, this.getTotalStars(), this._getExtraStats()));

    const result = applySpotMastery(this.mastery, spot.id, targetTier, { isPerfect });
    this.mastery = result.nextMastery;
    this.speakCount += 1;
    if (isPerfect) this.perfectCount += 1;

    const prog = computeFarmProgress(this.mastery);
    this.currentSpotIndex = prog.nextSpotIndex;

    this._hideDialogue();
    this.onRewardStar(result.starDelta);

    // 1. Check newly built 3D Village Buildings!
    const nextBuildings = getUnlockedBuildings(this.speakCount);
    const newlyBuilt = nextBuildings.filter(id => !prevBuildings.has(id));
    if (this.villageBuildings) {
      this.villageBuildings.syncBuildings(nextBuildings, newlyBuilt[0] || null);
    }

    // 2. Check newly unlocked 3D Wooju Gear (auto-equips into its slot!)
    const extra = this._getExtraStats();
    const nextGear = getUnlockedGear(this.mastery, this.getTotalStars(), extra);
    const newlyUnlockedGear = nextGear.filter(id => !prevUnlockedGear.has(id));
    if (newlyUnlockedGear.length > 0) {
      newlyUnlockedGear.forEach(id => {
        const gObj = WOOJU_GEAR.find(x => x.id === id);
        if (gObj) {
          WOOJU_GEAR.filter(x => x.slot === gObj.slot).forEach(x => { this.equippedGear[x.id] = false; });
          this.equippedGear[id] = true;
        }
      });
      this.hasNewBadge = true;
      if (this.wooju?.setGear) this.wooju.setGear(this.equippedGear);
    }

    // 3. Check newly unlocked Achievements!
    const nextAch = getUnlockedAchievements(this.mastery, this.getTotalStars(), extra);
    const newlyUnlockedAch = nextAch.filter(id => !prevAch.has(id));
    if (newlyUnlockedAch.length > 0) this.hasNewBadge = true;

    this._saveRpgState();

    // 4. Trigger 3D living farm party prop pop-in & animal crown/aura!
    if (this.partyRewards) {
      this.partyRewards.syncMastery(this.mastery, result.newlyMet ? spot.id : null);
    }

    if (isPerfect || result.newlyMastered || newlyBuilt.length > 0) {
      this.audio.playFanfareSFX();
      this.onConfetti(85);
      this._animateItemToBag(isPerfect ? '💎' : (newlyBuilt.length > 0 ? '🏗️' : '👑'));
    } else {
      this.audio.playStarSFX();
      this.onConfetti(42);
      this._animateItemToBag(spot.itemEmoji);
    }

    this._updateBagBadge();
    this._updateParadeBtn();
    this._renderRibbon();
    this._updateSpotVisuals();

    // 5. Priority Celebration Toasts + Interactive Treasure Chest Drop!
    if (newlyBuilt.length > 0) {
      const b = VILLAGE_BUILDINGS.find(x => x.id === newlyBuilt[0]);
      if (b) this.onToast(`🏗️ 새 3D 건물 완성!! ${b.emoji} ${b.name}이(가) 농장에 지어졌어요!!`);
    } else if (newlyUnlockedGear.length > 0) {
      const g = WOOJU_GEAR.find(x => x.id === newlyUnlockedGear[0]);
      if (g) this.onToast(`🎉 새 3D 장비 해금! ${g.emoji} ${g.name}을(를) 바로 장착했어요!`);
    } else if (newlyUnlockedAch.length > 0) {
      const a = FARM_ACHIEVEMENTS.find(x => x.id === newlyUnlockedAch[0]);
      if (a) this.onToast(`🏆 업적 달성! ${a.emoji} ${a.name}!`);
    } else if (isPerfect) {
      this.onToast(`💎 토씨 하나 안 틀림!! 퍼펙트 보물상자 도착!!`);
    } else if (result.newlyMastered) {
      this.onToast(`👑 ${spot.emoji} ${spot.name} 혼자 외우기 성공! 황금 왕관을 쓰고 우주 뒤를 따라와요!`);
    } else if (result.newlyMet) {
      if (prog.metCount >= FARM_SPOTS.length) {
        setTimeout(() => this._showFinale(), 550);
      } else {
        const next = FARM_SPOTS[this.currentSpotIndex];
        this.onToast(`✨ 3D 농장에 ${spot.itemEmoji} ${spot.itemLabel}이(가) 생겼어요! 다음은 ${next.emoji} ${next.name}!`);
      }
    } else if (result.upgraded) {
      this.onToast(`⭐⭐ ${spot.emoji} ${spot.name} 레벨 업! 다음엔 👑/💎 퍼펙트에 도전해요!`);
    } else {
      this.onToast(`🗣️ 말하기 ${this.speakCount}회 달성! 별 +1!`);
    }

    // Trigger Interactive Treasure Chest on Perfect OR every 5th cumulative speak!
    if (isPerfect) {
      setTimeout(() => {
        if (this.mounted) this._openChestModal('💎 토씨 하나 안 틀림!! 퍼펙트 보물상자!', { preferHigherRarity: true });
      }, 420);
    } else if (this.speakCount % 5 === 0) {
      setTimeout(() => {
        if (this.mounted) this._openChestModal(`🎁 말하기 ${this.speakCount}회 보너스 보물상자!`, { preferHigherRarity: false });
      }, 420);
    }
  }

  _hideDialogue() {
    clearInterval(this._typeTimer);
    this._typeTimer = null;
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
    const hoverEl = this.container?.querySelector('#farmHoverBubble');
    const hoverText = this.container?.querySelector('#farmHoverText');
    const projVec = new this.THREE.Vector3();
    let hoverSpotIdx = -1;

    if (hoverEl) {
      hoverEl.onclick = () => {
        if (hoverSpotIdx >= 0) {
          this.audio.unlock();
          this._handleSpotTap(hoverSpotIdx, true);
        }
      };
    }

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

      // Animate v3/v4 Living Farm 3D Party Rewards & Village Buildings
      if (this.partyRewards) this.partyRewards.update(t, dt);
      if (this.villageBuildings) this.villageBuildings.update(t, dt);

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
          const stopDist = this.pendingSpotTrigger ? 2.4 : 0.25;
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

        // Proximity auto-trigger when walking right up to the active unmet animal
        if (moving && !this.pendingSpotTrigger && this.currentSpotIndex < FARM_SPOTS.length) {
          const activeEntry = this.spotEntries[this.currentSpotIndex];
          if (activeEntry && Math.hypot(this.avatarPos.x - activeEntry.curX, this.avatarPos.z - activeEntry.curZ) < 2.4) {
            this.walkTarget = null;
            this._openDialogue(this.currentSpotIndex, false);
          }
        }
      }

      // Record breadcrumb trail for 3-Star Animal Parade!
      if (this.woojuTrail.length === 0) {
        this.woojuTrail.push({ x: this.avatarPos.x, z: this.avatarPos.z });
      } else {
        const head = this.woojuTrail[0];
        if (Math.hypot(this.avatarPos.x - head.x, this.avatarPos.z - head.z) > 0.26) {
          this.woojuTrail.unshift({ x: this.avatarPos.x, z: this.avatarPos.z });
          if (this.woojuTrail.length > 260) this.woojuTrail.pop();
        }
      }

      if (this.wooju) {
        this.wooju.group.position.x = this.avatarPos.x;
        this.wooju.group.position.z = this.avatarPos.z;
        this.wooju.group.rotation.y = this.avatarAngle;
        if (this.wooju.setAnim) this.wooju.setAnim(moving ? 'walk' : 'idle');
        if (this.wooju.updateMixer) this.wooju.updateMixer(dt);
        if (this.wooju.updateCosmetics) this.wooju.updateCosmetics(t, moving);
      }

      // 2. Living Villager AI:
      //    - 3-Star Mastered Animals -> Follow Wooju in a cute Animal Parade!
      //    - Locked Villagers -> Playfully flee from Wooju
      //    - Active/Done Villagers -> Stroll & turn to face Wooju
      let nearestIdx = -1;
      let nearestDist = 5.6;
      let paradeSlot = 0;

      this.spotEntries.forEach((m, idx) => {
        const tier = this.mastery[m.spot.id] || 0;
        const dxFromWooju = m.curX - this.avatarPos.x;
        const dzFromWooju = m.curZ - this.avatarPos.z;
        const distToWooju = Math.hypot(dxFromWooju, dzFromWooju);
        const isLocked = idx > this.currentSpotIndex;
        const isSpeaking = this.activeDialogueSpot === idx;
        const isNearWooju = this.entered && distToWooju < (isLocked ? 5.6 : 4.8);
        const isParadeFollower = this.paradeEnabled && tier >= 3 && !isSpeaking;
        const isDancingPig = idx === FARM_SPOTS.length - 1 && (this.currentSpotIndex >= FARM_SPOTS.length || isSpeaking);
        m.isFleeing = false;

        if (isNearWooju && this.activeDialogueSpot === null && distToWooju < nearestDist) {
          nearestDist = distToWooju;
          nearestIdx = idx;
        }

        if (isParadeFollower) {
          paradeSlot += 1;
          const trailIdx = Math.min(this.woojuTrail.length - 1, paradeSlot * 8);
          const pt = this.woojuTrail[trailIdx] || this.avatarPos;
          const pdx = pt.x - m.curX;
          const pdz = pt.z - m.curZ;
          const pd = Math.hypot(pdx, pdz);
          if (pd > 0.35) {
            const followSpeed = Math.min(7.8, 3.2 + pd * 1.4);
            m.curX += (pdx / pd) * followSpeed * dt;
            m.curZ += (pdz / pd) * followSpeed * dt;
            m.group.position.x = m.curX;
            m.group.position.z = m.curZ;
            m.group.position.y = 0; // Walk on ground in parade!
            const yaw = Math.atan2(pdx, pdz);
            let diff = yaw - m.group.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            m.group.rotation.y += diff * 0.16;
            m.isMoving = true;
          } else {
            m.isMoving = false;
          }
        } else if (isLocked && isNearWooju && this.activeDialogueSpot === null) {
          m.isFleeing = true;
          m.isMoving = true;
          m.wanderTarget = null;
          const safeDist = Math.max(0.01, distToWooju);
          let dirX = dxFromWooju / safeDist;
          let dirZ = dzFromWooju / safeDist;

          const fleeSpeed = 8.6;
          let nx = m.curX + dirX * fleeSpeed * dt;
          let nz = m.curZ + dirZ * fleeSpeed * dt;

          const nr = Math.hypot(nx, nz);
          if (nr > 15.6) {
            const tangX = -m.curZ / Math.max(0.01, Math.hypot(m.curX, m.curZ));
            const tangZ = m.curX / Math.max(0.01, Math.hypot(m.curX, m.curZ));
            const dot = tangX * dirX + tangZ * dirZ;
            const sign = dot >= 0 ? 1 : -1;
            dirX = tangX * sign;
            dirZ = tangZ * sign;
            nx = m.curX + dirX * fleeSpeed * dt;
            nz = m.curZ + dirZ * fleeSpeed * dt;
            const cr = Math.hypot(nx, nz);
            if (cr > 15.6) {
              nx = (nx / cr) * 15.6;
              nz = (nz / cr) * 15.6;
            }
          }
          m.curX = nx;
          m.curZ = nz;
          m.group.position.x = m.curX;
          m.group.position.z = m.curZ;
          m.group.position.y = m.baseY;
          const fleeYaw = Math.atan2(dirX, dirZ);
          let diff = fleeYaw - m.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          m.group.rotation.y += diff * 0.22;
        } else if (isSpeaking || (!isLocked && isNearWooju)) {
          m.isMoving = false;
          const targetYaw = Math.atan2(this.avatarPos.x - m.curX, this.avatarPos.z - m.curZ);
          let diff = targetYaw - m.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          m.group.rotation.y += diff * 0.14;
        } else {
          const distHome = Math.hypot(m.homeX - m.curX, m.homeZ - m.curZ);
          m.wanderTimer -= dt;
          if (!m.wanderTarget && (m.wanderTimer <= 0 || distHome > m.wanderRadius + 1.2)) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 0.4 + Math.random() * m.wanderRadius;
            m.wanderTarget = {
              x: m.homeX + Math.cos(ang) * rad,
              z: m.homeZ + Math.sin(ang) * rad,
            };
          }
          if (m.wanderTarget) {
            const wdx = m.wanderTarget.x - m.curX;
            const wdz = m.wanderTarget.z - m.curZ;
            const wd = Math.hypot(wdx, wdz);
            if (wd > 0.14) {
              const wSpeed = distHome > m.wanderRadius + 1.2 ? 3.2 : 1.35;
              m.curX += (wdx / wd) * wSpeed * dt;
              m.curZ += (wdz / wd) * wSpeed * dt;
              m.group.position.x = m.curX;
              m.group.position.z = m.curZ;
              m.group.position.y = m.baseY;
              const walkYaw = Math.atan2(wdx, wdz);
              let diff = walkYaw - m.group.rotation.y;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              m.group.rotation.y += diff * 0.1;
              m.isMoving = true;
            } else {
              m.wanderTarget = null;
              m.wanderTimer = 1.6 + Math.random() * 2.4;
              m.isMoving = false;
            }
          }
        }

        // Drive real GLB skeletal animations
        let animState = 'idle';
        if (m.isFleeing) animState = 'run';
        else if (isDancingPig && !m.isMoving) animState = 'dance';
        else if (isSpeaking && this.isListening) animState = 'talk';
        else if (m.isMoving) animState = 'walk';

        if (m.setAnim) m.setAnim(animState);
        if (m.updateMixer) m.updateMixer(dt);
        if (m.updateMasteryVisual) m.updateMasteryVisual(t);

        if (m.itemMesh && m.itemMesh.visible) {
          m.itemMesh.rotation.y = t * 1.8 + idx;
          m.itemMesh.position.y = 0.35 + Math.sin(t * 3 + idx) * 0.08;
        }
      });

      // 3. Track Active Villager's Live Position for Golden Ring, '!' & Animated Dashed Path
      if (this.currentSpotIndex < FARM_SPOTS.length && this.spotEntries[this.currentSpotIndex]) {
        const activeEntry = this.spotEntries[this.currentSpotIndex];
        if (this.activeRing && this.activeRing.visible) {
          this.activeRing.position.set(activeEntry.curX, activeEntry.baseY + 0.08, activeEntry.curZ);
          const s = 1 + Math.sin(t * 4.5) * 0.1;
          this.activeRing.scale.set(s, s, 1);
        }
        if (this.exclaimSprite && this.exclaimSprite.visible) {
          this.exclaimSprite.position.set(
            activeEntry.curX,
            activeEntry.baseY + 3.15 + Math.sin(t * 5) * 0.22,
            activeEntry.curZ
          );
        }
        if (this.dashedTrail.length) {
          const dx = activeEntry.curX - this.avatarPos.x;
          const dz = activeEntry.curZ - this.avatarPos.z;
          const dist = Math.hypot(dx, dz);
          const yaw = Math.atan2(dx, dz);
          const flow = (t * 0.65) % 1;

          this.dashedTrail.forEach((dash, i) => {
            const frac = (i + flow) / this.dashedTrail.length;
            if (dist < 2.5 || frac < 0.08 || frac > 0.92) {
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
      }

      if (this.tapRingLife > 0 && this.tapRing) {
        this.tapRingLife = Math.max(0, this.tapRingLife - dt * 2.5);
        const s = 1 + (1 - this.tapRingLife) * 1.4;
        this.tapRing.scale.set(s, s, 1);
        this.tapRing.material.opacity = this.tapRingLife * 0.7;
      }

      // 4. Camera: Low, immersive Animal Crossing horizon view
      const aspect = this.camera.aspect || 1;
      const portraitBoost = aspect < 1 ? 1.18 : 1.0;

      if (!this.entered) {
        const angle = t * 0.16;
        const r = 21 * portraitBoost;
        this.camera.position.set(Math.sin(angle) * r, 8.2 * portraitBoost, Math.cos(angle) * r);
        this.camera.lookAt(0, 1.8, 0);
      } else {
        let focusX = this.avatarPos.x;
        let focusZ = this.avatarPos.z;
        let camHeight = 5.4 * portraitBoost;
        let camDist = 11.2 * portraitBoost;
        let lookY = 1.7;
        let lookOffsetZ = -1.2;
        if (this.activeDialogueSpot !== null && this.spotEntries[this.activeDialogueSpot]) {
          const sp = this.spotEntries[this.activeDialogueSpot];
          focusX = sp.curX;
          focusZ = sp.curZ;
          camHeight = 3.2 * portraitBoost;
          camDist = 6.8 * portraitBoost;
          lookY = 1.25;
          lookOffsetZ = 0.6;
        }
        this.camera.position.x += (focusX - this.camera.position.x) * 0.08;
        this.camera.position.y += (camHeight - this.camera.position.y) * 0.08;
        this.camera.position.z += (focusZ + camDist - this.camera.position.z) * 0.08;
        this.camera.lookAt(focusX, lookY, focusZ + lookOffsetZ);
      }

      this.renderer.render(this.scene, this.camera);

      // 5. Project Floating Speech Bubble right above the nearest villager's 3D head
      if (hoverEl && hoverText) {
        if (nearestIdx >= 0 && this.entered && this.activeDialogueSpot === null) {
          const m = this.spotEntries[nearestIdx];
          const tier = this.mastery[m.spot.id] || 0;
          projVec.set(m.curX, (this.paradeEnabled && tier >= 3 ? 0 : m.baseY) + 2.75, m.curZ);
          projVec.project(this.camera);
          const rect = this.renderer.domElement.getBoundingClientRect();
          const sx = (projVec.x * 0.5 + 0.5) * rect.width;
          const sy = (-projVec.y * 0.5 + 0.5) * rect.height;
          hoverSpotIdx = nearestIdx;
          if (nearestIdx <= this.currentSpotIndex) {
            const tierBadge = tier >= 3 ? '👑' : (tier === 2 ? '⭐⭐' : (tier === 1 ? '⭐' : '💬'));
            hoverText.textContent = `${tierBadge} ${m.spot.emoji} ${m.spot.name}에게 말 걸기!`;
          } else {
            const cur = FARM_SPOTS[this.currentSpotIndex];
            hoverText.textContent = `💨 도망간다! 먼저 ${cur.emoji} ${cur.name} 만나요!`;
          }
          hoverEl.style.left = `${Math.max(95, Math.min(rect.width - 95, sx))}px`;
          hoverEl.style.top = `${Math.max(100, Math.min(rect.height - 140, sy))}px`;
          hoverEl.style.display = 'inline-flex';
        } else {
          hoverSpotIdx = -1;
          hoverEl.style.display = 'none';
        }
      }
    };
    this.rafId = requestAnimationFrame(animate);
  }
}
