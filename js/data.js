// Story cards, chunk timestamps, 3D farm spots, daily missions & pure logic
export const BASE_CARDS = [
  {
    "id": 1,
    "chapter": 1,
    "scene": "scene1",
    "start": 2.7,
    "end": 6.0,
    "cam": {
      "scale": 1.0,
      "ox": 50,
      "oy": 50
    },
    "anim": "bounce",
    "speaker": "📖 이야기 시작!",
    "icons": [
      [
        "🐷",
        "춤추는 돼지"
      ],
      [
        "💃",
        "댄스!"
      ]
    ],
    "en": "The Dancing Pig",
    "ko": "춤추는 돼지 (제목)",
    "gesture": "🐷 양손을 펼치고 신나게 제목 외치기!"
  },
  {
    "id": 2,
    "chapter": 1,
    "scene": "scene1",
    "start": 7.8,
    "end": 10.8,
    "cam": {
      "scale": 1.25,
      "ox": 34,
      "oy": 56
    },
    "anim": "",
    "speaker": "🏡 조용한 농장",
    "icons": [
      [
        "🏡",
        "농장"
      ],
      [
        "🤫",
        "조용해요"
      ]
    ],
    "en": "The farm is quiet.",
    "ko": "농장이 조용해요.",
    "gesture": "🤫 입에 검지 손가락 대고 '쉿!' 하기"
  },
  {
    "id": 3,
    "chapter": 1,
    "scene": "scene1",
    "start": 11.1,
    "end": 14.7,
    "cam": {
      "scale": 1.85,
      "ox": 67,
      "oy": 60
    },
    "anim": "bounce",
    "speaker": "🏚️ 헛간 속 동물들",
    "icons": [
      [
        "🐄🐑🐴",
        "동물들"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🏚️",
        "헛간 안에!"
      ]
    ],
    "en": "The animals are all in the barn.",
    "ko": "동물들이 모두 헛간 안에 있어요.",
    "gesture": "🏠 두 팔로 머리 위에 지붕 모양 만들기"
  },
  {
    "id": 4,
    "chapter": 1,
    "scene": "scene2",
    "start": 18.2,
    "end": 21.9,
    "cam": {
      "scale": 1.6,
      "ox": 28,
      "oy": 66
    },
    "anim": "",
    "speaker": "🐸 개구리가 말해요",
    "icons": [
      [
        "👨‍🌾",
        "농부 아저씨"
      ],
      [
        "😢",
        "슬퍼요"
      ],
      [
        "🐸",
        "개구리"
      ]
    ],
    "en": "\"Farmer Brown is sad,\" said the frog.",
    "ko": "\"브라운 농부 아저씨가 슬퍼요.\" 개구리가 말했어요.",
    "gesture": "😢 슬픈 표정 짓고 🐸 개구리처럼 폴짝!"
  },
  {
    "id": 5,
    "chapter": 1,
    "scene": "scene2",
    "start": 22.0,
    "end": 25.5,
    "cam": {
      "scale": 1.48,
      "ox": 72,
      "oy": 52
    },
    "anim": "bounce",
    "speaker": "🐾 동물 친구들 고민",
    "icons": [
      [
        "🤔",
        "뭘 할까?"
      ],
      [
        "➡️",
        ""
      ],
      [
        "😄",
        "행복하게!"
      ]
    ],
    "en": "\"What can we do to make him happy?\"",
    "ko": "\"아저씨를 행복하게 하려면 뭘 할 수 있을까?\"",
    "gesture": "🤔 턱에 손 대고 고민하다가 활짝 웃기!"
  },
  {
    "id": 6,
    "chapter": 2,
    "scene": "scene3",
    "start": 28.5,
    "end": 31.4,
    "cam": {
      "scale": 1.85,
      "ox": 25,
      "oy": 66
    },
    "anim": "bounce",
    "speaker": "🦉 부엉이가 말해요",
    "icons": [
      [
        "💡",
        "알았어!"
      ],
      [
        "🦉",
        "부엉이"
      ]
    ],
    "en": "\"I know,\" said the owl.",
    "ko": "\"알았어!\" 부엉이가 말했어요.",
    "gesture": "💡 검지 손가락 번쩍 들고 🦉 눈 동그랗게!"
  },
  {
    "id": 7,
    "chapter": 2,
    "scene": "scene3",
    "start": 31.6,
    "end": 34.7,
    "cam": {
      "scale": 1.95,
      "ox": 34,
      "oy": 36
    },
    "anim": "bounce",
    "speaker": "🦉 부엉이의 아이디어",
    "icons": [
      [
        "👨‍🍳",
        "만들자!"
      ],
      [
        "🍽️",
        "맛있는 저녁!"
      ]
    ],
    "en": "\"Let's make him a nice dinner!\"",
    "ko": "\"아저씨께 맛있는 저녁을 만들어 드리자!\"",
    "gesture": "🍽️ 냠냠 맛있게 먹는 시늉하기"
  },
  {
    "id": 8,
    "chapter": 2,
    "scene": "scene3",
    "start": 35.3,
    "end": 41.5,
    "cam": {
      "scale": 2.1,
      "ox": 60,
      "oy": 28
    },
    "anim": "bounce",
    "speaker": "🐔 닭이 말해요",
    "icons": [
      [
        "🐔",
        "닭"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🥚",
        "달걀"
      ],
      [
        "🍽️",
        "저녁"
      ]
    ],
    "en": "\"I will give him an egg for his dinner,\" said the chicken.",
    "ko": "\"나는 저녁으로 달걀을 드릴게.\" 닭이 말했어요.",
    "gesture": "🥚 손으로 동그란 달걀 들고 🐔 날개 파닥파닥!",
    "chunks": [
      {
        "start": 35.3,
        "end": 39.59,
        "en": "\"I will give him an egg for his dinner,\"",
        "ko": "저녁으로 달걀을 드릴게"
      },
      {
        "start": 39.59,
        "end": 41.5,
        "en": "said the chicken.",
        "ko": "닭이 말했어요"
      }
    ]
  },
  {
    "id": 9,
    "chapter": 2,
    "scene": "scene3",
    "start": 42.9,
    "end": 49.0,
    "cam": {
      "scale": 2.05,
      "ox": 80,
      "oy": 76
    },
    "anim": "bounce",
    "speaker": "🐰 토끼가 말해요",
    "icons": [
      [
        "🐰",
        "토끼"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🥕✨",
        "크고 멋진 당근!"
      ]
    ],
    "en": "\"And I will give him my nice, big carrot!\" said the rabbit.",
    "ko": "\"그리고 난 내 멋지고 큰 당근을 드릴래!\" 토끼가 말했어요.",
    "gesture": "🥕 양손으로 큰 당근 들고 🐰 머리 위로 토끼 귀!",
    "chunks": [
      {
        "start": 42.9,
        "end": 46.02,
        "en": "\"And I will give him my nice, big carrot!\"",
        "ko": "내 크고 멋진 당근을 드릴래!"
      },
      {
        "start": 46.02,
        "end": 49.0,
        "en": "said the rabbit.",
        "ko": "토끼가 말했어요"
      }
    ]
  },
  {
    "id": 10,
    "chapter": 2,
    "scene": "scene4",
    "start": 52.8,
    "end": 59.2,
    "cam": {
      "scale": 1.85,
      "ox": 26,
      "oy": 50
    },
    "anim": "bounce",
    "speaker": "🐄 젖소가 말해요",
    "icons": [
      [
        "🐄",
        "젖소"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🥛",
        "우유"
      ],
      [
        "🍽️",
        "저녁"
      ]
    ],
    "en": "\"I will give him some milk for his dinner,\" said the cow.",
    "ko": "\"나는 저녁으로 우유를 드릴게.\" 젖소가 말했어요.",
    "gesture": "🥛 우유 컵 들고 꿀꺽꿀꺽 마시는 시늉!",
    "chunks": [
      {
        "start": 52.8,
        "end": 57.16,
        "en": "\"I will give him some milk for his dinner,\"",
        "ko": "저녁으로 우유를 드릴게"
      },
      {
        "start": 57.16,
        "end": 59.2,
        "en": "said the cow.",
        "ko": "젖소가 말했어요"
      }
    ]
  },
  {
    "id": 11,
    "chapter": 2,
    "scene": "scene4",
    "start": 59.4,
    "end": 65.9,
    "cam": {
      "scale": 1.85,
      "ox": 74,
      "oy": 50
    },
    "anim": "bounce",
    "speaker": "🐴 말과 조랑말이 말해요",
    "icons": [
      [
        "🐴🐎",
        "말·조랑말"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🌽",
        "옥수수 따기!"
      ]
    ],
    "en": "\"We will pick corn for his dinner,\" said the horse and the pony.",
    "ko": "\"우리는 저녁으로 옥수수를 딸게.\" 말과 조랑말이 말했어요.",
    "gesture": "🌽 위로 손 뻗어 옥수수 똑똑 따기!",
    "chunks": [
      {
        "start": 59.4,
        "end": 63.16,
        "en": "\"We will pick corn for his dinner,\"",
        "ko": "저녁으로 옥수수를 딸게"
      },
      {
        "start": 63.16,
        "end": 65.9,
        "en": "said the horse and the pony.",
        "ko": "말과 조랑말이 말했어요"
      }
    ]
  },
  {
    "id": 12,
    "chapter": 3,
    "scene": "scene5",
    "start": 69.1,
    "end": 75.2,
    "cam": {
      "scale": 1.85,
      "ox": 30,
      "oy": 46
    },
    "anim": "bounce",
    "speaker": "🐱 고양이가 말해요",
    "icons": [
      [
        "🐱",
        "고양이"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🐭",
        "생쥐?!"
      ],
      [
        "🍽️",
        "저녁"
      ]
    ],
    "en": "\"I will get a mouse for his dinner,\" said the cat.",
    "ko": "\"나는 저녁으로 생쥐를 잡아올게.\" 고양이가 말했어요.",
    "gesture": "🐱 고양이 발톱 세우고 입맛 다시기!",
    "chunks": [
      {
        "start": 69.1,
        "end": 73.83,
        "en": "\"I will get a mouse for his dinner,\"",
        "ko": "저녁으로 생쥐를 잡아올게"
      },
      {
        "start": 73.83,
        "end": 75.2,
        "en": "said the cat.",
        "ko": "고양이가 말했어요"
      }
    ]
  },
  {
    "id": 13,
    "chapter": 3,
    "scene": "scene5",
    "start": 75.8,
    "end": 79.6,
    "cam": {
      "scale": 2.25,
      "ox": 20,
      "oy": 38
    },
    "anim": "shake",
    "speaker": "🐭 생쥐가 소리쳤어요!",
    "icons": [
      [
        "🐭",
        "생쥐"
      ],
      [
        "🙅‍♂️❌",
        "안 돼!!"
      ]
    ],
    "en": "\"No, you won't!\" the mouse yelled.",
    "ko": "\"안 돼, 어림없어!\" 생쥐가 소리쳤어요.",
    "gesture": "🙅 팔로 큰 X 표시하며 힘차게 외치기!"
  },
  {
    "id": 14,
    "chapter": 3,
    "scene": "scene5",
    "start": 79.9,
    "end": 84.6,
    "cam": {
      "scale": 1.95,
      "ox": 24,
      "oy": 44
    },
    "anim": "shake",
    "speaker": "🐭 생쥐가 말해요",
    "icons": [
      [
        "👨‍🌾",
        "농부 아저씨"
      ],
      [
        "🐭",
        "생쥐"
      ],
      [
        "🚫",
        "안 먹어!"
      ]
    ],
    "en": "\"Farmer Brown does not like to eat mice!\"",
    "ko": "\"브라운 아저씨는 생쥐 먹는 걸 안 좋아해!\"",
    "gesture": "😖 고개를 도리도리 저으며 손 흔들기"
  },
  {
    "id": 15,
    "chapter": 3,
    "scene": "scene5",
    "start": 85.0,
    "end": 90.9,
    "cam": {
      "scale": 1.9,
      "ox": 76,
      "oy": 52
    },
    "anim": "bounce",
    "speaker": "🐱 고양이의 낚시!",
    "icons": [
      [
        "🐱",
        "고양이"
      ],
      [
        "🎣",
        "그럼"
      ],
      [
        "🐟",
        "물고기!"
      ]
    ],
    "en": "\"Then I will get a fish for his dinner,\" said the cat.",
    "ko": "\"그럼 저녁으로 물고기를 잡아올게.\" 고양이가 말했어요.",
    "gesture": "🎣 낚싯대 던지고 휙! 끌어올리기",
    "chunks": [
      {
        "start": 85.0,
        "end": 88.84,
        "en": "\"Then I will get a fish for his dinner,\"",
        "ko": "그럼 물고기를 잡아올게"
      },
      {
        "start": 88.84,
        "end": 90.9,
        "en": "said the cat.",
        "ko": "고양이가 말했어요"
      }
    ]
  },
  {
    "id": 16,
    "chapter": 3,
    "scene": "scene6",
    "start": 95.6,
    "end": 100.2,
    "cam": {
      "scale": 2.25,
      "ox": 14,
      "oy": 24
    },
    "anim": "bounce",
    "speaker": "🦆 오리가 말해요",
    "icons": [
      [
        "🦆",
        "오리"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🍳",
        "저녁 요리!"
      ]
    ],
    "en": "\"And I will fix his dinner,\" said the duck.",
    "ko": "\"그리고 내가 저녁을 요리할게.\" 오리가 말했어요.",
    "gesture": "🍳 냄비를 휘휘 저으며 요리하는 시늉!"
  },
  {
    "id": 17,
    "chapter": 3,
    "scene": "scene6",
    "start": 100.6,
    "end": 106.4,
    "cam": {
      "scale": 1.8,
      "ox": 48,
      "oy": 78
    },
    "anim": "bounce",
    "speaker": "🐶 개와 염소가 말해요",
    "icons": [
      [
        "🐶🐐",
        "개·염소"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🧹",
        "헛간 청소!"
      ]
    ],
    "en": "\"And we will clean the barn,\" said the dog and the goat.",
    "ko": "\"그리고 우리는 헛간을 청소할게.\" 개와 염소가 말했어요.",
    "gesture": "🧹 빗자루로 쓱싹쓱싹 바닥 쓸기!",
    "chunks": [
      {
        "start": 100.6,
        "end": 105.17,
        "en": "\"And we will clean the barn,\"",
        "ko": "우리는 헛간을 청소할게"
      },
      {
        "start": 105.17,
        "end": 106.4,
        "en": "said the dog and the goat.",
        "ko": "개와 염소가 말했어요"
      }
    ]
  },
  {
    "id": 18,
    "chapter": 3,
    "scene": "scene6",
    "start": 106.8,
    "end": 113.0,
    "cam": {
      "scale": 2.2,
      "ox": 84,
      "oy": 28
    },
    "anim": "dance",
    "speaker": "🐑 당나귀와 양이 말해요",
    "icons": [
      [
        "🐴🐑",
        "당나귀·양"
      ],
      [
        "➡️",
        ""
      ],
      [
        "🎵",
        "노래 불러요!"
      ]
    ],
    "en": "\"We will sing him a song,\" said the donkey and the sheep.",
    "ko": "\"우리는 아저씨께 노래를 불러드릴게.\" 당나귀와 양이 말했어요.",
    "gesture": "🎵 마이크 들고 랄랄라 노래 부르기!",
    "chunks": [
      {
        "start": 106.8,
        "end": 111.55,
        "en": "\"We will sing him a song,\"",
        "ko": "아저씨께 노래를 불러드릴게"
      },
      {
        "start": 111.55,
        "end": 113.0,
        "en": "said the donkey and the sheep.",
        "ko": "당나귀와 양이 말했어요"
      }
    ]
  },
  {
    "id": 19,
    "chapter": 4,
    "scene": "scene7",
    "start": 115.8,
    "end": 119.3,
    "cam": {
      "scale": 1.9,
      "ox": 26,
      "oy": 56
    },
    "anim": "",
    "speaker": "🐷 슬픈 돼지",
    "icons": [
      [
        "🐷",
        "돼지"
      ],
      [
        "😢",
        "슬펐어요"
      ]
    ],
    "en": "The pig was sad.",
    "ko": "돼지는 슬펐어요.",
    "gesture": "😔 어깨 축 내리고 고개 숙이기"
  },
  {
    "id": 20,
    "chapter": 4,
    "scene": "scene7",
    "start": 119.6,
    "end": 124.2,
    "cam": {
      "scale": 1.85,
      "ox": 34,
      "oy": 44
    },
    "anim": "",
    "speaker": "🐷 고민하는 돼지",
    "icons": [
      [
        "🐷",
        "돼지"
      ],
      [
        "❓",
        "뭘 해야 하지?"
      ],
      [
        "👨‍🌾",
        "아저씨 위해"
      ]
    ],
    "en": "He did not know what to do for the farmer.",
    "ko": "농부 아저씨를 위해 뭘 해야 할지 몰랐어요.",
    "gesture": "🤷 양손 으쓱하며 고개 갸웃하기"
  },
  {
    "id": 21,
    "chapter": 4,
    "scene": "scene7",
    "start": 125.6,
    "end": 132.1,
    "cam": {
      "scale": 1.9,
      "ox": 73,
      "oy": 50
    },
    "anim": "bounce",
    "speaker": "🐷 반짝! 아이디어!",
    "icons": [
      [
        "💡",
        "알았어!"
      ],
      [
        "🐷",
        "돼지"
      ],
      [
        "👀🌀",
        "꼬불꼬불 꼬리!"
      ]
    ],
    "en": "\"I know,\" said the pig, as he looked at the curl in his tail.",
    "ko": "\"알았어!\" 돼지가 꼬불꼬불한 자기 꼬리를 보며 말했어요.",
    "gesture": "🌀 뒤돌아 엉덩이 꼬리 보며 손가락 빙글빙글!",
    "chunks": [
      {
        "start": 125.6,
        "end": 128.32,
        "en": "\"I know,\" said the pig,",
        "ko": "\"알았어!\" 돼지가 말했어요"
      },
      {
        "start": 128.32,
        "end": 132.1,
        "en": "as he looked at the curl in his tail.",
        "ko": "꼬불꼬불한 꼬리를 보면서요"
      }
    ]
  },
  {
    "id": 22,
    "chapter": 4,
    "scene": "scene7",
    "start": 132.3,
    "end": 136.0,
    "cam": {
      "scale": 2.0,
      "ox": 75,
      "oy": 58
    },
    "anim": "dance",
    "speaker": "🐷 신나는 돼지!",
    "icons": [
      [
        "🐷",
        "내가"
      ],
      [
        "💃🎵",
        "춤출 거야!"
      ],
      [
        "👨‍🌾",
        "아저씨 위해!"
      ]
    ],
    "en": "\"I will dance for Farmer Brown!\"",
    "ko": "\"브라운 아저씨를 위해 춤을 출 거야!\"",
    "gesture": "💃 양팔 들고 엉덩이 흔들며 신나게 춤추기!"
  },
  {
    "id": 23,
    "chapter": 4,
    "scene": "scene8",
    "start": 144.4,
    "end": 153.8,
    "cam": {
      "scale": 1.52,
      "ox": 48,
      "oy": 58
    },
    "anim": "bounce",
    "speaker": "🎉 모두가 행복해요!",
    "icons": [
      [
        "👨‍🌾😄",
        "아저씨 행복!"
      ],
      [
        "😂",
        "하하 웃었어요"
      ],
      [
        "🐷💃",
        "춤추는 돼지"
      ]
    ],
    "en": "The animals made Farmer Brown very happy, and he laughed at the dancing pig.",
    "ko": "동물들은 브라운 아저씨를 아주 행복하게 했고, 아저씨는 춤추는 돼지를 보고 웃었어요.",
    "gesture": "😂 배 잡고 하하하 크게 웃기!",
    "chunks": [
      {
        "start": 144.4,
        "end": 149.11,
        "en": "The animals made Farmer Brown very happy,",
        "ko": "동물들은 아저씨를 아주 행복하게 했고,"
      },
      {
        "start": 149.11,
        "end": 153.8,
        "en": "and he laughed at the dancing pig.",
        "ko": "아저씨는 춤추는 돼지를 보고 웃었어요"
      }
    ]
  },
  {
    "id": 24,
    "chapter": 4,
    "scene": "scene8",
    "start": 154.0,
    "end": 157.8,
    "cam": {
      "scale": 2.05,
      "ox": 60,
      "oy": 72
    },
    "anim": "dance",
    "speaker": "😲 깜짝 놀랐어요!",
    "icons": [
      [
        "😲",
        "한 번도 못 봤대요!"
      ],
      [
        "🐷💃",
        "춤추는 돼지!"
      ]
    ],
    "en": "He had never seen a dancing pig!",
    "ko": "아저씨는 춤추는 돼지를 한 번도 본 적이 없었거든요!",
    "gesture": "😲 눈 크게 뜨고 양손으로 얼굴 감싸기!"
  },
  {
    "id": 25,
    "chapter": 4,
    "scene": "scene8",
    "start": 157.9,
    "end": 160.3,
    "cam": {
      "scale": 1.0,
      "ox": 50,
      "oy": 50
    },
    "anim": "bounce",
    "speaker": "🙋 마지막 질문!",
    "icons": [
      [
        "🙋‍♂️",
        "여러분은"
      ],
      [
        "👀❓",
        "본 적 있나요?"
      ]
    ],
    "en": "Have you?",
    "ko": "여러분은 본 적 있나요?",
    "gesture": "🙋 관객을 바라보며 양손 활짝 펼치고 웃기!"
  }
];

export const REHEARSAL_OUTRO = {
  id: 99,
  chapter: 0,
  isBanner: true,
  bannerEmoji: "🏆🎉",
  bannerTitle: "발표회 대성공!!",
  bannerSub: "우주야 정말 멋졌어! 마지막 인사하고 박수 받자!",
  speaker: "🏆 끝인사",
  icons: [["🙌", "감사합니다!"], ["👏", "짝짝짝!"]],
  en: "Thank you for listening!",
  ko: "들어주셔서 감사합니다!",
  gesture: "🙌 환하게 웃으며 멋지게 끝인사!"
};

// 12 sequential 3D farm spots mapped 1:1 to BASE_CARDS #1..#25 along a cozy circular path
export const FARM_SPOTS = [
  { id: "farmer",       zone: 1, cardIds: [1, 2, 3],      name: "브라운 아저씨", emoji: "👨‍🌾", itemEmoji: "😢", itemLabel: "슬픈 농장",    portrait: "assets/char_farmer.png",       pos: { x: 0, z: 12.5 },   prop: "sign" },
  { id: "frog",         zone: 1, cardIds: [4, 5],         name: "개구리",        emoji: "🐸",  itemEmoji: "💭", itemLabel: "고민 시작",    portrait: "assets/char_frog.png",         pos: { x: -6.8, z: 10.5 }, prop: "lily" },
  { id: "owl",          zone: 2, cardIds: [6, 7],         name: "부엉이",        emoji: "🦉",  itemEmoji: "💡", itemLabel: "저녁 아이디어", portrait: "assets/char_owl.png",          pos: { x: -11.5, z: 5.5 }, prop: "stump" },
  { id: "chicken",      zone: 2, cardIds: [8],            name: "닭",            emoji: "🐔",  itemEmoji: "🥚", itemLabel: "달걀",         portrait: "assets/char_chicken.png",      pos: { x: -12.5, z: -1.0 }, prop: "nest" },
  { id: "rabbit",       zone: 2, cardIds: [9],            name: "토끼",          emoji: "🐰",  itemEmoji: "🥕", itemLabel: "큰 당근",      portrait: "assets/char_rabbit.png",       pos: { x: -10.2, z: -7.5 }, prop: "garden" },
  { id: "cow",          zone: 2, cardIds: [10],           name: "젖소",          emoji: "🐄",  itemEmoji: "🥛", itemLabel: "우유",         portrait: "assets/char_cow.png",          pos: { x: -4.8, z: -11.8 }, prop: "bucket" },
  { id: "horse_pony",   zone: 2, cardIds: [11],           name: "말과 조랑말",   emoji: "🐴",  itemEmoji: "🌽", itemLabel: "옥수수",       portrait: "assets/char_horse_pony.png",   pos: { x: 2.5, z: -12.2 },  prop: "corn" },
  { id: "cat_mouse",    zone: 3, cardIds: [12, 13, 14, 15], name: "고양이와 생쥐", emoji: "🐱",  itemEmoji: "🐟", itemLabel: "물고기 낚시",  portrait: "assets/char_cat_mouse.png",    pos: { x: 9.2, z: -8.8 },   prop: "pond" },
  { id: "duck",         zone: 3, cardIds: [16],           name: "오리",          emoji: "🦆",  itemEmoji: "🍳", itemLabel: "저녁 요리",    portrait: "assets/char_duck.png",         pos: { x: 12.4, z: -2.2 },  prop: "pot" },
  { id: "dog_goat",     zone: 3, cardIds: [17],           name: "개와 염소",     emoji: "🐶",  itemEmoji: "🧹", itemLabel: "헛간 청소",    portrait: "assets/char_dog_goat.png",     pos: { x: 11.4, z: 5.0 },   prop: "broom" },
  { id: "donkey_sheep", zone: 3, cardIds: [18],           name: "당나귀와 양",   emoji: "🐑",  itemEmoji: "🎵", itemLabel: "노래 선물",    portrait: "assets/char_donkey_sheep.png", pos: { x: 6.5, z: 10.6 },   prop: "music" },
  { id: "pig_finale",   zone: 4, cardIds: [19, 20, 21, 22, 23, 24, 25], name: "춤추는 돼지", emoji: "🐷", itemEmoji: "💃", itemLabel: "댄스 파티!", portrait: "assets/char_pig.png", pos: { x: 0, z: 0 }, prop: "stage" },
];

export const DAILY_MISSIONS = [
  { day: 1,  title: "🗺️ 3D 농장 한 바퀴 돌며 친구들 만나기!", mode: 0, chapter: 0 },
  { day: 2,  title: "🗺️ 3D 농장 다시 탐험 + 👂 귀 쫑긋 찾기!", mode: 0, chapter: 0 },
  { day: 3,  title: "🎬 1단계 스토리 보며 몸짓 놀이하기!", mode: 1, chapter: 0 },
  { day: 4,  title: "🦜 2단계 앵무새 — 1구간 (슬픈 농부) 따라하기", mode: 2, chapter: 1 },
  { day: 5,  title: "🦜 2단계 앵무새 — 2구간 (맛있는 저녁) 쪼개서 말하기", mode: 2, chapter: 2 },
  { day: 6,  title: "🦜 2단계 앵무새 — 3구간 (고양이와 친구들) 주고받기", mode: 2, chapter: 3 },
  { day: 7,  title: "🦜 2단계 앵무새 — 4구간 (춤추는 돼지!) 완성", mode: 2, chapter: 4 },
  { day: 8,  title: "🔍 3단계 그림보고 — 1·2구간 말해보기", mode: 3, chapter: 1 },
  { day: 9,  title: "🔍 3단계 그림보고 — 3구간 말해보기", mode: 3, chapter: 3 },
  { day: 10, title: "🔍 3단계 그림보고 — 4구간 + 전체 도전!", mode: 3, chapter: 4 },
  { day: 11, title: "🔥 약한 문장 집중 연습 + 그림보고 전체", mode: 3, chapter: 0 },
  { day: 12, title: "🎤 4단계 발표회 — 첫 리허설 도전!", mode: 4, chapter: 0 },
  { day: 13, title: "🎤 4단계 발표회 — 큰 목소리로 통녹음!", mode: 4, chapter: 0 },
  { day: 14, title: "🏆 발표회 파이널 리허설! 우주 화이팅!", mode: 4, chapter: 0 },
];

export function computeEchoWaitMs(durationSec) {
  const dur = typeof durationSec === "number" && durationSec > 0 ? durationSec : 3;
  return Math.max(3000, Math.round(dur * 1400 + 1000));
}

export function getDeck({ mode = 1, chapter = 0, weakIds = new Set() } = {}) {
  let cards;
  if (chapter === -1) {
    cards = BASE_CARDS.filter(c => weakIds && weakIds.has(c.id));
    if (cards.length === 0) cards = BASE_CARDS;
  } else if (chapter === 0) {
    cards = BASE_CARDS;
  } else {
    cards = BASE_CARDS.filter(c => c.chapter === chapter);
  }
  // Mode 4 removes REHEARSAL_INTRO per user decision; starts at card #1 and ends with REHEARSAL_OUTRO
  if (mode === 4) return [...cards, REHEARSAL_OUTRO];
  return cards;
}

export function getNextMission(stamps = {}) {
  for (const m of DAILY_MISSIONS) {
    if (!stamps[m.day]) return m;
  }
  return DAILY_MISSIONS[DAILY_MISSIONS.length - 1];
}

export function resolveSpotInteraction(spotIndex, currentSpotIndex, isListening) {
  if (isListening) return { action: "busy" };
  if (spotIndex > currentSpotIndex) return { action: "locked", redirectTo: currentSpotIndex };
  if (spotIndex < currentSpotIndex) return { action: "revisit" };
  return { action: "start" };
}

function shuffleWithRng(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildSequenceQuestion(spotIndex, rng = Math.random) {
  const safeIdx = Math.max(0, Math.min(FARM_SPOTS.length - 2, spotIndex));
  const promptSpot = FARM_SPOTS[safeIdx];
  const correctSpot = FARM_SPOTS[safeIdx + 1];
  const distractors = shuffleWithRng(
    FARM_SPOTS.filter(s => s.id !== promptSpot.id && s.id !== correctSpot.id),
    rng
  ).slice(0, 2);
  const choices = shuffleWithRng([correctSpot, ...distractors], rng);
  return { promptSpot, correctSpot, choices };
}

export function buildListenQuestion(cardPool = BASE_CARDS, rng = Math.random) {
  const pool = cardPool.length >= 3 ? cardPool : BASE_CARDS;
  const bySpot = new Map();
  for (const card of pool) {
    const spot = FARM_SPOTS.find(s => s.cardIds.includes(card.id));
    const key = spot ? spot.id : `card_${card.id}`;
    if (!bySpot.has(key)) bySpot.set(key, []);
    bySpot.get(key).push(card);
  }
  const spotKeys = shuffleWithRng([...bySpot.keys()], rng).slice(0, 3);
  const picked = spotKeys.map(k => {
    const cardsInSpot = bySpot.get(k);
    return cardsInSpot[Math.floor(rng() * cardsInSpot.length)];
  });
  const targetCard = picked[0];
  const choices = shuffleWithRng(picked, rng);
  return { targetCard, choices };
}

// --- v3/v4: 3D Farm RPG Mastery, 12 Village Buildings, 24 Treasures, 15 Gear & 16 Achievements ---
export const FARM_STORAGE_KEY = 'wooju_farm_rpg_v3';

// 12 Unlockable 3D Village Buildings / Landmarks (built permanently as Wooju speaks English!)
export const VILLAGE_BUILDINGS = [
  { id: 'garden_arch',   name: '꽃길 정원',        emoji: '🌷', reqSpeaks: 3,   desc: '따라 말하기 3회' },
  { id: 'magic_well',    name: '소원 우물',        emoji: '🪣', reqSpeaks: 6,   desc: '따라 말하기 6회' },
  { id: 'green_stall',   name: '초록 과일 가게',   emoji: '🍏', reqSpeaks: 10,  desc: '따라 말하기 10회' },
  { id: 'red_stall',     name: '빨간 간식 가게',   emoji: '🍿', reqSpeaks: 15,  desc: '따라 말하기 15회' },
  { id: 'fountain',      name: '반짝이 분수 광장', emoji: '⛲', reqSpeaks: 20,  desc: '따라 말하기 20회' },
  { id: 'wooju_house',   name: '우주의 오두막',    emoji: '🏡', reqSpeaks: 26,  desc: '따라 말하기 26회' },
  { id: 'friend_villa',  name: '동물 친구 별장',   emoji: '🏠', reqSpeaks: 32,  desc: '따라 말하기 32회' },
  { id: 'gold_windmill', name: '돌아가는 황금 풍차', emoji: '🌬️', reqSpeaks: 40, desc: '따라 말하기 40회' },
  { id: 'star_gazebo',   name: '별빛 정자',        emoji: '🏛️', reqSpeaks: 50,  desc: '따라 말하기 50회' },
  { id: 'royal_barn',    name: '황금 헛간 성',     emoji: '🏰', reqSpeaks: 62,  desc: '따라 말하기 62회' },
  { id: 'rocket_pad',    name: '우주 로켓 발사대', emoji: '🚀', reqSpeaks: 75,  desc: '따라 말하기 75회' },
  { id: 'rainbow_arch',  name: '전설의 무지개 다리', emoji: '🌈', reqSpeaks: 100, desc: '따라 말하기 100회!' },
];

// 40 Outdoor Treasures & Garden Decorations (expanded from 24 -> 40!)
export const TREASURE_ITEMS = [
  // Common (12)
  { id: 'tr_gold_egg',     name: '황금 달걀',       emoji: '🥚', rarity: 'common',    cat: '음식' },
  { id: 'tr_big_carrot',   name: '무지개 당근',     emoji: '🥕', rarity: 'common',    cat: '음식' },
  { id: 'tr_clover',       name: '네잎클로버',      emoji: '🍀', rarity: 'common',    cat: '자연' },
  { id: 'tr_acorn',        name: '황금 도토리',     emoji: '🌰', rarity: 'common',    cat: '자연' },
  { id: 'tr_broom',        name: '은빛 빗자루',     emoji: '🧹', rarity: 'common',    cat: '농장' },
  { id: 'tr_apple_pie',    name: '꿀사과 파이',     emoji: '🥧', rarity: 'common',    cat: '음식' },
  { id: 'tr_sunflower',    name: '햇살 해바라기',   emoji: '🌻', rarity: 'common',    cat: '자연' },
  { id: 'tr_bell',         name: '딸랑이 종',       emoji: '🔔', rarity: 'common',    cat: '농장' },
  { id: 'tr_tulip_pot',    name: '무지개 튤립 화분', emoji: '🌷', rarity: 'common',   cat: '정원' },
  { id: 'tr_butterfly',    name: '반짝이 나비',     emoji: '🦋', rarity: 'common',    cat: '자연' },
  { id: 'tr_honey_jar',    name: '달콤 꿀단지',     emoji: '🍯', rarity: 'common',    cat: '음식' },
  { id: 'tr_ladybug',      name: '행운 무당벌레',   emoji: '🐞', rarity: 'common',    cat: '자연' },
  // Rare (12)
  { id: 'tr_galaxy_milk',  name: '은하수 우유',     emoji: '🥛', rarity: 'rare',      cat: '음식' },
  { id: 'tr_dia_corn',     name: '다이아 옥수수',   emoji: '🌽', rarity: 'rare',      cat: '음식' },
  { id: 'tr_star_mush',    name: '별빛 버섯',       emoji: '🍄', rarity: 'rare',      cat: '자연' },
  { id: 'tr_magic_rod',    name: '마법 낚싯대',     emoji: '🎣', rarity: 'rare',      cat: '농장' },
  { id: 'tr_gold_note',    name: '황금 음표',       emoji: '🎵', rarity: 'rare',      cat: '농장' },
  { id: 'tr_crystal_flw',  name: '크리스탈 꽃',     emoji: '🌺', rarity: 'rare',      cat: '자연' },
  { id: 'tr_magic_stew',   name: '오리의 마법 스튜', emoji: '🍲', rarity: 'rare',     cat: '음식' },
  { id: 'tr_sakura_tree',  name: '분홍 벚꽃 나무',  emoji: '🌸', rarity: 'rare',      cat: '정원' },
  { id: 'tr_cotton_candy', name: '솜사탕 기계',     emoji: '🍭', rarity: 'rare',      cat: '축제' },
  { id: 'tr_fairy_house',  name: '요정의 버섯집',   emoji: '🏡', rarity: 'rare',      cat: '정원' },
  { id: 'tr_rainbow_shell', name: '무지개 조개',    emoji: '🐚', rarity: 'rare',      cat: '자연' },
  { id: 'tr_firefly_jar',  name: '반딧불이 유리병', emoji: '✨', rarity: 'rare',      cat: '정원' },
  // Epic (9)
  { id: 'tr_legend_fish',  name: '전설의 황금 잉어', emoji: '🐟', rarity: 'epic',     cat: '음식' },
  { id: 'tr_dance_shoes',  name: '춤추는 마법 구두', emoji: '👟', rarity: 'epic',     cat: '농장' },
  { id: 'tr_farmer_hat',   name: '브라운 황금 모자', emoji: '🤠', rarity: 'epic',     cat: '농장' },
  { id: 'tr_meteor',       name: '미니 운석',       emoji: '☄️', rarity: 'epic',      cat: '우주' },
  { id: 'tr_saturn_ring',  name: '토성 반지',       emoji: '🪐', rarity: 'epic',      cat: '우주' },
  { id: 'tr_dino_fossil',  name: '티라노 공룡 화석', emoji: '🦖', rarity: 'epic',     cat: '전시' },
  { id: 'tr_carousel',     name: '미니 회전목마',   emoji: '🎠', rarity: 'epic',      cat: '축제' },
  { id: 'tr_ufo_model',    name: '빛나는 UFO 모형', emoji: '🛸', rarity: 'epic',      cat: '우주' },
  { id: 'tr_treasure_map', name: '보물섬 황금 상자', emoji: '🗺️', rarity: 'epic',     cat: '전시' },
  // Legendary (7)
  { id: 'tr_pig_trophy',   name: '춤추는 돼지 트로피', emoji: '🏆', rarity: 'legendary', cat: '전설' },
  { id: 'tr_star_compass', name: '은하 나침반',     emoji: '🧭', rarity: 'legendary', cat: '우주' },
  { id: 'tr_rocket_key',   name: '우주선 황금 열쇠', emoji: '🔑', rarity: 'legendary', cat: '우주' },
  { id: 'tr_wooju_medal',  name: '우주 대왕 메달',  emoji: '🥇', rarity: 'legendary', cat: '전설' },
  { id: 'tr_solar_system', name: '태양계 행성 모형', emoji: '🌌', rarity: 'legendary', cat: '우주' },
  { id: 'tr_crystal_castle', name: '크리스탈 미니 성', emoji: '🏰', rarity: 'legendary', cat: '전설' },
  { id: 'tr_golden_dragon', name: '황금 드래곤 석상', emoji: '🐉', rarity: 'legendary', cat: '전설' },
];

// 10 My-Home Wallpapers (wall_sky is unlocked by default)
export const ROOM_WALLPAPERS = [
  { id: 'wall_sky',     name: '구름 하늘 벽지',   emoji: '☁️', rarity: 'common',    bg: '#BAE6FD', fg: '#FFFFFF', pattern: 'clouds', defaultOwned: true },
  { id: 'wall_wood',    name: '따뜻한 통나무 벽', emoji: '🪵', rarity: 'common',    bg: '#FDE68A', fg: '#D97706', pattern: 'stripes' },
  { id: 'wall_forest',  name: '초록 숲속 벽지',   emoji: '🌲', rarity: 'common',    bg: '#BBF7D0', fg: '#22C55E', pattern: 'dots' },
  { id: 'wall_pink',    name: '딸기 하트 벽지',   emoji: '💗', rarity: 'common',    bg: '#FCE7F3', fg: '#F472B6', pattern: 'dots' },
  { id: 'wall_ocean',   name: '바다 물결 벽지',   emoji: '🌊', rarity: 'rare',      bg: '#A5F3FC', fg: '#0284C7', pattern: 'stripes' },
  { id: 'wall_dino',    name: '공룡 탐험 벽지',   emoji: '🦕', rarity: 'rare',      bg: '#D9F99D', fg: '#65A30D', pattern: 'diamonds' },
  { id: 'wall_candy',   name: '달콤 캔디 벽지',   emoji: '🍬', rarity: 'rare',      bg: '#FBCFE8', fg: '#A855F7', pattern: 'stripes' },
  { id: 'wall_rainbow', name: '무지개 파스텔 벽', emoji: '🌈', rarity: 'epic',      bg: '#FEF3C7', fg: '#EC4899', pattern: 'rainbow' },
  { id: 'wall_space',   name: '우주 별밤 벽지',   emoji: '🌌', rarity: 'epic',      bg: '#1E1B4B', fg: '#FACC15', pattern: 'stars' },
  { id: 'wall_gold',    name: '황금 왕궁 벽지',   emoji: '👑', rarity: 'legendary', bg: '#FEF08A', fg: '#D97706', pattern: 'diamonds' },
];

// 10 My-Home Floorings (floor_oak is unlocked by default)
export const ROOM_FLOORS = [
  { id: 'floor_oak',    name: '원목 마루 바닥',   emoji: '🪵', rarity: 'common',    bg: '#E7B98A', fg: '#C8925C', pattern: 'planks', defaultOwned: true },
  { id: 'floor_grass',  name: '폭신 잔디 카펫',   emoji: '🌿', rarity: 'common',    bg: '#86EFAC', fg: '#4ADE80', pattern: 'dots' },
  { id: 'floor_check',  name: '체크 무늬 타일',   emoji: '🏁', rarity: 'common',    bg: '#F8FAFC', fg: '#94A3B8', pattern: 'check' },
  { id: 'floor_sand',   name: '해변 모래 바닥',   emoji: '🏖️', rarity: 'common',    bg: '#FDE68A', fg: '#F59E0B', pattern: 'dots' },
  { id: 'floor_pink',   name: '분홍 별 카펫',     emoji: '🌸', rarity: 'rare',      bg: '#FBCFE8', fg: '#F472B6', pattern: 'stars' },
  { id: 'floor_cloud',  name: '하늘 구름 카펫',   emoji: '☁️', rarity: 'rare',      bg: '#E0F2FE', fg: '#FFFFFF', pattern: 'clouds' },
  { id: 'floor_tatami', name: '아늑한 다다미',    emoji: '🎋', rarity: 'rare',      bg: '#D9F99D', fg: '#A3E635', pattern: 'planks' },
  { id: 'floor_marble', name: '반짝이 대리석',    emoji: '💎', rarity: 'epic',      bg: '#F1F5F9', fg: '#CBD5E1', pattern: 'check' },
  { id: 'floor_galaxy', name: '은하수 우주 바닥', emoji: '🪐', rarity: 'epic',      bg: '#312E81', fg: '#38BDF8', pattern: 'stars' },
  { id: 'floor_gold',   name: '황금 대왕 카펫',   emoji: '✨', rarity: 'legendary', bg: '#FDE047', fg: '#B45309', pattern: 'diamonds' },
];

// 40 3D My-Home Furniture, Toys & Plushies!
export const ROOM_FURNITURE = [
  // Common (12)
  { id: 'furn_bed_cozy',    name: '포근 구름 침대',   emoji: '🛏️', rarity: 'common',    shape: 'bed',      color: '#60A5FA', accent: '#FFFFFF' },
  { id: 'furn_sofa_mint',   name: '민트 푹신 소파',   emoji: '🛋️', rarity: 'common',    shape: 'sofa',     color: '#34D399', accent: '#FEF08A' },
  { id: 'furn_desk_wood',   name: '우주 공부 책상',   emoji: '🪑', rarity: 'common',    shape: 'table',    color: '#D97706', accent: '#FEF3C7' },
  { id: 'furn_bookshelf',   name: '동화책 책장',      emoji: '📚', rarity: 'common',    shape: 'shelf',    color: '#B45309', accent: '#F43F5E' },
  { id: 'furn_bear_plush',  name: '왕 곰돌이 인형',   emoji: '🧸', rarity: 'common',    shape: 'plush',    color: '#D97706', accent: '#FEF3C7' },
  { id: 'furn_star_lamp',   name: '별빛 스탠드 램프', emoji: '💡', rarity: 'common',    shape: 'lamp',     color: '#FACC15', accent: '#FEF08A' },
  { id: 'furn_rug_star',    name: '별 모양 러그',     emoji: '⭐', rarity: 'common',    shape: 'rug',      color: '#FDE047', accent: '#F59E0B' },
  { id: 'furn_plant_pot',   name: '초록 몬스테라',    emoji: '🪴', rarity: 'common',    shape: 'tree',     color: '#22C55E', accent: '#D97706' },
  { id: 'furn_chair_cat',   name: '고양이 쿠션 의자', emoji: '🐱', rarity: 'common',    shape: 'sofa',     color: '#F472B6', accent: '#FFFFFF' },
  { id: 'furn_mini_fridge', name: '간식 미니 냉장고', emoji: '🧊', rarity: 'common',    shape: 'cabinet',  color: '#38BDF8', accent: '#FFFFFF' },
  { id: 'furn_clock',       name: '뻐꾸기 시계탑',    emoji: '🕰️', rarity: 'common',    shape: 'cabinet',  color: '#92400E', accent: '#FACC15' },
  { id: 'furn_globe',       name: '빙글빙글 지구본',  emoji: '🌍', rarity: 'common',    shape: 'plush',    color: '#38BDF8', accent: '#22C55E' },
  // Rare (12)
  { id: 'furn_tv_retro',    name: '만화 영화 TV',     emoji: '📺', rarity: 'rare',      shape: 'tv',       color: '#334155', accent: '#38BDF8' },
  { id: 'furn_piano_mini',  name: '미니 피아노',      emoji: '🎹', rarity: 'rare',      shape: 'piano',    color: '#1E293B', accent: '#FFFFFF' },
  { id: 'furn_fish_tank',   name: '반짝이 열대어 어항', emoji: '🐠', rarity: 'rare',    shape: 'tank',     color: '#38BDF8', accent: '#F97316' },
  { id: 'furn_dino_plush',  name: '티라노 공룡 인형', emoji: '🦕', rarity: 'rare',      shape: 'plush',    color: '#22C55E', accent: '#FACC15' },
  { id: 'furn_cake_table',  name: '생일 케이크 식탁', emoji: '🎂', rarity: 'rare',      shape: 'table',    color: '#F472B6', accent: '#FEF08A' },
  { id: 'furn_train_set',   name: '칙칙폭폭 기차 놀이', emoji: '🚂', rarity: 'rare',    shape: 'table',    color: '#EF4444', accent: '#FACC15' },
  { id: 'furn_tent_camp',   name: '인디언 놀이 텐트', emoji: '⛺', rarity: 'rare',      shape: 'tent',     color: '#FB923C', accent: '#FEF3C7' },
  { id: 'furn_robot_toy',   name: '변신 로봇 피규어', emoji: '🤖', rarity: 'rare',      shape: 'plush',    color: '#6366F1', accent: '#38BDF8' },
  { id: 'furn_drum_set',    name: '쿵쾅쿵쾅 드럼 세트', emoji: '🥁', rarity: 'rare',    shape: 'plush',    color: '#EF4444', accent: '#FACC15' },
  { id: 'furn_cat_tower',   name: '냥냥 캣타워',      emoji: '🐈', rarity: 'rare',      shape: 'shelf',    color: '#FDE68A', accent: '#F97316' },
  { id: 'furn_kitchen',     name: '꼬마 주방 놀이',   emoji: '🍳', rarity: 'rare',      shape: 'cabinet',  color: '#FB7185', accent: '#FFFFFF' },
  { id: 'furn_soccer',      name: '미니 축구 골대',   emoji: '⚽', rarity: 'rare',      shape: 'tent',     color: '#22C55E', accent: '#FFFFFF' },
  // Epic (10)
  { id: 'furn_bed_rocket',  name: '우주 로켓 침대!',  emoji: '🚀', rarity: 'epic',      shape: 'bed',      color: '#EF4444', accent: '#38BDF8' },
  { id: 'furn_arcade',      name: '오락실 게임기!',   emoji: '🕹️', rarity: 'epic',      shape: 'arcade',   color: '#6366F1', accent: '#FACC15' },
  { id: 'furn_telescope',   name: '별 관찰 천체망원경', emoji: '🔭', rarity: 'epic',    shape: 'lamp',     color: '#E2E8F0', accent: '#38BDF8' },
  { id: 'furn_lego_castle', name: '블록 대왕 성',     emoji: '🧱', rarity: 'epic',      shape: 'cabinet',  color: '#F59E0B', accent: '#EF4444' },
  { id: 'furn_xmas_tree',   name: '반짝 트리 나무',   emoji: '🎄', rarity: 'epic',      shape: 'tree',     color: '#16A34A', accent: '#FACC15' },
  { id: 'furn_trampoline',  name: '방방 트램펄린',    emoji: '🤸', rarity: 'epic',      shape: 'rug',      color: '#3B82F6', accent: '#FACC15' },
  { id: 'furn_slide',       name: '실내 미끄럼틀',    emoji: '🛝', rarity: 'epic',      shape: 'tent',     color: '#FACC15', accent: '#EF4444' },
  { id: 'furn_icecream',    name: '아이스크림 카트',  emoji: '🍦', rarity: 'epic',      shape: 'table',    color: '#F472B6', accent: '#38BDF8' },
  { id: 'furn_unicorn',     name: '무지개 유니콘 인형', emoji: '🦄', rarity: 'epic',    shape: 'plush',    color: '#EC4899', accent: '#FDE047' },
  { id: 'furn_ufo_lamp',    name: '둥둥 UFO 무드등',  emoji: '🛸', rarity: 'epic',      shape: 'lamp',     color: '#38BDF8', accent: '#A855F7' },
  // Legendary (6)
  { id: 'furn_grand_piano', name: '황금 그랜드 피아노', emoji: '🎼', rarity: 'legendary', shape: 'piano',  color: '#FACC15', accent: '#FFFFFF' },
  { id: 'furn_trophy_wall', name: '황금 트로피 진열장', emoji: '🏆', rarity: 'legendary', shape: 'shelf',  color: '#F59E0B', accent: '#FEF08A' },
  { id: 'furn_gold_throne', name: '우주 대왕 황금 의자', emoji: '👑', rarity: 'legendary', shape: 'sofa',  color: '#FACC15', accent: '#EF4444' },
  { id: 'furn_planet_mob',  name: '빙글빙글 태양계 모빌', emoji: '🪐', rarity: 'legendary', shape: 'lamp', color: '#6366F1', accent: '#FACC15' },
  { id: 'furn_crystal_ball', name: '마법 수정구슬',   emoji: '🔮', rarity: 'legendary', shape: 'plush',    color: '#A855F7', accent: '#38BDF8' },
  { id: 'furn_rocket_tent', name: '우주선 비밀 기지!', emoji: '🛸', rarity: 'legendary', shape: 'tent',    color: '#4F46E5', accent: '#FACC15' },
];

// Unified 100-item catalog (40 treasures + 10 wallpapers + 10 floors + 40 furniture = 100!)
export const ALL_COLLECTIBLES = [
  ...TREASURE_ITEMS.map(x => ({ ...x, kind: 'treasure' })),
  ...ROOM_WALLPAPERS.map(x => ({ ...x, kind: 'wallpaper' })),
  ...ROOM_FLOORS.map(x => ({ ...x, kind: 'floor' })),
  ...ROOM_FURNITURE.map(x => ({ ...x, kind: 'furniture' })),
];

export function getHomeLevel(ownedFurnitureCount = 0) {
  if (ownedFurnitureCount >= 20) return { level: 3, name: '3단계 대왕 우주 왕궁', size: 15 };
  if (ownedFurnitureCount >= 8)  return { level: 2, name: '2단계 넓은 거실',     size: 12.5 };
  return { level: 1, name: '1단계 아담한 우주 방', size: 10 };
}

// 15 Unlockable 3D Wooju Avatar Gear Items across 3 simultaneous slots ('head' | 'back' | 'aura')
export const WOOJU_GEAR = [
  // Head (5)
  { id: 'star_hat',      slot: 'head', name: '별빛 꼬깔 모자', emoji: '🎩', reqType: 'stars',     reqCount: 4,  desc: '별 4개 모으기' },
  { id: 'cowboy_hat',    slot: 'head', name: '농부 카우보이 모자', emoji: '🤠', reqType: 'speaks', reqCount: 8,  desc: '말하기 8회' },
  { id: 'unicorn_horn',  slot: 'head', name: '유니콘 반짝이 뿔', emoji: '🦄', reqType: 'perfects', reqCount: 3, desc: '토씨 안 틀림 3회' },
  { id: 'gold_crown',    slot: 'head', name: '황금 왕관',      emoji: '👑', reqType: 'masters',   reqCount: 3,  desc: '혼자 외우기 3마리' },
  { id: 'astro_helmet',  slot: 'head', name: '우주 비행사 헬멧', emoji: '👩‍🚀', reqType: 'treasures', reqCount: 10, desc: '보물 10개 수집' },
  // Back (5)
  { id: 'hero_cape',     slot: 'back', name: '히어로 망토',    emoji: '🦸', reqType: 'stars',     reqCount: 10, desc: '별 10개 모으기' },
  { id: 'fairy_wings',   slot: 'back', name: '요정 나비 날개', emoji: '🦋', reqType: 'speaks',    reqCount: 15, desc: '말하기 15회' },
  { id: 'angel_wings',   slot: 'back', name: '천사 날개',      emoji: '🪽', reqType: 'perfects',  reqCount: 6,  desc: '토씨 안 틀림 6회' },
  { id: 'jetpack',       slot: 'back', name: '로켓 제트팩',    emoji: '🚀', reqType: 'masters',   reqCount: 6,  desc: '혼자 외우기 6마리' },
  { id: 'dragon_wings',  slot: 'back', name: '황금 드래곤 날개', emoji: '🐉', reqType: 'treasures', reqCount: 18, desc: '보물 18개 수집' },
  // Aura / Hand (5)
  { id: 'magic_wand',    slot: 'aura', name: '별빛 마법봉',    emoji: '🪄', reqType: 'speaks',    reqCount: 5,  desc: '말하기 5회' },
  { id: 'star_aura',     slot: 'aura', name: '황금 별 오라',   emoji: '✨', reqType: 'perfects',  reqCount: 1,  desc: '첫 토씨 안 틀림!' },
  { id: 'fire_aura',     slot: 'aura', name: '불꽃 슈퍼스타',  emoji: '🔥', reqType: 'speaks',    reqCount: 30, desc: '말하기 30회' },
  { id: 'rainbow_ring',  slot: 'aura', name: '무지개 발자국',  emoji: '🌈', reqType: 'masters',   reqCount: 9,  desc: '혼자 외우기 9마리' },
  { id: 'rainbow_mic',   slot: 'aura', name: '전설의 무지개 마이크', emoji: '🎤', reqType: 'masters', reqCount: 12, desc: '12마리 모두 외우기!' },
];

// 16 Nook-Miles style Achievements
export const FARM_ACHIEVEMENTS = [
  { id: 'ach_speak_1',    name: '첫 영어 주문!',     emoji: '🗣️', reqType: 'speaks',    reqCount: 1,   desc: '영어로 처음 말하기' },
  { id: 'ach_speak_10',   name: '수다쟁이 꼬마',     emoji: '🦜', reqType: 'speaks',    reqCount: 10,  desc: '영어로 10번 말하기' },
  { id: 'ach_speak_30',   name: '영어 마법사',       emoji: '🪄', reqType: 'speaks',    reqCount: 30,  desc: '영어로 30번 말하기' },
  { id: 'ach_speak_60',   name: '농장 대장님',       emoji: '🏅', reqType: 'speaks',    reqCount: 60,  desc: '영어로 60번 말하기' },
  { id: 'ach_speak_100',  name: '100번의 기적!',     emoji: '💯', reqType: 'speaks',    reqCount: 100, desc: '영어로 100번 말하기' },
  { id: 'ach_perf_1',     name: '첫 퍼펙트!',        emoji: '💎', reqType: 'perfects',  reqCount: 1,   desc: '토씨 안 틀림 1회' },
  { id: 'ach_perf_5',     name: '완벽 암기왕',       emoji: '🌟', reqType: 'perfects',  reqCount: 5,   desc: '토씨 안 틀림 5회' },
  { id: 'ach_perf_15',    name: '다이아 혀 마법사',  emoji: '👑', reqType: 'perfects',  reqCount: 15,  desc: '토씨 안 틀림 15회' },
  { id: 'ach_build_1',    name: '첫 건물 건설!',     emoji: '🏗️', reqType: 'buildings', reqCount: 1,   desc: '마을 건물 1개 건설' },
  { id: 'ach_build_6',    name: '마을 시장님',       emoji: '🏡', reqType: 'buildings', reqCount: 6,   desc: '마을 건물 6개 건설' },
  { id: 'ach_build_12',   name: '전설의 왕국 완성',  emoji: '🏰', reqType: 'buildings', reqCount: 12,  desc: '12개 건물 모두 완성' },
  { id: 'ach_master_3',   name: '미니 동물 기차',    emoji: '🐾', reqType: 'masters',   reqCount: 3,   desc: '3성 동물 3마리' },
  { id: 'ach_master_12',  name: '12마리 대퍼레이드', emoji: '🎪', reqType: 'masters',   reqCount: 12,  desc: '12마리 모두 3성!' },
  { id: 'ach_tr_5',       name: '보물 사냥꾼',       emoji: '🎁', reqType: 'treasures', reqCount: 5,   desc: '보물 5개 수집' },
  { id: 'ach_tr_12',      name: '보물 창고 주인',    emoji: '💰', reqType: 'treasures', reqCount: 12,  desc: '보물 12개 수집' },
  { id: 'ach_tr_24',      name: '전설의 컬렉터!',    emoji: '🏆', reqType: 'treasures', reqCount: 24,  desc: '24개 보물 올클리어!' },
];

export function countMasteredSpots(masteryMap = {}) {
  return FARM_SPOTS.filter(s => (masteryMap[s.id] || 0) >= 3).length;
}

export function getUnlockedBuildings(speakCount = 0) {
  return VILLAGE_BUILDINGS.filter(b => speakCount >= b.reqSpeaks).map(b => b.id);
}

export function getNextBuildingGoal(speakCount = 0) {
  return VILLAGE_BUILDINGS.find(b => speakCount < b.reqSpeaks) || null;
}

function meetsRequirement(reqType, reqCount, stats) {
  switch (reqType) {
    case 'stars':     return (stats.totalStars || 0) >= reqCount;
    case 'masters':   return (stats.masters || 0) >= reqCount;
    case 'speaks':    return (stats.speakCount || 0) >= reqCount;
    case 'perfects':  return (stats.perfectCount || 0) >= reqCount;
    case 'treasures': return (stats.treasureCount || 0) >= reqCount;
    case 'buildings': return (stats.buildingCount || 0) >= reqCount;
    default:          return false;
  }
}

export function getUnlockedGear(masteryMap = {}, totalStars = 0, extra = {}) {
  const stats = {
    totalStars,
    masters: countMasteredSpots(masteryMap),
    speakCount: extra.speakCount || 0,
    perfectCount: extra.perfectCount || 0,
    treasureCount: Array.isArray(extra.treasures) ? extra.treasures.length : (extra.treasureCount || 0),
    buildingCount: getUnlockedBuildings(extra.speakCount || 0).length,
  };
  return WOOJU_GEAR.filter(g => meetsRequirement(g.reqType, g.reqCount, stats)).map(g => g.id);
}

export function getUnlockedAchievements(masteryMap = {}, totalStars = 0, extra = {}) {
  const stats = {
    totalStars,
    masters: countMasteredSpots(masteryMap),
    speakCount: extra.speakCount || 0,
    perfectCount: extra.perfectCount || 0,
    treasureCount: Array.isArray(extra.treasures) ? extra.treasures.length : (extra.treasureCount || 0),
    buildingCount: getUnlockedBuildings(extra.speakCount || 0).length,
  };
  return FARM_ACHIEVEMENTS.filter(a => meetsRequirement(a.reqType, a.reqCount, stats)).map(a => a.id);
}

export function rollTreasureDrop(ownedIds = [], { preferHigherRarity = false, rng = Math.random } = {}) {
  const ownedSet = new Set(ownedIds);
  // Default wallpaper & floor are already owned so never drop them
  ROOM_WALLPAPERS.filter(w => w.defaultOwned).forEach(w => ownedSet.add(w.id));
  ROOM_FLOORS.filter(f => f.defaultOwned).forEach(f => ownedSet.add(f.id));

  const unowned = ALL_COLLECTIBLES.filter(t => !ownedSet.has(t.id));
  if (unowned.length === 0) {
    const legs = ALL_COLLECTIBLES.filter(t => t.rarity === 'legendary');
    const picked = legs[Math.floor(rng() * legs.length)];
    return { item: picked, kind: picked.kind, isDuplicate: true };
  }
  const pool = preferHigherRarity
    ? (unowned.filter(t => t.rarity !== 'common').length > 0 ? unowned.filter(t => t.rarity !== 'common') : unowned)
    : unowned;
  const picked = pool[Math.floor(rng() * pool.length)];
  return { item: picked, kind: picked.kind, isDuplicate: false };
}

export function computeFarmProgress(masteryMap = {}) {
  let metCount = 0;
  let masteredCount = 0;
  let totalMasteryStars = 0;
  let nextSpotIndex = FARM_SPOTS.length;

  FARM_SPOTS.forEach((spot, idx) => {
    const tier = Math.max(0, Math.min(3, masteryMap[spot.id] || 0));
    if (tier >= 1) metCount += 1;
    else if (nextSpotIndex === FARM_SPOTS.length) nextSpotIndex = idx;
    if (tier >= 3) masteredCount += 1;
    totalMasteryStars += tier;
  });

  return { metCount, masteredCount, totalMasteryStars, nextSpotIndex };
}

export function applySpotMastery(masteryMap = {}, spotId, targetTier = 1, { isPerfect = false } = {}) {
  const clamped = Math.max(1, Math.min(3, isPerfect ? 3 : targetTier));
  const prev = Math.max(0, Math.min(3, masteryMap[spotId] || 0));
  const nextVal = Math.max(prev, clamped);
  const nextMastery = { ...masteryMap, [spotId]: nextVal };
  const upgraded = nextVal > prev;
  const newlyMet = prev === 0 && nextVal >= 1;
  const newlyMastered = prev < 3 && nextVal === 3;
  const baseDelta = newlyMastered ? Math.max(2, nextVal - prev + 1) : (upgraded ? (nextVal - prev) : 1);
  const starDelta = isPerfect ? baseDelta + 2 : baseDelta;
  return { nextMastery, prevTier: prev, nextTier: nextVal, upgraded, newlyMet, newlyMastered, isPerfect, starDelta };
}

// --- v5: 14-Day Attendance Check-in Event & Daily Missions ---
export const ATTENDANCE_REWARDS = [
  { day: 1,  emoji: '⭐', label: '별 +3',          stars: 3, chest: false },
  { day: 2,  emoji: '🌟', label: '별 +4',          stars: 4, chest: false },
  { day: 3,  emoji: '🎁', label: '보물상자!',       stars: 2, chest: true,  highRarity: false },
  { day: 4,  emoji: '⭐', label: '별 +5',          stars: 5, chest: false },
  { day: 5,  emoji: '🎁', label: '희귀 상자!',      stars: 3, chest: true,  highRarity: true },
  { day: 6,  emoji: '🌟', label: '별 +5',          stars: 5, chest: false },
  { day: 7,  emoji: '👑', label: '7일 대보물!',     stars: 6, chest: true,  highRarity: true },
  { day: 8,  emoji: '⭐', label: '별 +5',          stars: 5, chest: false },
  { day: 9,  emoji: '🌟', label: '별 +6',          stars: 6, chest: false },
  { day: 10, emoji: '🎁', label: '10일 보물!',      stars: 4, chest: true,  highRarity: true },
  { day: 11, emoji: '⭐', label: '별 +6',          stars: 6, chest: false },
  { day: 12, emoji: '🎁', label: '희귀 상자!',      stars: 5, chest: true,  highRarity: true },
  { day: 13, emoji: '🌟', label: '별 +7',          stars: 7, chest: false },
  { day: 14, emoji: '🏆', label: '발표회 대선물!',   stars: 10, chest: true, highRarity: true },
];

export const DAILY_QUESTS = [
  { id: 'dq_speak_3',  emoji: '🗣️', title: '오늘 영어로 3번 말하기',            metric: 'speaksToday',          target: 3, rewardText: '⭐ 별 +3',          stars: 3, chest: false },
  { id: 'dq_spots_3',  emoji: '🐾', title: '오늘 동물 친구 3마리 만나기',        metric: 'uniqueSpotsCount',     target: 3, rewardText: '⭐ 별 +4',          stars: 4, chest: false },
  { id: 'dq_master_1', emoji: '👑', title: '혼자 외우기 또는 💎 퍼펙트 1번!',    metric: 'perfectOrMasterToday', target: 1, rewardText: '🎁 보물상자 1개!',   stars: 2, chest: true, highRarity: false },
];

export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDailyState(dailyState, todayKey) {
  if (dailyState && dailyState.date === todayKey) {
    return {
      date: todayKey,
      speaksToday: Number.isFinite(dailyState.speaksToday) ? dailyState.speaksToday : 0,
      perfectOrMasterToday: Number.isFinite(dailyState.perfectOrMasterToday) ? dailyState.perfectOrMasterToday : 0,
      uniqueSpotsToday: Array.isArray(dailyState.uniqueSpotsToday) ? [...dailyState.uniqueSpotsToday] : [],
      claimedMissions: Array.isArray(dailyState.claimedMissions) ? [...dailyState.claimedMissions] : [],
      allClearClaimed: Boolean(dailyState.allClearClaimed),
    };
  }
  return {
    date: todayKey,
    speaksToday: 0,
    perfectOrMasterToday: 0,
    uniqueSpotsToday: [],
    claimedMissions: [],
    allClearClaimed: false,
  };
}

export function recordDailyActivity(dailyState, todayKey, { spotId, tier = 1, isPerfect = false } = {}) {
  const next = normalizeDailyState(dailyState, todayKey);
  next.speaksToday += 1;
  if (tier >= 3 || isPerfect) next.perfectOrMasterToday += 1;
  if (spotId && !next.uniqueSpotsToday.includes(spotId)) {
    next.uniqueSpotsToday.push(spotId);
  }
  return next;
}

export function evaluateDailyQuests(dailyState) {
  const s = dailyState || { speaksToday: 0, perfectOrMasterToday: 0, uniqueSpotsToday: [], claimedMissions: [], allClearClaimed: false };
  const claimedSet = new Set(s.claimedMissions || []);
  const metrics = {
    speaksToday: s.speaksToday || 0,
    perfectOrMasterToday: s.perfectOrMasterToday || 0,
    uniqueSpotsCount: Array.isArray(s.uniqueSpotsToday) ? s.uniqueSpotsToday.length : 0,
  };

  const quests = DAILY_QUESTS.map(q => {
    const progress = Math.min(q.target, metrics[q.metric] || 0);
    const completed = progress >= q.target;
    const claimed = claimedSet.has(q.id);
    return { ...q, progress, completed, claimed, canClaim: completed && !claimed };
  });

  const allCompleted = quests.every(q => q.completed);
  const allClaimed = Boolean(s.allClearClaimed);
  const canClaimAllClear = allCompleted && !allClaimed;
  const claimableCount = quests.filter(q => q.canClaim).length + (canClaimAllClear ? 1 : 0);

  return { quests, allCompleted, allClaimed, canClaimAllClear, claimableCount };
}

export function claimDailyAttendance(attendanceState, todayKey) {
  const prev = attendanceState && typeof attendanceState === 'object'
    ? {
        days: Array.isArray(attendanceState.days) ? [...attendanceState.days] : [],
        lastClaimDate: attendanceState.lastClaimDate || null,
        streak: Number.isFinite(attendanceState.streak) ? attendanceState.streak : 0,
      }
    : { days: [], lastClaimDate: null, streak: 0 };

  if (prev.lastClaimDate === todayKey || prev.days.includes(todayKey)) {
    const dayNum = Math.min(ATTENDANCE_REWARDS.length, Math.max(1, prev.days.length));
    return { nextAttendance: prev, claimedDay: dayNum, reward: ATTENDANCE_REWARDS[dayNum - 1], alreadyClaimed: true };
  }

  // Compute consecutive streak by checking if lastClaimDate was yesterday
  let nextStreak = 1;
  if (prev.lastClaimDate) {
    const prevDate = new Date(`${prev.lastClaimDate}T00:00:00`);
    const curDate = new Date(`${todayKey}T00:00:00`);
    const diffDays = Math.round((curDate - prevDate) / 86400000);
    if (diffDays === 1) nextStreak = prev.streak + 1;
  }

  const nextDays = [...prev.days, todayKey];
  const cycleDay = ((nextDays.length - 1) % ATTENDANCE_REWARDS.length) + 1;
  const reward = ATTENDANCE_REWARDS[cycleDay - 1];
  const nextAttendance = { days: nextDays, lastClaimDate: todayKey, streak: nextStreak };

  return { nextAttendance, claimedDay: cycleDay, reward, alreadyClaimed: false };
}

// --- v6: Kid-Friendly Word-by-Word Pointing & Speech-to-Text Matching ---
const KID_PHONETIC_ALIASES = {
  said: ['sad', 'set', 'sat', 'say', 'head'],
  wont: ['want', 'one', 'dont', 'went'],
  mice: ['nice', 'my', 'rice', 'ice'],
  barn: ['born', 'bun', 'bar', 'burn', 'bond'],
  curl: ['girl', 'call', 'car', 'cool', 'curls'],
  laughed: ['left', 'raft', 'laugh', 'loved', 'last'],
  owl: ['all', 'howl', 'our', 'out', 'oil'],
  pony: ['funny', 'bony', 'penny', 'tony', 'phoney'],
  donkey: ['monkey', 'dunk', 'funky'],
  sheep: ['ship', 'cheap', 'sleep', 'sheet'],
  goat: ['coat', 'boat', 'got', 'gold', 'go'],
  pig: ['big', 'pick', 'peak', 'peg'],
  farmer: ['father', 'former', 'farm', 'armor'],
  brown: ['crown', 'clown', 'down', 'round', 'brow'],
  quiet: ['quite', 'white', 'client', 'kite'],
  frog: ['fog', 'log', 'from', 'frock'],
  corn: ['horn', 'born', 'coin', 'cone', 'call'],
  duck: ['dog', 'dark', 'dock', 'luck', 'truck'],
  fix: ['six', 'mix', 'picks', 'pics', 'fish'],
  tail: ['tell', 'tall', 'tale', 'trail', 'sale'],
  dance: ['dense', 'dents', 'pants', 'chance', 'dancing'],
  dancing: ['dansing', 'dance', 'chasing'],
  never: ['ever', 'clever', 'neighbor'],
  seen: ['sing', 'scene', 'seem', 'see', 'sin'],
  carrot: ['parrot', 'care', 'car', 'carrots'],
  chicken: ['kitchen', 'check', 'chick'],
  rabbit: ['habit', 'rapid', 'robot'],
  dinner: ['winner', 'inner', 'diner', 'tinner'],
  egg: ['leg', 'ache', 'eight', 'eggs'],
  milk: ['melt', 'silk', 'mill'],
  fish: ['dish', 'wish', 'finish', 'fix'],
  clean: ['green', 'queen', 'keen', 'lean'],
  song: ['long', 'strong', 'some', 'sung'],
  happy: ['heavy', 'hippie', 'hobby'],
  animals: ['animal', 'enamel'],
  know: ['no', 'now', 'new'],
  him: ['hem', 'ham', 'them', 'in'],
  his: ['is', 'he', 'this'],
  for: ['four', 'far', 'or', 'from'],
  an: ['and', 'in', 'a', 'on'],
  the: ['a', 'da', 'de', 'they', 'there'],
  to: ['two', 'too', 'do'],
  eat: ['it', 'heat', 'each'],
  have: ['half', 'had', 'has'],
  you: ['your', 'u', 'do'],
  what: ['want', 'hot', 'but'],
  make: ['bake', 'take', 'cake'],
  give: ['get', 'live', 'gift'],
  pick: ['pig', 'big', 'pack', 'peak'],
  looked: ['look', 'book', 'cooked'],
};

export function normalizeWord(word = '') {
  return String(word).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function tokenizeWords(text = '') {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, index) => ({
      index,
      raw,
      norm: normalizeWord(raw),
    }))
    .filter(w => w.norm.length > 0);
}

function editDistanceAtMostOne(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++; j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function isKidWordMatch(targetNorm, spokenNorm) {
  if (!targetNorm || !spokenNorm) return false;
  if (targetNorm === spokenNorm) return true;
  const aliases = KID_PHONETIC_ALIASES[targetNorm];
  if (aliases && aliases.includes(spokenNorm)) return true;
  if (targetNorm.length >= 4 && spokenNorm.length >= 3 && editDistanceAtMostOne(targetNorm, spokenNorm)) {
    return true;
  }
  return false;
}

export function matchSpokenWords(targetText, spokenTranscript, prevMatched = new Set()) {
  const targetTokens = tokenizeWords(targetText);
  const spokenTokens = tokenizeWords(spokenTranscript).map(t => t.norm);
  const matchedIndices = new Set(prevMatched);

  for (const t of targetTokens) {
    if (matchedIndices.has(t.index)) continue;
    if (spokenTokens.some(sp => isKidWordMatch(t.norm, sp))) {
      matchedIndices.add(t.index);
    }
  }

  const totalCount = targetTokens.length;
  const matchedCount = targetTokens.filter(t => matchedIndices.has(t.index)).length;
  const ratio = totalCount > 0 ? matchedCount / totalCount : 0;
  // Require all words for very short phrases (<=3 words), or >=85% for longer sentences
  const isPerfect = totalCount > 0 && (totalCount <= 3 ? matchedCount === totalCount : ratio >= 0.85);

  return { targetTokens, matchedIndices, matchedCount, totalCount, ratio, isPerfect };
}
