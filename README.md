# Present Fflow

Magyar nyelvű, node-alapú szerkesztő animált prezentációs videókhoz. A vászon React Flow-val készült, a videót az FFmpeg WebAssembly-verziója kódolja H.264-es MP4-be a böngészőben.

## Helyi indítás

Node.js 22 és npm szükséges. A projektmappában futtasd:

```powershell
npm install
npm run dev
```

A Vite kiírja a megnyitható helyi címet. A kiadási változatot az `npm run build` állítja elő a `dist` mappában. A videó rendereléséhez a böngésző a webalkalmazás mellől tölti be az FFmpeg-et.

## Az első videó

1. A mintaprojektben írd át a **Szöveg** kártya tartalmát. Válassz betűtípust, színt, animációt és időtartamot.
2. Az **FFmpeg render** kártyán állítsd be a felbontást, a képkockasebességet, a háttér megjelenését és a videó hosszát. A videó hossza legalább akkora legyen, mint az animációé.
3. A **Videólejátszó** kártyán nézd meg az élő előnézetet. A **Renderelés** gomb után ugyanitt játszható le és tölthető le az MP4.

Kártyát kattintással vagy húzással adhatsz hozzá a kártyatárból. A kimeneti csatlakozót húzd a következő kártya bemenetére. Kijelölt kártyát vagy kapcsolatot a `Delete` billentyűvel törölhetsz.

A **Mentés** ebben a böngészőben tárolja a konfigurációt. Az elrendezés és a beállítások JSON-fájlba exportálhatók, majd ugyanonnan visszatölthetők. A videókat külön MP4-fájlként töltheted le. Az első rendereléskor a böngésző körülbelül 32 MB-nyi FFmpeg-adatot tölt be. A videó felső időkorlátja 20 másodperc, az animációé 10 másodperc.

## Könyvtárak

- [React Flow](https://reactflow.dev/learn/customization/custom-nodes)
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/getting-started/usage/)
