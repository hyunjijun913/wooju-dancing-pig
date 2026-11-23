// Interactive mini-games: Story Sequencing Quiz & Listening Comprehension ("귀 쫑긋! 찾기 놀이")
import { FARM_SPOTS, BASE_CARDS, buildSequenceQuestion, buildListenQuestion } from './data.js';

function getPortraitForCard(card) {
  const spot = FARM_SPOTS.find(s => s.cardIds.includes(card.id));
  return spot ? spot.portrait : 'assets/char_pig.png';
}

function getLabelForCard(card) {
  const spot = FARM_SPOTS.find(s => s.cardIds.includes(card.id));
  if (!spot) return card.speaker;
  return `${spot.emoji} ${spot.name} (${spot.itemEmoji})`;
}

export class QuizController {
  constructor(modalEl, { audioEngine, onRewardStar = () => {}, onConfetti = () => {}, onToast = () => {} } = {}) {
    this.modalEl = modalEl;
    this.audio = audioEngine;
    this.onRewardStar = onRewardStar;
    this.onConfetti = onConfetti;
    this.onToast = onToast;

    this.titleEl = modalEl.querySelector('#quizTitle');
    this.bodyEl = modalEl.querySelector('#quizBody');
    this.activeType = null;
    this.round = 0;
    this.totalRounds = 5;
    this.score = 0;
    this.sequenceIndices = [];
    this.nextRoundTimer = null;
    this.roundLocked = false;
  }

  open() {
    this.modalEl.classList.add('open');
  }

  close() {
    clearTimeout(this.nextRoundTimer);
    this.nextRoundTimer = null;
    this.roundLocked = false;
    this.audio.stopAll();
    this.modalEl.classList.remove('open');
  }

  openSequenceQuiz() {
    clearTimeout(this.nextRoundTimer);
    this.activeType = 'sequence';
    this.round = 0;
    this.score = 0;
    // Focus on the core animal sequence (spots 1..10 -> next is 2..11)
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.sequenceIndices = pool.sort(() => Math.random() - 0.5).slice(0, this.totalRounds);
    this.titleEl.textContent = '🧩 동물 순서 맞추기 퀴즈';
    this.open();
    this._renderSequenceRound();
  }

  _renderSequenceRound() {
    this.roundLocked = false;
    if (this.round >= this.totalRounds) {
      this._renderFinish('🧩 동물 순서 박사 우주!!');
      return;
    }
    const idx = this.sequenceIndices[this.round];
    const q = buildSequenceQuestion(idx);

    this.bodyEl.innerHTML = `
      <div class="quiz-progress">문제 ${this.round + 1} / ${this.totalRounds}</div>
      <div class="quiz-prompt-card">
        <img src="${q.promptSpot.portrait}" alt="${q.promptSpot.name}" class="quiz-prompt-img" />
        <div>
          <div class="quiz-prompt-badge">${q.promptSpot.emoji} ${q.promptSpot.name} (${q.promptSpot.itemEmoji} ${q.promptSpot.itemLabel})</div>
          <div class="quiz-question-text">이 친구 <b>다음에는</b> 누가 나올까요?</div>
        </div>
      </div>
      <div class="quiz-choices">
        ${q.choices.map(c => `
          <button class="quiz-choice-btn" data-choice-id="${c.id}">
            <img src="${c.portrait}" alt="${c.name}" />
            <span class="quiz-choice-name">${c.emoji} ${c.name}</span>
            <span class="quiz-choice-item">${c.itemEmoji} ${c.itemLabel}</span>
          </button>
        `).join('')}
      </div>
    `;

    this.bodyEl.querySelectorAll('.quiz-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.roundLocked) return;
        const picked = btn.dataset.choiceId;
        if (picked === q.correctSpot.id) {
          this.roundLocked = true;
          btn.classList.add('correct');
          this.score += 1;
          this.audio.playStarSFX();
          this.onConfetti(35);
          this.onRewardStar(1);
          this.onToast(`🎉 정답! 다음은 ${q.correctSpot.emoji} ${q.correctSpot.name}!`);
          const firstCard = BASE_CARDS.find(c => c.id === q.correctSpot.cardIds[0]);
          if (firstCard) this.audio.playSegment(firstCard.start, firstCard.end);
          this.nextRoundTimer = setTimeout(() => {
            this.round += 1;
            this._renderSequenceRound();
          }, 1250);
        } else {
          btn.classList.add('wrong');
          this.onToast('💡 힌트: 농장 산책로에서 바로 옆에 있던 친구예요!');
          setTimeout(() => btn.classList.remove('wrong'), 500);
        }
      });
    });
  }

  openListenQuiz() {
    clearTimeout(this.nextRoundTimer);
    this.activeType = 'listen';
    this.round = 0;
    this.score = 0;
    this.titleEl.textContent = '👂 귀 쫑긋! 찾기 놀이';
    this.open();
    this._renderListenRound();
  }

  _renderListenRound() {
    this.roundLocked = false;
    if (this.round >= this.totalRounds) {
      this._renderFinish('👂 영어 귀가 번쩍! 우주 최고!!');
      return;
    }
    const pool = BASE_CARDS.filter(c => c.id >= 4 && c.id <= 22);
    const q = buildListenQuestion(pool);

    this.bodyEl.innerHTML = `
      <div class="quiz-progress">문제 ${this.round + 1} / ${this.totalRounds}</div>
      <div class="quiz-listen-box">
        <button class="big-btn btn-listen" id="quizReplayBtn">🔊 원어민 소리 다시 듣기</button>
        <div class="quiz-question-text" style="margin-top:8px;">소리를 잘 듣고 맞는 친구를 톡! 눌러보세요!</div>
      </div>
      <div class="quiz-choices">
        ${q.choices.map(c => `
          <button class="quiz-choice-btn" data-card-id="${c.id}">
            <img src="${getPortraitForCard(c)}" alt="${c.speaker}" />
            <span class="quiz-choice-name">${getLabelForCard(c)}</span>
          </button>
        `).join('')}
      </div>
    `;

    const playTarget = () => this.audio.playSegment(q.targetCard.start, q.targetCard.end);
    this.bodyEl.querySelector('#quizReplayBtn').addEventListener('click', playTarget);
    playTarget();

    this.bodyEl.querySelectorAll('.quiz-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.roundLocked) return;
        const pickedId = parseInt(btn.dataset.cardId, 10);
        if (pickedId === q.targetCard.id) {
          this.roundLocked = true;
          btn.classList.add('correct');
          this.score += 1;
          this.audio.playStarSFX();
          this.onConfetti(35);
          this.onRewardStar(1);
          this.onToast('🌟 딩동댕! 귀가 정말 밝아요!');
          this.nextRoundTimer = setTimeout(() => {
            this.round += 1;
            this._renderListenRound();
          }, 950);
        } else {
          btn.classList.add('wrong');
          this.onToast('👂 한 번 더 잘 들어볼까요?');
          playTarget();
          setTimeout(() => btn.classList.remove('wrong'), 500);
        }
      });
    });
  }

  _renderFinish(headline) {
    this.audio.stopAll();
    this.audio.playFanfareSFX();
    this.onConfetti(75);
    this.bodyEl.innerHTML = `
      <div class="quiz-finish">
        <div style="font-size:60px;">🏆✨</div>
        <h3>${headline}</h3>
        <p>${this.totalRounds}문제 중 <b>${this.score}개</b>를 맞혀서 별 ${this.score}개를 받았어요!</p>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:16px;">
          <button class="big-btn btn-listen" id="quizAgainBtn">🔄 한 번 더 하기</button>
          <button class="big-btn btn-star" style="grid-column:auto;" id="quizDoneBtn">✅ 학습으로 돌아가기</button>
        </div>
      </div>
    `;
    this.bodyEl.querySelector('#quizAgainBtn').addEventListener('click', () => {
      if (this.activeType === 'sequence') this.openSequenceQuiz();
      else this.openListenQuiz();
    });
    this.bodyEl.querySelector('#quizDoneBtn').addEventListener('click', () => this.close());
  }
}
