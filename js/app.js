// Main application orchestrator for 우주의 영어 동화 발표회 v2
import { SCENES } from './scenes.js';
import { BASE_CARDS, REHEARSAL_OUTRO, getDeck, getNextMission } from './data.js';
import { AudioEngine } from './audio.js';
import { QuizController } from './quiz.js';
import { FarmGame3D } from './game3d.js';

// --- Persistent State ---
let mode = 0; // Default to Mode 0 (3D Farm) since Wooju just started listening!
let chapter = 0;
let currentIndex = 0;
let showParentScript = true;
let showGesture = true;
let hideKoIconsInPractice = true;
let autoRecordInParrot = true;
let autoStoryMode = false;
let autoStoryTimer = null;
let autoNextTimer = null;

const completedIds = new Set(JSON.parse(localStorage.getItem('wooju_done_v1') || '[]'));
const weakIds = new Set(JSON.parse(localStorage.getItem('wooju_weak_v1') || '[]'));
const stamps = JSON.parse(localStorage.getItem('wooju_stamps_v1') || '{}');
let totalStars = parseInt(localStorage.getItem('wooju_stars_v1') || '0', 10);

const savedPigImg = localStorage.getItem('wooju_pig_img_v1');
if (savedPigImg) SCENES.scene7 = savedPigImg;

// --- Child & Parent Recordings ---
const childRecUrls = {};
let mediaRecorder = null;
let recChunks = [];
let isRecordingChild = false;
let isRecordingRehearsal = false;
let latestRehearsal = null;

let db = null;
const parentVoiceUrls = {};
let parentRecorder = null;
let parentRecCardId = null;

// --- IndexedDB for Parent Voices ---
function initDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve();
    const req = indexedDB.open('wooju_voices_db', 1);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('voices')) d.createObjectStore('voices');
    };
    req.onsuccess = (e) => { db = e.target.result; loadAllParentVoices().then(resolve); };
    req.onerror = () => resolve();
  });
}

function loadAllParentVoices() {
  return new Promise((resolve) => {
    if (!db) return resolve();
    const req = db.transaction('voices', 'readonly').objectStore('voices').openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { parentVoiceUrls[cursor.key] = URL.createObjectURL(cursor.value); cursor.continue(); }
      else resolve();
    };
    req.onerror = () => resolve();
  });
}

function saveParentVoice(cardId, blob) {
  return new Promise((resolve) => {
    if (parentVoiceUrls[cardId]) URL.revokeObjectURL(parentVoiceUrls[cardId]);
    parentVoiceUrls[cardId] = URL.createObjectURL(blob);
    if (!db) return resolve();
    const tx = db.transaction('voices', 'readwrite');
    tx.objectStore('voices').put(blob, cardId);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
  });
}

function deleteParentVoice(cardId) {
  return new Promise((resolve) => {
    if (parentVoiceUrls[cardId]) { URL.revokeObjectURL(parentVoiceUrls[cardId]); delete parentVoiceUrls[cardId]; }
    if (!db) return resolve();
    const tx = db.transaction('voices', 'readwrite');
    tx.objectStore('voices').delete(cardId);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
  });
}

// --- Confetti & Toast ---
const confettiCanvas = document.getElementById('confetti');
const cCtx = confettiCanvas.getContext('2d');
let particles = [];
function resizeConfetti() { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function launchConfetti(count = 50) {
  const colors = ['#FACC15', '#FB923C', '#EC4899', '#6366F1', '#22C55E', '#38BDF8'];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: window.innerWidth * (0.2 + Math.random() * 0.6),
      y: window.innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 14,
      vy: -6 - Math.random() * 11,
      size: 6 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }
  if (particles.length === count) requestAnimationFrame(tickConfetti);
}

function tickConfetti() {
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  particles = particles.filter(p => p.life > 0.02);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.38; p.rot += p.vrot; p.life -= 0.014;
    cCtx.save();
    cCtx.globalAlpha = Math.max(0, p.life);
    cCtx.translate(p.x, p.y);
    cCtx.rotate(p.rot);
    cCtx.fillStyle = p.color;
    cCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
    cCtx.restore();
  }
  if (particles.length > 0) requestAnimationFrame(tickConfetti);
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}

function addStars(n = 1) {
  totalStars += n;
  localStorage.setItem('wooju_stars_v1', String(totalStars));
  document.getElementById('starCount').textContent = totalStars;
}

function markWeakCard(cardId) {
  if (!cardId || cardId === 99) return;
  if (!weakIds.has(cardId)) {
    weakIds.add(cardId);
    localStorage.setItem('wooju_weak_v1', JSON.stringify([...weakIds]));
    updateWeakPill();
  }
}

function updateWeakPill() {
  const pill = document.getElementById('weakChapPill');
  if (weakIds.size > 0) {
    pill.style.display = 'inline-block';
    pill.textContent = `🔥 집중 연습 (${weakIds.size})`;
  } else {
    pill.style.display = 'none';
    if (chapter === -1) chapter = 0;
  }
}

function setPlayingVisual(isPlaying) {
  document.getElementById('sceneWrap').classList.toggle('playing', isPlaying);
  document.getElementById('storyFormula').classList.toggle('playing', isPlaying);
}

// --- Audio Engine, Quiz & 3D Farm ---
const storyAudio = document.getElementById('storyAudio');
const audioEngine = new AudioEngine(storyAudio, {
  getParentVoiceUrls: () => parentVoiceUrls,
  onVisualChange: setPlayingVisual,
  onToast: showToast,
  onRehearsalAborted: () => {
    isRecordingRehearsal = false;
    const btn = document.getElementById('btnRehearsalRec');
    if (btn) {
      btn.classList.remove('recording');
      btn.textContent = '🔴 통녹음 시작';
    }
  },
});

// Unlock iOS Safari AudioContext & HTMLAudioElement on first user touch
document.addEventListener('pointerdown', () => audioEngine.unlock(), { once: true });

// Prevent iPad/iOS Safari accidental double-tap zoom & pinch-zoom lockup
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
let _lastTouchEndTs = 0;
document.addEventListener('touchend', (e) => {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const now = Date.now();
  if (now - _lastTouchEndTs <= 320) {
    e.preventDefault();
  }
  _lastTouchEndTs = now;
}, { passive: false });

const quizController = new QuizController(document.getElementById('quizModal'), {
  audioEngine,
  onRewardStar: addStars,
  onConfetti: launchConfetti,
  onToast: showToast,
});

const farmGame = new FarmGame3D({
  audioEngine,
  getTotalStars: () => totalStars,
  onRewardStar: addStars,
  onConfetti: launchConfetti,
  onToast: showToast,
  onOpenSequenceQuiz: () => quizController.openSequenceQuiz(),
  onGoToParrotMode: () => switchMode(2, 1),
  onExitFullscreen: () => switchMode(1),
});

// --- Echo Overlay UI Hooks ---
function getEchoCallbacks(card) {
  const overlay = document.getElementById('echoOverlay');
  const banner = document.getElementById('echoBanner');
  const sub = document.getElementById('echoSub');
  const barFill = document.getElementById('echoBarFill');
  const loudMeter = document.getElementById('loudnessMeter');
  const loudFill = document.getElementById('loudnessFill');

  return {
    onEchoStart: ({ label, subText }) => {
      banner.textContent = label;
      if (subText) {
        sub.textContent = subText;
        sub.style.display = 'block';
      } else {
        sub.style.display = 'none';
      }
      barFill.style.width = '100%';
      loudMeter.style.display = 'flex';
      loudFill.style.width = '4%';
      overlay.classList.add('show');
    },
    onEchoTick: (pct) => {
      barFill.style.width = pct + '%';
    },
    onLevel: (level) => {
      const pct = Math.max(4, Math.min(100, Math.round(level * 100)));
      loudFill.style.width = pct + '%';
    },
    onMicDenied: () => {
      loudMeter.style.display = 'none';
    },
    onEchoEnd: () => {
      overlay.classList.remove('show');
    },
    onAutoRecordBlob: (blob) => {
      if (!card) return;
      if (childRecUrls[card.id]) URL.revokeObjectURL(childRecUrls[card.id]);
      childRecUrls[card.id] = URL.createObjectURL(blob);
      const activeCard = getDeck({ mode, chapter, weakIds })[currentIndex];
      if (activeCard && activeCard.id === card.id) {
        document.getElementById('btnPlayRec').disabled = false;
      }
      showToast('🎙️ 자동 녹음 완료! 비교 듣기를 눌러보세요!');
    },
  };
}

document.getElementById('btnEchoDoneEarly').addEventListener('click', (e) => {
  e.stopPropagation();
  audioEngine.finishEchoEarly();
});

// --- Stop Everything Helper ---
function stopAllPlayback({ keepRehearsalRec = false } = {}) {
  clearTimeout(autoNextTimer);
  clearInterval(autoStoryTimer);
  autoStoryTimer = null;
  document.getElementById('echoOverlay').classList.remove('show');
  if (isRecordingChild && mediaRecorder && mediaRecorder.state === 'recording') {
    try { mediaRecorder.stop(); } catch (_) {}
  }
  audioEngine.stopAll({ keepRehearsalRec });
  if (autoStoryMode) {
    autoStoryMode = false;
    const btn = document.getElementById('btnAutoStory');
    btn.classList.remove('playing-all');
    btn.textContent = '🎵 통으로 듣기';
  }
}

// --- Daily Mission Banner ---
function renderMissionBanner() {
  const m = getNextMission(stamps);
  document.getElementById('missionDayBadge').textContent = `오늘의 5분 미션 · ${m.day}일차`;
  document.getElementById('missionTitle').textContent = m.title;
}

document.getElementById('missionGoBtn').addEventListener('click', () => {
  const m = getNextMission(stamps);
  switchMode(m.mode, m.chapter);
  showToast(`🚀 ${m.day}일차 미션 시작!`);
});
document.getElementById('btnSeqQuiz').addEventListener('click', () => {
  stopAllPlayback();
  quizController.openSequenceQuiz();
});
document.getElementById('btnListenQuiz').addEventListener('click', () => {
  stopAllPlayback();
  quizController.openListenQuiz();
});
document.getElementById('closeQuizBtn').addEventListener('click', () => quizController.close());

// --- Mode Switching (Clean WebGL + Audio Teardown) ---
function switchMode(newMode, newChapter = null) {
  stopAllPlayback();
  if (mode === 0 && newMode !== 0) {
    farmGame.unmount();
  }
  mode = newMode;
  if (newChapter !== null) chapter = newChapter;
  currentIndex = 0;

  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.mode, 10) === mode));
  document.querySelectorAll('.chap-pill').forEach(p => p.classList.toggle('active', parseInt(p.dataset.chap, 10) === chapter));

  const farmCard = document.getElementById('farmCard');
  const chapterBar = document.getElementById('chapterBar');
  const stageCard = document.getElementById('stageCard');

  if (mode === 0) {
    farmCard.style.display = 'flex';
    chapterBar.style.display = 'none';
    stageCard.style.display = 'none';
    farmGame.mount(farmCard);
  } else {
    farmCard.style.display = 'none';
    chapterBar.style.display = 'flex';
    stageCard.style.display = 'flex';
    render(false);
  }
}

// --- Render Learning Card (Modes 1..4) ---
function render(shouldStopAudio = true) {
  if (shouldStopAudio) stopAllPlayback({ keepRehearsalRec: mode === 4 && isRecordingRehearsal });
  updateWeakPill();

  const deck = getDeck({ mode, chapter, weakIds });
  if (currentIndex >= deck.length) currentIndex = deck.length - 1;
  if (currentIndex < 0) currentIndex = 0;
  const card = deck[currentIndex];

  document.getElementById('starCount').textContent = totalStars;
  const pct = Math.max(5, Math.round(((currentIndex + 1) / deck.length) * 100));
  document.getElementById('rocketFill').style.width = pct + '%';
  document.getElementById('rocketIcon').style.left = `calc(${pct}% - 6px)`;

  const wrap = document.getElementById('sceneWrap');
  const camEl = document.getElementById('sceneCamera');
  const imgEl = document.getElementById('sceneImg');
  const bannerEl = document.getElementById('stageBanner');

  wrap.classList.remove('anim-bounce', 'anim-shake', 'anim-dance', 'mode-full');
  if (card.anim) wrap.classList.add('anim-' + card.anim);

  if (card.isBanner) {
    camEl.style.display = 'none';
    bannerEl.style.display = 'flex';
    bannerEl.innerHTML = `<div class="big-emoji">${card.bannerEmoji}</div><h2>${card.bannerTitle}</h2><p>${card.bannerSub}</p>`;
  } else {
    bannerEl.style.display = 'none';
    camEl.style.display = 'block';
    const sceneSrc = SCENES[card.scene];
    if (imgEl.dataset.scene !== card.scene || imgEl.src !== sceneSrc) {
      imgEl.src = sceneSrc;
      imgEl.dataset.scene = card.scene;
    }
    if (mode === 4) {
      wrap.classList.add('mode-full');
      camEl.style.transformOrigin = '50% 50%';
      camEl.style.transform = 'scale(1)';
    } else {
      const cam = card.cam || { scale: 1, ox: 50, oy: 50 };
      camEl.style.transformOrigin = `${cam.ox}% ${cam.oy}%`;
      camEl.style.transform = `scale(${cam.scale})`;
    }
  }

  document.getElementById('pageBadge').textContent = `${currentIndex + 1} / ${deck.length}`;
  document.getElementById('doneBadge').classList.toggle('show', completedIds.has(card.id));

  const speakerPill = document.getElementById('speakerPill');
  speakerPill.textContent = card.speaker || '';
  speakerPill.style.display = (mode === 4 && !card.isBanner) ? 'none' : 'inline-flex';

  const tapHint = document.getElementById('tapHintPill');
  tapHint.textContent = mode === 3 ? '👆 막히면 그림 톡!' : (mode === 4 ? '🎤 발표해 보세요!' : '👆 그림을 톡!');

  // Visual Story Icons (hide Korean labels in Mode 2/3 when Direct Method toggle is ON)
  const formulaEl = document.getElementById('storyFormula');
  const hideLabels = hideKoIconsInPractice && (mode === 2 || mode === 3);
  if (mode === 4 && !card.isBanner) {
    formulaEl.innerHTML = `<div style="font-size:16px;font-weight:800;color:#4F46E5;padding:6px 0;">🎤 발표회 모드! 그림만 보고 큰 목소리로 말해보세요!</div>`;
  } else {
    formulaEl.innerHTML = (card.icons || []).map(([emoji, label]) => {
      if (!label) return `<div class="icon-chip arrow"><span class="ic-emoji">${emoji}</span></div>`;
      return `<div class="icon-chip"><span class="ic-emoji">${emoji}</span>${hideLabels ? '' : `<span class="ic-label">${label}</span>`}</div>`;
    }).join('');
  }

  // Gesture box
  document.getElementById('gestureBox').style.display = (showGesture && mode !== 4) ? 'flex' : 'none';
  document.getElementById('gestureText').textContent = card.gesture || '';

  // Parent reference script
  const scriptBox = document.getElementById('parentScript');
  const showScriptNow = showParentScript && (mode === 1 || mode === 2 || card.isBanner);
  scriptBox.style.display = showScriptNow ? 'block' : 'none';
  document.getElementById('enText').textContent = card.en;
  document.getElementById('koText').textContent = card.ko;

  // Mode 4 One-Take Recorder Bar
  document.getElementById('rehearsalBar').style.display = mode === 4 ? 'flex' : 'none';

  // Buttons per mode
  const hasChunks = Array.isArray(card.chunks) && card.chunks.length >= 2;
  const btnPlay = document.getElementById('btnPlay');
  const btnSlow = document.getElementById('btnSlow');
  const btnHint1s = document.getElementById('btnHint1s');
  const btnEcho3 = document.getElementById('btnEcho3');
  const btnChunk = document.getElementById('btnChunk');
  const btnDuet = document.getElementById('btnDuet');

  btnHint1s.style.display = (mode === 3 || mode === 4) && !card.isBanner ? 'flex' : 'none';
  btnChunk.style.display = (mode === 2 && hasChunks) ? 'flex' : 'none';
  btnDuet.style.display = ((mode === 2 || mode === 3) && hasChunks) ? 'flex' : 'none';

  if (mode === 2) {
    btnPlay.textContent = '🦜 듣고 따라하기';
    btnSlow.style.display = 'none';
    btnEcho3.style.display = 'flex';
  } else if (mode === 3) {
    btnPlay.textContent = '🔊 전체 힌트';
    btnSlow.style.display = 'flex';
    btnEcho3.style.display = 'none';
  } else {
    btnPlay.textContent = '🔊 듣기';
    btnSlow.style.display = 'flex';
    btnEcho3.style.display = 'none';
  }

  document.getElementById('btnPlayRec').disabled = !childRecUrls[card.id];
  document.getElementById('btnDone').textContent = currentIndex === deck.length - 1
    ? '🏆 끝까지 다 했어요! 박수 받기!'
    : (completedIds.has(card.id) ? '🌟 또 말했어요! 다음으로 ➡️' : '⭐ 잘했어요! 별 받고 다음으로 ➡️');
  document.getElementById('btnPrev').disabled = currentIndex === 0;
  document.getElementById('btnNext').disabled = currentIndex === deck.length - 1;

  document.getElementById('dotStrip').innerHTML = deck.map((c, idx) => {
    const cls = [
      'dot',
      idx === currentIndex ? 'current' : '',
      completedIds.has(c.id) ? 'done' : '',
      weakIds.has(c.id) ? 'weak' : '',
    ].join(' ');
    return `<span class="${cls}" data-idx="${idx}" title="${idx + 1}번"></span>`;
  }).join('');
}

// --- Card Interaction Handlers ---
document.getElementById('sceneWrap').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  const wrap = document.getElementById('sceneWrap');
  wrap.classList.add('tap-pop');
  setTimeout(() => wrap.classList.remove('tap-pop'), 180);
  if (mode === 3 || mode === 4) markWeakCard(card.id);
  audioEngine.playCard(card, {
    mode,
    slow: false,
    triggerEcho: mode === 2,
    autoRecord: mode === 2 && autoRecordInParrot,
    ...getEchoCallbacks(card),
  });
});

document.getElementById('btnPlay').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  if (mode === 3 || mode === 4) markWeakCard(card.id);
  audioEngine.playCard(card, {
    mode,
    slow: false,
    triggerEcho: mode === 2,
    autoRecord: mode === 2 && autoRecordInParrot,
    ...getEchoCallbacks(card),
  });
});

document.getElementById('btnSlow').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  if (mode === 3 || mode === 4) markWeakCard(card.id);
  audioEngine.playCard(card, { mode, slow: true, triggerEcho: false });
});

document.getElementById('btnHint1s').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  markWeakCard(card.id);
  showToast('👂 첫 단어만 살짝 들려드릴게요!');
  audioEngine.playHint1s(card, { mode });
});

document.getElementById('btnEcho3').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  showToast('🦜 3번 연속 따라하기 시작!');
  audioEngine.playCard(card, {
    mode,
    slow: false,
    triggerEcho: true,
    loopCount: 3,
    autoRecord: autoRecordInParrot,
    ...getEchoCallbacks(card),
    onLoopComplete: () => {
      audioEngine.playStarSFX();
      launchConfetti(45);
      showToast('🦜 3번 따라하기 대성공!! 우주 최고!');
    },
  });
});

document.getElementById('btnChunk').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  showToast('✂️ 쪼개서 차근차근 따라해 볼까요!');
  audioEngine.playChunked(card, {
    ...getEchoCallbacks(card),
    onComplete: () => {
      audioEngine.playStarSFX();
      launchConfetti(45);
      showToast('✂️ 긴 문장도 완벽해요! 우주 최고!');
    },
  });
});

document.getElementById('btnDuet').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  showToast('🤝 원어민 다음을 우주가 이어 말해요!');
  audioEngine.playDuet(card, {
    ...getEchoCallbacks(card),
    onComplete: () => {
      audioEngine.playStarSFX();
      launchConfetti(35);
      showToast('🤝 멋진 호흡이에요! 짝짝짝!');
    },
  });
});

document.getElementById('btnDone').addEventListener('click', () => {
  const deck = getDeck({ mode, chapter, weakIds });
  const card = deck[currentIndex];
  completedIds.add(card.id);
  localStorage.setItem('wooju_done_v1', JSON.stringify([...completedIds]));
  addStars(1);

  if (currentIndex === deck.length - 1) {
    if (mode === 4) audioEngine.playApplauseSFX();
    audioEngine.playFanfareSFX();
    launchConfetti(90);
    showToast('🏆 우와!! 우주 최고야! 끝까지 다 했어요!!');
    render(false);
  } else {
    audioEngine.playStarSFX();
    launchConfetti(40);
    const praises = [
      '⭐ 우주 너무 잘했어요!',
      '🚀 로켓이 한 칸 더 날아갔어요!',
      '👏 멋진 목소리예요! 최고!',
      '🌟 대단해요! 다음 페이지로 슝~',
    ];
    showToast(praises[Math.floor(Math.random() * praises.length)]);
    render(false);
    // Smooth flow: auto-advance to next card after brief celebration
    clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(() => {
      if (currentIndex < getDeck({ mode, chapter, weakIds }).length - 1) {
        currentIndex += 1;
        render();
      }
    }, 1150);
  }
});

// --- Auto Whole Story (🎵 통으로 듣기) ---
document.getElementById('btnAutoStory').addEventListener('click', () => {
  const btn = document.getElementById('btnAutoStory');
  if (autoStoryMode) { stopAllPlayback(); return; }
  switchMode(1, 0);
  autoStoryMode = true;
  btn.classList.add('playing-all');
  btn.textContent = '⏹️ 멈추기';
  showToast('🎬 자동 줌인 동화가 시작됩니다!');

  const startAuto = () => {
    storyAudio.playbackRate = 1.0;
    storyAudio.currentTime = 1.0;
    storyAudio.play().catch(() => {});
    setPlayingVisual(true);
    autoStoryTimer = setInterval(() => {
      const t = storyAudio.currentTime;
      for (let i = BASE_CARDS.length - 1; i >= 0; i--) {
        if (t >= BASE_CARDS[i].start - 0.15) {
          if (currentIndex !== i) {
            currentIndex = i;
            render(false);
            setPlayingVisual(true);
          }
          break;
        }
      }
      if (storyAudio.ended || t >= 170) {
        stopAllPlayback();
        audioEngine.playFanfareSFX();
        launchConfetti(60);
        showToast('🌙 이야기 끝! 우주 잘 들었어요!');
      }
    }, 120);
  };

  if (storyAudio.readyState >= 1) startAuto();
  else {
    storyAudio.load();
    storyAudio.addEventListener('loadedmetadata', () => {
      if (autoStoryMode) startAuto();
    }, { once: true });
  }
});

// --- Navigation & Tabs ---
document.getElementById('btnPrev').addEventListener('click', () => {
  if (currentIndex > 0) { currentIndex--; render(); }
});
document.getElementById('btnNext').addEventListener('click', () => {
  if (currentIndex < getDeck({ mode, chapter, weakIds }).length - 1) { currentIndex++; render(); }
});
document.getElementById('dotStrip').addEventListener('click', (e) => {
  const dot = e.target.closest('.dot');
  if (!dot) return;
  currentIndex = parseInt(dot.dataset.idx, 10);
  render();
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => switchMode(parseInt(btn.dataset.mode, 10)));
});
document.querySelectorAll('.chap-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.chap-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    chapter = parseInt(pill.dataset.chap, 10);
    currentIndex = 0;
    render();
  });
});

// --- Child Voice Recording & A/B Compare ---
const btnRec = document.getElementById('btnRec');
btnRec.addEventListener('click', async () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  if (isRecordingChild && mediaRecorder) { mediaRecorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    showToast('이 환경에서는 마이크 녹음이 지원되지 않아요.');
    return;
  }
  try {
    stopAllPlayback();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/mp4' });
      if (childRecUrls[card.id]) URL.revokeObjectURL(childRecUrls[card.id]);
      childRecUrls[card.id] = URL.createObjectURL(blob);
      isRecordingChild = false;
      btnRec.classList.remove('recording');
      btnRec.textContent = '🎙️ 다시 녹음';
      document.getElementById('btnPlayRec').disabled = false;
      showToast('🎙️ 녹음 완료! 원어민과 비교해서 들어보세요!');
      new Audio(childRecUrls[card.id]).play().catch(() => {});
    };
    mediaRecorder.start();
    isRecordingChild = true;
    btnRec.classList.add('recording');
    btnRec.textContent = '⏹️ 녹음 멈추기';
    showToast('🔴 지금 영어로 크게 말해보세요!');
  } catch (_) {
    showToast('마이크 권한을 허용해 주세요!');
  }
});

document.getElementById('btnPlayRec').addEventListener('click', () => {
  const card = getDeck({ mode, chapter, weakIds })[currentIndex];
  if (!childRecUrls[card.id]) return;
  audioEngine.playABCompare(card, childRecUrls[card.id], { onToast: showToast });
});

// --- Mode 4 One-Take Full Rehearsal Recorder ---
const btnRehRec = document.getElementById('btnRehearsalRec');
const btnRehPlay = document.getElementById('btnRehearsalPlay');
const btnRehShare = document.getElementById('btnRehearsalShare');

btnRehRec.addEventListener('click', async () => {
  if (!isRecordingRehearsal) {
    const ok = await audioEngine.startFullRehearsalRec();
    if (!ok) return;
    isRecordingRehearsal = true;
    btnRehRec.classList.add('recording');
    btnRehRec.textContent = '⏹️ 통녹음 끝내기';
    showToast('🔴 1번부터 끝인사까지 원테이크 녹음 시작!');
  } else {
    const res = await audioEngine.stopFullRehearsalRec();
    isRecordingRehearsal = false;
    btnRehRec.classList.remove('recording');
    btnRehRec.textContent = '🔴 다시 통녹음';
    if (res && res.url) {
      latestRehearsal = res;
      btnRehPlay.style.display = 'inline-block';
      btnRehShare.style.display = 'inline-block';
      audioEngine.playApplauseSFX();
      launchConfetti(60);
      showToast('🎉 발표회 통녹음 완료! 바로 들어보세요!');
    }
  }
});

btnRehPlay.addEventListener('click', () => {
  if (!latestRehearsal?.url) return;
  stopAllPlayback();
  const a = new Audio(latestRehearsal.url);
  audioEngine.activeCustomAudio = a;
  a.play().catch(() => {});
  showToast('▶️ 우주의 발표회 통녹음 재생 중!');
});

btnRehShare.addEventListener('click', async () => {
  if (!latestRehearsal?.blob) return;
  const ext = (latestRehearsal.mimeType || '').includes('webm') ? 'webm' : 'm4a';
  const file = new File([latestRehearsal.blob], `wooju_dancing_pig_rehearsal.${ext}`, { type: latestRehearsal.mimeType || 'audio/mp4' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: '우주의 영어 발표회 - The Dancing Pig', files: [file] });
      return;
    } catch (_) {}
  }
  const a = document.createElement('a');
  a.href = latestRehearsal.url;
  a.download = file.name;
  a.click();
  showToast('💾 발표회 녹음 파일을 저장했어요!');
});

// Keyboard shortcuts (desktop)
window.addEventListener('keydown', (e) => {
  if (mode === 0 || document.querySelector('.modal-backdrop.open')) return;
  if (e.key === 'ArrowRight') document.getElementById('btnNext').click();
  if (e.key === 'ArrowLeft') document.getElementById('btnPrev').click();
  if (e.key === ' ') { e.preventDefault(); document.getElementById('btnPlay').click(); }
});

// --- Modals ---
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  if (id === 'parentModal' && parentRecorder && parentRecorder.state === 'recording') {
    try { parentRecorder.stop(); } catch (_) {}
  }
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(bg => {
  bg.addEventListener('click', (e) => {
    if (e.target === bg) {
      if (bg.id === 'quizModal') quizController.close();
      else closeModal(bg.id);
    }
  });
});

// --- 14-Day Stamp Board ---
const STAMP_ICONS = ['🚀', '🌟', '🪐', '🐷', '🌈', '🎵', '🏆', '🛸', '🌙', '💫', '🎉', '👑', '🔥', '🥇'];
function renderStamps() {
  document.getElementById('stampGrid').innerHTML = Array.from({ length: 14 }, (_, i) => {
    const day = i + 1, stamped = !!stamps[day];
    return `<div class="stamp-cell ${stamped ? 'stamped' : ''}" data-day="${day}"><div class="stamp-day">${day}일차</div><div class="stamp-ico">${stamped ? STAMP_ICONS[i] : '⬜'}</div></div>`;
  }).join('');
}
document.getElementById('openCalendarBtn').addEventListener('click', () => { renderStamps(); openModal('calendarModal'); });
document.getElementById('stampGrid').addEventListener('click', (e) => {
  const cell = e.target.closest('.stamp-cell');
  if (!cell) return;
  const day = cell.dataset.day;
  stamps[day] = !stamps[day];
  localStorage.setItem('wooju_stamps_v1', JSON.stringify(stamps));
  if (stamps[day]) { audioEngine.playStarSFX(); launchConfetti(35); showToast(`🎉 ${day}일차 도장 쾅!! 우주 최고!`); }
  renderStamps();
  renderMissionBanner();
});

// --- Parent Studio Modal (includes REHEARSAL_OUTRO, NO REHEARSAL_INTRO) ---
function renderParentList() {
  const list = [...BASE_CARDS, REHEARSAL_OUTRO];
  document.getElementById('parentVoiceList').innerHTML = list.map(c => {
    const hasVoice = !!parentVoiceUrls[c.id];
    const isRec = parentRecCardId === c.id;
    const label = c.id === 99 ? '끝인사' : `${c.id}.`;
    return `
      <div class="parent-row">
        <div class="parent-row-text">${label} ${c.en}</div>
        <button class="mini-btn rec ${isRec ? 'recording' : ''}" data-prec="${c.id}">
          ${isRec ? '⏹️ 중지' : (hasVoice ? '🎙️ 재녹음' : '🎙️ 녹음')}
        </button>
        ${hasVoice ? `<button class="mini-btn" data-pplay="${c.id}">▶️</button>
                      <button class="mini-btn del" data-pdel="${c.id}">🗑️</button>` : ''}
      </div>
    `;
  }).join('');
}

document.getElementById('openParentBtn').addEventListener('click', () => { renderParentList(); openModal('parentModal'); });
document.getElementById('parentVoiceList').addEventListener('click', async (e) => {
  const recBtn = e.target.closest('[data-prec]');
  const playBtn = e.target.closest('[data-pplay]');
  const delBtn = e.target.closest('[data-pdel]');
  if (playBtn) {
    stopAllPlayback();
    audioEngine.playUrl(parentVoiceUrls[parseInt(playBtn.dataset.pplay, 10)]);
    return;
  }
  if (delBtn) {
    await deleteParentVoice(parseInt(delBtn.dataset.pdel, 10));
    renderParentList();
    showToast('기본 원어민 음성으로 되돌렸어요.');
    return;
  }
  if (recBtn) {
    const id = parseInt(recBtn.dataset.prec, 10);
    if (parentRecorder && parentRecCardId === id) { parentRecorder.stop(); return; }
    if (parentRecorder && parentRecorder.state === 'recording') parentRecorder.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const rec = new MediaRecorder(stream);
      parentRecCardId = id;
      parentRecorder = rec;
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/mp4' });
        await saveParentVoice(id, blob);
        if (parentRecorder === rec) {
          parentRecCardId = null;
          parentRecorder = null;
        }
        renderParentList();
        showToast(`✅ ${id === 99 ? '끝인사' : `${id}번 문장`} 목소리가 저장되었어요!`);
      };
      rec.start();
      renderParentList();
      showToast(`🔴 ${id === 99 ? '끝인사를' : `${id}번 문장을`} 읽어주세요!`);
    } catch (_) {
      showToast('마이크 권한을 허용해 주세요!');
    }
  }
});

// Parent settings toggles
document.getElementById('toggleScriptBtn').addEventListener('click', (e) => {
  showParentScript = !showParentScript;
  e.target.textContent = `📝 부모님 대본 표시: ${showParentScript ? '켜짐' : '꺼짐'}`;
  if (mode !== 0) render(false);
});
document.getElementById('toggleGestureBtn').addEventListener('click', (e) => {
  showGesture = !showGesture;
  e.target.textContent = `🤸 몸짓 놀이 표시: ${showGesture ? '켜짐' : '꺼짐'}`;
  if (mode !== 0) render(false);
});
document.getElementById('toggleKoIconsBtn').addEventListener('click', (e) => {
  hideKoIconsInPractice = !hideKoIconsInPractice;
  e.target.textContent = `🔤 2·3단계 그림 한글 숨김: ${hideKoIconsInPractice ? '켜짐' : '꺼짐'}`;
  if (mode !== 0) render(false);
});
document.getElementById('toggleAutoRecBtn').addEventListener('click', (e) => {
  autoRecordInParrot = !autoRecordInParrot;
  e.target.textContent = `🦜 앵무새 자동 녹음: ${autoRecordInParrot ? '켜짐' : '꺼짐'}`;
});
document.getElementById('resetWeakBtn').addEventListener('click', () => {
  weakIds.clear();
  localStorage.removeItem('wooju_weak_v1');
  updateWeakPill();
  if (mode !== 0) render(false);
  showToast('집중 연습 목록을 비웠어요!');
});
document.getElementById('resetProgressBtn').addEventListener('click', () => {
  if (!confirm('우주의 별과 완료 표시를 초기화할까요?')) return;
  completedIds.clear(); totalStars = 0;
  localStorage.removeItem('wooju_done_v1'); localStorage.removeItem('wooju_stars_v1');
  document.getElementById('starCount').textContent = '0';
  if (mode !== 0) render(false);
  showToast('진도를 초기화했어요!');
});
document.getElementById('pigImgUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    SCENES.scene7 = reader.result;
    try { localStorage.setItem('wooju_pig_img_v1', reader.result); } catch (_) {}
    if (mode !== 0) render(false);
    showToast('🐷 돼지 장면 이미지가 적용되었어요!');
  };
  reader.readAsDataURL(file);
});

// --- Boot ---
initDB().then(() => {
  document.getElementById('starCount').textContent = totalStars;
  renderMissionBanner();
  updateWeakPill();
  switchMode(0);
});
