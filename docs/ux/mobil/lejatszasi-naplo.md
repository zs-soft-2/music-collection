# Mobil: lejátszási napló

**Követelmények:** [REQ-PLAY-*](../../felhasznaloi/lejatszasi-naplo.md)

## „Feltettem” gomb

- **Belépés:** a Gyűjtemény → lemez részletei képernyő.
- **Elhelyezés:** a borító alatt, a cím mellett, kör alakú lejátszás-jellegű ikon „Feltettem” felirattal.
  - Ez nem Play gomb, hanem rögzítés: nem tévesztendő össze a web egyetlen Play gombjával.
  - Ezért a lemez ikonja áll rajta (◉), nem a ▶.

```
┌──────────────────────────┐
│ ‹                        │
│      ┌──────────┐        │
│      │  borító  │        │
│      └──────────┘        │
│  Kind of Blue            │
│  Miles Davis    (◉ Feltettem)
│  Utoljára: 3 hete · 14×  │
│ ──────────────────────── │
│  Megjelenés   1959       │
│  Kiadó        Columbia   │
└──────────────────────────┘
```

| Állapot | Mit lát |
|---|---|
| alap | gomb, alatta „Utoljára: …” vagy „Még nem hallgattad” |
| több példány | koppintásra kis lap: a példányok listája (állapot, vásárlás helye), az alapérték kijelölve |
| rögzítve | rövid rezgés, alsó sáv: „Rögzítve · Visszavonás”; az „Utoljára” sor „most”-ra vált |
| offline | ugyanaz, a sávban: „szinkronizálunk, ha lesz kapcsolat” |
