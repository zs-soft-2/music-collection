# Mobil: értesítések

**Követelmények:** [REQ-NOTIF-*](../../felhasznaloi/ertesitesek.md)

## Engedélykérés

- **Belépés:** az első release-kérés elküldése után, vagy ha a felhasználó egy típust bekapcsol a
  beállításokban.
- **Előkérdés:** saját, nem rendszer-lap. „Szóljunk, ha elbírálták a kérésedet?” [Igen, szólj] [Most nem].
  - Az „Igen” után jön a rendszer engedélykérő párbeszéde.
  - A „Most nem” után 30 napig nem kérdez újra.

| Állapot | Mit lát |
|---|---|
| még nem kérdeztük | előkérdés a fenti pillanatokban |
| megadta | semmi; a beállítások kapcsolói működnek |
| megtagadta | a beállítások tetején: „Az értesítések ki vannak kapcsolva a telefon beállításaiban” + [Beállítások] |

## Beállítások

- **Belépés:** Profil → Értesítések.

```
┌──────────────────────────┐
│ ‹ Értesítések            │
│                          │
│ Kérésem elbírálása   [●] │
│ Napi kérdés (18:00)  [●] │
│ A hét bandája        [●] │
│ Lejárt kölcsön       [●] │
│                          │
│ Ezek a beállítások minden│
│ eszközödre érvényesek.   │
└──────────────────────────┘
```

| Állapot | Mit lát |
|---|---|
| töltés | kapcsolók tiltva |
| alap | kapcsolók a mentett vagy alapértelmezett értékkel |
| offline | a kapcsolók működnek, a változás szinkronra vár |
| engedély nélkül | felül figyelmeztető sáv; a kapcsolók állíthatók, de jelezve, hogy nem érkezik értesítés |

## Értesítések szövege

| Típus | Cím | Szöveg |
|---|---|---|
| jóváhagyva | Felvettük a lemezt | <cím> — már a gyűjteményedben van. |
| elutasítva | A kérésed nem ment át | <cím>. Nézd meg, miért. |
| napi kérdés | Ma még nem tippeltél | Itt a napi kérdés — tartsd meg a sorozatod! |
| a hét bandája | A hét bandája: <név> | Nézz bele, mit hallgatnak most a gyűjtők. |
| kölcsön | Lejárt egy kölcsön | <cím> — <név> <dátum>-ig ígérte vissza. |
