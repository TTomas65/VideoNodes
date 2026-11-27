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

Első megnyitáskor a mintában a Szöveg kártya az első jelenethez, a Háttér kártya a renderelő Háttér bemenetéhez csatlakozik. Az elkészült videót a bekötött Videólejátszó mutatja. A minta és az újonnan hozzáadott renderkártyák MP4 (H.264), Full HD, 30 fps és automatikus jelenethossz beállításokkal indulnak. Mentett projekt esetén a szerkesztő **Minta** gombjával nyithatod meg az indító elrendezést. Ha a böngésző a korábbi háromkártyás indítómintát tárolja, megnyitáskor a friss mintát kapod. Az eredeti vásznat a **Régi mentés megnyitása** gombbal érheted el a bal oldali sávban, az új minta mentése után is.

1. A mintaprojektben írd át a **Szöveg** kártya tartalmát. Válassz betűtípust, színt, animációt és időtartamot. Az **Előnézet** gomb felugró ablakban lejátssza az aktuális animációt.
2. Az **FFmpeg render** kártyán állítsd be a formátumot, a felbontást (akár 3840 × 2160), a képkockasebességet és a jelenetek hosszát. A minőségi beállítások a **Gyors előnézet** (CRF 26), a **Kiegyensúlyozott** (CRF 20) és a **Stúdió minőség** (CRF 15).
3. A **Videólejátszó** kártyán nézd meg az élő előnézetet. A **Renderelés** gomb után ugyanitt játszható le és tölthető le a kész videó. A jobb alsó sarkot húzva módosíthatod a kártya méretét, az **Ismétlés** gomb folyamatos lejátszást indít el, ha a videó már fut.

Kártyát kattintással vagy húzással adhatsz hozzá a kártyatárból. A jobb alsó sarok húzásával állíthatod a szélességét. A kimeneti csatlakozót húzd a következő kártya bemenetére. A vezeték fényes középső pontjára kattintva megjelenik a **Törlés** gomb. A `Delete` billentyű továbbra is törli a kijelölt kártyát vagy kapcsolatot.

## Feliratok szerkesztése

A **Szövegek szerkesztése** ablakban kijelölt betűkön vagy több soron külön állítható a betűtípus, a szín, a méret és a betűstílus. A balra, középre, jobbra és sorkitöltött igazítás a kijelöléssel érintett bekezdésekre vonatkozik. Kijelölés nélkül az egész feliratra érvényes. A betűméret a Full HD képkockához viszonyított pixelérték. Egy felirat legfeljebb 20 000 karakterből állhat. A feliratsablonok a meglévő sorokat formázzák. Üres szövegnél a sablon mintaszövege töltődik be. A **Pozíció** fülön az **Alaphelyzetbe állítás** a választott képernyőponthoz állítja vissza az eltolást, az elforgatást és a perspektívát. Az **Alkalmazás** a kártyára teszi a módosításokat, a **Mentés** pedig a projektbe írja őket.

A **Betűtípus** választó alapértelmezett forrása a Google Fonts. A lista a betűtípus saját betűivel írja ki a nevét, és a látható webfontmintákat tölti be először. A szövegszerkesztő oldalsávjában több betűtípust is kipróbálhatsz a kijelölésen vagy az egész feliraton. A **Betű alkalmazása** elfogadja a próbát, a **Mégsem** visszaállítja a korábbi betűtípust. Az Inter a program része. Helyi Windows- és Linux-szerveren megnyitható a **Gépen telepített** lista is. A projekt az egyes betűtípusok nevét és forrását tárolja. Másik gépen a választott helyi betűtípusnak is telepítve kell lennie.

A **Sablonok** fül **Szövegsablonok** nézete elmenti a betűformázást, az igazítást és a pozíciót. Betöltéskor ezeket az aktuális szövegre alkalmazza. Üres feliratnál a mentett mintaszöveget tölti be. A **Teljes kártyamentések** nézet a szöveget, a formázást, az animációs fázisokat, a finomhangolást és a kártyaszélességet együtt tárolja. A betöltött beállításokat a szerkesztő **Alkalmazás** gombja teszi a kártyára.

A helyi szerver mindkét típusú mentést előnézeti képpel a `presets/text` mappába írja. A **Levétel** elrejti a mentést a galériában. A **Levett sablonok** nézetből bármikor visszahelyezhető.

A Szöveg kártyán és a **Mozgás** fülön külön állítható a megjelenés, a köztes animáció és az eltűnés. A megjelenés alapértéke 1,2 mp, a kikapcsolt fázisoké 0 mp. A köztes fázisban az **Effekt hossza** az animáció lefutása, a **Köztes teljes ideje** az effekt és az azt követő mozdulatlan tartás összege. A teljes köztes idő legalább az effekt hossza. A Szöveg kártya előnézete mindig a megjelenés, a teljes köztes idő és az eltűnés összegét játssza le. A mozgásminták automatikusan elindulnak. A kiválasztott effekt intenzitása, dinamikája és típustól függően például az iránya, a hullámok száma vagy a nagyítólencse szélessége állítható. A **Stábfelirat-görgetés** követi a felirat forgatását és perspektíváját. Ha köztes vagy eltűnési fázis követi, a görgetés ott áll meg, ahol a feliratot elhelyezted.

A csúszkák alatti **Teljes animáció** a felirat minden fázisát lejátssza a nagy előnézetben. Az **Effekt animáció** az ott kiválasztott fázis effektjét mutatja a beállított effekthosszal.

A színmezők közös **Színpalettáján** színkerék, HEX- és RGB-mezők, valamint 3–15 választható árnyalat található. Egy színkártya a HEX-mezőbe írja az értékét. Kézi beírás után az **Alkalmaz** vagy az Enter fogadja el az értéket. A feliratszerkesztőben az oldalsó paletta élőben színezi a kijelölést, illetve kijelölés nélkül a teljes szöveget. A **Szín alkalmazása** megőrzi a változtatást, a **Mégse** visszaállítja az eredeti színt. A **Színátmenet** lapon két végpontból 2–5 színpontot keverhetsz, állíthatod az irányt, és másolhatod a CSS-kódot. A háttérszerkesztő **Színátmenet generálása** gombjával a létrehozott lineáris átmenet közvetlenül alkalmazható.

## Több jelenet egy videóban

Kösd a Szöveg kártyákat az **FFmpeg render** kártya **Jelenet 01–10** bemeneteire. Üres jelenethossz-mezőnél a felirat teljes animációs ideje adja a jelenet hosszát. Például 1,2 mp megjelenés, 5 mp teljes köztes idő és 1,5 mp eltűnés együtt 7,7 mp. Hosszabb videójelenethez add meg a hosszt a renderkártyán. Ekkor a már megjelent felirat a jelenet végéig látható, illetve egy beállított eltűnés a jelenet végére kerül.

Az előnézet és a render sorszám szerint halad, az üres bemeneteket kihagyva. A kék sávok jelenetenként követik az előrehaladást, az alsó jelző a teljes videót mutatja. A régi projektekben tárolt videóhossz a jelenetek hosszába kerül át. A korábbi szöveges kapcsolat a **Jelenet 01** bemenetre kerül.

Az **Átmenet** kártyát a **Szöveg** kimenete és az adott jelenet renderbemenete közé kösd. Válassz például áttűnést, kipördülést, darabokra esést vagy lapozást, majd adj meg 0,1–5 másodpercet. Az effekt az adott jelenet végén indul, és a következő bekötött jelenetre vált. A két rész fedése rövidíti a teljes videót. A renderelő a rendelkezésre álló képkockákhoz igazítja a fedést. Az utolsó jelenet a saját hosszával ér véget.

Az Átmenet **Előnézet** gombja a kártyához tartozó jelenetet és a következő bekötött jelenetet játssza le a projekt háttereivel és időzítésével. Egyetlen jelenet esetén azt önmagában mutatja. Az **Átmenetek szerkesztése** ablakban a kilenc mozgó A/B bélyegkép közül választhatsz, a nagy mintát megállíthatod és tekerheted. A kiválasztott effekt időgörbéje és a hozzá tartozó beállítások, például az irány, a fordulat vagy a hajtás szélessége finomhangolhatók. Az **Alkalmazás** a kártyához menti az értékeket, amelyeket az előnézet és a render is használ.

## Háttérkártya

Az **FFmpeg render** kártya **Háttér** bemenete a jelenetek közös hátterét adja. Ha egy **Szöveg** kártya bal oldali **Háttér** bemenetére is kötsz háttérkártyát, az adott jelenet ezt használja az előnézetben és a renderelt videóban. Az egyedi háttér animációja a jelenet elején indul. Ha a jelenethez egyik bemeneten sem kapcsolódik háttér, fekete lesz. A renderelőhöz kötött közös háttér szöveg nélkül is renderelhető, a **Jelenet 01** hosszával.

- **Képfeltöltés.** Válassz böngészőben megnyitható képet legfeljebb 25 MB méretig. Alakítsd ki az illesztést, a képkivágást, a nagyítást, az átlátszatlanságot és a mögöttes alapszínt. A böngésző állóképpé alakítja a fájlt a mentéshez.
- **Színátmenet és animáció.** Nyisd meg a **Háttér szerkesztése** ablakot. Válassz mintát, vagy állíts be legfeljebb öt színt, lineáris vagy radiális átmenetet, illetve fényfoltokat. A statikus mód mellett a forgatás, a sodródás és a pulzálás is beállítható. Az **Alkalmazás** átveszi az élő előnézet beállításait.
- **Generált minták.** A bélyegképek között a háttér formáját választhatod ki, a **Stílusok** részben pedig az adott forma előre beállított változatait. Az **Ametiszt hullámhoz** például a **Kék prizma**, a **Zöld fénycsíkok** és a **Smaragdhullám** tartozik. Szerkeszthetők a színek, az animáció és a fénytörés. A **Statikus** mód a beállított kezdőfázist rögzíti. A mintabeállítások a projekttel együtt mentődnek. [Gradient Lab](https://www.thesmallsquare.com/tools/gradient-lab)

A feltöltött háttérképet a böngésző menti, és a JSON-export is tartalmazza. A kép megjelenik a szövegelőnézetben, a videólejátszóban és a kész MP4- vagy WebM-fájlban.

A **Mentés** új példányt készít az aktuális vászon képernyőképével. Helyi `npm run dev` vagy `npm run preview` futtatásnál a fájlok a `backups/saves` mappa egy-egy almappájába kerülnek. A **Projekt importálása** gomb megnyitja a név szerint kereshető képes galériát. Egy képre kattintva betölthető a mentés. A galériában a `backups/starter.json` kezdőprojekt és a külön **JSON-fájl megnyitása** gomb is elérhető. A hosztolt oldalon a képes mentések a böngészőben tárolódnak.

Az elrendezés és a beállítások külön JSON-fájlba is exportálhatók. A videókat a lejátszóból töltheted le. A böngésző a formátum első renderelésekor tölti be a kódolót. Az MP4 motorja körülbelül 32 MB, a WebM motorja körülbelül 4,5 MB. Egy szöveganimációs fázis legfeljebb 180 másodpercig tarthat, a jelenethossz 0,1 és 540 másodperc között állítható.

## Könyvtárak

- [React Flow](https://reactflow.dev/learn/customization/custom-nodes)
- [ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/getting-started/usage/)
- [LibAV.js](https://github.com/Yahweasel/libav.js/releases/tag/v6.11.9) (WebM/VP9)
