# Present Fflow

Magyar nyelvű, node-alapú szerkesztő animált prezentációs videókhoz. A vászon React Flow-val készült, a videót az FFmpeg WebAssembly-verziója kódolja MP4 (H.264) vagy WebM (VP9) formátumba a böngészőben.

## Helyi indítás

Node.js 22 és npm szükséges. A projektmappában futtasd:

```powershell
npm install
npm run dev
```

A Vite kiírja a megnyitható helyi címet. A kiadási változatot az `npm run build` állítja elő a `dist` mappában. A videó rendereléséhez a böngésző a webalkalmazás mellől tölti be az FFmpeg-et.

## Az első videó

1. A mintaprojektben írd át a **Szöveg** kártya tartalmát. Válassz betűtípust, színt, animációt és időtartamot. Az **Előnézet** gomb felugró ablakban lejátssza az aktuális animációt.
2. Az **FFmpeg render** kártyán állítsd be a formátumot, a felbontást (akár 3840 × 2160), a képkockasebességet és a jelenetek hosszát. A minőségi beállítások a **Gyors előnézet** (CRF 26), a **Kiegyensúlyozott** (CRF 20) és a **Stúdió minőség** (CRF 15).
3. A **Videólejátszó** kártyán nézd meg az élő előnézetet. A **Renderelés** gomb után ugyanitt játszható le és tölthető le a kész videó. A jobb alsó sarkot húzva módosíthatod a kártya méretét, az **Ismétlés** gomb folyamatos lejátszást indít el, ha a videó már fut.

Kártyát kattintással vagy húzással adhatsz hozzá a kártyatárból. A jobb alsó sarok húzásával állíthatod a szélességét. A kimeneti csatlakozót húzd a következő kártya bemenetére. A vezeték fényes középső pontjára kattintva megjelenik a **Törlés** gomb. A `Delete` billentyű továbbra is törli a kijelölt kártyát vagy kapcsolatot.

## Több jelenet egy videóban

Kösd a Szöveg kártyákat az **FFmpeg render** kártya **Jelenet 01–10** bemeneteire, és a sorok mezőiben add meg az egyes jelenetek hosszát. Üres időmezőnél a szöveganimáció saját ideje érvényesül. Hosszabb jelenetben az elkészült felirat a jelenet végéig látható. Rövidebb jelenetnél a váltás megszakíthatja az animációt.

Az előnézet és a render sorszám szerint halad, az üres bemeneteket kihagyva. A kék sávok jelenetenként követik az előrehaladást, az alsó jelző a teljes videót mutatja. A régi projektekben tárolt videóhossz a jelenetek hosszába kerül át. A korábbi szöveges kapcsolat a **Jelenet 01** bemenetre kerül.

## Háttérkártya

Add hozzá a **Háttér** kártyát a kártyatárból, és kösd az **FFmpeg render** kártya **Háttér** bemenetére. Szabad Háttér bemenetnél a videó háttere fekete. Ha csak háttér van csatlakoztatva, önálló videóként renderelhető, a **Jelenet 01** hosszával.

- **Képfeltöltés.** Válassz böngészőben megnyitható képet legfeljebb 25 MB méretig. Alakítsd ki az illesztést, a képkivágást, a nagyítást, az átlátszatlanságot és a mögöttes alapszínt. A böngésző állóképpé alakítja a fájlt a mentéshez.
- **Színátmenet és animáció.** Nyisd meg a **Háttér szerkesztése** ablakot. Válassz mintát, vagy állíts be legfeljebb öt színt, lineáris vagy radiális átmenetet, illetve fényfoltokat. A statikus mód mellett a forgatás, a sodródás és a pulzálás is beállítható. Az **Alkalmazás** átveszi az élő előnézet beállításait.

A feltöltött háttérképet a böngésző menti, és a JSON-export is tartalmazza. A kép megjelenik a szövegelőnézetben, a videólejátszóban és a kész MP4- vagy WebM-fájlban.

A **Mentés** ebben a böngészőben tárolja a konfigurációt. Az elrendezés és a beállítások JSON-fájlba exportálhatók, majd ugyanonnan visszatölthetők. A videókat külön töltheted le. A böngésző a formátum első renderelésekor tölti be a kódolót. Az MP4 motorja körülbelül 32 MB, a WebM motorja körülbelül 4,5 MB. Egy szöveganimáció legfeljebb 10 másodpercig tarthat, a jelenethossz 0,1 és 20 másodperc között állítható.

## Könyvtárak

- [React Flow](https://reactflow.dev/learn/customization/custom-nodes)
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/getting-started/usage/)
- [LibAV.js](https://github.com/Yahweasel/libav.js/releases/tag/v6.11.9) (WebM/VP9)
