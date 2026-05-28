/**
 * ふりがな自動付与ツール — script.js
 * kuromoji.js を使って日本語テキストの漢字にルビを付与する
 */

(function () {
  'use strict';

  // ============================================================
  // 学年別配当漢字（文部科学省 学習指導要領準拠）
  // 指定学年「以上」の漢字にルビを付与するため、
  // 下の学年の漢字セットも引き継がれる形で管理する
  // ============================================================
  const GRADE_KANJI = {
    1: new Set([
      '一','右','雨','円','王','音','下','火','花','貝','学','気','九','休',
      '玉','金','空','月','犬','見','五','口','校','左','山','四','子','糸',
      '字','耳','七','車','手','十','出','女','小','上','森','人','水','正',
      '生','青','夕','石','赤','千','川','先','早','草','足','村','大','男',
      '竹','中','虫','町','天','田','土','二','日','入','年','白','八','百',
      '文','木','本','名','目','立','力','林','六'
    ]),
    2: new Set([
      '引','羽','雲','園','遠','何','科','夏','家','歌','画','回','会','解',
      '外','角','楽','活','間','丸','岩','顔','記','帰','弓','牛','魚','京',
      '強','教','近','兄','形','計','元','言','原','古','戸','午','後','語',
      '工','公','広','交','光','考','行','高','合','国','黒','今','才','細',
      '作','算','止','市','矢','姉','思','紙','寺','自','時','室','社','弱',
      '首','秋','週','春','書','少','場','色','食','心','新','親','図','数',
      '星','晴','切','雪','船','線','前','組','走','多','太','体','台','地',
      '池','知','茶','昼','長','鳥','朝','直','通','弟','店','点','電','刀',
      '冬','当','東','答','頭','同','道','読','内','南','肉','馬','売','買',
      '麦','半','番','父','風','分','聞','米','歩','母','方','北','毎','妹',
      '万','明','鳴','毛','門','夜','野','友','用','曜','来','里','理','話'
    ]),
    3: new Set([
      '悪','安','暗','委','意','医','育','員','院','飲','運','泳','駅','央',
      '横','屋','温','化','荷','界','開','階','寒','感','漢','館','岸','期',
      '起','客','宮','急','球','去','橋','業','曲','局','銀','区','苦','具',
      '君','係','軽','血','決','研','県','庫','湖','向','港','号','根','祭',
      '皿','仕','死','使','始','指','歯','詩','次','事','持','式','実','写',
      '者','主','守','取','酒','受','州','拾','終','習','集','住','重','宿',
      '所','暑','助','昭','消','商','章','勝','乗','植','申','身','神','真',
      '深','進','世','整','昔','全','相','送','想','速','族','他','打','対',
      '待','代','第','題','炭','短','談','着','注','柱','帳','調','追','定',
      '庭','笛','鉄','転','都','度','投','登','等','動','童','農','波','配',
      '倍','箱','畑','発','反','坂','板','皮','悲','美','鼻','氷','表','秒',
      '病','品','負','部','服','福','物','平','返','勉','放','味','命','面',
      '問','役','薬','由','油','有','遊','予','洋','羊','葉','様','落','流',
      '旅','両','緑','礼','列','練','路','和'
    ]),
    4: new Set([
      '愛','案','以','衣','位','茨','印','英','栄','媛','塩','岡','億','加',
      '賀','改','械','害','街','各','覚','完','官','管','関','観','願','岐',
      '希','季','旗','機','議','求','泣','給','挙','漁','共','協','鏡','競',
      '極','熊','訓','軍','郡','径','型','景','芸','欠','結','建','健','験',
      '固','功','好','香','候','康','佐','差','菜','最','埼','材','崎','昨',
      '札','刷','察','参','産','散','残','士','氏','試','辞','滋','児','失',
      '静','縄','焼','象','照','城','臣','信','井','成','清','席','積','折',
      '節','説','浅','戦','選','然','争','倉','巣','束','側','続','卒','孫',
      '帯','単','置','仲','貯','兆','低','底','的','典','伝','徒','努','灯',
      '堂','得','特','毒','熱','念','敗','梅','博','阪','飯','飛','必','票',
      '標','不','夫','付','府','富','副','兵','別','辺','変','便','包','法',
      '望','牧','末','満','未','民','無','約','勇','要','養','浴','利','陸',
      '良','料','量','輪','類','令','冷','例','連','老','労','録'
    ]),
    5: new Set([
      '圧','囲','移','因','永','営','衛','易','益','液','演','応','往','桜',
      '可','仮','価','河','過','賀','快','解','格','確','額','刊','幹','慣',
      '眼','基','寄','規','技','義','逆','久','旧','居','許','境','均','禁',
      '句','型','経','潔','件','険','現','減','故','個','護','効','厚','耕',
      '鉱','構','興','講','混','査','再','災','妻','採','際','在','財','罪',
      '雑','支','志','枝','師','資','飼','示','似','識','謝','授','修','述',
      '術','準','序','招','承','証','情','常','条','状','織','職','制','性',
      '政','勢','精','製','税','責','績','接','設','絶','祖','素','総','造',
      '像','増','則','測','属','率','損','退','貸','態','団','断','築','張',
      '提','程','適','統','銅','導','独','任','燃','能','破','判','版','比',
      '否','費','備','評','貧','布','婦','武','復','複','仏','編','保','墓',
      '報','豊','防','貿','暴','脈','務','迷','綿','輸','余','容','略','留',
      '領'
    ]),
    6: new Set([
      '遺','域','宇','映','延','沿','我','灰','拡','閣','割','株','干','巻',
      '看','簡','危','机','揮','貴','疑','吸','供','胸','郷','勤','筋','系',
      '敬','警','劇','激','穴','絹','権','憲','源','厳','己','呼','誤','后',
      '孝','皇','紅','降','鋼','刻','骨','困','砂','座','済','裁','策','冊',
      '蚕','至','私','姿','視','詞','誌','磁','射','捨','尺','若','樹','収',
      '宗','就','衆','従','縦','縮','熟','純','処','署','諸','除','将','傷',
      '障','城','蒸','針','仁','垂','推','寸','盛','聖','誠','舌','宣','専',
      '泉','洗','染','善','奏','窓','創','装','層','操','蔵','臓','存','尊',
      '宅','担','探','誕','段','暖','値','宙','忠','著','庁','頂','腸','潮',
      '賃','痛','展','討','党','糖','届','難','乳','認','納','脳','派','拝',
      '背','肺','俳','班','晩','否','批','秘','腹','奮','並','閉','陛','片',
      '補','暮','宝','訪','亡','忘','棒','枚','幕','密','盟','模','訳','優',
      '郵','幼','欲','翌','乱','卵','覧','裏','律','臨','朗','論'
    ]),
  };

  // 中学以上 = 常用漢字のうち小学校6年分以外
  // 「jr」モードでは小1〜6の漢字すべてを除外対象とする
  function buildGradeSet(level) {
    if (level === 'all') return null; // null = 全漢字対象
    if (level === 'jr') {
      // 小学校全学年の漢字セット（1〜6年生）
      const allPrimary = new Set();
      for (let g = 1; g <= 6; g++) {
        GRADE_KANJI[g].forEach(k => allPrimary.add(k));
      }
      return allPrimary; // これに含まれる漢字 = ルビ付与しない
    }
    // 指定学年未満の漢字セット = ルビを付けない漢字
    const skipSet = new Set();
    for (let g = 1; g < parseInt(level, 10); g++) {
      GRADE_KANJI[g].forEach(k => skipSet.add(k));
    }
    return skipSet;
  }

  // ============================================================
  // kuromoji.js 初期化
  // ============================================================
  const DICT_PATH = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/';
  let tokenizerInstance = null;
  let tokenizerLoading = false;
  let tokenizerReady = false;

  function loadTokenizer() {
    return new Promise((resolve, reject) => {
      if (tokenizerReady && tokenizerInstance) {
        resolve(tokenizerInstance);
        return;
      }
      if (tokenizerLoading) {
        // 既に読み込み中なら待つ
        const poll = setInterval(() => {
          if (tokenizerReady && tokenizerInstance) {
            clearInterval(poll);
            resolve(tokenizerInstance);
          }
        }, 200);
        return;
      }
      tokenizerLoading = true;
      kuromoji.builder({ dicPath: DICT_PATH }).build((err, tokenizer) => {
        tokenizerLoading = false;
        if (err) {
          reject(err);
          return;
        }
        tokenizerInstance = tokenizer;
        tokenizerReady = true;
        resolve(tokenizer);
      });
    });
  }

  // ============================================================
  // 変換ロジック
  // ============================================================
  const KANJI_RANGE = /[一-鿿㐀-䶿]/;

  function containsTargetKanji(text, skipSet) {
    for (const ch of text) {
      if (!KANJI_RANGE.test(ch)) continue;
      if (skipSet === null) return true;       // 全漢字モード
      if (!skipSet.has(ch)) return true;       // skipSetに含まれない = 対象
    }
    return false;
  }

  function convertTokens(tokens, skipSet, format) {
    let rubyHtml = '';
    let outputText = '';

    for (const token of tokens) {
      const surface = token.surface_form;
      const reading = token.reading;

      // 読みが取れない / カタカナ読みがない場合はそのまま
      if (!reading || reading === surface) {
        rubyHtml += escapeHtml(surface);
        outputText += surface;
        continue;
      }

      // 対象漢字を含むか判定
      if (!containsTargetKanji(surface, skipSet)) {
        rubyHtml += escapeHtml(surface);
        outputText += surface;
        continue;
      }

      const hira = katakanaToHiragana(reading);

      if (format === 'ruby') {
        rubyHtml += `<ruby>${escapeHtml(surface)}<rt>${hira}</rt></ruby>`;
        outputText += `<ruby>${surface}<rt>${hira}</rt></ruby>`;
      } else if (format === 'paren') {
        rubyHtml += `${escapeHtml(surface)}（${hira}）`;
        outputText += `${surface}（${hira}）`;
      } else {
        // text: ふりがなのみ
        rubyHtml += escapeHtml(hira);
        outputText += hira;
      }
    }

    return { rubyHtml, outputText };
  }

  function katakanaToHiragana(str) {
    return str.replace(/[ァ-ヶ]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================================
  // DOM 操作
  // ============================================================
  const inputText    = document.getElementById('input-text');
  const countNum     = document.getElementById('count-num');
  const charCount    = document.querySelector('.char-count');
  const kanjiLevel   = document.getElementById('kanji-level');
  const outputFormat = document.getElementById('output-format');
  const convertBtn   = document.getElementById('convert-btn');
  const loadingEl    = document.getElementById('loading');
  const errorMsg     = document.getElementById('error-msg');
  const outputBlock  = document.getElementById('output-block');
  const previewArea  = document.getElementById('preview-area');
  const outputTextEl = document.getElementById('output-text');
  const copyBtn      = document.getElementById('copy-btn');

  // 文字数カウント
  inputText.addEventListener('input', () => {
    const len = inputText.value.length;
    countNum.textContent = len;
    if (len >= 2000) {
      charCount.classList.add('over');
    } else {
      charCount.classList.remove('over');
    }
  });

  // 変換ボタン
  convertBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) {
      showError('テキストを入力してください。');
      return;
    }
    if (text.length > 2000) {
      showError('テキストは2000文字以内で入力してください。');
      return;
    }

    hideError();
    hideOutput();
    showLoading(true);
    convertBtn.disabled = true;

    try {
      const tokenizer = await loadTokenizer();
      const tokens = tokenizer.tokenize(text);
      const level   = kanjiLevel.value;
      const format  = outputFormat.value;
      const skipSet = buildGradeSet(level);

      const { rubyHtml, outputText } = convertTokens(tokens, skipSet, format);

      previewArea.innerHTML = rubyHtml;
      outputTextEl.value    = outputText;
      showOutput();
    } catch (err) {
      showError('辞書の読み込みに失敗しました。ページを再読み込みしてもう一度お試しください。');
      console.error(err);
    } finally {
      showLoading(false);
      convertBtn.disabled = false;
    }
  });

  // コピーボタン
  copyBtn.addEventListener('click', () => {
    const text = outputTextEl.value;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showCopied()).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    outputTextEl.select();
    outputTextEl.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      showCopied();
    } catch (e) {
      showError('コピーに失敗しました。テキストを手動でコピーしてください。');
    }
  }

  function showCopied() {
    copyBtn.textContent = 'コピーしました!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'コピー';
      copyBtn.classList.remove('copied');
    }, 2000);
  }

  // UI ヘルパー
  function showLoading(flag) {
    loadingEl.hidden = !flag;
  }

  function showOutput() {
    outputBlock.hidden = false;
  }

  function hideOutput() {
    outputBlock.hidden = true;
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
  }

  function hideError() {
    errorMsg.hidden = true;
  }

})();
