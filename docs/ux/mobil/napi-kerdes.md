# Mobil: napi kérdés

**Követelmények:** [REQ-DAILY-*](../../felhasznaloi/napi-kerdes.md)

## Kártya

- **Belépés:** a Gyűjtemény fül teteje, amíg nincs aznapi válasz.

```
┌──────────────────────────┐
│ ? Napi kérdés      ×     │
│ 🔥 5 napos sorozat —     │
│ ne szakítsd meg!         │
│              [ Tippelek ]│
└──────────────────────────┘
```

| Állapot | Mit lát |
|---|---|
| nincs válasz | a kártya |
| elrejtve (×) | aznap nem látszik |
| megválaszolva | a kártya eltűnik |
| nincs mai kérdés | a kártya nem jelenik meg |

## Kérdés

- **Belépés:** a kártya, vagy az emlékeztető értesítés.

| Állapot | Mit lát |
|---|---|
| töltés | csontváz |
| kérdés | a kérdés szövege (és borító, ha a sablon ad), 3–4 nagy válaszgomb, futó idő |
| küldés | a választott gomb pörög, a többi tiltva |
| eredmény | a jó válasz zölden, a rossz tipp pirosan, „+12 pont · 🔥 6 nap” és a [Ranglista] |
| már tippelt | rögtön az eredmény |
| offline | „A tipphez kapcsolat kell”, a gombok tiltva |

- **Ranglista:** egyszerű lista, a saját sor kiemelve és a lista tetejére rögzítve.
