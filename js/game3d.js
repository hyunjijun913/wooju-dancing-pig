// 0단계 (v4): Living 3D Farm Collector RPG — 12 Village Buildings, 24 Treasure Drops,
// 15 3D Wooju Gear Cosmetics, 16 Achievements & 3-Star Animal Parade!
import {
  FARM_SPOTS,
  BASE_CARDS,
  VILLAGE_BUILDINGS,
  TREASURE_ITEMS,
  ROOM_WALLPAPERS,
  ROOM_FLOORS,
  ROOM_FURNITURE,
  ALL_COLLECTIBLES,
  getHomeLevel,
  WOOJU_GEAR,
  FARM_ACHIEVEMENTS,
  ATTENDANCE_REWARDS,
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
  getLocalDateKey,
  normalizeDailyState,
  recordDailyActivity,
  evaluateDailyQuests,
  claimDailyAttendance,
  tokenizeWords,
  matchSpokenWords,
} from './data.js';
import {
  buildWooju3D,
  buildSpotCharacter3D,
  buildFarmWorld3D,
  buildPartyRewards3D,
  buildVillageBuildings3D,
  buildPlacedTreasures3D,
  buildMyHome3D,
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
    this.placedTreasures = []; // [{ id, x, z }] placed directly in 3D farm!
    this.homeState = { wallpaper: 'wall_sky', floor: 'floor_oak', placedFurniture: [] };
    this.inHome = false;
    this.savedOutdoorPos = { x: 0, z: 15.2 };
    this.homeTab = 'furniture'; // 'furniture' | 'wallpaper' | 'floor'
    this.placingFurnitureId = null;
    this.lastRevealedKind = 'treasure';
    this.attendance = { days: [], lastClaimDate: null, streak: 0 };
    this.daily = normalizeDailyState(null, getLocalDateKey());
    this.paradeEnabled = true;
    this.bagTab = 'collection';
    this.hasNewBadge = false;
    this.pendingChest = null;
    this.lastRevealedTreasureId = null;
    this.placingTreasureId = null;
    this.cameraFocusOverride = null; // { x, z, until }

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
    this.outdoorGroup = null;
    this.wooju = null;
    this.partyRewards = null;
    this.villageBuildings = null;
    this.placedTreasures3D = null;
    this.myHome3D = null;
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
    this._wordSweepTimer = null;
    this._autoPerfectTimer = null;
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
        this.placedTreasures = Array.isArray(parsed.placedTreasures) ? parsed.placedTreasures : [];
        this.homeState = parsed.homeState && typeof parsed.homeState === 'object'
          ? {
              wallpaper: parsed.homeState.wallpaper || 'wall_sky',
              floor: parsed.homeState.floor || 'floor_oak',
              placedFurniture: Array.isArray(parsed.homeState.placedFurniture) ? parsed.homeState.placedFurniture : [],
            }
          : { wallpaper: 'wall_sky', floor: 'floor_oak', placedFurniture: [] };
        this.attendance = parsed.attendance && typeof parsed.attendance === 'object'
          ? parsed.attendance
          : { days: [], lastClaimDate: null, streak: 0 };
        this.daily = normalizeDailyState(parsed.daily, getLocalDateKey());
      }
    } catch (_) {
      this.mastery = {};
      this.equippedGear = {};
      this.speakCount = 0;
      this.perfectCount = 0;
      this.treasures = [];
      this.placedTreasures = [];
      this.homeState = { wallpaper: 'wall_sky', floor: 'floor_oak', placedFurniture: [] };
      this.attendance = { days: [], lastClaimDate: null, streak: 0 };
      this.daily = normalizeDailyState(null, getLocalDateKey());
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
        placedTreasures: this.placedTreasures,
        homeState: this.homeState,
        attendance: this.attendance,
        daily: this.daily,
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
    this._clearWordTimers();
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
    this.placedTreasures3D = null;
    this.myHome3D = null;
    this.outdoorGroup = null;
    this.inHome = false;
    this.cameraFocusOverride = null;
    this.placingTreasureId = null;
    this.placingFurnitureId = null;
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
    this.placedTreasures = [];
    this.currentSpotIndex = 0;
    this._saveRpgState();

    this.isListening = false;
    this.activeDialogueSpot = null;
    this.dialogueListened = false;
    this.pendingSpotTrigger = null;
    this.placingTreasureId = null;
    this.cameraFocusOverride = null;
    this.avatarPos = { x: 0, z: 15.2 };
    this.woojuTrail = [];
    this.walkTarget = null;

    if (this.wooju) {
      this.wooju.group.position.set(this.avatarPos.x, 0, this.avatarPos.z);
      this.wooju.setGear(this.equippedGear);
    }
    if (this.partyRewards) this.partyRewards.syncMastery(this.mastery);
    if (this.villageBuildings) this.villageBuildings.syncBuildings([]);
    if (this.placedTreasures3D) this.placedTreasures3D.syncPlaced([]);

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
          <button class="farm-pill-btn farm-home-btn" id="farmHomeBtn" title="우주의 3D 마이홈">🏡 내 집</button>
          <button class="farm-pill-btn farm-event-btn" id="farmEventBtn" title="출석체크 &amp; 일일 미션">
            🎁 출석·미션
            <span class="event-badge-dot" id="farmEventBadge" style="display:none;">!</span>
          </button>
          <button class="farm-pill-btn farm-parade-btn" id="farmParadeBtn" title="3성 동물 기차" style="display:none;">🐾 기차 ON</button>
          <button class="farm-pill-btn farm-reset-btn" id="farmResetBtn" title="처음부터">🔄</button>
        </div>

        <div class="farm-guide-pill" id="farmGuidePill">👆 노란 점선 길을 따라 반짝이는 친구에게 가보세요!</div>
        <div class="farm-goal-pill" id="farmGoalPill">🗣️ 0회 · 다음 건물: 🌷 꽃길 정원 (3회)</div>
        <div class="home-level-pill" id="homeLevelPill" style="display:none;">🏡 1단계 아담한 우주 방</div>
        <div class="farm-cinematic-banner" id="farmCinematicBanner" style="display:none;">🏗️ 뚝딱뚝딱 새 건물 짓는 중!!</div>
        <div class="farm-place-bar" id="farmPlaceBar" style="display:none;">
          <span id="farmPlaceText">👆 농장 땅을 톡! 눌러 보물을 장식하세요!</span>
          <button class="mini-btn" id="farmPlaceHereBtn">📍 내 발 앞에 놓기</button>
          <button class="mini-btn del" id="farmPlaceCancelBtn">✕ 취소</button>
        </div>

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

        <!-- 🏡 My-Home 3D Interior Decorator Modal -->
        <div class="farm-bag-modal" id="farmHomeModal" style="display:none;">
          <div class="farm-bag-sheet">
            <div class="modal-head">
              <h2>🛋️ 우주의 3D 방 꾸미기</h2>
              <button class="close-btn" id="farmHomeCloseBtn">✕</button>
            </div>
            <div class="bag-tab-bar" style="grid-template-columns:repeat(3,1fr);">
              <button class="bag-tab active" data-home-tab="furniture">🛋️ 가구 <span id="homeFurnCount">0/40</span></button>
              <button class="bag-tab" data-home-tab="wallpaper">🎨 벽지 <span id="homeWallCount">1/10</span></button>
              <button class="bag-tab" data-home-tab="floor">🟫 바닥 <span id="homeFloorCount">1/10</span></button>
            </div>
            <div id="farmHomeBody"></div>
          </div>
        </div>

        <!-- 🎁 14-Day Attendance Check-in & Daily Missions Event Modal -->
        <div class="farm-bag-modal" id="farmEventModal" style="display:none;">
          <div class="farm-bag-sheet">
            <div class="modal-head">
              <h2>🎁 매일 출석체크 &amp; 일일 미션</h2>
              <button class="close-btn" id="farmEventCloseBtn">✕</button>
            </div>
            <div id="farmEventBody"></div>
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
              <button class="big-btn btn-star" id="chestPlaceNowBtn" style="margin-top:8px;width:100%;">🏡 지금 농장에 바로 장식하기!</button>
              <button class="mini-btn" id="chestCloseBtn" style="margin-top:4px;width:100%;">🎒 도감에만 넣어두기</button>
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
    this.container.querySelector('#farmBagBtn').addEventListener('click', () => {
      if (this.inHome) this._openHomeModal();
      else this._openBagModal();
    });
    this.container.querySelector('#farmBagCloseBtn').addEventListener('click', () => this._closeBagModal());
    this.container.querySelector('#farmHomeBtn').addEventListener('click', () => this._toggleMyHome());
    this.container.querySelector('#farmHomeCloseBtn').addEventListener('click', () => this._closeHomeModal());
    this.container.querySelectorAll('[data-home-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.homeTab = btn.dataset.homeTab;
        this._renderHomeModal();
      });
    });
    this.container.querySelector('#farmEventBtn').addEventListener('click', () => this._openEventModal());
    this.container.querySelector('#farmEventCloseBtn').addEventListener('click', () => this._closeEventModal());
    this.container.querySelector('#farmDlgCloseBtn').addEventListener('click', () => this._hideDialogue());
    this.container.querySelector('#chestBoxBtn').addEventListener('click', () => this._revealPendingChest());
    this.container.querySelector('#chestCloseBtn').addEventListener('click', () => this._closeChestModal());
    this.container.querySelector('#chestPlaceNowBtn').addEventListener('click', () => {
      const id = this.lastRevealedTreasureId;
      const kind = this.lastRevealedKind;
      this._closeChestModal();
      if (!id) return;
      if (kind === 'wallpaper') {
        this.homeState.wallpaper = id;
        this._saveRpgState();
        this._enterMyHome();
        this.onToast('🎨 새 벽지로 내 방을 예쁘게 꾸몄어요!');
      } else if (kind === 'floor') {
        this.homeState.floor = id;
        this._saveRpgState();
        this._enterMyHome();
        this.onToast('🟫 새 바닥으로 내 방을 멋지게 바꿨어요!');
      } else if (kind === 'furniture') {
        this._enterMyHome();
        this._enterFurniturePlaceMode(id);
      } else {
        if (this.inHome) this._exitMyHome();
        this._enterPlaceMode(id);
      }
    });
    this.container.querySelector('#farmPlaceHereBtn').addEventListener('click', () => {
      if (this.placingFurnitureId) {
        const fx = this.avatarPos.x + Math.sin(this.avatarAngle) * 1.9;
        const fz = this.avatarPos.z + Math.cos(this.avatarAngle) * 1.9;
        this._commitFurniturePlacement(this.placingFurnitureId, fx, fz);
        return;
      }
      if (!this.placingTreasureId) return;
      const fx = this.avatarPos.x + Math.sin(this.avatarAngle) * 2.1;
      const fz = this.avatarPos.z + Math.cos(this.avatarAngle) * 2.1;
      this._commitTreasurePlacement(this.placingTreasureId, fx, fz);
    });
    this.container.querySelector('#farmPlaceCancelBtn').addEventListener('click', () => this._exitPlaceMode());

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
      const todayKey = getLocalDateKey();
      const attendedToday = this.attendance?.lastClaimDate === todayKey;
      if (!attendedToday) {
        this._openEventModal();
      } else if (this.currentSpotIndex === 0) {
        this._openDialogue(0, false);
      } else {
        this.onToast('🏡 우주의 농장에 돌아왔어요! 오늘의 일일 미션과 3성 왕관에 도전해요!');
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
    setTxt('#farmBagCount', this.inHome ? `${this.homeState.placedFurniture.length}개 배치` : `${prog.metCount}/${FARM_SPOTS.length}`);
    setTxt('#farmBagModalCount', `${prog.metCount}/${FARM_SPOTS.length}`);
    setTxt('#farmBuildModalCount', `${unlockedBuildings.length}/${VILLAGE_BUILDINGS.length}`);
    setTxt('#farmTrModalCount', `${this.treasures.length}/${ALL_COLLECTIBLES.length}`);
    setTxt('#farmGearModalCount', `${unlockedGear.length}/${WOOJU_GEAR.length}`);
    setTxt('#farmAchModalCount', `${unlockedAch.length}/${FARM_ACHIEVEMENTS.length}`);
    setTxt('#farmBagPreview', this.inHome ? '🛋️ 방 꾸미기' : `🏗️${unlockedBuildings.length} · 💎${this.treasures.length} · 👕${unlockedGear.length}`);

    const newDot = this.container?.querySelector('#farmGearNewDot');
    if (newDot) newDot.style.display = this.hasNewBadge ? 'inline-block' : 'none';

    // Update 🎁 출석·미션 pulsing badge dot
    const todayKey = getLocalDateKey();
    this.daily = normalizeDailyState(this.daily, todayKey);
    const attendedToday = this.attendance?.lastClaimDate === todayKey;
    const dqEval = evaluateDailyQuests(this.daily);
    const pendingEventGifts = (attendedToday ? 0 : 1) + dqEval.claimableCount;
    const evDot = this.container?.querySelector('#farmEventBadge');
    if (evDot) {
      if (pendingEventGifts > 0) {
        evDot.style.display = 'inline-block';
        evDot.textContent = attendedToday ? String(pendingEventGifts) : '선물!';
      } else {
        evDot.style.display = 'none';
      }
    }

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
        <p class="bag-hint">영어로 말할 때마다 <b>3D 농장에 건물이 뚝딱뚝딱 지어져요!</b> 완성된 건물을 톡! 누르면 카메라가 구경하러 가요! (누적: <b>${this.speakCount}회</b>)</p>
        <div class="farm-bag-grid">
          ${VILLAGE_BUILDINGS.map((b) => {
            const built = unlockedBuildings.has(b.id);
            return `
              <button class="bag-slot ${built ? 'got mastered' : ''}" data-visit-build="${b.id}" ${built ? '' : 'disabled'}>
                <div class="bag-slot-stars">${built ? '🏗️ 구경 가기!' : `${Math.min(this.speakCount, b.reqSpeaks)}/${b.reqSpeaks}회`}</div>
                <div class="bag-slot-ico">${built ? b.emoji : '🔒'}</div>
                <div class="bag-slot-name">${b.name}</div>
                <div class="bag-slot-who">${b.desc}</div>
              </button>
            `;
          }).join('')}
        </div>
      `;
      contentEl.querySelectorAll('[data-visit-build]').forEach(btn => {
        btn.addEventListener('click', () => {
          const bId = btn.dataset.visitBuild;
          this._closeBagModal();
          this._playConstructionCinematic(bId, { isRevisit: true });
        });
      });
      return;
    }

    if (this.bagTab === 'treasures') {
      const rarityLbl = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' };
      const placedIds = new Set(this.placedTreasures.map(p => p.id));
      contentEl.innerHTML = `
        <p class="bag-hint">모은 보물을 <b>🏡 농장에 놓기</b> 버튼으로 3D 농장 어디든 직접 전시하고 꾸밀 수 있어요! (전시 중: <b>${this.placedTreasures.length}개</b>)</p>
        <div class="farm-bag-grid">
          ${TREASURE_ITEMS.map((tr) => {
            const got = ownedTreasures.has(tr.id);
            const isPlaced = placedIds.has(tr.id);
            return `
              <div class="bag-slot ${got ? `got rarity-${tr.rarity}` : ''}">
                <div class="bag-slot-stars">${got ? rarityLbl[tr.rarity] : '???'}</div>
                <div class="bag-slot-ico">${got ? tr.emoji : '🎁'}</div>
                <div class="bag-slot-name">${got ? tr.name : '숨겨진 보물'}</div>
                ${got
                  ? `<button class="bag-place-btn ${isPlaced ? 'placed' : ''}" data-place-tr="${tr.id}">${isPlaced ? '📍 옮기기' : '🏡 농장에 놓기'}</button>`
                  : `<div class="bag-slot-who">상자를 열어보세요</div>`}
              </div>
            `;
          }).join('')}
        </div>
      `;
      contentEl.querySelectorAll('[data-place-tr]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.placeTr;
          this._closeBagModal();
          this._enterPlaceMode(id);
        });
      });
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
    this.lastRevealedTreasureId = item.id;
    this.lastRevealedKind = item.kind || 'treasure';

    const boxBtn = this.container?.querySelector('#chestBoxBtn');
    const subEl = this.container?.querySelector('#chestSub');
    const revealEl = this.container?.querySelector('#chestReveal');
    const rarityEl = this.container?.querySelector('#chestRarity');
    const icoEl = this.container?.querySelector('#chestItemIco');
    const nameEl = this.container?.querySelector('#chestItemName');
    const placeNowBtn = this.container?.querySelector('#chestPlaceNowBtn');
    const rarityNames = { common: '⭐ 일반', rare: '💙 희귀!', epic: '💜 영웅!!', legendary: '🌈 전설!!!' };
    const kindNames = { treasure: '농장 보물', wallpaper: '방 벽지', floor: '방 바닥', furniture: '마이홈 가구' };

    if (boxBtn) boxBtn.style.display = 'none';
    if (subEl) subEl.style.display = 'none';
    if (rarityEl) {
      const kLabel = kindNames[this.lastRevealedKind] || '보물';
      rarityEl.textContent = isDuplicate ? '✨ 보너스 전설 선물! (별 +3!)' : `${rarityNames[item.rarity]} · ${kLabel}`;
      rarityEl.className = `chest-rarity rarity-${item.rarity}`;
    }
    if (placeNowBtn) {
      if (this.lastRevealedKind === 'wallpaper') placeNowBtn.textContent = '🎨 내 방 벽지로 바로 꾸미기!';
      else if (this.lastRevealedKind === 'floor') placeNowBtn.textContent = '🟫 내 방 바닥으로 바로 꾸미기!';
      else if (this.lastRevealedKind === 'furniture') placeNowBtn.textContent = '🛋️ 내 집에 가서 바로 놓기!';
      else placeNowBtn.textContent = '🏡 지금 농장에 바로 장식하기!';
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

  _enterPlaceMode(treasureId) {
    const item = TREASURE_ITEMS.find(t => t.id === treasureId);
    if (!item) return;
    this.placingTreasureId = treasureId;
    const bar = this.container?.querySelector('#farmPlaceBar');
    const txt = this.container?.querySelector('#farmPlaceText');
    if (txt) txt.textContent = `👆 농장 땅을 톡! 눌러 ${item.emoji} ${item.name} 놓기!`;
    if (bar) bar.style.display = 'flex';
    this.onToast(`🏡 원하는 농장 바닥을 톡! 누르면 ${item.emoji} ${item.name}이(가) 장식돼요!`);
  }

  _exitPlaceMode() {
    this.placingTreasureId = null;
    this.placingFurnitureId = null;
    const bar = this.container?.querySelector('#farmPlaceBar');
    if (bar) bar.style.display = 'none';
  }

  _getOwnedFurnitureIds() {
    const owned = new Set(this.treasures);
    return ROOM_FURNITURE.filter(f => owned.has(f.id)).map(f => f.id);
  }

  _toggleMyHome() {
    if (this.inHome) this._exitMyHome();
    else this._enterMyHome();
  }

  _enterMyHome() {
    this._hideDialogue();
    this._hideFinale();
    this._closeBagModal();
    this._exitPlaceMode();
    if (!this.inHome) {
      this.savedOutdoorPos = { x: this.avatarPos.x, z: this.avatarPos.z };
    }
    this.inHome = true;
    this.walkTarget = null;
    this.pendingSpotTrigger = null;
    this.avatarPos = { x: 0, z: 2.2 };
    this.avatarAngle = Math.PI;

    const ownedFurnCount = this._getOwnedFurnitureIds().length;
    const homeLv = getHomeLevel(ownedFurnCount);

    if (this.outdoorGroup) this.outdoorGroup.visible = false;
    if (this.myHome3D) {
      this.myHome3D.group.visible = true;
      this.myHome3D.syncRoomStyle(this.homeState.wallpaper, this.homeState.floor, homeLv.size);
      this.myHome3D.syncFurniture(this.homeState.placedFurniture);
    }
    if (this.scene) {
      this.scene.background = new this.THREE.Color('#FEF3C7');
      this.scene.fog = null;
    }

    const homeBtn = this.container?.querySelector('#farmHomeBtn');
    const ribbon = this.container?.querySelector('#farmRibbon');
    const guide = this.container?.querySelector('#farmGuidePill');
    const goal = this.container?.querySelector('#farmGoalPill');
    const hover = this.container?.querySelector('#farmHoverBubble');
    const lvPill = this.container?.querySelector('#homeLevelPill');
    const pocketIco = this.container?.querySelector('.pocket-ico');
    const pocketLbl = this.container?.querySelector('.pocket-label');

    if (homeBtn) { homeBtn.textContent = '🌳 농장 나가기'; homeBtn.classList.add('in-home'); }
    if (ribbon) ribbon.style.display = 'none';
    if (guide) guide.style.display = 'none';
    if (goal) goal.style.display = 'none';
    if (hover) hover.style.display = 'none';
    if (lvPill) {
      const nextHint = homeLv.level === 1 ? ' (가구 8개면 넓어져요!)' : (homeLv.level === 2 ? ' (가구 20개면 왕궁!)' : ' ✨ 최고 단계!');
      lvPill.textContent = `🏡 ${homeLv.name} · 가구 ${ownedFurnCount}개${nextHint}`;
      lvPill.style.display = 'block';
    }
    if (pocketIco) pocketIco.textContent = '🛋️';
    if (pocketLbl) pocketLbl.innerHTML = `방 꾸미기 <b id="farmBagCount">${this.homeState.placedFurniture.length}개</b>`;
    this._updateBagBadge();
  }

  _exitMyHome() {
    this._closeHomeModal();
    this._exitPlaceMode();
    this.inHome = false;
    this.walkTarget = null;
    this.avatarPos = { ...this.savedOutdoorPos };

    if (this.outdoorGroup) this.outdoorGroup.visible = true;
    if (this.myHome3D) this.myHome3D.group.visible = false;
    if (this.scene) {
      this.scene.background = new this.THREE.Color('#9BD8FF');
      this.scene.fog = new this.THREE.Fog('#BFE8FF', 34, 88);
    }

    const homeBtn = this.container?.querySelector('#farmHomeBtn');
    const ribbon = this.container?.querySelector('#farmRibbon');
    const guide = this.container?.querySelector('#farmGuidePill');
    const goal = this.container?.querySelector('#farmGoalPill');
    const lvPill = this.container?.querySelector('#homeLevelPill');
    const pocketIco = this.container?.querySelector('.pocket-ico');
    const pocketLbl = this.container?.querySelector('.pocket-label');

    if (homeBtn) { homeBtn.textContent = '🏡 내 집'; homeBtn.classList.remove('in-home'); }
    if (ribbon) ribbon.style.display = 'flex';
    if (guide) guide.style.display = 'block';
    if (goal) goal.style.display = 'block';
    if (lvPill) lvPill.style.display = 'none';
    if (pocketIco) pocketIco.textContent = '🎒';
    if (pocketLbl) pocketLbl.innerHTML = `도감·옷장 <b id="farmBagCount">0/12</b>`;
    this._updateBagBadge();
  }

  _openHomeModal() {
    this._renderHomeModal();
    const modal = this.container?.querySelector('#farmHomeModal');
    if (modal) modal.style.display = 'flex';
  }

  _closeHomeModal() {
    const modal = this.container?.querySelector('#farmHomeModal');
    if (modal) modal.style.display = 'none';
  }

  _enterFurniturePlaceMode(furnId) {
    const item = ROOM_FURNITURE.find(f => f.id === furnId);
    if (!item) return;
    this.placingFurnitureId = furnId;
    const bar = this.container?.querySelector('#farmPlaceBar');
    const txt = this.container?.querySelector('#farmPlaceText');
    if (txt) txt.textContent = `👆 방 바닥을 톡! 눌러 ${item.emoji} ${item.name} 놓기!`;
    if (bar) bar.style.display = 'flex';
    this.onToast(`🛋️ 방 바닥 원하는 곳을 톡! 눌러 ${item.emoji} ${item.name}을(를) 배치하세요!`);
  }

  _commitFurniturePlacement(furnId, rawX, rawZ) {
    const half = this.myHome3D ? this.myHome3D.getHalfSize() : 4.2;
    const x = Math.max(-half, Math.min(half, rawX));
    const z = Math.max(-half, Math.min(half, rawZ));
    const idx = this.homeState.placedFurniture.findIndex(p => p.id === furnId);
    if (idx >= 0) this.homeState.placedFurniture[idx] = { id: furnId, x, z, rot: 0 };
    else this.homeState.placedFurniture.push({ id: furnId, x, z, rot: 0 });
    this._saveRpgState();
    if (this.myHome3D) this.myHome3D.syncFurniture(this.homeState.placedFurniture, furnId);
    this._exitPlaceMode();
    this._updateBagBadge();
    this.audio.playStarSFX();
    this.onConfetti(55);
    const item = ROOM_FURNITURE.find(f => f.id === furnId);
    if (item) this.onToast(`🛋️ ${item.emoji} ${item.name}을(를) 내 방에 멋지게 배치했어요!`);
  }

  _renderHomeModal() {
    const body = this.container?.querySelector('#farmHomeBody');
    if (!body) return;
    const ownedSet = new Set(this.treasures);
    ROOM_WALLPAPERS.filter(w => w.defaultOwned).forEach(w => ownedSet.add(w.id));
    ROOM_FLOORS.filter(f => f.defaultOwned).forEach(f => ownedSet.add(f.id));

    const ownedFurn = ROOM_FURNITURE.filter(f => ownedSet.has(f.id));
    const ownedWalls = ROOM_WALLPAPERS.filter(w => ownedSet.has(w.id));
    const ownedFloors = ROOM_FLOORS.filter(f => ownedSet.has(f.id));

    const setTxt = (sel, txt) => { const el = this.container?.querySelector(sel); if (el) el.textContent = txt; };
    setTxt('#homeFurnCount', `${ownedFurn.length}/${ROOM_FURNITURE.length}`);
    setTxt('#homeWallCount', `${ownedWalls.length}/${ROOM_WALLPAPERS.length}`);
    setTxt('#homeFloorCount', `${ownedFloors.length}/${ROOM_FLOORS.length}`);

    this.container.querySelectorAll('[data-home-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.homeTab === this.homeTab);
    });

    if (this.homeTab === 'furniture') {
      const placedIds = new Set(this.homeState.placedFurniture.map(p => p.id));
      body.innerHTML = `
        <p class="bag-hint">보물상자에서 모은 <b>40종 3D 가구·장난감</b>을 내 방에 마음대로 배치해요! (가구 8개 → 2단계 거실, 20개 → 3단계 왕궁!)</p>
        <div class="farm-bag-grid">
          ${ROOM_FURNITURE.map(f => {
            const got = ownedSet.has(f.id);
            const placed = placedIds.has(f.id);
            return `
              <div class="bag-slot ${got ? `got rarity-${f.rarity}` : ''}">
                <div class="bag-slot-ico">${got ? f.emoji : '🔒'}</div>
                <div class="bag-slot-name">${got ? f.name : '숨겨진 가구'}</div>
                ${got
                  ? `<button class="bag-place-btn ${placed ? 'placed' : ''}" data-place-furn="${f.id}">${placed ? '📍 옮기기' : '🛋️ 방에 놓기'}</button>`
                  : `<div class="bag-slot-who">보물상자에서 획득</div>`}
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('[data-place-furn]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.placeFurn;
          this._closeHomeModal();
          this._enterFurniturePlaceMode(id);
        });
      });
      return;
    }

    if (this.homeTab === 'wallpaper') {
      body.innerHTML = `
        <p class="bag-hint">원하는 벽지를 톡! 누르면 내 방 벽지가 즉시 바뀌어요!</p>
        <div class="farm-bag-grid">
          ${ROOM_WALLPAPERS.map(w => {
            const got = ownedSet.has(w.id);
            const active = this.homeState.wallpaper === w.id;
            return `
              <button class="bag-slot ${got ? 'got' : ''} ${active ? 'mastered' : ''}" data-set-wall="${w.id}" ${got ? '' : 'disabled'}>
                <div class="home-swatch" style="background:${got ? w.bg : '#E2E8F0'}">${got ? w.emoji : '🔒'}</div>
                <div class="bag-slot-name">${w.name}</div>
                <div class="bag-slot-who">${active ? '✨ 적용 중!' : (got ? '👆 바꾸기' : '보물상자 획득')}</div>
              </button>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('[data-set-wall]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.setWall;
          this.homeState.wallpaper = id;
          this._saveRpgState();
          const lv = getHomeLevel(this._getOwnedFurnitureIds().length);
          if (this.myHome3D) this.myHome3D.syncRoomStyle(this.homeState.wallpaper, this.homeState.floor, lv.size);
          this.audio.playChimeSFX();
          this._renderHomeModal();
        });
      });
      return;
    }

    if (this.homeTab === 'floor') {
      body.innerHTML = `
        <p class="bag-hint">원하는 바닥재를 톡! 누르면 내 방 바닥이 즉시 바뀌어요!</p>
        <div class="farm-bag-grid">
          ${ROOM_FLOORS.map(f => {
            const got = ownedSet.has(f.id);
            const active = this.homeState.floor === f.id;
            return `
              <button class="bag-slot ${got ? 'got' : ''} ${active ? 'mastered' : ''}" data-set-floor="${f.id}" ${got ? '' : 'disabled'}>
                <div class="home-swatch" style="background:${got ? f.bg : '#E2E8F0'}">${got ? f.emoji : '🔒'}</div>
                <div class="bag-slot-name">${f.name}</div>
                <div class="bag-slot-who">${active ? '✨ 적용 중!' : (got ? '👆 바꾸기' : '보물상자 획득')}</div>
              </button>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('[data-set-floor]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.setFloor;
          this.homeState.floor = id;
          this._saveRpgState();
          const lv = getHomeLevel(this._getOwnedFurnitureIds().length);
          if (this.myHome3D) this.myHome3D.syncRoomStyle(this.homeState.wallpaper, this.homeState.floor, lv.size);
          this.audio.playChimeSFX();
          this._renderHomeModal();
        });
      });
    }
  }

  _commitTreasurePlacement(treasureId, rawX, rawZ) {
    const r = Math.hypot(rawX, rawZ);
    const x = r > 15.8 ? (rawX / r) * 15.8 : rawX;
    const z = r > 15.8 ? (rawZ / r) * 15.8 : rawZ;
    const idx = this.placedTreasures.findIndex(p => p.id === treasureId);
    if (idx >= 0) this.placedTreasures[idx] = { id: treasureId, x, z };
    else this.placedTreasures.push({ id: treasureId, x, z });
    this._saveRpgState();
    if (this.placedTreasures3D) {
      this.placedTreasures3D.syncPlaced(this.placedTreasures, treasureId);
    }
    this._exitPlaceMode();
    this.audio.playStarSFX();
    this.onConfetti(55);
    const item = TREASURE_ITEMS.find(t => t.id === treasureId);
    if (item) this.onToast(`✨ ${item.emoji} ${item.name}을(를) 3D 농장에 멋지게 장식했어요!`);
  }

  _playConstructionCinematic(buildingId, { isRevisit = false } = {}) {
    const b = VILLAGE_BUILDINGS.find(x => x.id === buildingId);
    if (!b || !this.villageBuildings) return;
    const pos = this.villageBuildings.getFocusPos(buildingId);
    const durationMs = isRevisit ? 2200 : 3100;
    this.cameraFocusOverride = { x: pos.x, z: pos.z, until: performance.now() + durationMs };

    const banner = this.container?.querySelector('#farmCinematicBanner');
    if (banner) {
      banner.textContent = isRevisit
        ? `🏗️ 우주가 지은 ${b.emoji} ${b.name}!`
        : `🏗️ 뚝딱뚝딱! ${b.emoji} ${b.name} 건설 중!!`;
      banner.style.display = 'block';
      if (!isRevisit) {
        setTimeout(() => {
          if (this.mounted && banner && banner.style.display === 'block') {
            banner.textContent = `🎉 완공!! ${b.emoji} ${b.name}이(가) 완성됐어요!!`;
            this.audio.playFanfareSFX();
            this.onConfetti(90);
          }
        }, 1600);
      }
      setTimeout(() => {
        if (this.mounted && banner) banner.style.display = 'none';
      }, durationMs);
    }
  }

  _openEventModal() {
    this.daily = normalizeDailyState(this.daily, getLocalDateKey());
    this._renderEventModal();
    const modal = this.container?.querySelector('#farmEventModal');
    if (modal) modal.style.display = 'flex';
  }

  _closeEventModal() {
    const modal = this.container?.querySelector('#farmEventModal');
    if (modal) modal.style.display = 'none';
    if (this.entered && this.currentSpotIndex === 0 && this.activeDialogueSpot === null) {
      this._openDialogue(0, false);
    }
  }

  _renderEventModal() {
    const body = this.container?.querySelector('#farmEventBody');
    if (!body) return;
    const todayKey = getLocalDateKey();
    this.daily = normalizeDailyState(this.daily, todayKey);
    const attendedToday = this.attendance?.lastClaimDate === todayKey;
    const checkedCount = (this.attendance?.days || []).length;
    const cycleChecked = checkedCount === 0 ? 0 : (((checkedCount - 1) % ATTENDANCE_REWARDS.length) + 1);
    const nextDayNum = attendedToday ? cycleChecked : ((checkedCount % ATTENDANCE_REWARDS.length) + 1);
    const streak = this.attendance?.streak || 0;
    const dq = evaluateDailyQuests(this.daily);

    body.innerHTML = `
      <div class="event-section-title">
        <span>📅 14일 출석체크 선물</span>
        <span class="streak-pill">🔥 ${streak}일 연속 출석 중!</span>
      </div>
      <div class="attend-grid">
        ${ATTENDANCE_REWARDS.map((r) => {
          const isChecked = attendedToday ? r.day <= cycleChecked : r.day < nextDayNum;
          const isTodayNext = !attendedToday && r.day === nextDayNum;
          return `
            <div class="attend-cell ${isChecked ? 'checked' : ''} ${isTodayNext ? 'today-next' : ''}">
              <div class="attend-day">${r.day}일차</div>
              <div class="attend-ico">${isChecked ? '✅' : r.emoji}</div>
              <div class="attend-lbl">${r.label}</div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="big-btn ${attendedToday ? 'btn-slow' : 'btn-star'}" id="btnClaimAttend" style="width:100%;margin-bottom:16px;" ${attendedToday ? 'disabled' : ''}>
        ${attendedToday
          ? '✅ 오늘 출석 선물을 이미 받았어요! 내일 또 만나요!'
          : `🎁 ${nextDayNum}일차 출석 도장 쾅! (${ATTENDANCE_REWARDS[nextDayNum - 1].label} 받기)`}
      </button>

      <div class="event-section-title">
        <span>🎯 오늘의 일일 미션</span>
        <span class="streak-pill">매일 자정 새 미션!</span>
      </div>
      <div class="daily-quest-list">
        ${dq.quests.map((q) => {
          const pct = Math.round((q.progress / q.target) * 100);
          const rowCls = q.claimed ? 'done' : (q.canClaim ? 'ready' : '');
          const btnCls = q.claimed ? 'claimed' : (q.canClaim ? 'can-claim' : '');
          const btnTxt = q.claimed ? '✅ 완료' : (q.canClaim ? `🎁 ${q.rewardText}` : `${q.rewardText}`);
          return `
            <div class="daily-quest-row ${rowCls}">
              <div class="dq-ico">${q.emoji}</div>
              <div class="dq-body">
                <div class="dq-title">${q.title}</div>
                <div class="dq-prog-wrap">
                  <div class="dq-bar"><div class="dq-bar-fill" style="width:${pct}%"></div></div>
                  <span class="dq-num">${q.progress}/${q.target}</span>
                </div>
              </div>
              <button class="dq-btn ${btnCls}" data-dq-id="${q.id}" ${q.canClaim ? '' : 'disabled'}>${btnTxt}</button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="all-clear-card">
        <div>
          <div style="font-size:14px;font-weight:900;color:#78350F;">🌟 오늘 미션 3개 올클리어 대선물!</div>
          <div style="font-size:12px;font-weight:700;color:#92400E;">⭐ 별 +5 &amp; 황금 희귀 보물상자 1개!</div>
        </div>
        <button class="dq-btn ${dq.allClaimed ? 'claimed' : (dq.canClaimAllClear ? 'can-claim' : '')}" id="btnClaimAllClear" ${dq.canClaimAllClear ? '' : 'disabled'}>
          ${dq.allClaimed ? '🏆 수령 완료' : (dq.canClaimAllClear ? '🎁 대선물 받기!' : '진행 중')}
        </button>
      </div>
    `;

    const attendBtn = body.querySelector('#btnClaimAttend');
    if (attendBtn && !attendedToday) {
      attendBtn.onclick = () => {
        const res = claimDailyAttendance(this.attendance, todayKey);
        if (res.alreadyClaimed) return;
        this.attendance = res.nextAttendance;
        this._saveRpgState();
        this.onRewardStar(res.reward.stars);
        this.audio.playFanfareSFX();
        this.onConfetti(75);
        this._updateBagBadge();
        this._renderEventModal();
        this.onToast(`🎉 ${res.claimedDay}일차 출석 완료! 🔥 ${res.nextAttendance.streak}일 연속! (${res.reward.label})`);
        if (res.reward.chest) {
          this._closeEventModal();
          setTimeout(() => {
            if (this.mounted) this._openChestModal(`🎁 ${res.claimedDay}일차 출석 특별 보물상자!`, { preferHigherRarity: Boolean(res.reward.highRarity) });
          }, 260);
        }
      };
    }

    body.querySelectorAll('.dq-btn.can-claim[data-dq-id]').forEach(btn => {
      btn.onclick = () => {
        const qId = btn.dataset.dqId;
        const q = dq.quests.find(x => x.id === qId);
        if (!q || !q.canClaim) return;
        this.daily.claimedMissions.push(qId);
        this._saveRpgState();
        this.onRewardStar(q.stars);
        this.audio.playStarSFX();
        this.onConfetti(55);
        this._updateBagBadge();
        this._renderEventModal();
        this.onToast(`🎯 일일 미션 보상 획득! ${q.rewardText}!`);
        if (q.chest) {
          this._closeEventModal();
          setTimeout(() => {
            if (this.mounted) this._openChestModal('🎯 일일 미션 보물상자!', { preferHigherRarity: Boolean(q.highRarity) });
          }, 260);
        }
      };
    });

    const allClearBtn = body.querySelector('#btnClaimAllClear');
    if (allClearBtn && dq.canClaimAllClear) {
      allClearBtn.onclick = () => {
        this.daily.allClearClaimed = true;
        this._saveRpgState();
        this.onRewardStar(5);
        this.audio.playFanfareSFX();
        this.onConfetti(95);
        this._updateBagBadge();
        this._renderEventModal();
        this._closeEventModal();
        this.onToast('🌟 오늘의 일일 미션 올클리어!! 황금 대보물상자 도착!!');
        setTimeout(() => {
          if (this.mounted) this._openChestModal('🌟 일일 미션 올클리어 황금 보물상자!', { preferHigherRarity: true });
        }, 260);
      };
    }
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

    // 1. Outdoor 3D Farm World wrapped in `outdoorGroup` so switching to 🏡 My-Home is instant!
    this.outdoorGroup = new THREE.Group();
    this.scene.add(this.outdoorGroup);

    const world = buildFarmWorld3D(THREE, this.outdoorGroup);
    this.groundMesh = world.groundMesh;
    this.clouds = world.clouds;

    // 1b. v3/v4/v7 Living Party Feast, 12 Unlockable Village Buildings & Placed 3D Treasures
    this.partyRewards = buildPartyRewards3D(THREE, this.outdoorGroup);
    this.partyRewards.syncMastery(this.mastery);
    this.villageBuildings = buildVillageBuildings3D(THREE, this.outdoorGroup);
    this.villageBuildings.syncBuildings(getUnlockedBuildings(this.speakCount));
    this.placedTreasures3D = buildPlacedTreasures3D(THREE, this.outdoorGroup, TREASURE_ITEMS);
    this.placedTreasures3D.syncPlaced(this.placedTreasures);

    // 1c. v8: Cozy 3D My-Home Room (hidden until Wooju enters 🏡 내 집!)
    this.myHome3D = buildMyHome3D(THREE, this.scene, {
      wallpapers: ROOM_WALLPAPERS,
      floors: ROOM_FLOORS,
      furniture: ROOM_FURNITURE,
    });
    const homeLv = getHomeLevel(this._getOwnedFurnitureIds().length);
    this.myHome3D.syncRoomStyle(this.homeState.wallpaper, this.homeState.floor, homeLv.size);
    this.myHome3D.syncFurniture(this.homeState.placedFurniture);

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

      this.outdoorGroup.add(built.group);
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
    this.outdoorGroup.add(this.activeRing);

    this.exclaimSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: createBadgeTexture(THREE, '!', '#F59E0B', '#FFFFFF'), transparent: true })
    );
    this.exclaimSprite.scale.set(0.95, 0.95, 1);
    this.outdoorGroup.add(this.exclaimSprite);

    this.dashedTrail = [];
    const dashGeo = new THREE.CapsuleGeometry(0.11, 0.42, 4, 8);
    dashGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const dashMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#FACC15' : '#FFFFFF', transparent: true, opacity: 0.92 });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      this.outdoorGroup.add(dash);
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

      // Indoor 🏡 My-Home floor tap (furniture placement or indoor walking)
      if (this.inHome && this.myHome3D) {
        const floorHits = this.raycaster.intersectObject(this.myHome3D.floorMesh, false);
        if (floorHits.length > 0) {
          const pt = floorHits[0].point;
          if (this.placingFurnitureId) {
            this._commitFurniturePlacement(this.placingFurnitureId, pt.x, pt.z);
            return;
          }
          const half = this.myHome3D.getHalfSize();
          const cx = Math.max(-half, Math.min(half, pt.x));
          const cz = Math.max(-half, Math.min(half, pt.z));
          this.walkTarget = { x: cx, z: cz };
          this.pendingSpotTrigger = null;
          this._spawnTapRing(cx, cz);
        }
        return;
      }

      if (this.placingTreasureId) {
        const gHits = this.raycaster.intersectObject(this.groundMesh, false);
        if (gHits.length > 0) {
          this._commitTreasurePlacement(this.placingTreasureId, gHits[0].point.x, gHits[0].point.z);
        }
        return;
      }

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
        if (this.placingTreasureId) {
          this._commitTreasurePlacement(this.placingTreasureId, pt.x, pt.z);
          return;
        }
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

  _clearWordTimers() {
    clearInterval(this._typeTimer);
    this._typeTimer = null;
    clearInterval(this._wordSweepTimer);
    this._wordSweepTimer = null;
    clearTimeout(this._autoPerfectTimer);
    this._autoPerfectTimer = null;
  }

  _renderWordChips(el, targetText, { matchedIndices = new Set(), hiddenMode = false, activeIdx = -1 } = {}) {
    if (!el) return;
    const tokens = tokenizeWords(targetText);
    el.innerHTML = `<div class="word-chip-wrap">${tokens.map((t) => {
      const lit = matchedIndices.has(t.index);
      const active = t.index === activeIdx;
      const hidden = hiddenMode && !lit;
      const cls = ['word-chip', lit ? 'word-lit' : '', active ? 'word-active' : '', hidden ? 'word-hidden' : ''].join(' ');
      const label = hidden ? '•'.repeat(Math.min(5, Math.max(2, t.norm.length))) : t.raw;
      return `<button type="button" class="${cls}" data-word-idx="${t.index}" data-word-raw="${t.raw.replace(/"/g, '&quot;')}">${label}</button>`;
    }).join('')}</div>`;

    el.querySelectorAll('.word-chip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const raw = btn.dataset.wordRaw || '';
        btn.classList.add('word-pointed');
        setTimeout(() => btn.classList.remove('word-pointed'), 420);
        this.audio.speakSingleWord(raw);
      });
    });
  }

  _startWordSweep(el, card) {
    clearInterval(this._wordSweepTimer);
    const tokens = tokenizeWords(card.en);
    if (!tokens.length) return;
    const durMs = Math.max(1200, ((card.end || 3) - (card.start || 0)) * 1000);
    const stepMs = Math.max(140, Math.round(durMs / tokens.length));
    let cur = 0;
    this._renderWordChips(el, card.en, { activeIdx: 0 });
    this._wordSweepTimer = setInterval(() => {
      cur += 1;
      if (cur >= tokens.length) {
        clearInterval(this._wordSweepTimer);
        this._wordSweepTimer = null;
        this._renderWordChips(el, card.en, { activeIdx: -1 });
        return;
      }
      el.querySelectorAll('.word-chip').forEach((btn, i) => {
        btn.classList.toggle('word-active', i === cur);
      });
    }, stepMs);
  }

  _startMagicGaugeForDialogue(cards, spotIdx) {
    const gaugeEl = this.container?.querySelector('#farmMagicGauge');
    const labelEl = this.container?.querySelector('#farmMagicLabel');
    const fillEl = this.container?.querySelector('#farmMagicFill');
    const pctEl = this.container?.querySelector('#farmMagicPct');
    const enEl = this.container?.querySelector('#farmDlgEn');
    const normalBtn = this.container?.querySelector('#farmJudgeNormalBtn');
    const crownBtn = this.container?.querySelector('#farmJudgeCrownBtn');
    const perfectBtn = this.container?.querySelector('#farmJudgePerfectBtn');
    if (!gaugeEl || !fillEl || !pctEl || !labelEl) return;

    this._clearWordTimers();
    this.voiceFilled = false;
    fillEl.style.width = '0%';
    pctEl.textContent = '0%';
    gaugeEl.classList.remove('filled');
    normalBtn?.classList.remove('pulse-ready');
    crownBtn?.classList.remove('pulse-ready');
    perfectBtn?.classList.remove('pulse-ready');

    const fullText = cards.map(c => c.en).join(' ');
    const hiddenMode = this.dialogueMode === 'memory';
    let matchedIndices = new Set();
    let autoPerfectFired = false;

    this._renderWordChips(enEl, fullText, { matchedIndices, hiddenMode });

    const startFallbackVoiceGauge = () => {
      labelEl.textContent = hiddenMode
        ? '🌙 그림만 보고 영어로 크게 말해보세요!'
        : '🎙️ 단어를 톡! 눌러 듣거나 영어로 따라 말해요!';
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
          if (hiddenMode) crownBtn?.classList.add('pulse-ready');
          else normalBtn?.classList.add('pulse-ready');
        },
        onMicDenied: () => {
          labelEl.textContent = '👆 단어를 톡! 눌러 듣고 말한 뒤 보상 버튼을 눌러요!';
          pctEl.textContent = '✨';
        },
      });
    };

    const sttStarted = this.audio.startSpeechMatch({
      onTranscript: (transcript) => {
        if (this.activeDialogueSpot !== spotIdx || autoPerfectFired) return;
        const res = matchSpokenWords(fullText, transcript, matchedIndices);
        const prevSize = matchedIndices.size;
        matchedIndices = res.matchedIndices;

        if (matchedIndices.size !== prevSize) {
          this._renderWordChips(enEl, fullText, { matchedIndices, hiddenMode });
        }

        const pct = Math.min(100, Math.round(res.ratio * 100));
        fillEl.style.width = `${pct}%`;
        pctEl.textContent = `${res.matchedCount}/${res.totalCount}`;
        labelEl.textContent = `✨ 단어 불 켜기: ${res.matchedCount}/${res.totalCount}개 맞췄어요!`;

        if (res.isPerfect) {
          autoPerfectFired = true;
          this.voiceFilled = true;
          this.audio.stopSpeechMatch();
          // Light up all remaining words golden for celebration!
          const allIdx = new Set(res.targetTokens.map(t => t.index));
          this._renderWordChips(enEl, fullText, { matchedIndices: allIdx, hiddenMode: false });
          gaugeEl.classList.add('filled');
          fillEl.style.width = '100%';
          pctEl.textContent = '💎100%';
          labelEl.textContent = '💎 우와!! 토씨 하나 안 틀렸어요!! 퍼펙트!!';
          perfectBtn?.classList.add('pulse-ready');
          this.audio.playChimeSFX();
          this._autoPerfectTimer = setTimeout(() => {
            if (this.activeDialogueSpot === spotIdx) {
              this._claimSpotReward(spotIdx, 3, { isPerfect: true });
            }
          }, 800);
        } else if (pct >= 50 && !this.voiceFilled) {
          this.voiceFilled = true;
          normalBtn?.classList.add('pulse-ready');
        }
      },
      onUnsupported: () => startFallbackVoiceGauge(),
      onError: () => startFallbackVoiceGauge(),
    });

    if (sttStarted) {
      labelEl.textContent = hiddenMode
        ? '🎙️ 외워서 말하면 숨겨진 단어가 반짝 열려요!'
        : '🎙️ 영어로 말하면 단어에 초록불이 켜져요! (단어 톡=듣기)';
    }
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
            this._startWordSweep(enEl, card);
            koEl.textContent = card.ko || '';
          },
          onAllDone: () => {
            this.isListening = false;
            this.dialogueListened = true;
            normalBtn.disabled = false;
            normalBtn.textContent = currentTier === 0
              ? `⭐ 따라 말했어요! (${spot.itemEmoji} 3D 선물 받기!)`
              : '⭐ 따라 말했어요!';
            this._startMagicGaugeForDialogue(cards, spotIdx);
          },
        });
      } else if (modeKey === 'hint') {
        normalBtn.disabled = false;
        normalBtn.textContent = '⭐⭐ 힌트로 성공!';
        crownBtn.textContent = '👑 혼자 다 외웠어요!';
        const mainCard = firstChunkedCard || cards[0];
        renderIcons(mainCard, true);
        if (firstChunkedCard) {
          this._renderWordChips(enEl, firstChunkedCard.chunks[0].en);
          koEl.textContent = '🤝 앞부분을 듣고 뒷부분을 우주가 이어 말해요!';
          this.isListening = true;
          this.audio.playSegment(firstChunkedCard.chunks[0].start, firstChunkedCard.chunks[0].end, {
            rate: 0.95,
            onDone: () => {
              this.isListening = false;
              this._startMagicGaugeForDialogue(cards, spotIdx);
            },
          });
        } else {
          this._renderWordChips(enEl, mainCard.en, { hiddenMode: true });
          koEl.textContent = '👂 첫 1초 힌트를 듣고 이어 말해요!';
          this.isListening = true;
          this.audio.playSegment(mainCard.start, Math.min(mainCard.end, mainCard.start + 1.05), {
            rate: 1.0,
            onDone: () => {
              this.isListening = false;
              this._startMagicGaugeForDialogue(cards, spotIdx);
            },
          });
        }
      } else {
        // 'memory' — 3-Star Golden Crown Challenge!
        normalBtn.disabled = false;
        normalBtn.textContent = '⭐ 힌트 보고 말했어요';
        crownBtn.textContent = '👑 안 보고 혼자 외웠어요!!';
        iconsEl.innerHTML = cards.map(c =>
          (c.icons || []).map(([em]) => `<span class="farm-icon-chip">${em}</span>`).join('')
        ).join('<span class="farm-icon-arrow">·</span>');
        koEl.textContent = '🌙 그림만 보고 영어로 말하면 숨겨진 단어가 반짝 열려요!';
        this._startMagicGaugeForDialogue(cards, spotIdx);
      }
    };

    this.container.querySelectorAll('.farm-tier-tab').forEach(btn => {
      btn.onclick = () => runChallengeMode(btn.dataset.tierMode);
    });

    replayBtn.onclick = () => {
      this.audio.stopVoiceGauge();
      this.audio.stopSpeechMatch();
      this.isListening = true;
      this.audio.playSegmentSequence(cards, {
        onCardStart: (card) => {
          renderIcons(card, this.dialogueMode === 'memory');
          if (this.dialogueMode !== 'memory') {
            this._startWordSweep(enEl, card);
            koEl.textContent = card.ko || '';
          }
        },
        onAllDone: () => {
          this.isListening = false;
          this._startMagicGaugeForDialogue(cards, spotIdx);
        },
      });
    };

    if (chunkBtn && firstChunkedCard) {
      chunkBtn.onclick = () => {
        this.audio.stopVoiceGauge();
        this.audio.stopSpeechMatch();
        this.isListening = true;
        renderIcons(firstChunkedCard, false);
        this._renderWordChips(enEl, firstChunkedCard.chunks[0].en);
        koEl.textContent = `✂️ 1조각: ${firstChunkedCard.chunks[0].ko || ''}`;
        this.audio.playSegment(firstChunkedCard.chunks[0].start, firstChunkedCard.chunks[0].end, {
          rate: 0.92,
          onDone: () => {
            setTimeout(() => {
              if (this.activeDialogueSpot !== spotIdx) return;
              this._renderWordChips(enEl, firstChunkedCard.chunks[1].en);
              koEl.textContent = `✂️ 2조각: ${firstChunkedCard.chunks[1].ko || ''}`;
              this.audio.playSegment(firstChunkedCard.chunks[1].start, firstChunkedCard.chunks[1].end, {
                rate: 0.92,
                onDone: () => {
                  this.isListening = false;
                  this._startMagicGaugeForDialogue(cards, spotIdx);
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

    // Track daily mission activity!
    const prevDqClaimable = evaluateDailyQuests(this.daily).claimableCount;
    this.daily = recordDailyActivity(this.daily, getLocalDateKey(), {
      spotId: spot.id,
      tier: result.nextTier,
      isPerfect,
    });
    const nextDqClaimable = evaluateDailyQuests(this.daily).claimableCount;
    if (nextDqClaimable > prevDqClaimable) {
      setTimeout(() => {
        if (this.mounted) this.onToast('🎯 일일 미션 달성!! 상단 🎁 출석·미션 버튼을 눌러 선물을 받으세요!');
      }, 1500);
    }

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
    if (newlyBuilt.length > 0) {
      this._playConstructionCinematic(newlyBuilt[0], { isRevisit: false });
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
    this._clearWordTimers();
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

      // Animate v3/v4/v7/v8 Living Farm or My-Home 3D Furniture
      if (this.inHome) {
        if (this.myHome3D) this.myHome3D.update(t, dt);
      } else {
        if (this.partyRewards) this.partyRewards.update(t, dt);
        if (this.villageBuildings) this.villageBuildings.update(t, dt);
        if (this.placedTreasures3D) this.placedTreasures3D.update(t, dt);
      }

      // 1. Wooju 3D Avatar Movement & Walking Limb Animation
      let moving = false;
      const speed = this.inHome ? 5.6 : 7.5;
      if (this.entered && this.activeDialogueSpot === null) {
        if (Math.hypot(this.joyVec.x, this.joyVec.z) > 0.08) {
          const nx = this.avatarPos.x + this.joyVec.x * speed * dt;
          const nz = this.avatarPos.z + this.joyVec.z * speed * dt;
          if (this.inHome && this.myHome3D) {
            const half = this.myHome3D.getHalfSize();
            this.avatarPos.x = Math.max(-half, Math.min(half, nx));
            this.avatarPos.z = Math.max(-half, Math.min(half, nz));
          } else if (Math.hypot(nx, nz) <= 16.2) {
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
            if (this.pendingSpotTrigger && !this.inHome) {
              const { spotIdx, isRevisit } = this.pendingSpotTrigger;
              this.pendingSpotTrigger = null;
              this._openDialogue(spotIdx, isRevisit);
            }
          }
        }

        // Proximity auto-trigger when walking right up to the active unmet animal (outdoor only)
        if (!this.inHome && moving && !this.pendingSpotTrigger && this.currentSpotIndex < FARM_SPOTS.length) {
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
      } else if (this.inHome) {
        // Cozy Animal Crossing isometric corner-room view!
        const roomHalf = this.myHome3D ? this.myHome3D.getHalfSize() : 4.2;
        const zoom = (roomHalf / 4.2) * portraitBoost;
        const tx = this.avatarPos.x * 0.35 + 6.2 * zoom;
        const ty = 8.4 * zoom;
        const tz = this.avatarPos.z * 0.35 + 10.2 * zoom;
        this.camera.position.x += (tx - this.camera.position.x) * 0.1;
        this.camera.position.y += (ty - this.camera.position.y) * 0.1;
        this.camera.position.z += (tz - this.camera.position.z) * 0.1;
        this.camera.lookAt(this.avatarPos.x * 0.25, 1.1, this.avatarPos.z * 0.25);
      } else {
        let focusX = this.avatarPos.x;
        let focusZ = this.avatarPos.z;
        let camHeight = 5.4 * portraitBoost;
        let camDist = 11.2 * portraitBoost;
        let lookY = 1.7;
        let lookOffsetZ = -1.2;
        if (this.cameraFocusOverride) {
          if (performance.now() < this.cameraFocusOverride.until) {
            focusX = this.cameraFocusOverride.x;
            focusZ = this.cameraFocusOverride.z;
            camHeight = 7.2 * portraitBoost;
            camDist = 12.8 * portraitBoost;
            lookY = 2.0;
            lookOffsetZ = 0;
          } else {
            this.cameraFocusOverride = null;
          }
        } else if (this.activeDialogueSpot !== null && this.spotEntries[this.activeDialogueSpot]) {
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
        if (!this.inHome && nearestIdx >= 0 && this.entered && this.activeDialogueSpot === null) {
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
