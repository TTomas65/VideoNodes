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

1. A mintaprojektben írd át a **Szöveg** kártya tartalmát. Válassz betűtípust, színt, animációt és időtartamot.
2. Az **FFmpeg render** kártyán állítsd be a formátumot, a felbontást (akár 3840 × 2160), a képkockasebességet, a háttér megjelenését és a videó hosszát. A minőségi beállítások a **Gyors előnézet** (CRF 26), a **Kiegyensúlyozott** (CRF 20) és a **Stúdió minőség** (CRF 15). A videó hossza legalább akkora legyen, mint az animációé.
3. A **Videólejátszó** kártyán nézd meg az élő előnézetet. A **Renderelés** gomb után ugyanitt játszható le és tölthető le a kész videó. A jobb alsó sarkot húzva módosíthatod a kártya méretét, az **Ismétlés** gomb folyamatos lejátszást indít el, ha a videó már fut.

Kártyát kattintással vagy húzással adhatsz hozzá a kártyatárból. A kimeneti csatlakozót húzd a következő kártya bemenetére. Kijelölt kártyát vagy kapcsolatot a `Delete` billentyűvel törölhetsz.

A **Mentés** ebben a böngészőben tárolja a konfigurációt. Az elrendezés és a beállítások JSON-fájlba exportálhatók, majd ugyanonnan visszatölthetők. A videókat külön töltheted le. A böngésző a formátum első renderelésekor tölti be a kódolót. Az MP4 motorja körülbelül 32 MB, a WebM motorja körülbelül 4,5 MB. A videó felső időkorlátja 20 másodperc, az animációé 10 másodperc.

## Könyvtárak

- [React Flow](https://reactflow.dev/learn/customization/custom-nodes)
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/getting-started/usage/)
- [LibAV.js](https://github.com/Yahweasel/libav.js/releases/tag/v6.11.9) (WebM/VP9)
