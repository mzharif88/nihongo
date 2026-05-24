// ============================================================
// EXPANDED MODULES — Hiragana+, Katakana+, Time, Money,
// Counting, Sentence Builder, Common Sentences, Expressions
// ============================================================

// ─── HIRAGANA EXPANDED ────────────────────────────────────────

export const HIRAGANA_DAKUTEN = [
  // が行 (ga row)
  { character: 'が', romaji: 'ga',  english: 'ga',  example_jp: 'がっこう (gakkou)', example_en: 'School',        mnemonic: 'か + two dots = voiced' },
  { character: 'ぎ', romaji: 'gi',  english: 'gi',  example_jp: 'ぎんこう (ginkou)', example_en: 'Bank',          mnemonic: 'き + two dots' },
  { character: 'ぐ', romaji: 'gu',  english: 'gu',  example_jp: 'ぐんて (gunte)',   example_en: 'Work gloves',    mnemonic: 'く + two dots' },
  { character: 'げ', romaji: 'ge',  english: 'ge',  example_jp: 'げんき (genki)',   example_en: 'Healthy',        mnemonic: 'け + two dots' },
  { character: 'ご', romaji: 'go',  english: 'go',  example_jp: 'ごはん (gohan)',   example_en: 'Rice/meal',      mnemonic: 'こ + two dots' },
  // ざ行 (za row)
  { character: 'ざ', romaji: 'za',  english: 'za',  example_jp: 'ざっし (zasshi)', example_en: 'Magazine',       mnemonic: 'さ + two dots' },
  { character: 'じ', romaji: 'ji',  english: 'ji',  example_jp: 'じかん (jikan)',   example_en: 'Time',           mnemonic: 'し + two dots' },
  { character: 'ず', romaji: 'zu',  english: 'zu',  example_jp: 'ずっと (zutto)',   example_en: 'All along',      mnemonic: 'す + two dots' },
  { character: 'ぜ', romaji: 'ze',  english: 'ze',  example_jp: 'ぜんぶ (zenbu)',   example_en: 'Everything',     mnemonic: 'せ + two dots' },
  { character: 'ぞ', romaji: 'zo',  english: 'zo',  example_jp: 'ぞう (zou)',       example_en: 'Elephant',       mnemonic: 'そ + two dots' },
  // だ行 (da row)
  { character: 'だ', romaji: 'da',  english: 'da',  example_jp: 'だいがく (daigaku)',example_en: 'University',    mnemonic: 'た + two dots' },
  { character: 'ぢ', romaji: 'di',  english: 'di',  example_jp: 'はなぢ (hanaji)', example_en: 'Nosebleed',      mnemonic: 'ち + two dots (rare)' },
  { character: 'づ', romaji: 'du',  english: 'du',  example_jp: 'つづく (tsuzuku)', example_en: 'Continue',      mnemonic: 'つ + two dots (rare)' },
  { character: 'で', romaji: 'de',  english: 'de',  example_jp: 'でんしゃ (densha)',example_en: 'Train',          mnemonic: 'て + two dots' },
  { character: 'ど', romaji: 'do',  english: 'do',  example_jp: 'どこ (doko)',      example_en: 'Where',          mnemonic: 'と + two dots' },
  // ば行 (ba row)
  { character: 'ば', romaji: 'ba',  english: 'ba',  example_jp: 'ばんごはん (bangohan)',example_en: 'Dinner',    mnemonic: 'は + two dots' },
  { character: 'び', romaji: 'bi',  english: 'bi',  example_jp: 'びょういん (byouin)',example_en: 'Hospital',   mnemonic: 'ひ + two dots' },
  { character: 'ぶ', romaji: 'bu',  english: 'bu',  example_jp: 'ぶんか (bunka)',   example_en: 'Culture',        mnemonic: 'ふ + two dots' },
  { character: 'べ', romaji: 'be',  english: 'be',  example_jp: 'べんきょう (benkyou)',example_en: 'Study',      mnemonic: 'へ + two dots' },
  { character: 'ぼ', romaji: 'bo',  english: 'bo',  example_jp: 'ぼうし (boushi)', example_en: 'Hat',            mnemonic: 'ほ + two dots' },
  // ぱ行 (pa row) — handakuten
  { character: 'ぱ', romaji: 'pa',  english: 'pa',  example_jp: 'パーティー (paatii)', example_en: 'Party',      mnemonic: 'は + circle (handakuten)' },
  { character: 'ぴ', romaji: 'pi',  english: 'pi',  example_jp: 'ぴんく (pinku)',   example_en: 'Pink',           mnemonic: 'ひ + circle' },
  { character: 'ぷ', romaji: 'pu',  english: 'pu',  example_jp: 'ぷーる (puuru)',   example_en: 'Pool',           mnemonic: 'ふ + circle' },
  { character: 'ぺ', romaji: 'pe',  english: 'pe',  example_jp: 'ぺん (pen)',       example_en: 'Pen',            mnemonic: 'へ + circle' },
  { character: 'ぽ', romaji: 'po',  english: 'po',  example_jp: 'ぽすと (posuto)', example_en: 'Mailbox',        mnemonic: 'ほ + circle' },
]

export const HIRAGANA_COMBOS = [
  { character: 'きゃ', romaji: 'kya', english: 'kya', example_jp: 'きゃく (kyaku)',   example_en: 'Guest/customer', mnemonic: 'き + small や' },
  { character: 'きゅ', romaji: 'kyu', english: 'kyu', example_jp: 'きゅう (kyuu)',    example_en: 'Nine',           mnemonic: 'き + small ゆ' },
  { character: 'きょ', romaji: 'kyo', english: 'kyo', example_jp: 'きょう (kyou)',    example_en: 'Today',          mnemonic: 'き + small よ' },
  { character: 'しゃ', romaji: 'sha', english: 'sha', example_jp: 'しゃしん (shashin)',example_en: 'Photo',         mnemonic: 'し + small や' },
  { character: 'しゅ', romaji: 'shu', english: 'shu', example_jp: 'しゅみ (shumi)',   example_en: 'Hobby',          mnemonic: 'し + small ゆ' },
  { character: 'しょ', romaji: 'sho', english: 'sho', example_jp: 'しょくじ (shokuji)',example_en: 'Meal',          mnemonic: 'し + small よ' },
  { character: 'ちゃ', romaji: 'cha', english: 'cha', example_jp: 'おちゃ (ocha)',    example_en: 'Tea',            mnemonic: 'ち + small や' },
  { character: 'ちゅ', romaji: 'chu', english: 'chu', example_jp: 'ちゅうごく (chuugoku)',example_en: 'China',     mnemonic: 'ち + small ゆ' },
  { character: 'ちょ', romaji: 'cho', english: 'cho', example_jp: 'ちょっと (chotto)', example_en: 'A little',      mnemonic: 'ち + small よ' },
  { character: 'にゃ', romaji: 'nya', english: 'nya', example_jp: 'にゃあ (nyaa)',    example_en: 'Meow',           mnemonic: 'に + small や' },
  { character: 'にゅ', romaji: 'nyu', english: 'nyu', example_jp: 'にゅうがく (nyuugaku)',example_en: 'Enrollment', mnemonic: 'に + small ゆ' },
  { character: 'にょ', romaji: 'nyo', english: 'nyo', example_jp: 'にょろにょろ',     example_en: 'Wriggling',      mnemonic: 'に + small よ' },
  { character: 'ひゃ', romaji: 'hya', english: 'hya', example_jp: 'ひゃく (hyaku)',   example_en: 'Hundred',        mnemonic: 'ひ + small や' },
  { character: 'ひゅ', romaji: 'hyu', english: 'hyu', example_jp: 'ひゅうっと',       example_en: 'Whoosh',         mnemonic: 'ひ + small ゆ' },
  { character: 'ひょ', romaji: 'hyo', english: 'hyo', example_jp: 'ひょうき (hyouki)', example_en: 'Funny/Clownish', mnemonic: 'ひ + small よ' },
  { character: 'みゃ', romaji: 'mya', english: 'mya', example_jp: 'みゃく (myaku)',   example_en: 'Pulse',          mnemonic: 'み + small や' },
  { character: 'みゅ', romaji: 'myu', english: 'myu', example_jp: 'みゅうじっく',     example_en: 'Music',          mnemonic: 'み + small ゆ' },
  { character: 'みょ', romaji: 'myo', english: 'myo', example_jp: 'みょうじ (myouji)', example_en: 'Surname',        mnemonic: 'み + small よ' },
  { character: 'りゃ', romaji: 'rya', english: 'rya', example_jp: 'りゃくご (ryakugo)',example_en: 'Abbreviation',  mnemonic: 'り + small や' },
  { character: 'りゅ', romaji: 'ryu', english: 'ryu', example_jp: 'りゅう (ryuu)',    example_en: 'Dragon',         mnemonic: 'り + small ゆ' },
  { character: 'りょ', romaji: 'ryo', english: 'ryo', example_jp: 'りょこう (ryokou)', example_en: 'Travel',         mnemonic: 'り + small よ' },
  { character: 'ぎゃ', romaji: 'gya', english: 'gya', example_jp: 'ぎゃく (gyaku)',   example_en: 'Reverse',        mnemonic: 'ぎ + small や' },
  { character: 'ぎゅ', romaji: 'gyu', english: 'gyu', example_jp: 'ぎゅうにく (gyuuniku)',example_en: 'Beef',       mnemonic: 'ぎ + small ゆ' },
  { character: 'ぎょ', romaji: 'gyo', english: 'gyo', example_jp: 'ぎょうざ (gyouza)', example_en: 'Gyoza/Dumplings',mnemonic: 'ぎ + small よ' },
  { character: 'じゃ', romaji: 'ja',  english: 'ja',  example_jp: 'じゃあね (jaa ne)', example_en: 'See you!',       mnemonic: 'じ + small や' },
  { character: 'じゅ', romaji: 'ju',  english: 'ju',  example_jp: 'じゅぎょう (jugyou)',example_en: 'Lesson',        mnemonic: 'じ + small ゆ' },
  { character: 'じょ', romaji: 'jo',  english: 'jo',  example_jp: 'じょうず (jouzu)', example_en: 'Skillful',       mnemonic: 'じ + small よ' },
  { character: 'びゃ', romaji: 'bya', english: 'bya', example_jp: 'びゃくや',         example_en: 'White night',    mnemonic: 'び + small や' },
  { character: 'びゅ', romaji: 'byu', english: 'byu', example_jp: 'びゅうっと',       example_en: 'Whoosh',         mnemonic: 'び + small ゆ' },
  { character: 'びょ', romaji: 'byo', english: 'byo', example_jp: 'びょういん (byouin)',example_en: 'Hospital',     mnemonic: 'び + small よ' },
  { character: 'ぴゃ', romaji: 'pya', english: 'pya', example_jp: 'ぴゃっと',         example_en: 'Quickly',        mnemonic: 'ぴ + small や' },
  { character: 'ぴゅ', romaji: 'pyu', english: 'pyu', example_jp: 'ぴゅうっと',       example_en: 'Whooshing',      mnemonic: 'ぴ + small ゆ' },
  { character: 'ぴょ', romaji: 'pyo', english: 'pyo', example_jp: 'ぴょんと',         example_en: 'Jump/Hop',       mnemonic: 'ぴ + small よ' },
]

// ─── KATAKANA EXPANDED ────────────────────────────────────────

export const KATAKANA_DAKUTEN = [
  { character: 'ガ', romaji: 'ga',  english: 'ga',  example_jp: 'ゲーム (geemu)',    example_en: 'Game',           mnemonic: 'カ + two dots' },
  { character: 'ギ', romaji: 'gi',  english: 'gi',  example_jp: 'ギター (gitaa)',    example_en: 'Guitar',         mnemonic: 'キ + two dots' },
  { character: 'グ', romaji: 'gu',  english: 'gu',  example_jp: 'グラス (gurasu)',   example_en: 'Glass',          mnemonic: 'ク + two dots' },
  { character: 'ゲ', romaji: 'ge',  english: 'ge',  example_jp: 'ゲーム (geemu)',    example_en: 'Game',           mnemonic: 'ケ + two dots' },
  { character: 'ゴ', romaji: 'go',  english: 'go',  example_jp: 'ゴルフ (gorufu)',   example_en: 'Golf',           mnemonic: 'コ + two dots' },
  { character: 'ザ', romaji: 'za',  english: 'za',  example_jp: 'ザーッと',          example_en: 'Sound of rain',  mnemonic: 'サ + two dots' },
  { character: 'ジ', romaji: 'ji',  english: 'ji',  example_jp: 'ジュース (juusu)', example_en: 'Juice',          mnemonic: 'シ + two dots' },
  { character: 'ズ', romaji: 'zu',  english: 'zu',  example_jp: 'ズボン (zubon)',    example_en: 'Trousers',       mnemonic: 'ス + two dots' },
  { character: 'ゼ', romaji: 'ze',  english: 'ze',  example_jp: 'ゼロ (zero)',       example_en: 'Zero',           mnemonic: 'セ + two dots' },
  { character: 'ゾ', romaji: 'zo',  english: 'zo',  example_jp: 'ゾーン (zoon)',     example_en: 'Zone',           mnemonic: 'ソ + two dots' },
  { character: 'ダ', romaji: 'da',  english: 'da',  example_jp: 'ダンス (dansu)',    example_en: 'Dance',          mnemonic: 'タ + two dots' },
  { character: 'デ', romaji: 'de',  english: 'de',  example_jp: 'デート (deeto)',    example_en: 'Date (romantic)',mnemonic: 'テ + two dots' },
  { character: 'ド', romaji: 'do',  english: 'do',  example_jp: 'ドア (doa)',        example_en: 'Door',           mnemonic: 'ト + two dots' },
  { character: 'バ', romaji: 'ba',  english: 'ba',  example_jp: 'バス (basu)',       example_en: 'Bus',            mnemonic: 'ハ + two dots' },
  { character: 'ビ', romaji: 'bi',  english: 'bi',  example_jp: 'ビール (biiru)',    example_en: 'Beer',           mnemonic: 'ヒ + two dots' },
  { character: 'ブ', romaji: 'bu',  english: 'bu',  example_jp: 'ブルー (buruu)',    example_en: 'Blue',           mnemonic: 'フ + two dots' },
  { character: 'ベ', romaji: 'be',  english: 'be',  example_jp: 'ベッド (beddo)',    example_en: 'Bed',            mnemonic: 'ヘ + two dots' },
  { character: 'ボ', romaji: 'bo',  english: 'bo',  example_jp: 'ボール (booru)',    example_en: 'Ball',           mnemonic: 'ホ + two dots' },
  { character: 'パ', romaji: 'pa',  english: 'pa',  example_jp: 'パーティー (paatii)',example_en: 'Party',         mnemonic: 'ハ + circle' },
  { character: 'ピ', romaji: 'pi',  english: 'pi',  example_jp: 'ピザ (piza)',       example_en: 'Pizza',          mnemonic: 'ヒ + circle' },
  { character: 'プ', romaji: 'pu',  english: 'pu',  example_jp: 'プール (puuru)',    example_en: 'Pool',           mnemonic: 'フ + circle' },
  { character: 'ペ', romaji: 'pe',  english: 'pe',  example_jp: 'ペン (pen)',        example_en: 'Pen',            mnemonic: 'ヘ + circle' },
  { character: 'ポ', romaji: 'po',  english: 'po',  example_jp: 'ポスト (posuto)',   example_en: 'Mailbox',        mnemonic: 'ホ + circle' },
  { character: 'ヴ', romaji: 'vu',  english: 'vu',  example_jp: 'ヴァイオリン (vaiorin)',example_en: 'Violin',    mnemonic: 'ウ + two dots (for V sounds)' },
  { character: 'ヷ', romaji: 'va',  english: 'va',  example_jp: 'ヴァン (van)',      example_en: 'Van',            mnemonic: 'Used in foreign loanwords' },
]

export const KATAKANA_COMBOS = [
  { character: 'キャ', romaji: 'kya', english: 'kya', example_jp: 'キャンプ (kyanpu)',  example_en: 'Camp',          mnemonic: 'キ + small ャ' },
  { character: 'キュ', romaji: 'kyu', english: 'kyu', example_jp: 'キュート (kyuuto)', example_en: 'Cute',           mnemonic: 'キ + small ュ' },
  { character: 'キョ', romaji: 'kyo', english: 'kyo', example_jp: 'キョロキョロ',      example_en: 'Looking around', mnemonic: 'キ + small ョ' },
  { character: 'シャ', romaji: 'sha', english: 'sha', example_jp: 'シャワー (shawaa)', example_en: 'Shower',         mnemonic: 'シ + small ャ' },
  { character: 'シュ', romaji: 'shu', english: 'shu', example_jp: 'シュート (shuuto)', example_en: 'Shoot/Goal',     mnemonic: 'シ + small ュ' },
  { character: 'ショ', romaji: 'sho', english: 'sho', example_jp: 'ショッピング',      example_en: 'Shopping',       mnemonic: 'シ + small ョ' },
  { character: 'チャ', romaji: 'cha', english: 'cha', example_jp: 'チャンス (chansu)', example_en: 'Chance',         mnemonic: 'チ + small ャ' },
  { character: 'チュ', romaji: 'chu', english: 'chu', example_jp: 'チューブ (chuubu)', example_en: 'Tube',           mnemonic: 'チ + small ュ' },
  { character: 'チョ', romaji: 'cho', english: 'cho', example_jp: 'チョコレート',      example_en: 'Chocolate',      mnemonic: 'チ + small ョ' },
  { character: 'ニャ', romaji: 'nya', english: 'nya', example_jp: 'ニャン (nyan)',     example_en: 'Meow (cat)',     mnemonic: 'ニ + small ャ' },
  { character: 'ニュ', romaji: 'nyu', english: 'nyu', example_jp: 'ニュース (nyuusu)',  example_en: 'News',          mnemonic: 'ニ + small ュ' },
  { character: 'ニョ', romaji: 'nyo', english: 'nyo', example_jp: 'ニョロニョロ',      example_en: 'Squiggly',       mnemonic: 'ニ + small ョ' },
  { character: 'ヒャ', romaji: 'hya', english: 'hya', example_jp: 'ヒャッホー',        example_en: 'Yahoo!',         mnemonic: 'ヒ + small ャ' },
  { character: 'ヒュ', romaji: 'hyu', english: 'hyu', example_jp: 'ヒューマン',        example_en: 'Human',          mnemonic: 'ヒ + small ュ' },
  { character: 'ヒョ', romaji: 'hyo', english: 'hyo', example_jp: 'ヒョウ (hyou)',     example_en: 'Leopard',        mnemonic: 'ヒ + small ョ' },
  { character: 'ミャ', romaji: 'mya', english: 'mya', example_jp: 'ミャンマー',        example_en: 'Myanmar',        mnemonic: 'ミ + small ャ' },
  { character: 'ミュ', romaji: 'myu', english: 'myu', example_jp: 'ミュージック',      example_en: 'Music',          mnemonic: 'ミ + small ュ' },
  { character: 'ミョ', romaji: 'myo', english: 'myo', example_jp: 'ミョウバン',        example_en: 'Alum',           mnemonic: 'ミ + small ョ' },
  { character: 'リャ', romaji: 'rya', english: 'rya', example_jp: 'リャマ (ryama)',    example_en: 'Llama',          mnemonic: 'リ + small ャ' },
  { character: 'リュ', romaji: 'ryu', english: 'ryu', example_jp: 'リュック (ryukku)', example_en: 'Backpack',       mnemonic: 'リ + small ュ' },
  { character: 'リョ', romaji: 'ryo', english: 'ryo', example_jp: 'リョカン (ryokan)', example_en: 'Japanese inn',   mnemonic: 'リ + small ョ' },
  { character: 'ギャ', romaji: 'gya', english: 'gya', example_jp: 'ギャップ (gyappu)', example_en: 'Gap',            mnemonic: 'ギ + small ャ' },
  { character: 'ジャ', romaji: 'ja',  english: 'ja',  example_jp: 'ジャム (jamu)',     example_en: 'Jam',            mnemonic: 'ジ + small ャ' },
  { character: 'ジュ', romaji: 'ju',  english: 'ju',  example_jp: 'ジュース (juusu)',  example_en: 'Juice',          mnemonic: 'ジ + small ュ' },
  { character: 'ジョ', romaji: 'jo',  english: 'jo',  example_jp: 'ジョーク (jooku)', example_en: 'Joke',            mnemonic: 'ジ + small ョ' },
  { character: 'ビャ', romaji: 'bya', english: 'bya', example_jp: 'ビャクヤ',         example_en: 'White night',    mnemonic: 'ビ + small ャ' },
  { character: 'ビュ', romaji: 'byu', english: 'byu', example_jp: 'ビュッフェ',        example_en: 'Buffet',         mnemonic: 'ビ + small ュ' },
  { character: 'ビョ', romaji: 'byo', english: 'byo', example_jp: 'ビョーンと',        example_en: 'Boing!',         mnemonic: 'ビ + small ョ' },
  { character: 'ピャ', romaji: 'pya', english: 'pya', example_jp: 'ピャッと',         example_en: 'Swiftly',        mnemonic: 'ピ + small ャ' },
  { character: 'ピュ', romaji: 'pyu', english: 'pyu', example_jp: 'ピューマ',          example_en: 'Puma',           mnemonic: 'ピ + small ュ' },
  { character: 'ピョ', romaji: 'pyo', english: 'pyo', example_jp: 'ピョンと跳ぶ',     example_en: 'Hop!',           mnemonic: 'ピ + small ョ' },
]

// ─── TIME MODULE ──────────────────────────────────────────────

export const TIME_CARDS = [
  // Hours
  { character: '一時',  romaji: 'ichiji',   english: '1 o\'clock',  example_jp: '一時に起きる',      example_en: 'Wake up at 1',        mnemonic: 'いち (1) + じ (o\'clock)' },
  { character: '二時',  romaji: 'niji',     english: '2 o\'clock',  example_jp: '二時に会う',        example_en: 'Meet at 2',           mnemonic: 'に (2) + じ' },
  { character: '三時',  romaji: 'sanji',    english: '3 o\'clock',  example_jp: '三時のおやつ',      example_en: '3 o\'clock snack',    mnemonic: 'さん (3) + じ' },
  { character: '四時',  romaji: 'yoji',     english: '4 o\'clock',  example_jp: '四時に終わる',      example_en: 'Finish at 4',         mnemonic: 'よ (4) + じ' },
  { character: '五時',  romaji: 'goji',     english: '5 o\'clock',  example_jp: '五時に帰る',        example_en: 'Return at 5',         mnemonic: 'ご (5) + じ' },
  { character: '六時',  romaji: 'rokuji',   english: '6 o\'clock',  example_jp: '六時に起きる',      example_en: 'Wake up at 6',        mnemonic: 'ろく (6) + じ' },
  { character: '七時',  romaji: 'shichiji', english: '7 o\'clock',  example_jp: '七時のニュース',    example_en: 'Seven o\'clock news', mnemonic: 'しち (7) + じ' },
  { character: '八時',  romaji: 'hachiji',  english: '8 o\'clock',  example_jp: '八時に出る',        example_en: 'Leave at 8',          mnemonic: 'はち (8) + じ' },
  { character: '九時',  romaji: 'kuji',     english: '9 o\'clock',  example_jp: '九時に寝る',        example_en: 'Sleep at 9',          mnemonic: 'く (9) + じ' },
  { character: '十時',  romaji: 'juuji',    english: '10 o\'clock', example_jp: '十時に始まる',      example_en: 'Start at 10',         mnemonic: 'じゅう (10) + じ' },
  { character: '十一時',romaji: 'juuichiji',english: '11 o\'clock', example_jp: '十一時に終わる',    example_en: 'End at 11',           mnemonic: '11 + じ' },
  { character: '十二時',romaji: 'juuniji',  english: '12 o\'clock', example_jp: '十二時に昼ご飯',    example_en: 'Lunch at 12',         mnemonic: '12 + じ' },
  // Minutes
  { character: '〜分',  romaji: '~fun/pun', english: '~ minutes',   example_jp: '五分後 (gofungo)',  example_en: 'Five minutes later',  mnemonic: 'ふん (fun) after 1,3,4,6 / ぷん (pun) after 1p,6p,8p,10p' },
  { character: '半',    romaji: 'han',      english: 'Half past',   example_jp: '三時半',            example_en: '3:30',                mnemonic: 'はん = half' },
  { character: '午前',  romaji: 'gozen',    english: 'AM (before noon)', example_jp: '午前六時',     example_en: '6 AM',                mnemonic: 'ごぜん = before noon' },
  { character: '午後',  romaji: 'gogo',     english: 'PM (after noon)',  example_jp: '午後三時',     example_en: '3 PM',                mnemonic: 'ごご = after noon' },
  { character: '今',    romaji: 'ima',      english: 'Now',         example_jp: '今、何時ですか',    example_en: 'What time is it now?',mnemonic: 'Present moment' },
  { character: '〜時間',romaji: '~jikan',   english: '~ hours (duration)',example_jp: '二時間かかる', example_en: 'Takes 2 hours',       mnemonic: 'じかん = hours of time' },
  { character: '〜分間',romaji: '~funkan',  english: '~ minutes (duration)',example_jp: '十分間待つ', example_en: 'Wait 10 minutes',     mnemonic: 'ふんかん = minutes of time' },
  { character: 'ちょうど',romaji:'choudo',  english: 'Exactly / Sharp', example_jp: '三時ちょうど',  example_en: 'Exactly 3 o\'clock',  mnemonic: 'Precise time' },
  // Days / Weeks
  { character: '日曜日',romaji: 'nichiyoubi',english: 'Sunday',    example_jp: '日曜日は休み',      example_en: 'Sunday is a day off', mnemonic: 'にち (sun/day) + ようび' },
  { character: '月曜日',romaji: 'getsuyoubi',english: 'Monday',    example_jp: '月曜日に始まる',    example_en: 'Starts Monday',       mnemonic: 'げつ (moon/month)' },
  { character: '火曜日',romaji: 'kayoubi',   english: 'Tuesday',   example_jp: '火曜日の授業',      example_en: 'Tuesday\'s class',   mnemonic: 'か (fire)' },
  { character: '水曜日',romaji: 'suiyoubi',  english: 'Wednesday', example_jp: '水曜日に会議',      example_en: 'Meeting on Wednesday',mnemonic: 'すい (water)' },
  { character: '木曜日',romaji: 'mokuyoubi', english: 'Thursday',  example_jp: '木曜日に出かける',  example_en: 'Go out Thursday',     mnemonic: 'もく (wood/tree)' },
  { character: '金曜日',romaji: 'kin\'youbi',english: 'Friday',    example_jp: '花金 (hanakin)',     example_en: 'Fun Friday',          mnemonic: 'きん (gold/money)' },
  { character: '土曜日',romaji: 'doyoubi',   english: 'Saturday',  example_jp: '土曜日はゆっくりする',example_en: 'Relax on Saturday',  mnemonic: 'ど (earth)' },
  // Months
  { character: '一月',  romaji: 'ichigatsu', english: 'January',   example_jp: '一月は寒い',        example_en: 'January is cold',     mnemonic: 'いち (1) + がつ' },
  { character: '二月',  romaji: 'nigatsu',   english: 'February',  example_jp: '二月は短い',        example_en: 'February is short',   mnemonic: 'に (2) + がつ' },
  { character: '三月',  romaji: 'sangatsu',  english: 'March',     example_jp: '三月に卒業する',    example_en: 'Graduate in March',   mnemonic: 'さん (3) + がつ' },
  { character: '四月',  romaji: 'shigatsu',  english: 'April',     example_jp: '四月から入学する',  example_en: 'Enroll from April',   mnemonic: 'し (4) + がつ' },
]

// ─── MONEY MODULE ─────────────────────────────────────────────

export const MONEY_CARDS = [
  { character: '一円',   romaji: 'ichien',    english: '1 yen',          example_jp: '一円玉',           example_en: '1 yen coin',         mnemonic: 'いちえん — smallest coin' },
  { character: '五円',   romaji: 'goen',      english: '5 yen',          example_jp: '五円玉',           example_en: '5 yen coin (lucky)', mnemonic: 'ごえん = 5 yen, also means connection' },
  { character: '十円',   romaji: 'juuen',     english: '10 yen',         example_jp: '十円玉',           example_en: '10 yen coin',        mnemonic: 'じゅうえん — bronze coin' },
  { character: '五十円', romaji: 'gojuuen',   english: '50 yen',         example_jp: '五十円玉',         example_en: '50 yen coin',        mnemonic: 'ごじゅうえん — has a hole' },
  { character: '百円',   romaji: 'hyakuen',   english: '100 yen',        example_jp: '百円ショップ',     example_en: '100 yen shop',       mnemonic: 'ひゃくえん — silver coin' },
  { character: '五百円', romaji: 'gohyakuen', english: '500 yen',        example_jp: '五百円玉',         example_en: '500 yen coin',       mnemonic: 'ごひゃくえん — largest coin' },
  { character: '千円',   romaji: 'senen',     english: '1,000 yen',      example_jp: '千円札',           example_en: '1000 yen note',      mnemonic: 'せんえん — green note' },
  { character: '五千円', romaji: 'gosenen',   english: '5,000 yen',      example_jp: '五千円札',         example_en: '5000 yen note',      mnemonic: 'ごせんえん — brown note' },
  { character: '一万円', romaji: 'ichimanen', english: '10,000 yen',     example_jp: '一万円札',         example_en: '10,000 yen note',    mnemonic: 'いちまんえん — largest note' },
  { character: 'いくら', romaji: 'ikura',     english: 'How much?',      example_jp: 'これはいくらですか', example_en: 'How much is this?', mnemonic: 'Shopping essential' },
  { character: 'お金',   romaji: 'okane',     english: 'Money',          example_jp: 'お金がない',       example_en: 'No money',           mnemonic: 'おかね — polite money' },
  { character: '値段',   romaji: 'nedan',     english: 'Price',          example_jp: '値段は？',         example_en: 'What\'s the price?', mnemonic: 'ねだん — cost' },
  { character: '安い',   romaji: 'yasui',     english: 'Cheap',          example_jp: '安いですね',       example_en: 'That\'s cheap!',     mnemonic: 'やすい — low price' },
  { character: '高い',   romaji: 'takai',     english: 'Expensive',      example_jp: '高すぎる！',       example_en: 'Too expensive!',     mnemonic: 'たかい — high price' },
  { character: 'お釣り', romaji: 'otsuri',    english: 'Change (money)', example_jp: 'お釣りをください', example_en: 'Change please',      mnemonic: 'おつり — money returned' },
  { character: 'レシート',romaji: 'reshiito',  english: 'Receipt',        example_jp: 'レシートをください', example_en: 'Receipt please',    mnemonic: 'From English receipt' },
  { character: 'カード', romaji: 'kaado',     english: 'Card payment',   example_jp: 'カードで払えますか', example_en: 'Can I pay by card?',mnemonic: 'クレジットカード' },
  { character: '現金',   romaji: 'genkin',    english: 'Cash',           example_jp: '現金で払う',       example_en: 'Pay with cash',      mnemonic: 'げんきん — physical money' },
  { character: '消費税', romaji: 'shouhizei', english: 'Consumption tax',example_jp: '税込みで',         example_en: 'Tax included',       mnemonic: 'しょうひぜい — Japan\'s sales tax' },
  { character: '割引',   romaji: 'waribiki',  english: 'Discount',       example_jp: '割引がありますか', example_en: 'Is there a discount?',mnemonic: 'わりびき — price reduction' },
  { character: 'セール', romaji: 'seeru',     english: 'Sale',           example_jp: 'セール中です',     example_en: 'Currently on sale',  mnemonic: 'From English sale' },
  { character: '送料',   romaji: 'souryou',   english: 'Shipping fee',   example_jp: '送料無料',         example_en: 'Free shipping',      mnemonic: 'そうりょう — delivery cost' },
  { character: '合計',   romaji: 'goukei',    english: 'Total',          example_jp: '合計はいくらですか', example_en: 'What\'s the total?',mnemonic: 'ごうけい — sum total' },
  { character: '支払い', romaji: 'shiharai',  english: 'Payment',        example_jp: '支払いはどうしますか', example_en: 'How would you like to pay?', mnemonic: 'しはらい — paying' },
  { character: 'ポイント',romaji: 'pointo',    english: 'Loyalty points', example_jp: 'ポイントを使いますか', example_en: 'Would you like to use points?', mnemonic: 'Reward points system' },
]

// ─── COUNTING MODULE ──────────────────────────────────────────

export const COUNTING_CARDS = [
  // General counters
  { character: '〜つ',  romaji: '~tsu',     english: 'Counting things (1-9, general)',example_jp: 'りんご三つ',example_en: '3 apples',         mnemonic: 'ひとつ・ふたつ・みっつ... general purpose' },
  { character: 'ひとつ',romaji: 'hitotsu',   english: 'One thing',      example_jp: 'ひとつください',   example_en: 'One please',         mnemonic: 'Old Japanese: ひとつ' },
  { character: 'ふたつ',romaji: 'futatsu',   english: 'Two things',     example_jp: 'ふたつ買う',       example_en: 'Buy two',            mnemonic: 'Old Japanese: ふたつ' },
  { character: 'みっつ',romaji: 'mittsu',    english: 'Three things',   example_jp: 'みっつ取る',       example_en: 'Take three',         mnemonic: 'Old Japanese: みっつ' },
  { character: 'よっつ',romaji: 'yottsu',    english: 'Four things',    example_jp: 'よっつ食べる',     example_en: 'Eat four',           mnemonic: 'Old Japanese: よっつ' },
  { character: 'いつつ',romaji: 'itsutsu',   english: 'Five things',    example_jp: 'いつつある',       example_en: 'There are five',     mnemonic: 'Old Japanese: いつつ' },
  { character: 'むっつ',romaji: 'muttsu',    english: 'Six things',     example_jp: 'むっつ並べる',     example_en: 'Line up six',        mnemonic: 'Old Japanese: むっつ' },
  { character: 'ななつ',romaji: 'nanatsu',   english: 'Seven things',   example_jp: 'ななつ選ぶ',       example_en: 'Choose seven',       mnemonic: 'Old Japanese: ななつ' },
  { character: 'やっつ',romaji: 'yattsu',    english: 'Eight things',   example_jp: 'やっつ集める',     example_en: 'Collect eight',      mnemonic: 'Old Japanese: やっつ' },
  { character: 'ここのつ',romaji:'kokonotsu', english: 'Nine things',   example_jp: 'ここのつ残る',     example_en: 'Nine remain',        mnemonic: 'Old Japanese: ここのつ' },
  // 〜本 (long thin things)
  { character: '〜本',  romaji: '~hon/bon/pon',english: 'Counter for long/thin things',example_jp: 'えんぴつ二本', example_en: '2 pencils',     mnemonic: '本 = book but also long objects' },
  { character: '一本',  romaji: 'ippon',     english: 'One (long thing)',example_jp: 'ペン一本',         example_en: '1 pen',              mnemonic: 'いっぽん — stick, pen, bottle' },
  { character: '二本',  romaji: 'nihon',     english: 'Two (long things)',example_jp: '箸二本',          example_en: '2 chopsticks',       mnemonic: 'にほん — also = Japan!' },
  { character: '三本',  romaji: 'sanbon',    english: 'Three (long things)',example_jp: 'ビール三本',    example_en: '3 beers',            mnemonic: 'さんぼん' },
  // 〜枚 (flat things)
  { character: '〜枚',  romaji: '~mai',      english: 'Counter for flat things',example_jp: '紙一枚',    example_en: '1 sheet of paper',   mnemonic: 'まい — paper, tickets, shirts, plates' },
  { character: '一枚',  romaji: 'ichimai',   english: 'One (flat thing)',example_jp: '切手一枚',         example_en: '1 stamp',            mnemonic: 'いちまい' },
  { character: '二枚',  romaji: 'nimai',     english: 'Two (flat things)',example_jp: 'シャツ二枚',      example_en: '2 shirts',           mnemonic: 'にまい' },
  // 〜冊 (books)
  { character: '〜冊',  romaji: '~satsu',    english: 'Counter for books',example_jp: '本三冊',          example_en: '3 books',            mnemonic: 'さつ — books, notebooks, magazines' },
  // 〜台 (machines/vehicles)
  { character: '〜台',  romaji: '~dai',      english: 'Counter for machines/vehicles',example_jp: '車一台', example_en: '1 car',           mnemonic: 'だい — cars, bikes, TVs, computers' },
  // 〜匹 (small animals)
  { character: '〜匹',  romaji: '~hiki/biki/piki',english: 'Counter for small animals',example_jp: '猫二匹', example_en: '2 cats',         mnemonic: 'ひき — fish, insects, cats, dogs' },
  // 〜頭 (large animals)
  { character: '〜頭',  romaji: '~tou',      english: 'Counter for large animals',example_jp: '牛三頭',   example_en: '3 cows',             mnemonic: 'とう — horses, cows, elephants' },
  // 〜羽 (birds)
  { character: '〜羽',  romaji: '~wa/ba/pa', english: 'Counter for birds/rabbits',example_jp: '鳥一羽',   example_en: '1 bird',             mnemonic: 'わ — birds and rabbits' },
  // 〜人 (people)
  { character: '〜人',  romaji: '~nin/ri',   english: 'Counter for people',example_jp: '三人家族',        example_en: 'Family of three',    mnemonic: 'にん — but 1=ひとり, 2=ふたり' },
  { character: 'ひとり',romaji: 'hitori',    english: 'One person',     example_jp: '一人で行く',       example_en: 'Go alone',           mnemonic: 'ひとり — irregular!' },
  { character: 'ふたり',romaji: 'futari',    english: 'Two people',     example_jp: '二人でデート',     example_en: 'Date for two',       mnemonic: 'ふたり — irregular!' },
  // 〜個 (general small objects)
  { character: '〜個',  romaji: '~ko',       english: 'Counter for small objects',example_jp: 'りんご三個', example_en: '3 apples',         mnemonic: 'こ — eggs, apples, candy, buttons' },
  // 〜杯 (cups/bowls)
  { character: '〜杯',  romaji: '~hai/bai/pai',english: 'Counter for cups/bowls',example_jp: 'コーヒー一杯', example_en: '1 cup of coffee',mnemonic: 'はい — drinks, bowls of rice' },
  // 〜階 (floors)
  { character: '〜階',  romaji: '~kai/gai',  english: 'Counter for floors', example_jp: '三階です',      example_en: 'Third floor',        mnemonic: 'かい — building floors' },
  // 〜回 (number of times)
  { character: '〜回',  romaji: '~kai',      english: 'Counter for times/occurrences',example_jp: '三回練習する', example_en: 'Practice 3 times', mnemonic: 'かい — how many times' },
  { character: '〜番',  romaji: '~ban',      english: 'Number ~ (in a sequence)',example_jp: '一番電車',    example_en: 'First train',        mnemonic: 'ばん — rankings, numbers' },
]

// ─── COMMON SENTENCES MODULE ──────────────────────────────────

export const COMMON_SENTENCES = [
  { character: 'これは何ですか。',      romaji: 'Kore wa nan desu ka.',           english: 'What is this?',                example_jp: 'これはペンです',           example_en: 'This is a pen',             mnemonic: 'これ = this (near me)' },
  { character: 'どこですか。',         romaji: 'Doko desu ka.',                   english: 'Where is it?',                 example_jp: 'トイレはどこですか',       example_en: 'Where is the restroom?',    mnemonic: 'どこ = where' },
  { character: '〜はありますか。',     romaji: '~wa arimasu ka.',                 english: 'Do you have ~?',               example_jp: '英語のメニューはありますか',example_en: 'Do you have an English menu?',mnemonic: 'ありますか = is there?' },
  { character: '〜をください。',       romaji: '~wo kudasai.',                    english: 'Please give me ~.',            example_jp: '水をください',             example_en: 'Water please',              mnemonic: 'ください = please give' },
  { character: 'いくらですか。',       romaji: 'Ikura desu ka.',                  english: 'How much is it?',              example_jp: 'このシャツはいくらですか', example_en: 'How much is this shirt?',   mnemonic: 'いくら = how much money' },
  { character: '〜はどこですか。',     romaji: '~wa doko desu ka.',              english: 'Where is ~?',                  example_jp: '駅はどこですか',           example_en: 'Where is the station?',     mnemonic: 'は = topic, どこ = where' },
  { character: '〜をお願いします。',   romaji: '~wo onegaishimasu.',              english: 'I would like ~, please.',      example_jp: 'コーヒーをお願いします',   example_en: 'Coffee, please',            mnemonic: 'お願いします = please' },
  { character: 'わかりません。',       romaji: 'Wakarimasen.',                    english: 'I don\'t understand.',         example_jp: 'すみません、わかりません', example_en: 'Sorry, I don\'t understand', mnemonic: 'わかる = understand + ません = negative' },
  { character: 'もう一度言ってください。',romaji:'Mou ichido itte kudasai.',      english: 'Please say that again.',       example_jp: 'ゆっくり話してください',   example_en: 'Please speak slowly',        mnemonic: 'もういちど = one more time' },
  { character: '〜に行きたいです。',   romaji: '~ni ikitai desu.',                english: 'I want to go to ~.',           example_jp: '東京に行きたいです',       example_en: 'I want to go to Tokyo',     mnemonic: '〜たい = want to do' },
  { character: '〜が好きです。',       romaji: '~ga suki desu.',                  english: 'I like ~.',                    example_jp: '日本料理が好きです',       example_en: 'I like Japanese food',      mnemonic: 'が = subject marker, すき = like' },
  { character: '〜が嫌いです。',       romaji: '~ga kirai desu.',                 english: 'I dislike ~.',                 example_jp: '辛い食べ物が嫌いです',     example_en: 'I dislike spicy food',      mnemonic: 'きらい = dislike' },
  { character: '〜ができます。',       romaji: '~ga dekimasu.',                   english: 'I can do ~.',                  example_jp: '日本語が話せます',         example_en: 'I can speak Japanese',      mnemonic: 'できる = can do / be able to' },
  { character: '〜を食べたことがあります。',romaji:'~wo tabeta koto ga arimasu.', english: 'I have eaten ~ before.',       example_jp: 'すしを食べたことがあります',example_en: 'I have eaten sushi before', mnemonic: '〜たことがある = have experience of' },
  { character: '〜てもいいですか。',   romaji: '~te mo ii desu ka.',              english: 'Is it okay if I ~?',           example_jp: '写真を撮ってもいいですか', example_en: 'May I take a photo?',        mnemonic: '〜てもいい = may / it\'s okay to' },
  { character: '〜てください。',       romaji: '~te kudasai.',                    english: 'Please do ~.',                 example_jp: 'ゆっくり話してください',   example_en: 'Please speak slowly',        mnemonic: '〜てください = polite request' },
  { character: '〜はどうですか。',     romaji: '~wa dou desu ka.',                english: 'How is/about ~?',              example_jp: '天気はどうですか',         example_en: 'How\'s the weather?',       mnemonic: 'どう = how' },
  { character: '〜ましょう。',         romaji: '~mashou.',                        english: 'Let\'s ~!',                    example_jp: '行きましょう！',           example_en: 'Let\'s go!',                mnemonic: 'ましょう = let\'s (invitation)' },
  { character: '〜たいです。',         romaji: '~tai desu.',                      english: 'I want to ~.',                 example_jp: '寝たいです',               example_en: 'I want to sleep',           mnemonic: '〜たい = desire to do' },
  { character: 'お元気ですか。',       romaji: 'Ogenki desu ka.',                 english: 'How are you?',                 example_jp: 'お元気ですか？元気です！', example_en: 'How are you? I\'m fine!',   mnemonic: 'げんき = healthy/well' },
  { character: 'どうしましたか。',     romaji: 'Dou shimashita ka.',              english: 'What happened? / What\'s wrong?',example_jp: '顔色が悪いですね。どうしましたか',example_en: 'You look pale. What\'s wrong?', mnemonic: 'どう = how, しましたか = did' },
  { character: '〜はいつですか。',     romaji: '~wa itsu desu ka.',               english: 'When is ~?',                   example_jp: '試験はいつですか',         example_en: 'When is the exam?',         mnemonic: 'いつ = when' },
  { character: 'どのくらいかかりますか。',romaji:'Dono kurai kakarimasu ka.',     english: 'How long does it take?',       example_jp: '駅までどのくらいかかりますか',example_en: 'How long to the station?', mnemonic: 'どのくらい = how much/long' },
  { character: '〜と言います。',       romaji: '~to iimasu.',                     english: 'It is called ~ / I am called ~.',example_jp: 'ザリフと言います',      example_en: 'My name is Zarif',          mnemonic: 'といいます = is called' },
  { character: '〜かもしれません。',   romaji: '~kamo shiremasen.',               english: 'It might be ~ / Maybe ~.',     example_jp: '雨かもしれません',         example_en: 'It might rain',             mnemonic: 'かもしれない = might / possibly' },
]

// ─── EXPRESSIONS MODULE ───────────────────────────────────────

export const EXPRESSIONS = [
  // Reactions
  { character: 'なるほど！',   romaji: 'naruhodo',    english: 'I see! / Indeed!',      example_jp: 'なるほど、そういうことか',   example_en: 'I see, that\'s what it means', mnemonic: 'Aha! moment' },
  { character: 'そうですね。', romaji: 'sou desu ne', english: 'That\'s right / I agree',example_jp: 'そうですね、難しいですね',   example_en: 'That\'s right, it\'s difficult',mnemonic: 'Agreeing expression' },
  { character: 'そうですか。', romaji: 'sou desu ka', english: 'Is that so? / Really?', example_jp: '本当にそうですか？',         example_en: 'Is that really so?',           mnemonic: 'Showing understanding' },
  { character: 'まあまあ。',   romaji: 'maa maa',     english: 'So-so / Not bad',        example_jp: '調子はどう？まあまあかな', example_en: 'How are you? So-so.',          mnemonic: 'Average response' },
  { character: 'やばい！',    romaji: 'yabai',       english: 'Whoa! / That\'s crazy!', example_jp: 'やばい、遅刻した！',         example_en: 'Oh no, I\'m late!',            mnemonic: 'Surprise/alarm (casual)' },
  { character: 'すごい！',    romaji: 'sugoi',       english: 'Amazing! / Wow!',         example_jp: 'すごい、本当にすごい！',     example_en: 'Amazing, truly amazing!',      mnemonic: 'Expression of awe' },
  { character: 'かわいい！',  romaji: 'kawaii',      english: 'Cute! / Adorable!',       example_jp: 'かわいい猫ですね！',         example_en: 'What a cute cat!',             mnemonic: 'Cuteness expression' },
  { character: 'うそ！',     romaji: 'uso',         english: 'No way! / You\'re kidding!',example_jp: 'うそ！本当に？',           example_en: 'No way! Really?',              mnemonic: 'Disbelief expression' },
  { character: 'えっと…',    romaji: 'etto',        english: 'Um... / Hmm...',          example_jp: 'えっと、何だったっけ',       example_en: 'Um, what was it again...',     mnemonic: 'Filler while thinking' },
  { character: 'あ、そうだ！',romaji: 'a, sou da',   english: 'Oh, that\'s right!',      example_jp: 'あ、そうだ！財布を忘れた', example_en: 'Oh right! I forgot my wallet!',mnemonic: 'Sudden realization' },
  // Polite phrases
  { character: 'いただきます',romaji: 'itadakimasu', english: 'Let\'s eat / Thank you for the food',example_jp: 'いただきます！',    example_en: 'Said before eating',           mnemonic: 'Gratitude before meals' },
  { character: 'ごちそうさま',romaji: 'gochisousama',english: 'Thank you for the meal', example_jp: 'ごちそうさまでした',         example_en: 'Said after eating',            mnemonic: 'Gratitude after meals' },
  { character: 'お疲れ様',   romaji: 'otsukaresama',english: 'Good work / Thanks for your effort',example_jp: 'お疲れ様でした！', example_en: 'Good work today!',             mnemonic: 'End of work expression' },
  { character: 'よろしくお願いします',romaji:'yoroshiku onegaishimasu',english:'Nice to meet you / Please treat me well',example_jp: '新しい仕事でよろしくお願いします',example_en:'Please take care of me',  mnemonic: 'Formal goodwill expression' },
  { character: 'お邪魔します',romaji: 'ojama shimasu',english: 'Sorry to disturb / Excuse me for coming in',example_jp: 'お邪魔します！',example_en: 'Said when entering someone\'s home',mnemonic: 'Polite entering phrase' },
  { character: 'お大事に',   romaji: 'odaiji ni',   english: 'Take care / Get well soon',example_jp: '風邪ですか？お大事に！', example_en: 'You have a cold? Get well!',    mnemonic: 'Said to sick person' },
  { character: '気をつけて', romaji: 'ki wo tsukete',english: 'Take care / Be careful', example_jp: '気をつけて帰ってね',         example_en: 'Take care going home',         mnemonic: 'Safety farewell' },
  { character: 'お先に失礼します',romaji:'osaki ni shitsurei shimasu',english:'I\'m leaving first, excuse me',example_jp: 'お先に失礼します！',example_en: 'Said when leaving office first', mnemonic: 'Polite early departure' },
  // Useful phrases
  { character: 'ちょっと待って',romaji: 'chotto matte',english: 'Wait a moment',         example_jp: 'ちょっと待ってください', example_en: 'Please wait a moment',          mnemonic: 'ちょっと = a little, まって = wait' },
  { character: '大丈夫ですか',romaji: 'daijoubu desu ka',english: 'Are you okay?',      example_jp: '転びましたが大丈夫ですか', example_en: 'You fell, are you okay?',       mnemonic: 'だいじょうぶ = okay/fine' },
  { character: '大丈夫です',  romaji: 'daijoubu desu', english: 'I\'m fine / No worries',example_jp: '大丈夫です、心配しないで', example_en: 'I\'m fine, don\'t worry',       mnemonic: 'Most useful reply ever' },
  { character: 'いいですよ！',romaji: 'ii desu yo',  english: 'Sure! / That\'s fine!',  example_jp: '一緒に行っていいですよ！', example_en: 'Sure, you can come along!',     mnemonic: 'いい = good + ですよ = it is!' },
  { character: 'そうしましょう',romaji:'sou shimashou',english: 'Let\'s do that',        example_jp: 'じゃあ、そうしましょう！', example_en: 'Okay, let\'s do that!',        mnemonic: 'そう = like that, しましょう = let\'s do' },
  { character: 'ありがとうございます',romaji:'arigatou gozaimasu',english: 'Thank you very much',example_jp: 'いつもありがとうございます',example_en: 'Thank you always',          mnemonic: 'Most polite form of thanks' },
  { character: 'どういたしまして',romaji:'dou itashimashite',english: 'You\'re welcome',  example_jp: 'ありがとう！どういたしまして',example_en: 'Thanks! You\'re welcome',      mnemonic: 'Standard reply to thanks' },
]

// ─── SENTENCE BUILDER DATA ────────────────────────────────────
// Each sentence is broken into color-coded parts
// type: 'subject' | 'topic' | 'object' | 'verb' | 'particle' | 'adjective' | 'time' | 'place' | 'connector'

export const SENTENCE_PATTERNS = [
  {
    id: 'basic_identity',
    title: 'Basic Identity — Aは Bです',
    english: 'A is B.',
    parts: [
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject (I)' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '学生',   romaji: 'gakusei', type: 'object',   label: 'Noun (student)' },
      { text: 'です',   romaji: 'desu',    type: 'verb',     label: 'Copula (am/is)' },
      { text: 'か',     romaji: 'ka',      type: 'particle', label: 'Question marker' },
    ],
    note: 'は (wa) marks the topic. です (desu) = am/is/are. Add か at end for question.',
  },
  {
    id: 'basic_action',
    title: 'Basic Action — Subject が Object を Verb',
    english: 'I eat sushi.',
    parts: [
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: 'すし',   romaji: 'sushi',   type: 'object',   label: 'Object' },
      { text: 'を',     romaji: 'wo',      type: 'particle', label: 'Object marker' },
      { text: '食べます',romaji: 'tabemasu',type: 'verb',    label: 'Verb (eat)' },
    ],
    note: 'を (wo) marks the direct object. Verb always comes at the END in Japanese.',
  },
  {
    id: 'location',
    title: 'Location — Place で Action',
    english: 'I study at school.',
    parts: [
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '学校',   romaji: 'gakkou',  type: 'place',    label: 'Place (school)' },
      { text: 'で',     romaji: 'de',      type: 'particle', label: 'Location of action' },
      { text: '勉強します',romaji:'benkyou shimasu',type:'verb',label: 'Verb (study)' },
    ],
    note: 'で (de) = at/in (location of action). Different from に!',
  },
  {
    id: 'destination',
    title: 'Destination — Place に行く',
    english: 'I go to Japan.',
    parts: [
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '日本',   romaji: 'nihon',   type: 'place',    label: 'Destination' },
      { text: 'に',     romaji: 'ni',      type: 'particle', label: 'Direction marker' },
      { text: '行きます',romaji:'ikimasu',  type: 'verb',    label: 'Verb (go)' },
    ],
    note: 'に (ni) = to/toward (destination). Also used for time: 三時に = at 3.',
  },
  {
    id: 'with_time',
    title: 'With Time — 毎日 Subject Verb',
    english: 'I study Japanese every day.',
    parts: [
      { text: '毎日',   romaji: 'mainichi',type: 'time',     label: 'Time (every day)' },
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '日本語', romaji: 'nihongo', type: 'object',   label: 'Object (Japanese)' },
      { text: 'を',     romaji: 'wo',      type: 'particle', label: 'Object marker' },
      { text: '勉強します',romaji:'benkyou shimasu',type:'verb',label:'Verb (study)' },
    ],
    note: 'Time expressions usually come first or after the topic. Order: Time → Place → Object → Verb.',
  },
  {
    id: 'adjective_noun',
    title: 'Adjective + Noun',
    english: 'A big dog.',
    parts: [
      { text: '大きい', romaji: 'ookii',   type: 'adjective',label: 'い-adjective' },
      { text: '犬',     romaji: 'inu',     type: 'object',   label: 'Noun (dog)' },
    ],
    note: 'い-adjectives come BEFORE the noun directly. No connector needed!',
  },
  {
    id: 'adjective_sentence',
    title: 'Adjective Sentence',
    english: 'Tokyo is big.',
    parts: [
      { text: '東京',   romaji: 'toukyou', type: 'subject',  label: 'Topic' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '大きい', romaji: 'ookii',   type: 'adjective',label: 'い-adjective' },
      { text: 'です',   romaji: 'desu',    type: 'verb',     label: 'Polite ending' },
    ],
    note: 'Topic は + adjective + です. For な-adjectives add な before nouns: きれいな花.',
  },
  {
    id: 'possession',
    title: 'Possession — の (no)',
    english: 'This is my book.',
    parts: [
      { text: 'これ',   romaji: 'kore',    type: 'subject',  label: 'Subject (this)' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Owner (I/my)' },
      { text: 'の',     romaji: 'no',      type: 'particle', label: 'Possessive の' },
      { text: '本',     romaji: 'hon',     type: 'object',   label: 'Noun (book)' },
      { text: 'です',   romaji: 'desu',    type: 'verb',     label: 'Copula' },
    ],
    note: 'の (no) = \'s (possessive). わたしの本 = my book. 日本の食べ物 = Japanese food.',
  },
  {
    id: 'negative',
    title: 'Negative Sentence',
    english: 'I don\'t eat meat.',
    parts: [
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '肉',     romaji: 'niku',    type: 'object',   label: 'Object (meat)' },
      { text: 'を',     romaji: 'wo',      type: 'particle', label: 'Object marker' },
      { text: '食べません',romaji:'tabemasen',type:'verb',   label: 'Negative verb' },
    ],
    note: 'ます (masu) → ません (masen) for negative. です → ではありません.',
  },
  {
    id: 'past_tense',
    title: 'Past Tense',
    english: 'I ate sushi yesterday.',
    parts: [
      { text: '昨日',   romaji: 'kinou',   type: 'time',     label: 'Time (yesterday)' },
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: 'すし',   romaji: 'sushi',   type: 'object',   label: 'Object' },
      { text: 'を',     romaji: 'wo',      type: 'particle', label: 'Object marker' },
      { text: '食べました',romaji:'tabemashita',type:'verb', label: 'Past verb' },
    ],
    note: 'ます → ました for past tense. ません → ませんでした for past negative.',
  },
  {
    id: 'te_form',
    title: 'て-form — Connecting Actions',
    english: 'I woke up, ate, and left.',
    parts: [
      { text: '起きて',  romaji: 'okite',  type: 'verb',     label: 'て-form (wake)' },
      { text: '食べて',  romaji: 'tabete', type: 'verb',     label: 'て-form (eat)' },
      { text: '出かけました',romaji:'dekakemashita',type:'verb',label:'Final verb (left)' },
    ],
    note: 'て-form connects sequential actions. Change ます → て to link verbs.',
  },
  {
    id: 'want_to',
    title: 'Want to — 〜たい',
    english: 'I want to go to Japan.',
    parts: [
      { text: 'わたし', romaji: 'watashi', type: 'subject',  label: 'Subject' },
      { text: 'は',     romaji: 'wa',      type: 'particle', label: 'Topic marker' },
      { text: '日本',   romaji: 'nihon',   type: 'place',    label: 'Destination' },
      { text: 'に',     romaji: 'ni',      type: 'particle', label: 'Direction particle' },
      { text: '行きたい',romaji:'ikitai',  type: 'verb',     label: '〜たい (want to)' },
      { text: 'です',   romaji: 'desu',    type: 'verb',     label: 'Polite ending' },
    ],
    note: 'Remove ます from verb, add たいです. いきます → いきたいです = want to go.',
  },
]

// ─── MODULE COLLECTIONS REGISTRY ──────────────────────────────

export const HIRAGANA_COLLECTIONS = [
  { id: 'h1', label: 'Basic (あ-ん)',     cards: [] }, // populated from content.js
  { id: 'h2', label: 'Dakuten (が-ぽ)',   cards: HIRAGANA_DAKUTEN },
  { id: 'h3', label: 'Combinations (きゃ-ぴょ)', cards: HIRAGANA_COMBOS },
]

export const KATAKANA_COLLECTIONS = [
  { id: 'k1', label: 'Basic (ア-ン)',     cards: [] }, // populated from content.js
  { id: 'k2', label: 'Dakuten (ガ-ヴ)',   cards: KATAKANA_DAKUTEN },
  { id: 'k3', label: 'Combinations (キャ-ピョ)', cards: KATAKANA_COMBOS },
]

export const TIME_COLLECTIONS      = [{ id: 'tm1', label: 'Time & Calendar',   cards: TIME_CARDS }]
export const MONEY_COLLECTIONS     = [{ id: 'mn1', label: 'Money & Prices',    cards: MONEY_CARDS }]
export const COUNTING_COLLECTIONS  = [{ id: 'cn1', label: 'Counters',          cards: COUNTING_CARDS }]
export const SENTENCES_COLLECTIONS = [{ id: 'sc1', label: 'Common Sentences',  cards: COMMON_SENTENCES }]
export const EXPRESSIONS_COLLECTIONS = [{ id: 'ex1', label: 'Expressions',     cards: EXPRESSIONS }]
