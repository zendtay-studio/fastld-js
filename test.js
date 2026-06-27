// test.js

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

const assert = require('assert');
const { detect, detectAll, getDatabaseInfo } = require('./index');
const { tokenize } = require('./clear');
const ISO_MAP = require('./iso');

console.log("⚡ =================================================== ⚡");
console.log("     COMPLETE ISO 639-1 LANGUAGE DETECTION TEST        ");
console.log("⚡ =================================================== ⚡\n");

assert.deepStrictEqual(tokenize('Hola!!! 123 😀😀 hola hola spam spam!!!'), ['hola', 'spam']);
console.log('🧪 Tokenization regression test passed');

const dbInfo = getDatabaseInfo();
console.log(`📊 Database Info:`);
console.log(`   Type: ${dbInfo.type}`);
console.log(`   Languages: ${dbInfo.languages}`);
console.log(`   Total n-grams: ${dbInfo.ngrams.toLocaleString()}`);
console.log(`   Config: ${dbInfo.config.NGRAM_SIZES.join(', ')}-grams, top ${dbInfo.config.TOP_NGRAMS_PER_LANG} per language`);
console.log(`   Generated: ${dbInfo.generated}\n`);

// Test texts for ALL ISO codes
const TEST_TEXTS = {
    // Romance languages
    es: `La familia salió de viaje hacia la playa el fin de semana pasado. El clima estaba perfecto para nadar y tomar el sol durante toda la tarde. Los niños construyeron castillos de arena mientras los padres descansaban en la sombra. Comieron pescado fresco y bebieron agua de coco en el restaurante del lugar. Por la noche, caminaron por la orilla viendo las estrellas y escuchando el sonido de las olas. Fue un día maravilloso que todos recordarán por siempre.`,
    
    en: `The family went on a trip to the beach last weekend. The weather was perfect for swimming and sunbathing all afternoon. The children built sandcastles while the parents relaxed in the shade. They ate fresh fish and drank coconut water at the local restaurant. In the evening, they walked along the shore watching the stars and listening to the sound of the waves. It was a wonderful day that everyone will remember forever.`,
    
    fr: `La famille est partie en voyage à la plage le week-end dernier. Le temps était parfait pour se baigner et bronzer tout l'après-midi. Les enfants ont construit des châteaux de sable pendant que les parents se reposaient à l'ombre. Ils ont mangé du poisson frais et bu de l'eau de coco au restaurant local. Le soir, ils se sont promenés le long du rivage en regardant les étoiles et en écoutant le bruit des vagues. Ce fut une merveilleuse journée que tout le monde se souviendra pour toujours.`,
    
    it: `La famiglia ha fatto un viaggio in spiaggia lo scorso fine settimana. Il tempo era perfetto per nuotare e prendere il sole per tutto il pomeriggio. I bambini hanno costruito castelli di sabbia mentre i genitori si rilassavano all'ombra. Hanno mangiato pesce fresco e bevuto acqua di cocco al ristorante locale. La sera, hanno camminato lungo la riva guardando le stelle e ascoltando il suono delle onde. È stata una giornata meravigliosa che tutti ricorderanno per sempre.`,
    
    pt: `A família fez uma viagem à praia no último fim de semana. O tempo estava perfeito para nadar e apanhar sol durante toda a tarde. As crianças construíram castelos de areia enquanto os pais relaxavam à sombra. Comeram peixe fresco e beberam água de coco no restaurante local. À noite, caminharam pela costa observando as estrelas e ouvindo o som das ondas. Foi um dia maravilhoso que todos lembrarão para sempre.`,
    
    ro: `Familia a făcut o excursie la plajă weekendul trecut. Vremea era perfectă pentru înot și plajă toată după-amiaza. Copiii au construit castele de nisip în timp ce părinții se relaxau la umbră. Au mâncat pește proaspăt și au băut apă de cocos la restaurantul local. Seara, s-au plimbat de-a lungul țărmului privind stelele și ascultând sunetul valurilor. A fost o zi minunată pe care toată lumea o va aminti pentru totdeauna.`,
    
    ca: `La família va fer un viatge a la platja el cap de setmana passat. El temps era perfecte per nedar i prendre el sol durant tota la tarda. Els nens van construir castells de sorra mentre els pares descansaven a l'ombra. Van menjar peix fresc i van beure aigua de coco al restaurant local. Al vespre, van caminar per la riba mirant les estrelles i escoltant el so de les onades. Va ser un dia meravellós que tothom recordarà per sempre.`,
    
    // Germanic languages
    de: `Die Familie machte am vergangenen Wochenende einen Ausflug an den Strand. Das Wetter war den ganzen Nachmittag perfekt zum Schwimmen und Sonnenbaden. Die Kinder bauten Sandburgen, während die Eltern sich im Schatten entspannten. Sie aßen frischen Fisch und tranken Kokoswasser im örtlichen Restaurant. Am Abend gingen sie am Ufer entlang, beobachteten die Sterne und lauschten dem Rauschen der Wellen. Es war ein wundervoller Tag, an den sich alle für immer erinnern werden.`,
    
    nl: `Het gezin maakte een reis naar het strand afgelopen weekend. Het weer was de hele middag perfect om te zwemmen en te zonnebaden. De kinderen bouwden zandkastelen terwijl de ouders in de schaduw ontspanden. Ze aten verse vis en dronken kokoswater in het lokale restaurant. 's Avonds liepen ze langs de kust terwijl ze naar de sterren keken en luisterden naar het geluid van de golven. Het was een prachtige dag die iedereen voor altijd zal herinneren.`,
    
    sv: `Familjen gjorde en resa till stranden förra helgen. Vädret var perfekt för simning och solbad hela eftermiddagen. Barnen byggde sandslott medan föräldrarna vilade i skuggan. De åt färsk fisk och drack kokosvatten på den lokala restaurangen. På kvällen promenerade de längs stranden och tittade på stjärnorna och lyssnade på vågornas ljud. Det var en underbar dag som alla kommer att minnas för alltid.`,
    
    da: `Familien tog en tur til stranden i sidste weekend. Vejret var perfekt til svømning og solbadning hele eftermiddagen. Børnene byggede sandslotte, mens forældrene slappede af i skyggen. De spiste frisk fisk og drak kokosvand på den lokale restaurant. Om aftenen gik de langs kysten og kiggede på stjernerne og lyttede til bølgernes lyd. Det var en vidunderlig dag, som alle vil huske for evigt.`,
    
    no: `Familien dro på tur til stranden i helgen. Været var perfekt for svømming og soling hele ettermiddagen. Barna bygget sandslott mens foreldrene slappet av i skyggen. De spiste fersk fisk og drakk kokosvann på den lokale restauranten. Om kvelden gikk de langs stranden og så på stjernene og lyttet til bølgenes lyd. Det var en fantastisk dag som alle vil huske for alltid.`,
    
    is: `Fjölskyldan fór í ferð til strandarinnar um síðustu helgi. Veðrið var fullkomið fyrir sund og sólbað alla síðdegistímann. Börnin smíðuðu sandkastala á meðan foreldrarnir slökuðu í skugganum. Þeir borðuðu ferskan fisk og drukku kókosvatn á veitingastaðnum á staðnum. Á kvöldin gengu þeir með ströndinni horfandi á stjörnurnar og hlýðandi á hljóð öldurnar. Það var dásamlegur dagur sem allir munu muna að eilífu.`,
    
    // Slavic languages
    pl: `Rodzina wybrała się na plażę w zeszły weekend. Pogoda była idealna do pływania i opalania przez całe popołudnie. Dzieci budowały zamki z piasku, podczas gdy rodzice odpoczywali w cieniu. Zjedli świeżą rybę i pili wodę kokosową w lokalnej restauracji. Wieczorem spacerowali wzdłuż brzegu, obserwując gwiazdy i słuchając szumu fal. To był wspaniały dzień, który wszyscy zapamiętają na zawsze.`,
    
    cs: `Rodina vyrazila na pláž minulý víkend. Počasí bylo ideální pro plavání a opalování celé odpoledne. Děti stavěly hrady z písku, zatímco rodiče odpočívali ve stínu. Jedli čerstvé ryby a pili kokosovou vodu v místní restauraci. Večer se procházeli po břehu, dívali se na hvězdy a poslouchali zvuk vln. Byl to nádherný den, na který budou všichni vzpomínat navždy.`,
    
    sk: `Rodina vycestovala na pláž minulý víkend. Počasie bolo ideálne na plávanie a opaľovanie celé popoludnie. Deti stavali hrady z piesku, zatiaľ čo rodičia odpočívali v tieni. Jedli čerstvé ryby a pili kokosovú vodu v miestnej reštaurácii. Večer sa prechádzali po brehu, pozerali sa na hviezdy a počúvali zvuk vĺn. Bol to nádherný deň, na ktorý budú všetci spomínať navždy.`,
    
    ru: `Семья отправилась на пляж в прошлые выходные. Погода была идеальной для купания и загара весь день. Дети строили замки из песка, пока родители отдыхали в тени. Они ели свежую рыбу и пили кокосовую воду в местном ресторане. Вечером они гуляли по берегу, глядя на звезды и слушая шум волн. Это был чудесный день, который все запомнят навсегда.`,
    
    uk: `Сім'я вирушила на пляж минулих вихідних. Погода була ідеальною для купання та засмаги цілий день. Діти будували замки з піску, поки батьки відпочивали в тіні. Вони їли свіжу рибу та пили кокосову воду в місцевому ресторані. Ввечері вони гуляли вздовж берега, дивлячись на зірки та слухаючи шум хвиль. Це був чудовий день, який всі запам'ятають назавжди.`,
    
    hr: `Obitelj je otputovala na plažu prošlog vikenda. Vrijeme je bilo savršeno za plivanje i sunčanje cijelo poslijepodne. Djeca su gradila dvorce od pijeska dok su se roditelji opuštali u hladu. Jeli su svježu ribu i pili kokosovu vodu u lokalnom restoranu. Navečer su šetali uz obalu gledajući zvijezde i slušajući zvuk valova. Bio je to prekrasan dan kojeg će se svi zauvijek sjećati.`,
    
    sr: `Породица је отпутовала на плажу прошлог викенда. Време је било савршено за пливање и сунчање цело поподне. Деца су градила дворце од песка док су се родитељи опуштали у хладу. Јели су свежу рибу и пили кокосову воду у локалном ресторану. Увече су шетали дуж обале гледајући звезде и слушајући звук таласа. Био је то прекрасан дан којег ће се сви заувек сећати.`,
    
    sl: `Družina se je odpravila na plažo prejšnji konec tedna. Vreme je bilo popolno za plavanje in sončenje celo popoldne. Otroci so gradili gradbene iz peska, medtem ko so se starši sprostili v senci. Jedli so sveže ribe in pili kokosovo vodo v lokalni restavraciji. Zvečer so se sprehajali ob obali, opazovali zvezde in poslušali zvok valov. Bil je čudovit dan, ki se ga bodo vsi za vedno spominjali.`,
    
    bg: `Семейството отиде на плаж миналия уикенд. Времето беше перфектно за плуване и слънчеви бани цял следобед. Децата строяха пясъчни замъци, докато родителите си почиваха на сянка. Ядоха прясна риба и пиха кокосова вода в местния ресторант. Вечерта се разхождаха по брега, гледайки звездите и слушайки звука на вълните. Беше прекрасен ден, който всички ще запомнят завинаги.`,
    
    // Baltic languages
    lt: `Šeima išvyko į paplūdimį praėjusį savaitgalį. Oras buvo puikus maudytis ir degintis saulėje visą popietę. Vaikai statė pilis iš smėlio, kol tėvai ilsėjosi pavėsyje. Jie valgė šviežią žuvį ir gėrė kokosų vandenį vietiniame restorane. Vakare jie vaikščiojo palei krantą, žiūrėdami į žvaigždes ir klausydami bangų garso. Tai buvo nuostabi diena, kurią visi prisimins amžinai.`,
    
    lv: `Ģimene devās ceļojumā uz pludmali pagājušajā nedēļas nogalē. Laiks bija lielisks peldēšanai un sauļošanai visu pēcpusdienu. Bērni būvēja smilšu pilis, kamēr vecāki atpūtās ēnā. Viņi ēda svaigas zivis un dzēra kokosriekstu ūdeni vietējā restorānā. Vakarā viņi staigāja gar krastu, skatoties zvaigznes un klausoties viļņu skaņu. Tā bija brīnišķīga diena, ko visi atcerēsies mūžīgi.`,
    
    et: `Perekond sõitis eelmisel nädalavahetusel rannareisile. Ilm oli suurepärane ujumiseks ja päevitamiseks terve pärastlõuna. Lapsed ehitasid liivalosse, samal ajal kui vanemad puhkasid varjus. Nad sõid värsket kala ja jõid kookosvett kohalikus restoranis. Õhtul kõndisid nad mööda kallast, vaadates tähti ja kuulates lainete häält. See oli imeline päev, mida kõik mäletavad igavesti.`,
    
    // Finno-Ugric languages
    fi: `Perhe teki matkan rannalle viime viikonloppuna. Sää oli täydellinen uimiseen ja auringonottoon koko iltapäivän. Lapset rakensivat hiekkalinnoja, kun vanhemmat lepäsivät varjossa. He söivät tuoretta kalaa ja joivat kookosvettä paikallisessa ravintolassa. Illalla he kävelivät rannalla tähtiä katsellen ja aaltojen ääntä kuunnellen. Se oli ihana päivä, jonka kaikki muistavat ikuisesti.`,
    
    hu: `A család kirándult a tengerpartra a múlt hétvégén. Az idő tökéletes volt úszáshoz és napozáshoz egész délután. A gyerekek homokvárat építettek, míg a szülők a árnyékban pihentek. Friss halat ettek és kókuszvizet ittak a helyi étteremben. Este a part mentén sétáltak, csillagokat nézve és a hullámok hangját hallgatva. Csodálatos nap volt, amit mindenki örökké emlékezetesnek fog tartani.`,
    
    // Celtic languages
    ga: `Chuaigh an teaghlach ar thuras go dtí an trá an deireadh seachtaine seo caite. Bhí an aimsir foirfe do snámh agus do dheamhas gréine i rith an tráthnóna. Thóg na páistí caisleáin ghainimh agus na tuismitheoirí ag scíth a ligean sa scáth. D'ith siad iasc úr agus d'ól siad uisce cnó cócó sa bhialann áitiúil. Tráthnóna, shiúil siad cois chladach ag breathnú ar na réaltaí agus ag éisteacht le fuaim na dtonnta. Lá iontach a bheidh i gcuimhne ag gach duine go deo.`,
    
    cy: `Aeth y teulu ar daith i'r traeth y penwythnos diwethaf. Roedd y tywydd yn berffaith ar gyfer nofio ac ymlacio yn yr haul drwy'r prynhawn. Adeiladodd y plant gestyll tywod tra'r rhieni yn ymlacio yn y cysgod. Bwytasant bysgod ffres ac yfasant ddŵr cnau coco yn y bwyty lleol. Gyda'r nos, cerddent ar hyd y lan yn gwylio'r sêr ac yn gwrando ar sŵn y tonnau. Roedd yn ddiwrnod hyfryd y bydd pawb yn ei gofio am byth.`,
    
    // Greek
    el: `Η οικογένεια πήγε εκδρομή στην παραλία το περασμένο σαββατοκύριακο. Ο καιρός ήταν τέλειος για κολύμπι και ηλιοθεραπεία όλο το απόγευμα. Τα παιδιά έχτισαν κάστρα από άμμο ενώ οι γονείς χαλάρωναν στη σκιά. Έφαγαν φρέσκο ψάρι και ήπιαν νερό καρύδας στο τοπικό εστιατόριο. Το βράδυ, περπάτησαν κατά μήκος της ακτής κοιτάζοντας τα αστέρια και ακούγοντας τον ήχο των κυμάτων. Ήταν μια υπέροχη μέρα που όλοι θα θυμούνται για πάντα.`,
    
    // Albanian
    sq: `Familja bëri një udhëtim në plazh fundjavën e kaluar. Moti ishte i përsosur për not dhe rrezitje gjatë gjithë pasdites. Fëmijët ndërtuan kështjella rëre ndërsa prindërit pushonin në hije. Ata hëngrën peshk të freskët dhe pinë ujë kokosi në restorantin lokal. Në mbrëmje, ata ecën përgjatë bregut duke parë yjet dhe duke dëgjuar zhurmën e valëve. Ishte një ditë e mrekullueshme që të gjithë do ta kujtojnë përgjithmonë.`,
    
    // Armenian
    hy: `Ընտանիքը վերջին շաբաթավերջին ճանապարհորդեց դեպի լողափ: Եղանակը կատարյալ էր լողալու և արևայրուք ընդունելու համար ամբողջ կեսօրին: Երեխաները ավազից ամրոցներ էին կառուցում, մինչ ծնողները հանգստանում էին ստվերում: Նրանք տեղական ռեստորանում թարմ ձուկ կերան և կոկոսի ջուր խմեցին: Երեկոյան նրանք քայլում էին ափով՝ նայելով աստղերին և լսելով ալիքների ձայնը: Դա հրաշալի օր էր, որը բոլորը հավերժ կհիշեն:`,
    
    // Georgian
    ka: `ოჯახი გასულ შაბათ-კვირას სანაპიროზე გაემგზავრა. ამინდი მთელი შუადღის განმავლობაში ცურვისა და მზის აბაზანებისთვის იდეალური იყო. ბავშვები ქვიშის ციხეებს აშენებდნენ, სანამ მშობლები ჩრდილში ისვენებდნენ. მათ ადგილობრივ რესტორანში ახალი თევზი მიირთვეს და ქოქოსის წყალი დალიეს. საღამოს ისინი ნაპირზე დადიოდნენ, ვარსკვლავებს უყურებდნენ და ტალღების ხმას უსმენდნენ. ეს იყო შესანიშნავი დღე, რომელსაც ყველა სამუდამოდ დაიმახსოვრებს.`,
    
    // Semitic languages
    ar: `ذهبت العائلة في رحلة إلى الشاطئ في نهاية الأسبوع الماضي. كان الطقس مثالياً للسباحة والاستمتاع بأشعة الشمس طوال فترة بعد الظهر. بنى الأطفال قلاعاً من الرمال بينما كان الوالدان يسترخيان في الظل. تناولوا سمكاً طازجاً وشربوا ماء جوز الهند في المطعم المحلي. في المساء، تمشوا على طول الشاطئ يتأملون النجوم ويستمعون إلى صوت الأمواج. كان يوماً رائعاً سيتذكره الجميع إلى الأبد.`,
    
    he: `המשפחה יצאה לטיול לחוף הים בסוף השבוע שעבר. מזג האוויר היה מושלם לשחייה ולשיזוף לאורך כל אחר הצהריים. הילדים בנו טירות חול בזמן שההורים נחו בצל. הם אכלו דגים טריים ושתו מי קוקוס במסעדה המקומית. בערב, הם טיילו לאורך החוף תוך התבוננות בכוכבים והאזנה לקול הגלים. זה היה יום נפלא שכולם יזכרו לנצח.`,
    
    mt: `Il-familja marret il-bajja l-aħħar tmiem il-ġimgħa. It-temp kien perfett għall-għawm u għall-kemm xemx matul il-waranofs kollu. It-tfal bnew kastelli tar-ramel waqt li l-ġenituri rrilassaw fid-dell. Huma kielu ħut frisk u xorbu ilma tal-ġewż indiġeni fir-ristorant lokali. Filgħaxija, mexew tul ix-xatt jaraw l-istilel u jisimgħu l-ħoss tal-mewġ. Kienet ġurnata sabiħa li kulħadd se jiftakar għal dejjem.`,
    
    // Indo-Iranian languages
    hi: `परिवार पिछले सप्ताहांत समुद्र तट की यात्रा पर गया था। दोपहर भर तैराकी और धूप सेंकने के लिए मौसम एकदम सही था। बच्चों ने रेत के महल बनाए जबकि माता-पिता छाया में आराम कर रहे थे। उन्होंने स्थानीय रेस्तरां में ताज़ी मछली खाई और नारियल पानी पिया। शाम को, वे तारों को देखते हुए और लहरों की आवाज़ सुनते हुए किनारे पर टहले। यह एक अद्भुत दिन था जिसे हर कोई हमेशा याद रखेगा।`,
    
    ur: `خاندان نے گزشتہ ہفتے کے آخر میں ساحل سمندر کا سفر کیا۔ دوپہر بھر تیراکی اور دھوپ سینکنے کے لیے موسم بہترین تھا۔ بچوں نے ریت کے قلعے بنائے جبکہ والدین سایہ میں آرام کر رہے تھے۔ انہوں نے مقامی ریستوران میں تازہ مچھلی کھائی اور ناریل پانی پیا۔ شام کو، وہ ستاروں کو دیکھتے ہوئے اور لہروں کی آواز سنتے ہوئے ساحل کے کنارے چلے۔ یہ ایک شاندار دن تھا جسے ہر کوئی ہمیشہ یاد رکھے گا۔`,
    
    bn: `পরিবারটি গত সপ্তাহান্তে সমুদ্র সৈকতে ভ্রমণ করেছিল। বিকেল জুড়ে সাঁতার কাটা এবং রোদ পোহানোর জন্য আবহাওয়া নিখুঁত ছিল। বাচ্চারা বালির দুর্গ তৈরি করছিল যখন বাবা-মা ছায়ায় বিশ্রাম নিচ্ছিলেন। তারা স্থানীয় রেস্তোরাঁয় তাজা মাছ খেয়েছিলেন এবং নারকেল জল পান করেছিলেন। সন্ধ্যায়, তারা তারা দেখতে এবং wavesেউয়ের শব্দ শুনতে তীরে হাঁটত। এটি একটি দুর্দান্ত দিন ছিল যা সবার চিরকাল মনে থাকবে।`,
    
    // East Asian languages
    zh: `上周末全家去海滩旅行。整个下午的天气都非常适合游泳和享受阳光。孩子们在堆沙堡，而父母则在阴凉处休息。他们在当地餐厅吃了新鲜的鱼，喝了椰子水。晚上，他们沿着海岸散步，看着星星，听着海浪的声音。这是所有人都将永远铭记的美好一天。`,
    
    ja: `先週末、家族でビーチに旅行に行きました。天気は完璧で、午後中ずっと泳いだり日光浴をしたりして過ごしました。子どもたちは砂の城を作り、両親は日陰でリラックスしていました。地元のレストランで新鮮な魚を食べ、ココナッツウォーターを飲みました。夕方には、星を眺めながら波の音を聞きつつ海岸を散歩しました。誰もが永遠に覚えている素晴らしい一日でした。`,
    
    ko: `가족은 지난 주말에 해변으로 여행을 갔습니다. 오후 내내 수영과 일광욕을 하기에 날씨가 완벽했습니다. 아이들은 모래성을 쌓았고 부모님은 그늘에서 휴식을 취했습니다. 현지 식당에서 생선회를 먹고 코코넛 워터를 마셨습니다. 저녁에는 별을 보며 파도 소리를 들으며 해안가를 따라 걸었습니다. 모두가 영원히 기억할 멋진 하루였습니다.`,
    
    // Southeast Asian languages
    vi: `Gia đình đã đi du lịch đến bãi biển vào cuối tuần trước. Thời tiết thật hoàn hảo để bơi lội và tắm nắng suốt cả buổi chiều. Những đứa trẻ xây lâu đài cát trong khi cha mẹ thư giãn dưới bóng râm. Họ ăn cá tươi và uống nước dừa tại nhà hàng địa phương. Vào buổi tối, họ đi dọc theo bờ biển ngắm sao và lắng nghe tiếng sóng vỗ. Đó là một ngày tuyệt vời mà mọi người sẽ nhớ mãi.`,
    
    th: `ครอบครัวไปเที่ยวชายหาดเมื่อสุดสัปดาห์ที่แล้ว อากาศเหมาะสำหรับการว่ายน้ำและการอาบแดดตลอดทั้งบ่าย เด็กๆสร้างปราสาททรายขณะที่ผู้ปกครองพักผ่อนในที่ร่ม พวกเขากินปลาสดและดื่มน้ำมะพร้าวที่ร้านอาหารท้องถิ่น ในตอนเย็นพวกเขาเดินเลียบชายฝั่งดูดาวและฟังเสียงคลื่น มันเป็นวันที่ยอดเยี่ยมที่ทุกคนจะจดจำตลอดไป`,
    
    id: `Keluarga melakukan perjalanan ke pantai akhir pekan lalu. Cuaca sangat sempurna untuk berenang dan berjemur sepanjang sore. Anak-anak membangun istana pasir sementara orang tua bersantai di tempat teduh. Mereka makan ikan segar dan minum air kelapa di restoran lokal. Di malam hari, mereka berjalan di sepanjang pantai sambil melihat bintang dan mendengarkan suara ombak. Itu adalah hari yang indah yang akan dikenang semua orang selamanya.`,
    
    ms: `Keluarga membuat perjalanan ke pantai hujung minggu lalu. Cuaca sangat sempurna untuk berenang dan berjemur sepanjang petang. Anak-anak membina istana pasir sementara ibu bapa berehat di tempat teduh. Mereka makan ikan segar dan minum air kelapa di restoran tempatan. Pada waktu malam, mereka berjalan di sepanjang pantai sambil melihat bintang dan mendengar bunyi ombak. Itu adalah hari yang indah yang akan diingati semua orang selamanya.`,
    
    tl: `Ang pamilya ay naglakbay sa dalampasigan noong nakaraang katapusan ng linggo. Ang panahon ay perpekto para sa paglangoy at pag-sunbath sa buong hapon. Ang mga bata ay nagtayo ng mga kastilyong buhangin habang ang mga magulang ay nagpapahinga sa lilim. Kumain sila ng sariwang isda at uminom ng tubig ng niyog sa lokal na restawran. Sa gabi, naglakad sila sa tabing-dagat na pinagmamasdan ang mga bituin at pinakikinggan ang tunog ng mga alon. Ito ay isang kahanga-hangang araw na tatandaan ng lahat magpakailanman.`,
    
    // Turkic languages
    tr: `Aile geçen hafta sonu plaja bir gezi yaptı. Hava bütün öğleden sonra yüzmek ve güneşlenmek için mükemmeldi. Çocuklar kumdan kaleler yaparken ebeveynler gölgede dinleniyordu. Yerel restoranda taze balık yediler ve hindistan cevizi suyu içtiler. Akşam yıldızları izleyerek ve dalga sesini dinleyerek kıyı boyunca yürüdüler. Herkesin sonsuza kadar hatırlayacağı harika bir gündü.`,
    
    az: `Ailə keçən həftə sonu çimərliyə səyahət etdi. Hava bütün günorta üzmək və günəşlənmək üçün mükəmməl idi. Uşaqlar qum qalaları tikirdilər, valideynlər isə kölgədə istirahət edirdilər. Yerli restoranda təzə balıq yedilər və hindistan cevizi suyu içdilər. Axşam ulduzlara baxaraq və dalğaların səsini dinləyərək sahil boyunca gəzdilər. Hər kəsin əbədi olaraq xatırlayacağı gözəl bir gün idi.`,
    
    // African languages
    sw: `Familia ilifanya safari ya pwani mwishoni mwa wiki iliyopita. Hali ya hewa ilikuwa nzuri kwa kuogelea na kuchoma jua mchana kucha. Watoto walijenga ngome za mchanga wakati wazazi wakipumzika kivulini. Walikula samaki safi na kunywa maji ya nazi kwenye mgahawa wa eneo hilo. Jioni, walitembea kando ya ufuo wakitazama nyota na kusikiliza sauti ya mawimbi. Ilikuwa siku nzuri ambayo kila mtu atakumbuka milele.`,
    
    zu: `Umndeni wenze uhambo olusogadula olwandle ngempelasonto edlule. Isimo sezulu besihle ukuze ubhukude futhi ubheke ilanga ntambama yonke. Izingane zakha izinqaba zesihlabathi ngenkathi abazali bephumule emthunzini. Badla inhlanzi entsha futhi baphuza amanzi kakhukhunathi endaweni yokudlela yendawo. Kusihlwa, bahamba ngasogwini bebuka izinkanyezi futhi belalele umsindo wamagagasi. Kwakusukuzuhle abantu bonke abazosikhumbula unomphela.`,
    
    yo: `Ìdílé ṣe ìrìn àjò lọ sí etíkun ní òpin ọ̀sẹ̀ tó kọjá. Ojú ọjọ́ dára fún odo àti gbigba oòrùn ní gbogbo ọ̀sán. Àwọn ọmọ kọ́ ilẹ̀ iyanrìn nígbà tí àwọn òbí ń sinmi ní iboji. Wọ́n jẹ ẹja tuntun wọ́n sì mu omi àgbọn ní ilé oúnjẹ àdúgbò. Ní alẹ́, wọ́n rin lẹ́bàá etíkun tí wọ́n ń wo ìràwọ̀ tí wọ́n sì ń fetí sí ariwo ìgbì omi. Ó jẹ́ ọjọ́ alárinwinniyìí tí gbogbo ènìyàn yóò rántí títí láé.`
};

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📝 TEST RESULTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("ISO    Language                 Expected  Detected  Status  Accuracy  Time(ms)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

let correctos = 0;
let totalTiempo = 0;
const resultados = [];
const fallos = [];

// Test ALL ISO codes that have test texts
for (const [code, info] of Object.entries(ISO_MAP)) {
    const testText = TEST_TEXTS[code];
    if (!testText) continue;
    
    const inicio = performance.now();
    const res = detect(testText);
    const fin = performance.now();
    const tiempoMs = fin - inicio;
    
    totalTiempo += tiempoMs;
    const esCorrecto = res.code === code;
    if (esCorrecto) correctos++;
    else fallos.push({code, esperado: code, detectado: res.code, name: info.name});
    
    resultados.push({
        esperado: code,
        detectado: res.code,
        name: info.name,
        accuracy: res.accuracy,
        matches: res.matches,
        total: res.total,
        tiempo: tiempoMs,
        ok: esCorrecto
    });
    
    const icono = esCorrecto ? "✅" : "❌";
    const nameShort = info.name.length > 20 ? info.name.substring(0, 17) + "..." : info.name.padEnd(20);
    console.log(`${icono} ${code.toUpperCase().padEnd(4)} ${nameShort}  ${code.toUpperCase().padEnd(7)} → ${res.code.toUpperCase().padEnd(7)}  ${(res.accuracy * 100).toFixed(1)}%    ${tiempoMs.toFixed(2)}`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Compatibility smoke tests
const filtered = detectAll('Hola mundo', { allow: ['es', 'en'] });
if (!Array.isArray(filtered) || filtered.length === 0) {
    throw new Error('detectAll should return filtered results for allow-list options');
}
if (filtered.some(item => !['es', 'en'].includes(item.code))) {
    throw new Error('detectAll allow-list filtering changed the public contract');
}

const limited = detect('Hola mundo', 2);
if (!Array.isArray(limited) || limited.length > 2) {
    throw new Error('detect should return an array when given a numeric limit');
}

console.log("🧪 Compatibility checks passed");

// Summary
const precision = resultados.length > 0 ? (correctos / resultados.length) * 100 : 0;
const tiempoPromedio = resultados.length > 0 ? totalTiempo / resultados.length : 0;

console.log("════════════════════════════════════════════════════════════");
console.log("📊 FINAL SUMMARY");
console.log("════════════════════════════════════════════════════════════");
console.log(`✅ Correct:      ${correctos}/${resultados.length} (${precision.toFixed(1)}%)`);
console.log(`⏱️  Total time:   ${totalTiempo.toFixed(2)} ms`);
console.log(`⚡ Average:      ${tiempoPromedio.toFixed(2)} ms per text`);
console.log(`📋 Languages tested: ${resultados.length} out of ${Object.keys(ISO_MAP).length} total ISO codes`);

if (fallos.length > 0) {
    console.log(`\n❌ MISMATCHES (Expected → Detected):`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    fallos.forEach(f => {
        console.log(`   ${f.code.toUpperCase()} (${f.name}) → ${f.detectado.toUpperCase()}`);
    });
} else {
    console.log(`\n🎉 PERFECT! All languages detected correctly!`);
}

// Show accuracy distribution
console.log(`\n📈 ACCURACY DISTRIBUTION:`);
const accuracies = resultados.map(r => r.accuracy);
const perfect = accuracies.filter(a => a === 1).length;
const high = accuracies.filter(a => a >= 0.9 && a < 1).length;
const medium = accuracies.filter(a => a >= 0.7 && a < 0.9).length;
const low = accuracies.filter(a => a < 0.7).length;

console.log(`   100%:       ${perfect} languages`);
console.log(`   90-99%:     ${high} languages`);
console.log(`   70-89%:     ${medium} languages`);
console.log(`   <70%:       ${low} languages`);
