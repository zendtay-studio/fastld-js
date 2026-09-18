/*
 * Copyright 2026 ZendTay Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let e = null, o = null, t = null;

// compiled lazily (first tokenize) to keep require() ~instant
let n = null;

// code point -> folded base letter (bit-level diacritic table)
// Fold pairs "src,base" precomputed like buildDM() would: for every code point
// that NFD-decomposes into a base letter + combining marks, base is stored.
// Esperanto letters (ĉĝĥĵŝŭ) are kept intact, so "sxanxo" != "sanjo".
// Listed as <src><base> pairs; ~0 for unchanged/kept.
const u = 'ÀAÁAÂAÃAÄAÅAÇCÈEÉEÊEËEÌIÍIÎIÏIÑNÒOÓOÔOÕOÖOÙUÚUÛUÜUÝYàaáaâaãaäaåaçcèeéeêeëeìiíiîiïiñnòoóoôoõoöoùuúuûuüuýyÿyĀAāaĂAăaĄAąaĆCćcĊCċcČCčcĎDďdĒEēeĔEĕeĖEėeĘEęeĚEěeĞGğgĠGġgĢGģgĨIĩiĪIīiĬIĭiĮIįiİIĶKķkĹLĺlĻLļlĽLľlŃNńnŅNņnŇNňnŌOōoŎOŏoŐOőoŔRŕrŖRŗrŘRřrŚSśsŞSşsŠSšsŢTţtŤTťtŨUũuŪUūuŮUůuŰUűuŲUųuŴWŵwŶYŷyŸYŹZźzŻZżzŽZžzƠOơoƯUưuǍAǎaǏIǐiǑOǒoǓUǔuǕUǖuǗUǘuǙUǚuǛUǜuǞAǟaǠAǡaǢÆǣæǦGǧgǨKǩkǪOǫoǬOǭoǮƷǯʒǰjǴGǵgǸNǹnǺAǻaǼÆǽæǾØǿøȀAȁaȂAȃaȄEȅeȆEȇeȈIȉiȊIȋiȌOȍoȎOȏoȐRȑrȒRȓrȔUȕuȖUȗuȘSșsȚTțtȞHȟhȦAȧaȨEȩeȪOȫoȬOȭoȮOȯoȰOȱoȲYȳÿ́̈΅¨ΆΑΈΕΉΗΊΙΌΟΎΥΏΩΐιΪΙΫΥάαέεήηίιΰυϊιϋυόούυώωϓϒϔϒЀЕЁЕЃГЇІЌКЍИЎУЙИйиѐеёеѓгїіќкѝиўуѶѴѷѵӁЖӂжӐАӑаӒАӓаӖЕӗеӚӘӛәӜЖӝжӞЗӟзӢИӣиӤИӥиӦОӧоӪӨӫөӬЭӭэӮУӯуӰУӱуӲУӳуӴЧӵчӸЫӹыآاأاؤوإائيۀەۂہۓےऩनऱरऴळक़कख़खग़गज़जड़डढ़ढफ़फय़यোেৌেড়ডঢ়ঢয়যਲ਼ਲਸ਼ਸਖ਼ਖਗ਼ਗਜ਼ਜਫ਼ਫୈେୋେୌେଡ଼ଡଢ଼ଢஔஒொெோேௌெైెೀಿೇೆೈೆೊೆೋೆൊെോേൌെේෙොෙෝෙෞෙགྷགཌྷཌདྷདབྷབཛྷཛཀྵཀཱཱཱཱིུྲྀྲླྀླཱཱྀྒྷྒྜྷྜྡྷྡྦྷྦྫྷྫྐྵྐဦဥᬆᬅᬈᬇᬊᬉᬌᬋᬎᬍᬒᬑᬻᬺᬽᬼᭀᬾᭁᬿᭃᭂḀAḁaḂBḃbḄBḅbḆBḇbḈCḉcḊDḋdḌDḍdḎDḏdḐDḑdḒDḓdḔEḕeḖEḗeḘEḙeḚEḛeḜEḝeḞFḟfḠGḡgḢHḣhḤHḥhḦHḧhḨHḩhḪHḫhḬIḭiḮIḯiḰKḱkḲKḳkḴKḵkḶLḷlḸLḹlḺLḻlḼLḽlḾMḿmṀMṁmṂMṃmṄNṅnṆNṇnṈNṉnṊNṋnṌOṍoṎOṏoṐOṑoṒOṓoṔPṕpṖPṗpṘRṙrṚRṛrṜRṝrṞRṟrṠSṡsṢSṣsṤSṥsṦSṧsṨSṩsṪTṫtṬTṭtṮTṯtṰTṱtṲUṳuṴUṵuṶUṷuṸUṹuṺUṻuṼVṽvṾVṿvẀWẁwẂWẃwẄWẅwẆWẇwẈWẉwẊXẋxẌXẍxẎYẏyẐZẑzẒZẓzẔZẕzẖhẗtẘwẙyẛſẠAạaẢAảaẤAấaẦAầaẨAẩaẪAẫaẬAậaẮAắaẰAằaẲAẳaẴAẵaẶAặaẸEẹeẺEẻeẼEẽeẾEếeỀEềeỂEểeỄEễeỆEệeỈIỉiỊIịiỌOọoỎOỏoỐOốoỒOồoỔOổoỖOỗoỘOộoỚOớoỜOờoỞOởoỠOỡoỢOợoỤUụuỦUủuỨUứuỪUừuỬUửuỮUữuỰUựuỲYỳyỴYỵyỶYỷyỸYỹyἀαἁαἂαἃαἄαἅαἆαἇαἈΑἉΑἊΑἋΑἌΑἍΑἎΑἏΑἐεἑεἒεἓεἔεἕεἘΕἙΕἚΕἛΕἜΕἝΕἠηἡηἢηἣηἤηἥηἦηἧηἨΗἩΗἪΗἫΗἬΗἭΗἮΗἯΗἰιἱιἲιἳιἴιἵιἶιἷιἸΙἹΙἺΙἻΙἼΙἽΙἾΙἿΙὀοὁοὂοὃοὄοὅοὈΟὉΟὊΟὋΟὌΟὍΟὐυὑυὒυὓυὔυὕυὖυὗυὙΥὛΥὝΥὟΥὠωὡωὢωὣωὤωὥωὦωὧωὨΩὩΩὪΩὫΩὬΩὭΩὮΩὯΩὰαάαὲεέεὴηήηὶιίιὸοόοὺυύυὼωώωᾀαᾁαᾂαᾃαᾄαᾅαᾆαᾇαᾈΑᾉΑᾊΑᾋΑᾌΑᾍΑᾎΑᾏΑᾐηᾑηᾒηᾓηᾔηᾕηᾖηᾗηᾘΗᾙΗᾚΗᾛΗᾜΗᾝΗᾞΗᾟΗᾠωᾡωᾢωᾣωᾤωᾥωᾦωᾧωᾨΩᾩΩᾪΩᾫΩᾬΩᾭΩᾮΩᾯΩᾰαᾱαᾲαᾳαᾴαᾶαᾷαᾸΑᾹΑᾺΑΆΑᾼΑ῁¨ῂηῃηῄηῆηῇηῈΕΈΕῊΗΉΗῌΗ῍᾿῎᾿῏᾿ῐιῑιῒιΐιῖιῗιῘΙῙΙῚΙΊΙ῝῾῞῾῟῾ῠυῡυῢυΰυῤρῥρῦυῧυῨΥῩΥῪΥΎΥῬΡ῭¨΅¨ῲωῳωῴωῶωῷωῸΟΌΟῺΩΏΩῼΩÅA↚←↛→↮↔⇍⇐⇎⇔⇏⇒∄∃∉∈∌∋∤∣∦∥≁∼≄≃≇≅≉≈≠=≢≡≭≍≮<≯>≰≤≱≥≴≲≵≳≸≶≹≷⊀≺⊁≻⊄⊂⊅⊃⊈⊆⊉⊇⊬⊢⊭⊨⊮⊩⊯⊫⋠≼⋡≽⋢⊑⋣⊒⋪⊲⋫⊳⋬⊴⋭⊵⫝̸⫝';

{
    const e = new Uint16Array(11008);
    // 0x80..0x2AFF: Latin, Greek, Cyrillic, Armenian...
        for (let o = 0; o < u.length; o += 2) {
        e[u.charCodeAt(o)] = u.charCodeAt(o + 1);
    }
    n = e;
}

// Strip diacritics ("café" -> "cafe", "ñ" -> "n"). The model is built from
// folded text, so query and index always agree. ASCII pass is allocation-free:
// an untouched string is returned as-is.
function l(e) {
    let o = '', t = 0;
    const u = e.length;
    for (let l = 0; l < u; l++) {
        const u = e.charCodeAt(l);
        if (u < 128) continue;
        // plain ASCII: already folded
                let a = u < n.length ? n[u] : 0;
        if (a === 0 && u >= n.length) {
            // rare astral/unknown: live NFD
            const o = e[l].normalize('NFD');
            if (o.length > 1) a = o.charCodeAt(0);
        }
        if (a === 0) continue;
        // unchanged (KEEP or no marks)
                if (l > t) o += e.slice(t, l);
        // flush untouched run
                o += String.fromCharCode(a);
        t = l + 1;
    }
    return t === 0 ? e : t < u ? o + e.slice(t) : o;
}

// Clean text into lowercase tokens: strip numbers/emoji/symbols, collapse
// letter repeats, fold diacritics, and dedupe (preserves words from any language).
function a(n) {
    if (!n || typeof n !== 'string') return [];
    if (!e) {
        e = /[\p{L}\u0F0B]+/gu;
        o = /(.)\1{2,}/gu;
        t = /(.)\1{2,}/u;
    }
    // \u0F0B = Tibetan tsek
        const u = [];
    let a;
    e.lastIndex = 0;
    while ((a = e.exec(n)) !== null) {
        const e = a[0];
        let o = e;
        for (let t = 0; t < e.length; t++) {
            // toLowerCase only if it can change something
            const n = e.charCodeAt(t);
            if (n >= 128 || n >= 65 && n <= 90) {
                o = e.toLowerCase();
                break;
            }
        }
        u.push(l(o));
    }
    if (u.length === 0) return [];
    const i = Object.create(null);
    const r = [];
    for (let e = 0; e < u.length; e++) {
        let n = u[e];
        if (t.test(n)) n = n.replace(o, '$1');
        // only allocate when repeats exist
                if (n.length < 2 || i[n]) continue;
        i[n] = 1;
        r.push(n);
    }
    return r;
}

module.exports = {
    tokenize: a,
    fold: l
};