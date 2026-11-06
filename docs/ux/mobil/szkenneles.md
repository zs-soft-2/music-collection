# Mobil: szkennelés

**Követelmények:** [REQ-SCAN-*](../../felhasznaloi/szkenneles.md)

## Élő olvasó

- **Belépés:** a fülsáv kiemelt Szkennelés gombja (`tabs/scan`).

| Állapot | Mit lát |
|---|---|
| engedélykérés | rendszer-párbeszéd. Előtte egy mondat: „A kamerával olvassuk a lemez vonalkódját.” |
| olvas | teljes képernyős élőkép, középen a célzó keret, alul a „Kézi kód” és „Fotó” gomb |
| talált | a keret zöldre vált, a telefon rezeg, felcsúszik az eredménylap |
| keres | az eredménylapon csontváz-sorok, „Keresés…” |
| nincs engedély | az élőkép helyén: „A kamerához nincs hozzáférés”, gomb a beállításokhoz, és „Kézi kód” |
| offline | az élőkép működik, a sáv szövege: „Nincs kapcsolat — a kódokat elmentjük, és később keressük” |

```
┌──────────────────────────┐
│ ×                 ⚡ 3 ▤ │  ← bezárás, vaku, munkamenet (3)
│                          │
│      ┌────────────┐      │
│      │ ▌▌▌ ▌▌ ▌▌▌ │      │  ← célzó keret
│      └────────────┘      │
│   Irányítsd a kamerát    │
│     a vonalkódra         │
│                          │
│  [ Kézi kód ]  [ Fotó ]  │
└──────────────────────────┘
```

## Eredménylap

Alsó lap (sheet), félig felhúzva. A kamera mögötte tovább olvas (REQ-SCAN-003).

| Állapot | Fejléc-jelző | Fő gomb | Másodlagos |
|---|---|---|---|
| megvan | zöld „Megvan · 2 példány” | Megnyitás | Még egy példány |
| kívánságlistán | arany „A kívánságlistádon” | Megtaláltam | Felvétel a gyűjteménybe |
| nincs meg | semleges „Nincs meg” | Felvétel a gyűjteménybe | Kívánságlistára |
| új | kék „Új a katalógusnak” | Kérés a katalógusba | — |
| nem ismert | szürke „Nem ismerjük ezt a kódot” | Fotó készítése | Kézi kód újra |
| hiba | piros sor a hibaforrással (Discogs, kvóta) | Újra | — |

```
┌──────────────────────────┐
│ ▔▔▔▔                     │
│ ┌────┐ Kind of Blue      │
│ │ ▒▒ │ Miles Davis       │
│ └────┘ LP · Columbia ·   │
│        1959 · CL 1355    │
│ ● Megvan · 2 példány     │
│ ┌──────────────────────┐ │
│ │      Megnyitás       │ │
│ └──────────────────────┘ │
│   Még egy példány  ›     │
│ Más kiadás? (3 jelölt) ▾ │
└──────────────────────────┘
```

- **Több jelölt:** „Más kiadás? (n jelölt)” lenyitható lista. Az `exact` jelölt kerül elöl, a többi jelölt
  halványabban látszik.
- **Lap kezelése:** lehúzással bezárható. A következő kód olvasásakor a lap tartalma cserélődik.

## Munkamenet-lista

- **Belépés:** az élőkép jobb felső ▤ számlálója.

| Állapot | Mit lát |
|---|---|
| üres | „Még nem olvastál be semmit” |
| lista | soronként: borító, cím, állapotjelző pötty, idő. Az ismételt kód sora felvillan. |
| függő (offline) | óra ikon: „Kapcsolatra vár”. A kapcsolat visszatértekor az állapot-pötty magától frissül. |

- A sorra koppintva újra megnyílik az eredménylap.
- A lista a munkamenet végéig él: a fül elhagyásáig, vagy amíg a felhasználó a „Lista törlése” gombra nem nyom.

## Kézi bevitel

- **Belépés:** „Kézi kód” gomb.
- Számbillentyűzetes mező, 8–13 számjegy. Az ellenőrzőszám hibájára a mező alatt figyelmeztet:
  „Ez a kód nem tűnik érvényesnek”.
- „Keresés” után ugyanaz az eredménylap jön.

## Fotó mód

- **Belépés:** „Fotó” gomb, vagy a „nem ismert” eredményből.

| Állapot | Mit lát |
|---|---|
| választó | rendszer-lap: „Fotó készítése” vagy „Választás a galériából” |
| feltöltés és felismerés | a fotó kicsinyítve, alatta „Felismerés…” és a kvóta: „ma még 27 felismerés” |
| eredmény | ugyanaz az eredménylap; a fejlécben kis jelzés: „fotóból felismerve” (`mc-ai-mark`) |
| kvóta elfogyott | „A mai fotós felismerések elfogytak — holnap újra, vagy írd be a kódot” |
| kikapcsolva | „A fotós felismerés most nem elérhető” |
| semmi nem ismerhető fel | „Nem ismertük fel. Próbáld a hátlapot, ahol a kiadó és a katalógusszám van.” |

- Ahol modell dolgozott, ott az `mc-ai-mark` jelzés áll, mint a weben.
