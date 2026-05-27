// ============================================================
// GRAMMAR MODULE — Fill-in-the-blank exercises
// Structured by JLPT level and grammar point
// Each exercise: { id, sentence, blank (index), options, answer, explanation, level, point }
// ============================================================

// ─── N5 GRAMMAR POINTS ───────────────────────────────────────

export const GRAMMAR_N5 = [

  // ── PARTICLES ──────────────────────────────────────────────

  // は (topic marker)
  { id: 'n5-001', level: 'N5', point: 'は (topic marker)',
    sentence: 'わたし ___ がくせいです。', blank: 'は',
    options: ['は', 'が', 'を', 'に'],
    answer: 0,
    hint: 'は marks the topic of the sentence.',
    explanation: 'は (wa) marks the topic. "As for me, I am a student." Use は when introducing what the sentence is about.',
    example: 'わたしは がくせいです。→ I am a student.' },

  // が (subject marker)
  { id: 'n5-002', level: 'N5', point: 'が (subject marker)',
    sentence: 'あそこに ねこ ___ います。', blank: 'が',
    options: ['は', 'が', 'を', 'で'],
    answer: 1,
    hint: 'が marks the subject of existence verbs like います/あります.',
    explanation: 'が marks the grammatical subject. Use が with います (there is, for animate) and あります (there is, for inanimate).',
    example: 'ねこがいます。→ There is a cat.' },

  // を (object marker)
  { id: 'n5-003', level: 'N5', point: 'を (object marker)',
    sentence: 'まいにち にほんご ___ べんきょうします。', blank: 'を',
    options: ['は', 'が', 'を', 'に'],
    answer: 2,
    hint: 'を marks the direct object — the thing being acted on.',
    explanation: 'を (wo) marks the direct object. The thing you eat, study, buy, or do goes before を.',
    example: 'りんごをたべます。→ I eat an apple.' },

  // に (destination/time)
  { id: 'n5-004', level: 'N5', point: 'に (destination)',
    sentence: 'がっこう ___ いきます。', blank: 'に',
    options: ['で', 'に', 'を', 'が'],
    answer: 1,
    hint: 'に marks the destination when using verbs like いく, くる, かえる.',
    explanation: 'に marks direction/destination. Use に with movement verbs (行く, 来る, 帰る). Also used for time: ３時に = at 3 o\'clock.',
    example: 'がっこうにいきます。→ I go to school.' },

  // で (location of action)
  { id: 'n5-005', level: 'N5', point: 'で (location of action)',
    sentence: 'としょかん ___ べんきょうします。', blank: 'で',
    options: ['に', 'で', 'を', 'が'],
    answer: 1,
    hint: 'で marks where an action takes place — not where something exists.',
    explanation: 'で marks where an action happens. "I study AT the library." Different from に which marks destination. に = destination, で = action location.',
    example: 'としょかんでべんきょうします。→ I study at the library.' },

  // に vs で
  { id: 'n5-006', level: 'N5', point: 'に vs で',
    sentence: 'こうえん ___ あそびます。', blank: 'で',
    options: ['に', 'で', 'が', 'を'],
    answer: 1,
    hint: 'Playing (あそぶ) is an action. Where does the action take place?',
    explanation: 'あそぶ is an action verb, so use で for the location. に would be used for destination (going TO the park), で is where you DO something.',
    example: 'こうえんであそびます。→ I play at the park.' },

  // も (also/too)
  { id: 'n5-007', level: 'N5', point: 'も (also)',
    sentence: 'わたし ___ にほんごをはなします。', blank: 'も',
    options: ['は', 'が', 'も', 'を'],
    answer: 2,
    hint: 'も replaces は or が when meaning "also/too".',
    explanation: 'も means "also" or "too". It replaces は or が. If A does something and B ALSO does it, use も for B.',
    example: 'わたしもにほんごをはなします。→ I also speak Japanese.' },

  // の (possessive)
  { id: 'n5-008', level: 'N5', point: 'の (possessive)',
    sentence: 'これはわたし ___ ほんです。', blank: 'の',
    options: ['は', 'の', 'が', 'を'],
    answer: 1,
    hint: 'の connects nouns — like "\'s" in English.',
    explanation: 'の shows possession or connection between nouns. わたしの本 = my book. にほんのりょうり = Japanese food.',
    example: 'わたしのほん → my book | にほんのたべもの → Japanese food' },

  // と (and / with)
  { id: 'n5-009', level: 'N5', point: 'と (and/with)',
    sentence: 'ともだち ___ えいがをみます。', blank: 'と',
    options: ['に', 'で', 'と', 'を'],
    answer: 2,
    hint: 'と means "together with" when doing something WITH someone.',
    explanation: 'と has two uses: A と B = A and B (listing); と + verb = with (together). ともだちとみる = watch WITH a friend.',
    example: 'ともだちとえいがをみます。→ I watch a movie with my friend.' },

  // から/まで (from/until)
  { id: 'n5-010', level: 'N5', point: 'から/まで (from/until)',
    sentence: 'しごとはくじ ___ ごじまでです。', blank: 'から',
    options: ['から', 'まで', 'に', 'で'],
    answer: 0,
    hint: 'から = from (starting point). まで = until (ending point).',
    explanation: 'から marks the starting point (from). まで marks the endpoint (until/to). Work is FROM 9 UNTIL 5.',
    example: 'くじからごじまで → from 9 to 5' },

  // ── VERB FORMS ─────────────────────────────────────────────

  // ます form (polite present)
  { id: 'n5-011', level: 'N5', point: 'ます (polite present/future)',
    sentence: 'まいにち にほんごを べんきょう___。', blank: 'します',
    options: ['します', 'しました', 'しません', 'しています'],
    answer: 0,
    hint: 'Which form expresses habitual present or future action politely?',
    explanation: '〜ます is the polite non-past form. It expresses habitual actions ("I study every day") or future intention.',
    example: 'べんきょうします → I study / I will study' },

  // ました (polite past)
  { id: 'n5-012', level: 'N5', point: 'ました (polite past)',
    sentence: 'きのう すしを たべ___。', blank: 'ました',
    options: ['ます', 'ました', 'ません', 'ませんでした'],
    answer: 1,
    hint: 'きのう (yesterday) tells you the action happened in the past.',
    explanation: '〜ました is the polite past tense. Add ました instead of ます. きのう = yesterday signals past tense.',
    example: 'たべました → I ate | いきました → I went' },

  // ません (polite negative)
  { id: 'n5-013', level: 'N5', point: 'ません (polite negative)',
    sentence: 'おさけを のみ___。', blank: 'ません',
    options: ['ます', 'ました', 'ません', 'ませんでした'],
    answer: 2,
    hint: 'This is a negative statement about a present habit.',
    explanation: '〜ません is polite negative (present/future). I do NOT drink sake. For past negative: ませんでした.',
    example: 'のみません → I don\'t drink | いきません → I don\'t go' },

  // ませんでした (past negative)
  { id: 'n5-014', level: 'N5', point: 'ませんでした (past negative)',
    sentence: 'きのう がっこうに いき___。', blank: 'ませんでした',
    options: ['ます', 'ました', 'ません', 'ませんでした'],
    answer: 3,
    hint: 'Yesterday (きのう) + did NOT go.',
    explanation: '〜ませんでした is past negative. I did NOT go to school yesterday.',
    example: 'いきませんでした → I did not go | たべませんでした → I did not eat' },

  // て-form (connecting / requesting)
  { id: 'n5-015', level: 'N5', point: 'てください (please do)',
    sentence: 'ゆっくり はなし___ください。', blank: 'て',
    options: ['て', 'に', 'を', 'が'],
    answer: 0,
    hint: '〜てください = please do ~. The verb goes into て-form first.',
    explanation: 'Verb て-form + ください = please do ~. はなす → はなして → はなしてください = Please speak.',
    example: 'はなしてください → Please speak | みてください → Please look' },

  // ている (ongoing action)
  { id: 'n5-016', level: 'N5', point: 'ている (ongoing action)',
    sentence: 'いま あめが ふっ___。', blank: 'ています',
    options: ['ます', 'ました', 'ています', 'てください'],
    answer: 2,
    hint: 'いま (now) + ongoing state — rain is currently falling.',
    explanation: '〜ています expresses: (1) ongoing action = currently doing, (2) resultant state = has happened and continues. It\'s raining RIGHT NOW.',
    example: 'ふっています → It is raining | たべています → I am eating' },

  // たい (want to)
  { id: 'n5-017', level: 'N5', point: 'たい (want to)',
    sentence: 'にほんに いき___です。', blank: 'たい',
    options: ['ます', 'たい', 'ません', 'ました'],
    answer: 1,
    hint: 'たい expresses desire — what you WANT to do.',
    explanation: 'Verb stem + たい = want to do. Remove ます, add たい. いきます → いき + たい → いきたい = want to go.',
    example: 'いきたい → want to go | たべたい → want to eat' },

  // ── ADJECTIVES ─────────────────────────────────────────────

  // い-adjective present
  { id: 'n5-018', level: 'N5', point: 'い-adjective (present)',
    sentence: 'きょうは てんきが ___ です。', blank: 'いい',
    options: ['いい', 'よかった', 'よくない', 'よくなかった'],
    answer: 0,
    hint: 'Present tense, positive. The weather is good today.',
    explanation: 'い-adjectives end in い. Present positive: adjective + です. いい is irregular: good.',
    example: 'てんきがいいです → The weather is good' },

  // い-adjective past
  { id: 'n5-019', level: 'N5', point: 'い-adjective past',
    sentence: 'きのうは さむ___ です。', blank: 'かった',
    options: ['い', 'かった', 'くない', 'くなかった'],
    answer: 1,
    hint: 'Past tense of い-adjective: drop い, add かった.',
    explanation: 'い-adjective past: drop い → add かった. さむい → さむかった = it was cold. Except いい → よかった.',
    example: 'さむかったです → It was cold | たかかったです → It was expensive' },

  // い-adjective negative
  { id: 'n5-020', level: 'N5', point: 'い-adjective negative',
    sentence: 'このみせは たか___ です。', blank: 'くない',
    options: ['い', 'かった', 'くない', 'くなかった'],
    answer: 2,
    hint: 'Negative of い-adjective: drop い, add くない.',
    explanation: 'い-adjective negative: drop い → add くない. たかい → たかくない = not expensive.',
    example: 'たかくないです → not expensive | さむくないです → not cold' },

  // な-adjective
  { id: 'n5-021', level: 'N5', point: 'な-adjective',
    sentence: 'かのじょは にほんごが じょうず___ です。', blank: 'な (before noun) / ∅ (before です)',
    options: ['な', 'の', 'い', 'を'],
    answer: 0,
    hint: 'な-adjectives need な when modifying nouns directly.',
    explanation: 'な-adjectives use な before nouns: じょうずなひと = skillful person. Before です they don\'t need な: じょうずです.',
    example: 'じょうずなひと → skillful person | きれいなはな → beautiful flower' },

  // ── QUESTION WORDS ─────────────────────────────────────────

  // どこ (where)
  { id: 'n5-022', level: 'N5', point: 'どこ (where)',
    sentence: 'トイレは ___ ですか。', blank: 'どこ',
    options: ['なに', 'どこ', 'だれ', 'いつ'],
    answer: 1,
    hint: 'Which question word asks about location?',
    explanation: 'どこ = where. Question words: なに/なん = what, どこ = where, だれ = who, いつ = when, どうして = why, どのくらい = how much/long.',
    example: 'どこですか → Where is it? | どこにいきますか → Where are you going?' },

  // なん / なに (what)
  { id: 'n5-023', level: 'N5', point: 'なん vs なに (what)',
    sentence: 'これは ___ ですか。', blank: 'なん',
    options: ['なに', 'なん', 'どこ', 'だれ'],
    answer: 1,
    hint: 'Before です/で/の — use なん. Before other particles — use なに.',
    explanation: 'Use なん before: です, で, の, and counters (なんにん, なんじ). Use なに before: を, が, and alone. これはなんですか = What is this?',
    example: 'なんですか → What is it? | なにをしますか → What will you do?' },

  // いつ (when)
  { id: 'n5-024', level: 'N5', point: 'いつ (when)',
    sentence: 'たんじょうびは ___ ですか。', blank: 'いつ',
    options: ['なに', 'どこ', 'いつ', 'だれ'],
    answer: 2,
    hint: 'Which question word asks about time?',
    explanation: 'いつ = when. It can be placed at the start of a sentence or before です.',
    example: 'いつですか → When is it? | いついきますか → When will you go?' },

  // ── STRUCTURE ──────────────────────────────────────────────

  // じゃないです (negative copula)
  { id: 'n5-025', level: 'N5', point: 'じゃないです (not)',
    sentence: 'わたしは がくせい ___ ありません。', blank: 'では',
    options: ['では', 'には', 'をは', 'がは'],
    answer: 0,
    hint: 'ではありません is the formal negative of です.',
    explanation: 'ではありません is the polite formal negative of です. Casual: じゃない. わたしはがくせいではありません = I am not a student.',
    example: 'がくせいではありません → Not a student | にほんじんではありません → Not Japanese' },

  // ね / よ (sentence-ending)
  { id: 'n5-026', level: 'N5', point: 'ね vs よ (sentence particles)',
    sentence: 'このラーメンはおいしい___！（I\'m telling you）', blank: 'よ',
    options: ['ね', 'よ', 'か', 'の'],
    answer: 1,
    hint: 'よ = asserting new information to the listener. ね = seeking agreement.',
    explanation: 'よ = I\'m informing/insisting (you may not know this). ね = right? / isn\'t it? (seeking agreement or shared feeling).',
    example: 'おいしいよ！→ It\'s delicious! (I\'m telling you) | おいしいね → It\'s delicious, isn\'t it?' },

  // もう / まだ
  { id: 'n5-027', level: 'N5', point: 'もう vs まだ',
    sentence: '___ たべましたか。（Have you eaten yet?）', blank: 'もう',
    options: ['もう', 'まだ', 'また', 'もっと'],
    answer: 0,
    hint: 'Which word asks "already/yet" in questions about completed actions?',
    explanation: 'もう = already (positive) / anymore (negative). まだ = still / not yet. もうたべましたか = Have you eaten already? まだ = Not yet.',
    example: 'もうたべました → I already ate | まだたべていません → I haven\'t eaten yet' },

  // あります vs います
  { id: 'n5-028', level: 'N5', point: 'あります vs います',
    sentence: 'こうえんに こどもが ___。', blank: 'います',
    options: ['あります', 'います', 'いります', 'あります'],
    answer: 1,
    hint: 'います = existence of living things. あります = existence of non-living things.',
    explanation: 'います (いる) = for people, animals — animate beings. あります (ある) = for objects, places, events — inanimate. Children are alive → います.',
    example: 'ねこがいます → There is a cat | ほんがあります → There is a book' },

  // てもいいですか (may I?)
  { id: 'n5-029', level: 'N5', point: 'てもいいですか (may I?)',
    sentence: 'しゃしんを とっ___ いいですか。', blank: 'ても',
    options: ['ても', 'では', 'てに', 'がも'],
    answer: 0,
    hint: 'て-form + も + いいですか = May I ~?',
    explanation: 'Verb て-form + もいいですか = May I ~? / Is it okay if I ~? The response: もちろん or どうぞ for yes, ちょっと… for polite no.',
    example: 'とってもいいですか → May I take (a photo)? | はいってもいいですか → May I come in?' },

  // からです (because)
  { id: 'n5-030', level: 'N5', point: 'から (because/reason)',
    sentence: 'あついです。まど をあけて___。', blank: 'ください',
    options: ['から', 'ので', 'ください', 'です'],
    answer: 2,
    hint: 'This sentence is a request (please open the window because it\'s hot).',
    explanation: 'Two sentence structures: (reason)から、(result) = Because it\'s hot, please open the window. から gives the reason/cause.',
    example: 'あついですから → Because it\'s hot | つかれたから → Because I\'m tired' },
]

// ─── N4 GRAMMAR POINTS ───────────────────────────────────────

export const GRAMMAR_N4 = [

  { id: 'n4-001', level: 'N4', point: 'ことができる (can do)',
    sentence: 'わたしは にほんごを はなす___ できます。', blank: 'こと',
    options: ['こと', 'もの', 'ところ', 'ため'],
    answer: 0,
    hint: 'Verb dictionary form + ことができる = can do ~',
    explanation: '〜ことができる expresses ability. Verb plain form + ことができます. More formal than just 〜られます.',
    example: 'にほんごをはなすことができます → I can speak Japanese' },

  { id: 'n4-002', level: 'N4', point: 'たことがある (have done before)',
    sentence: 'すしを たべた___ があります。', blank: 'こと',
    options: ['こと', 'もの', 'ため', 'ところ'],
    answer: 0,
    hint: 'Past plain form + ことがある = have experience of doing',
    explanation: '〜たことがある expresses past experience. Verb past plain form + ことがあります = I have done ~ before.',
    example: 'たべたことがあります → I have eaten (it) before' },

  { id: 'n4-003', level: 'N4', point: 'ながら (while doing)',
    sentence: 'おんがくを きき___ べんきょうします。', blank: 'ながら',
    options: ['ながら', 'てから', 'たり', 'のに'],
    answer: 0,
    hint: 'ながら = doing two things simultaneously',
    explanation: 'Verb stem + ながら = while doing ~. Both actions happen at the same time. The main action comes at the end.',
    example: 'きながら → while listening | あるきながら → while walking' },

  { id: 'n4-004', level: 'N4', point: 'てから (after doing)',
    sentence: 'しゅくだいを して___ あそびます。', blank: 'から',
    options: ['から', 'ながら', 'ために', 'のに'],
    answer: 0,
    hint: 'て-form + から = after doing ~, then...',
    explanation: '〜てから expresses sequential actions: do A, then do B. Different from ながら (simultaneous).',
    example: 'してから → after doing | たべてから → after eating' },

  { id: 'n4-005', level: 'N4', point: 'ために (in order to)',
    sentence: 'にほんごを まなぶ___ にほんに きました。', blank: 'ために',
    options: ['ために', 'から', 'ながら', 'のに'],
    answer: 0,
    hint: 'ために = for the purpose of / in order to',
    explanation: 'Verb plain form + ために = in order to ~. Expresses purpose. The subject of both clauses must be the same.',
    example: 'まなぶために → in order to learn | けんこうのために → for health' },
]

// ─── GRAMMAR COLLECTIONS ─────────────────────────────────────

export const GRAMMAR_COLLECTIONS = [
  { id: 'g-particles',   label: 'Particles (は・が・を・に・で)',  cards: GRAMMAR_N5.filter(g => g.point.match(/は|が|を|に|で|も|の|と|から/)) },
  { id: 'g-verbs',       label: 'Verb Forms (ます・た・ない)',     cards: GRAMMAR_N5.filter(g => g.point.match(/ます|ました|ません|ている|たい|てください/)) },
  { id: 'g-adjectives',  label: 'Adjectives (い・な)',             cards: GRAMMAR_N5.filter(g => g.point.match(/adjective|い-adj|な-adj/i)) },
  { id: 'g-questions',   label: 'Question Words (どこ・なに・いつ)', cards: GRAMMAR_N5.filter(g => g.point.match(/どこ|なに|いつ|だれ/)) },
  { id: 'g-structure',   label: 'Sentence Structure (N5)',        cards: GRAMMAR_N5.filter(g => g.point.match(/ね|よ|もう|あります|います|てもいい|から/)) },
  { id: 'g-n4',          label: 'N4 Grammar Points',             cards: GRAMMAR_N4 },
  { id: 'g-all-n5',      label: 'All N5 Grammar',                cards: GRAMMAR_N5 },
]

export const ALL_GRAMMAR = [...GRAMMAR_N5, ...GRAMMAR_N4]
