# Mobil: példány-felvitel

**Követelmények:** [REQ-COPY-*](../../felhasznaloi/peldany-felvitel.md)

## Felvételi lap

- **Belépés:** a szkennelés eredménylapján a „Felvétel a gyűjteménybe” vagy a „Még egy példány” gomb.
- **Forma:** teljes magasságú alsó lap.

| Állapot | Mit lát |
|---|---|
| alap | fejléc: borító, cím, kiadás; alatta a „Mentés” gomb rögtön elérhető |
| kibontva | „Részletek” szakaszok: Vásárlás, Állapot, Fotók |
| mentés | a gomb pörög, utána a lap bezárul |
| mentve | alsó sáv: „Felvéve a gyűjteménybe · Visszavonás” (5 mp) |
| offline mentve | sáv: „Felvéve — szinkronizálunk, ha lesz kapcsolat”; a Fotók szakasz tiltva: „Fotót kapcsolattal csatolhatsz” |
| hiba | piros sor a gomb felett, a beírt adatok megmaradnak |

```
┌──────────────────────────┐
│ ┌────┐ Kind of Blue      │
│ │ ▒▒ │ LP · CL 1355      │
│ └────┘ 3. példány lesz   │
│ ┌──────────────────────┐ │
│ │        Mentés        │ │
│ └──────────────────────┘ │
│ ▸ Vásárlás               │
│   2026.11.06 · Lemezbörze│
│   [ 8 000 ] [ HUF ▾ ]    │
│ ▸ Állapot                │
│   Lemez [NM][VG+][VG]…   │
│   Borító[NM][VG+][VG]…   │
│ ▸ Fotók  [ + ] [ + ]     │
└──────────────────────────┘
```

- **Vásárlás helye:** a mező a legutóbbi helyeket chipként ajánlja fel.
- **Állapot:** szegmens-gombok. Nyomva tartásra egy mondatos magyarázat jelenik meg
  (például „VG+: enyhe használati nyomok, hibátlan lejátszás”).
- **Fotók:** két hely. Koppintásra a kamera vagy a galéria nyílik.
