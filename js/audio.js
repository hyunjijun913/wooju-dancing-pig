// Unified audio playback, chunking, duet, 1s hint, loudness meter, SFX & recording engine
import { computeEchoWaitMs } from './data.js';

/**
 * Determines which audio source to use for a given card and feature.
 * Chunking, Duet, and Mode 0 (3D Farm) always use native story.m4a for exact timestamps.
 * Full play, 3x echo, 1s hint, and REHEARSAL_OUTRO prefer parentVoiceUrls when present.
 */
export function resolveAudioSource(card, { mode = 1, feature = 'full', parentVoiceUrls = {} } = {}) {
  const hasNative = typeof card?.start === 'number' && typeof card?.end === 'number';
  const hasParent = Boolean(card && parentVoiceUrls && parentVoiceUrls[card.id]);

  if (feature === 'chunk' || feature === 'duet' || mode === 0) {
    return hasNative ? 'native' : (hasParent ? 'parent' : 'tts');
  }
  if (hasParent) return 'parent';
  if (hasNative) return 'native';
  return 'tts';
}

export class AudioEngine {
  constructor(storyAudioEl, {
    getParentVoiceUrls = () => ({}),
    onVisualChange = () => {},
    onToast = () => {},
    onRehearsalAborted = () => {},
  } = {}) {
    this.storyAudio = storyAudioEl;
    this.getParentVoiceUrls = getParentVoiceUrls;
    this.onVisualChange = onVisualChange;
    this.onToast = onToast;
    this.onRehearsalAborted = onRehearsalAborted;

    this.audioCtx = null;
    this.unlocked = false;
    this.segmentTimer = null;
    this.echoTimer = null;
    this.echoDoneCb = null;
    this.customAudioEl = typeof Audio !== 'undefined' ? new Audio() : null;
    if (this.customAudioEl) this.customAudioEl.playsInline = true;
    this.wordAudioEl = typeof Audio !== 'undefined' ? new Audio() : null;
    if (this.wordAudioEl) this.wordAudioEl.playsInline = true;
    this.activeCustomAudio = null;
    this.preferredVoice = null;
    this.playToken = 0;

    // Single shared mic stream for echo loudness meter + auto-record
    this.echoMicStream = null;
    this.micAnalyser = null;
    this.micSourceNode = null;
    this.micRaf = null;
    this.autoRec = null;

    // Sustained-speech magic voice gauge (3D Farm RPG)
    this.gaugeStream = null;
    this.gaugeSource = null;
    this.gaugeAnalyser = null;
    this.gaugeRaf = null;
    this.gaugeToken = 0;

    // Live Speech-to-Text word-lighting recognizer (v6)
    this.speechRec = null;
    this.speechActive = false;

    // Cozy Animal Crossing-style procedural marimba BGM & auto-ducking (v9)
    this.bgmEnabled = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmDucked = false;
    this.lastStepSfxAt = 0;

    // Full Mode 4 one-take presentation recorder
    this.rehearsalRec = null;
    this.rehearsalStream = null;
    this.rehearsalChunks = [];
    this.rehearsalUrl = null;
    this.rehearsalBlob = null;
    this._rehearsalStopResolver = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this._loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
    }
  }

  /**
   * Call synchronously inside a user pointer/click gesture to unlock iOS Safari AudioContext & HTMLAudioElements.
   */
  unlock() {
    this.getAudioCtx();
    if (this.unlocked) return;
    this.unlocked = true;
    // Prime storyAudio silently if idle
    if (this.storyAudio && this.storyAudio.paused && this.storyAudio.readyState === 0) {
      try { this.storyAudio.load(); } catch (_) {}
    }
    if (this.customAudioEl && !this.customAudioEl.src) {
      // Silent 1-frame WAV data URI unlocks reusable audio elements on iOS Safari
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.customAudioEl.src = silentWav;
      this.customAudioEl.play().then(() => { this.customAudioEl.pause(); }).catch(() => {});
      if (this.wordAudioEl && !this.wordAudioEl.src) {
        this.wordAudioEl.src = silentWav;
        this.wordAudioEl.play().then(() => { this.wordAudioEl.pause(); }).catch(() => {});
      }
    }
  }

  _loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    this.preferredVoice =
      voices.find(v => v.lang === 'en-US' && /Samantha|Aaron|Ava|Google US English/i.test(v.name)) ||
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang.startsWith('en')) ||
      null;
  }

  getAudioCtx() {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!this.audioCtx) this.audioCtx = new Ctx();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // --- Web Audio SFX ---
  playChimeSFX() {
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) return;
      [659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.26);
      });
    } catch (_) {}
  }

  playStarSFX() {
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.16, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.32);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.34);
      });
    } catch (_) {}
  }

  playFanfareSFX() {
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 659.25, 1046.5];
      const times = [0, 0.1, 0.2, 0.32, 0.44];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + times[i]);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + times[i]);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[i] + 0.45);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + times[i]);
        osc.stop(ctx.currentTime + times[i] + 0.46);
      });
    } catch (_) {}
  }

  playApplauseSFX() {
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) return;
      const duration = 1.6;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.sin(Math.min(1, t / 0.15) * Math.PI * 0.5) * Math.max(0, 1 - t / duration);
        const burst = (Math.sin(t * 55) > 0.2 ? 1.0 : 0.45);
        data[i] = (Math.random() * 2 - 1) * 0.22 * env * burst;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.7;
      src.connect(filter);
      filter.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  // --- Core Playback Control ---
  clearEchoTimer() {
    if (this.echoTimer) {
      clearInterval(this.echoTimer);
      this.echoTimer = null;
    }
    this.echoDoneCb = null;
  }

  finishEchoEarly() {
    const cb = this.echoDoneCb;
    this.clearEchoTimer();
    if (cb) cb();
  }

  stopAll({ keepRehearsalRec = false } = {}) {
    this.playToken += 1;
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }
    this.clearEchoTimer();
    this._teardownEchoMic(false, null);
    this.stopVoiceGauge();
    this.stopSpeechMatch();
    this.setBgmDucked(false);
    if (this.storyAudio) this.storyAudio.pause();
    if (this.activeCustomAudio) {
      this.activeCustomAudio.onended = null;
      this.activeCustomAudio.pause();
      this.activeCustomAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.onVisualChange(false);
    if (!keepRehearsalRec && this.rehearsalRec && this.rehearsalRec.state === 'recording') {
      try { this.rehearsalRec.stop(); } catch (_) {}
      this.onRehearsalAborted();
    }
  }

  playUrl(url, { rate = 1.0, maxDurationSec = null, token = this.playToken, onDone = null } = {}) {
    const audio = this.customAudioEl || new Audio();
    audio.onended = null;
    audio.pause();
    audio.src = url;
    audio.playbackRate = rate;
    this.activeCustomAudio = audio;
    this.onVisualChange(true);

    let limitTimer = null;
    const finish = () => {
      if (limitTimer) clearTimeout(limitTimer);
      audio.onended = null;
      if (token !== this.playToken) return;
      this.onVisualChange(false);
      if (this.activeCustomAudio === audio) this.activeCustomAudio = null;
      if (onDone) onDone();
    };

    audio.onended = finish;
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => {
        if (limitTimer) clearTimeout(limitTimer);
        audio.onended = null;
        this.onVisualChange(false);
        this.onToast('화면을 한 번 더 톡! 눌러주세요!');
      });
    }
    if (maxDurationSec) {
      limitTimer = setTimeout(() => {
        audio.pause();
        finish();
      }, Math.round(maxDurationSec * 1000));
    }
  }

  playSegment(startSec, endSec, { rate = 1.0, token = this.playToken, onDone = null } = {}) {
    if (!this.storyAudio) return;
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }

    const startPlayback = () => {
      if (token !== this.playToken) return;
      try {
        this.storyAudio.playbackRate = rate;
        this.storyAudio.currentTime = startSec;
      } catch (_) {}

      let playStarted = false;
      let playBlocked = false;
      const p = this.storyAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          playStarted = true;
        }).catch(() => {
          playBlocked = true;
          clearInterval(this.segmentTimer);
          this.segmentTimer = null;
          this.onVisualChange(false);
          this.onToast('화면을 한 번 더 톡! 눌러주세요!');
        });
      } else {
        playStarted = true;
      }

      this.onVisualChange(true);
      this.segmentTimer = setInterval(() => {
        if (token !== this.playToken || playBlocked) {
          clearInterval(this.segmentTimer);
          this.segmentTimer = null;
          return;
        }
        // Only treat paused as finished AFTER playback actually started (prevents NotAllowedError gate bypass!)
        const reachedEnd = this.storyAudio.currentTime >= endSec || this.storyAudio.ended;
        const pausedAfterStart = playStarted && this.storyAudio.paused;
        if (reachedEnd || pausedAfterStart) {
          this.storyAudio.pause();
          clearInterval(this.segmentTimer);
          this.segmentTimer = null;
          this.onVisualChange(false);
          if (onDone) onDone();
        }
      }, 35);
    };

    if (this.storyAudio.readyState >= 1) {
      startPlayback();
    } else {
      this.storyAudio.load();
      this.storyAudio.addEventListener('loadedmetadata', () => {
        if (token === this.playToken) startPlayback();
      }, { once: true });
    }
  }

  _playSingleSource(card, { mode = 1, feature = 'full', rate = 1.0, maxDurationSec = null, token, onDone }) {
    const parentVoiceUrls = this.getParentVoiceUrls() || {};
    const source = resolveAudioSource(card, { mode, feature, parentVoiceUrls });

    if (source === 'parent') {
      this.playUrl(parentVoiceUrls[card.id], { rate, maxDurationSec, token, onDone });
      return;
    }

    if (source === 'native') {
      const endSec = maxDurationSec ? Math.min(card.end, card.start + maxDurationSec) : card.end;
      this.playSegment(card.start, endSec, { rate, token, onDone });
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance((card.en || '').replace(/[""]/g, ''));
      utter.lang = 'en-US';
      utter.rate = rate < 1 ? 0.78 : 0.94;
      if (this.preferredVoice) utter.voice = this.preferredVoice;
      this.onVisualChange(true);
      utter.onend = () => {
        if (token !== this.playToken) return;
        this.onVisualChange(false);
        if (onDone) onDone();
      };
      window.speechSynthesis.speak(utter);
    } else if (onDone) {
      onDone();
    }
  }

  // Opens ONE shared mic stream for both loudness meter and optional auto-record (avoids dual getUserMedia on iOS Safari)
  async _startEchoMic({ onLevel, autoRecord, onMicDenied, token }) {
    this._teardownEchoMic(false, null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      if (onMicDenied) onMicDenied();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Guard against abort/mode switch while awaiting getUserMedia!
      if (token !== this.playToken) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.echoMicStream = stream;

      if (onLevel) {
        const ctx = this.getAudioCtx();
        if (ctx) {
          this.micSourceNode = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          this.micSourceNode.connect(analyser);
          this.micAnalyser = analyser;
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            if (!this.micAnalyser || token !== this.playToken) return;
            this.micAnalyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const level = Math.min(1, Math.sqrt(sum / data.length) * 4.5);
            onLevel(level);
            this.micRaf = requestAnimationFrame(tick);
          };
          this.micRaf = requestAnimationFrame(tick);
        }
      }

      if (autoRecord && typeof MediaRecorder !== 'undefined') {
        const localChunks = [];
        const rec = new MediaRecorder(stream);
        rec._localChunks = localChunks;
        rec.ondataavailable = (e) => { if (e.data.size > 0) localChunks.push(e.data); };
        rec.start();
        this.autoRec = rec;
      }
    } catch (_) {
      if (onMicDenied) onMicDenied();
    }
  }

  _teardownEchoMic(emit = false, onBlob = null) {
    if (this.micRaf) {
      cancelAnimationFrame(this.micRaf);
      this.micRaf = null;
    }
    if (this.micSourceNode) {
      try { this.micSourceNode.disconnect(); } catch (_) {}
      this.micSourceNode = null;
    }
    this.micAnalyser = null;

    const rec = this.autoRec;
    const stream = this.echoMicStream;
    this.autoRec = null;
    this.echoMicStream = null;

    if (rec && rec.state !== 'inactive') {
      const chunks = rec._localChunks || [];
      rec.onstop = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (emit && onBlob && chunks.length > 0) {
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/mp4' });
          onBlob(blob);
        }
      };
      try { rec.stop(); } catch (_) {
        if (stream) stream.getTracks().forEach(t => t.stop());
      }
    } else if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  }

  _runEchoTurn({
    durationSec,
    label,
    subText = '',
    autoRecord = false,
    onAutoRecordBlob = null,
    onEchoStart,
    onEchoTick,
    onEchoEnd,
    onLevel,
    onMicDenied,
    token,
    onFinished,
  }) {
    if (token !== this.playToken) return;
    this.playChimeSFX();
    const waitMs = computeEchoWaitMs(durationSec);
    if (onEchoStart) onEchoStart({ label, subText, waitMs });

    if (onLevel || autoRecord) {
      this._startEchoMic({ onLevel, autoRecord, onMicDenied, token });
    }

    const startTs = Date.now();
    const complete = () => {
      if (token !== this.playToken) return;
      this.clearEchoTimer();
      this._teardownEchoMic(autoRecord, onAutoRecordBlob);
      if (onEchoEnd) onEchoEnd();
      if (onFinished) onFinished();
    };

    this.echoDoneCb = complete;
    this.echoTimer = setInterval(() => {
      if (token !== this.playToken) {
        this.clearEchoTimer();
        return;
      }
      const elapsed = Date.now() - startTs;
      const pct = Math.max(0, 100 - (elapsed / waitMs) * 100);
      if (onEchoTick) onEchoTick(pct);
      if (elapsed >= waitMs) {
        complete();
      }
    }, 60);
  }

  playCard(card, {
    mode = 1,
    slow = false,
    triggerEcho = false,
    loopCount = 0,
    autoRecord = false,
    onAutoRecordBlob = null,
    onEchoStart = null,
    onEchoTick = null,
    onEchoEnd = null,
    onLevel = null,
    onMicDenied = null,
    onLoopComplete = null,
  } = {}) {
    this.unlock();
    this.stopAll({ keepRehearsalRec: mode === 4 });
    const token = this.playToken;
    const rate = slow ? 0.8 : 1.0;
    const feature = loopCount > 0 ? 'echo3' : 'full';
    const totalLoops = loopCount > 0 ? loopCount : 1;

    const runIteration = (iter) => {
      if (token !== this.playToken) return;
      this._playSingleSource(card, {
        mode,
        feature,
        rate,
        token,
        onDone: () => {
          if (token !== this.playToken) return;
          if (triggerEcho || mode === 2 || loopCount > 0) {
            const roundLabel = loopCount > 0 ? ` (${iter}/${totalLoops})` : '';
            const dur = typeof card.start === 'number' && typeof card.end === 'number' ? (card.end - card.start) : 3;
            this._runEchoTurn({
              durationSec: dur,
              label: `🦜 이제 우주 차례! 따라 말해요!${roundLabel}`,
              autoRecord: autoRecord && iter === totalLoops,
              onAutoRecordBlob,
              onEchoStart,
              onEchoTick,
              onEchoEnd,
              onLevel,
              onMicDenied,
              token,
              onFinished: () => {
                if (token !== this.playToken) return;
                if (iter < totalLoops) {
                  runIteration(iter + 1);
                } else if (loopCount > 0 && onLoopComplete) {
                  onLoopComplete();
                }
              },
            });
          }
        },
      });
    };

    runIteration(1);
  }

  playChunked(card, { onEchoStart, onEchoTick, onEchoEnd, onLevel, onMicDenied, onComplete } = {}) {
    this.unlock();
    if (!card.chunks || card.chunks.length < 2) {
      this.playCard(card, { mode: 2, triggerEcho: true, onEchoStart, onEchoTick, onEchoEnd, onLevel, onMicDenied });
      return;
    }
    this.stopAll();
    const token = this.playToken;
    const steps = [
      { start: card.chunks[0].start, end: card.chunks[0].end, label: '✂️ 1조각 따라 말해요!', sub: card.chunks[0].en },
      { start: card.chunks[1].start, end: card.chunks[1].end, label: '✂️ 2조각 따라 말해요!', sub: card.chunks[1].en },
      { start: card.start, end: card.end, label: '🌟 이제 합쳐서 전체 말하기!', sub: card.en },
    ];

    const runStep = (idx) => {
      if (token !== this.playToken) return;
      const st = steps[idx];
      this.playSegment(st.start, st.end, {
        rate: 0.95,
        token,
        onDone: () => {
          if (token !== this.playToken) return;
          this._runEchoTurn({
            durationSec: st.end - st.start,
            label: st.label,
            subText: st.sub,
            onEchoStart,
            onEchoTick,
            onEchoEnd,
            onLevel,
            onMicDenied,
            token,
            onFinished: () => {
              if (token !== this.playToken) return;
              if (idx + 1 < steps.length) runStep(idx + 1);
              else if (onComplete) onComplete();
            },
          });
        },
      });
    };
    runStep(0);
  }

  playDuet(card, { onEchoStart, onEchoTick, onEchoEnd, onLevel, onMicDenied, onComplete } = {}) {
    this.unlock();
    if (!card.chunks || card.chunks.length < 2) {
      this.playCard(card, { mode: 2, triggerEcho: true, onEchoStart, onEchoTick, onEchoEnd, onLevel, onMicDenied });
      return;
    }
    this.stopAll();
    const token = this.playToken;
    const first = card.chunks[0];
    const second = card.chunks[1];

    this.playSegment(first.start, first.end, {
      rate: 0.95,
      token,
      onDone: () => {
        if (token !== this.playToken) return;
        this._runEchoTurn({
          durationSec: second.end - second.start,
          label: '🤝 주고받기! 우주가 이어 말해요!',
          subText: `👉 ${second.en}`,
          onEchoStart,
          onEchoTick,
          onEchoEnd,
          onLevel,
          onMicDenied,
          token,
          onFinished: () => {
            if (token !== this.playToken) return;
            if (onComplete) onComplete();
          },
        });
      },
    });
  }

  playHint1s(card, { mode = 3 } = {}) {
    this.unlock();
    this.stopAll({ keepRehearsalRec: mode === 4 });
    const token = this.playToken;
    this._playSingleSource(card, {
      mode,
      feature: 'hint1s',
      rate: 1.0,
      maxDurationSec: 1.05,
      token,
      onDone: () => {},
    });
  }

  playSegmentSequence(cards, { onCardStart = null, onAllDone = null } = {}) {
    this.unlock();
    this.stopAll();
    const token = this.playToken;
    const playAt = (i) => {
      if (token !== this.playToken) return;
      if (i >= cards.length) {
        if (onAllDone) onAllDone();
        return;
      }
      const c = cards[i];
      if (onCardStart) onCardStart(c, i);
      this.playSegment(c.start, c.end, {
        rate: 1.0,
        token,
        onDone: () => {
          if (token !== this.playToken) return;
          setTimeout(() => playAt(i + 1), 220);
        },
      });
    };
    playAt(0);
  }

  playABCompare(card, childUrl, { onToast = this.onToast } = {}) {
    if (!childUrl) return;
    this.unlock();
    this.stopAll();
    const token = this.playToken;
    if (onToast) onToast('🔊 먼저 원어민 목소리!');
    this._playSingleSource(card, {
      mode: 2,
      feature: 'full',
      rate: 1.0,
      token,
      onDone: () => {
        if (token !== this.playToken) return;
        setTimeout(() => {
          if (token !== this.playToken) return;
          if (onToast) onToast('🎙️ 이제 우주 목소리!');
          this.playUrl(childUrl, { rate: 1.0, token });
        }, 350);
      },
    });
  }

  // --- Sustained-Speech Magic Voice Gauge (3D Farm RPG) ---
  async startVoiceGauge({
    onLevel = () => {},
    onProgress = () => {},
    onFilled = () => {},
    onMicDenied = () => {},
    targetSpeechSec = 1.0,
  } = {}) {
    this.stopVoiceGauge();
    const gToken = ++this.gaugeToken;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onMicDenied();
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (gToken !== this.gaugeToken) {
        stream.getTracks().forEach(t => t.stop());
        return false;
      }
      this.gaugeStream = stream;
      const ctx = this.getAudioCtx();
      if (!ctx) {
        onMicDenied();
        return false;
      }
      this.gaugeSource = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      this.gaugeSource.connect(analyser);
      this.gaugeAnalyser = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      let spokenSec = 0;
      let filled = false;
      let lastTs = performance.now();

      const tick = (now) => {
        if (!this.gaugeAnalyser || gToken !== this.gaugeToken) return;
        const dt = Math.min(0.1, Math.max(0, (now - lastTs) / 1000));
        lastTs = now;
        this.gaugeAnalyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(1, rms * 5.0);
        onLevel(level);

        // Require sustained speech energy (prevents single-frame scream bypass)
        if (level > 0.14 && !filled) {
          spokenSec += dt;
          const pct = Math.min(100, Math.round((spokenSec / targetSpeechSec) * 100));
          onProgress(pct);
          if (spokenSec >= targetSpeechSec) {
            filled = true;
            this.playChimeSFX();
            onFilled();
          }
        }
        this.gaugeRaf = requestAnimationFrame(tick);
      };
      this.gaugeRaf = requestAnimationFrame(tick);
      return true;
    } catch (_) {
      onMicDenied();
      return false;
    }
  }

  stopVoiceGauge() {
    this.gaugeToken += 1;
    if (this.gaugeRaf) {
      cancelAnimationFrame(this.gaugeRaf);
      this.gaugeRaf = null;
    }
    if (this.gaugeSource) {
      try { this.gaugeSource.disconnect(); } catch (_) {}
      this.gaugeSource = null;
    }
    this.gaugeAnalyser = null;
    if (this.gaugeStream) {
      this.gaugeStream.getTracks().forEach(t => t.stop());
      this.gaugeStream = null;
    }
  }

  // --- v8.4: Studio Neural Individual Word MP3 Playback (clean, warm, zero seek-clip!) ---
  speakSingleWord(word) {
    const norm = String(word || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm && this.wordAudioEl) {
      this.unlock();
      try {
        this.wordAudioEl.pause();
        this.wordAudioEl.src = `assets/words/${norm}.mp3`;
        this.wordAudioEl.currentTime = 0;
        const p = this.wordAudioEl.play();
        if (p && p.catch) {
          p.catch(() => this._fallbackSpeakWordTTS(word));
        }
        return;
      } catch (_) {}
    }
    this._fallbackSpeakWordTTS(word);
  }

  _fallbackSpeakWordTTS(word) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const clean = String(word || '').replace(/[^a-zA-Z0-9'\- ]/g, '').trim();
    if (!clean) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'en-US';
      utter.rate = 0.84;
      if (this.preferredVoice) utter.voice = this.preferredVoice;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }

  supportsSpeechRecognition() {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  startSpeechMatch({ onTranscript = () => {}, onUnsupported = () => {}, onError = () => {} } = {}) {
    this.stopSpeechMatch();
    if (!this.supportsSpeechRecognition()) {
      onUnsupported();
      return false;
    }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 3;

      let committed = '';
      this.speechRec = rec;
      this.speechActive = true;

      rec.onresult = (event) => {
        if (this.speechRec !== rec) return;
        let interim = '';
        let altBag = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const primary = res[0]?.transcript || '';
          for (let a = 0; a < res.length; a++) {
            altBag += ' ' + (res[a]?.transcript || '');
          }
          if (res.isFinal) committed += ' ' + primary;
          else interim += ' ' + primary;
        }
        onTranscript((committed + ' ' + interim + ' ' + altBag).trim());
      };

      rec.onerror = (e) => {
        if (this.speechRec !== rec) return;
        const code = e?.error || 'unknown';
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          this.stopSpeechMatch();
          onError(code);
        }
      };

      rec.onend = () => {
        // Auto-restart while dialogue is still waiting for Wooju to finish speaking
        if (this.speechRec === rec && this.speechActive) {
          try { rec.start(); } catch (_) {}
        }
      };

      rec.start();
      return true;
    } catch (_) {
      this.stopSpeechMatch();
      onUnsupported();
      return false;
    }
  }

  stopSpeechMatch() {
    this.speechActive = false;
    const rec = this.speechRec;
    this.speechRec = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.stop(); } catch (_) {}
    }
  }

  // --- v9: Cozy Animal Crossing Marimba BGM + Auto-Ducking + Footstep/Door/Pop SFX ---
  setBgmDucked(ducked) {
    this.bgmDucked = Boolean(ducked);
  }

  startBgm() {
    this.unlock();
    if (this.bgmEnabled && this.bgmTimer) return;
    this.bgmEnabled = true;
    // Cheerful, warm C-major pentatonic cozy village melody
    const melody = [
      523.25, 659.25, 783.99, 659.25, 880.00, 783.99, 659.25, 0,
      587.33, 659.25, 783.99, 587.33, 523.25, 0,      392.00, 0,
      523.25, 659.25, 880.00, 1046.5, 880.00, 783.99, 659.25, 587.33,
      523.25, 659.25, 587.33, 392.00, 523.25, 0,      0,      0,
    ];
    const bass = [261.63, 0, 196.00, 0, 220.00, 0, 196.00, 0];

    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled) return;
      const ctx = this.getAudioCtx();
      if (!ctx || ctx.state !== 'running') return;
      // Mute BGM cleanly while native story or speech recognition is active
      if (this.bgmDucked || this.speechActive || (this.storyAudio && !this.storyAudio.paused)) return;

      const idx = this.bgmStep % melody.length;
      const freq = melody[idx];
      const bFreq = bass[this.bgmStep % bass.length];
      this.bgmStep += 1;

      const playTone = (f, type, vol, dur) => {
        if (!f) return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + dur + 0.02);
        } catch (_) {}
      };

      playTone(freq, 'triangle', 0.055, 0.34);
      if (idx % 2 === 0 && bFreq) playTone(bFreq, 'sine', 0.035, 0.42);
    }, 340);
  }

  stopBgm() {
    this.bgmEnabled = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleBgm() {
    if (this.bgmEnabled) {
      this.stopBgm();
      return false;
    }
    this.startBgm();
    return true;
  }

  playStepSFX(indoor = false) {
    const now = performance.now();
    if (now - this.lastStepSfxAt < 240) return;
    this.lastStepSfxAt = now;
    try {
      const ctx = this.getAudioCtx();
      if (!ctx || ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = indoor ? 220 : 155;
      osc.frequency.setValueAtTime(baseFreq + Math.random() * 25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.055);
      gain.gain.setValueAtTime(0.045, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.065);
    } catch (_) {}
  }

  playDoorSFX() {
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) return;
      [392.0, 523.25, 659.25].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.11, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.24);
      });
    } catch (_) {}
  }

  playPopSFX() {
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  }

  // --- Mode 4 One-Take Full Rehearsal Recorder ---
  async startFullRehearsalRec() {
    this.unlock();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.onToast('이 브라우저에서는 마이크 녹음이 지원되지 않아요.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const rec = new MediaRecorder(stream);
      this.rehearsalStream = stream;
      this.rehearsalChunks = chunks;
      this.rehearsalRec = rec;

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        // Always release mic hardware tracks even if aborted by stopAll()
        stream.getTracks().forEach(t => t.stop());
        const mime = rec.mimeType || 'audio/mp4';
        let result = null;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mime });
          if (this.rehearsalUrl) URL.revokeObjectURL(this.rehearsalUrl);
          this.rehearsalBlob = blob;
          this.rehearsalUrl = URL.createObjectURL(blob);
          result = { url: this.rehearsalUrl, blob, mimeType: mime };
        }
        if (this.rehearsalRec === rec) {
          this.rehearsalRec = null;
          this.rehearsalStream = null;
          this.rehearsalChunks = [];
        }
        if (this._rehearsalStopResolver) {
          const r = this._rehearsalStopResolver;
          this._rehearsalStopResolver = null;
          r(result);
        }
      };

      rec.start();
      return true;
    } catch (_) {
      this.onToast('마이크 권한을 허용해 주세요!');
      return false;
    }
  }

  stopFullRehearsalRec() {
    return new Promise((resolve) => {
      const rec = this.rehearsalRec;
      if (!rec || rec.state === 'inactive') {
        resolve(this.rehearsalUrl ? { url: this.rehearsalUrl, blob: this.rehearsalBlob } : null);
        return;
      }
      this._rehearsalStopResolver = resolve;
      try { rec.stop(); } catch (_) {
        this._rehearsalStopResolver = null;
        resolve(null);
      }
    });
  }
}
