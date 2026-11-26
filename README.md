# VideoNodes

Magyar nyelvű, node-alapú szerkesztő animált prezentációs videókhoz. A vászon React Flow-val készült, a videót az FFmpeg WebAssembly-verziója kódolja MP4 (H.264) vagy WebM (VP9) formátumba a böngészőben.

## Helyi indítás

Node.js 22 és npm szükséges. A projektmappában futtasd:

```powershell
npm install
npm run dev
```

A Vite kiírja a megnyitható helyi címet. A kiadási változatot az `npm run build` állítja elő a `dist` mappában. A videó rendereléséhez a böngésző a webalkalmazás mellől tölti be az FFmpeg-et.

## Az első videó

Első megnyitáskor a mintában a Szöveg kártya az első jelenethez, a Háttér kártya a renderelő Háttér bemenetéhez csatlakozik. Az elkészült videót a bekötött Videólejátszó mutatja. A minta és az újonnan hozzáadott renderkártyák MP4 (H.264), Full HD, 30 fps és 4 másodperces jelenethossz beállításokkal indulnak. Mentett projekt esetén a szerkesztő **Minta** gombjával nyithatod meg az indító elrendezést. Ha a böngésző a korábbi háromkártyás indítómintát tárolja, megnyitáskor a friss mintát kapod. Az eredeti vásznat a **Régi mentés megnyitása** gombbal érheted el a bal oldali sávban, az új minta mentése után is.

1. A mintaprojektben írd át a **Szöveg** kártya tartalmát. Válassz betűtípust, színt, animációt és időtartamot. Az **Előnézet** gomb felugró ablakban lejátssza az aktuális animációt.
2. Az **FFmpeg render** kártyán állítsd be a formátumot, a felbontást (akár 3840 × 2160), a képkockasebességet és a jelenetek hosszát. A minőségi beállítások a **Gyors előnézet** (CRF 26), a **Kiegyensúlyozott** (CRF 20) és a **Stúdió minőség** (CRF 15).
3. A **Videólejátszó** kártyán nézd meg az élő előnézetet. A **Renderelés** gomb után ugyanitt játszható le és tölthető le a kész videó. A jobb alsó sarkot húzva módosíthatod a kártya méretét, az **Ismétlés** gomb folyamatos lejátszást indít el, ha a videó már fut.

Kártyát kattintással vagy húzással adhatsz hozzá a kártyatárból. A jobb alsó sarok húzásával állíthatod a szélességét. A kimeneti csatlakozót húzd a következő kártya bemenetére. A vezeték fényes középső pontjára kattintva megjelenik a **Törlés** gomb. A `Delete` billentyű továbbra is törli a kijelölt kártyát vagy kapcsolatot.

## Több jelenet egy videóban

Kösd a Szöveg kártyákat az **FFmpeg render** kártya **Jelenet 01–10** bemeneteire, és a sorok mezőiben add meg az egyes jelenetek hosszát. Üres időmezőnél a szöveganimáció saját ideje érvényesül. Hosszabb jelenetben az elkészült felirat a jelenet végéig látható. Rövidebb jelenetnél a váltás megszakíthatja az animációt.

Az előnézet és a render sorszám szerint halad, az üres bemeneteket kihagyva. A kék sávok jelenetenként követik az előrehaladást, az alsó jelző a teljes videót mutatja. A régi projektekben tárolt videóhossz a jelenetek hosszába kerül át. A korábbi szöveges kapcsolat a **Jelenet 01** bemenetre kerül.

Az **Átmenet** kártyát a **Szöveg** kimenete és az adott jelenet renderbemenete közé kösd. Válassz például áttűnést, kipördülést, darabokra esést vagy lapozást, majd adj meg 0,1–5 másodpercet. Az effekt az adott jelenet végén indul, és a következő bekötött jelenetre vált. A két rész fedése rövidíti a teljes videót. A renderelő a rendelkezésre álló képkockákhoz igazítja a fedést. Az utolsó jelenet a saját hosszával ér véget.

## Háttérkártya

Az **FFmpeg render** kártya **Háttér** bemenete a jelenetek közös hátterét adja. Ha egy **Szöveg** kártya bal oldali **Háttér** bemenetére is kötsz háttérkártyát, az adott jelenet ezt használja az előnézetben és a renderelt videóban. Az egyedi háttér animációja a jelenet elején indul. Ha a jelenethez egyik bemeneten sem kapcsolódik háttér, fekete lesz. A renderelőhöz kötött közös háttér szöveg nélkül is renderelhető, a **Jelenet 01** hosszával.

- **Képfeltöltés.** Válassz böngészőben megnyitható képet legfeljebb 25 MB méretig. Alakítsd ki az illesztést, a képkivágást, a nagyítást, az átlátszatlanságot és a mögöttes alapszínt. A böngésző állóképpé alakítja a fájlt a mentéshez.
- **Színátmenet és animáció.** Nyisd meg a **Háttér szerkesztése** ablakot. Válassz mintát, vagy állíts be legfeljebb öt színt, lineáris vagy radiális átmenetet, illetve fényfoltokat. A statikus mód mellett a forgatás, a sodródás és a pulzálás is beállítható. Az **Alkalmazás** átveszi az élő előnézet beállításait.

A feltöltött háttérképet a böngésző menti, és a JSON-export is tartalmazza. A kép megjelenik a szövegelőnézetben, a videólejátszóban és a kész MP4- vagy WebM-fájlban.

A **Mentés** új példányt készít az aktuális vászon képernyőképével. Helyi `npm run dev` vagy `npm run preview` futtatásnál a fájlok a `backups/saves` mappa egy-egy almappájába kerülnek. A **Projekt importálása** gomb megnyitja a név szerint kereshető képes galériát. Egy képre kattintva betölthető a mentés. A galériában a `backups/starter.json` kezdőprojekt és a külön **JSON-fájl megnyitása** gomb is elérhető. A hosztolt oldalon a képes mentések a böngészőben tárolódnak.

Az elrendezés és a beállítások külön JSON-fájlba is exportálhatók. A videókat a lejátszóból töltheted le. A böngésző a formátum első renderelésekor tölti be a kódolót. Az MP4 motorja körülbelül 32 MB, a WebM motorja körülbelül 4,5 MB. Egy szöveganimáció legfeljebb 10 másodpercig tarthat, a jelenethossz 0,1 és 20 másodperc között állítható.

## Könyvtárak

- [React Flow](https://reactflow.dev/learn/customization/custom-nodes)
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/getting-started/usage/)
- [LibAV.js](https://github.com/Yahweasel/libav.js/releases/tag/v6.11.9) (WebM/VP9)
