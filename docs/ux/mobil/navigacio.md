# Mobil: navigáció és keret

**Követelmények:** [REQ-MOB-*](../../felhasznaloi/mobil-platform.md)

A vázlatok kézzel készültek. A megvalósítás után valódi felvétel váltja fel őket (390×844, lásd
`.specify/project/docs.md`). Az Ionic `mode: 'ios'` stílus mindkét platformon egységes megjelenést ad.

## Bejelentkezés

- **Belépés:** az app indítása munkamenet nélkül (`guestGuard`).

| Állapot | Mit lát |
|---|---|
| alap | logó, egymondatos ígéret, „Belépés Google-fiókkal” gomb |
| folyamatban | a gomb tiltva, pörgő jel |
| megszakítva | a natív lap bezárva: vissza az alaphoz, hibaüzenet nélkül |
| hiba | szöveges hiba a gomb alatt, és „Újra” |

```
┌──────────────────────────┐
│                          │
│        ◉ Music           │
│        Collection        │
│                          │
│  A gyűjteményed, mindig  │
│       a zsebedben.       │
│                          │
│ ┌──────────────────────┐ │
│ │ G  Belépés Google-fal│ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

## Fülsáv

Négy fül, a szkennelés kiemelt kör-gombként (REQ-MOB-006):

```
┌──────────────────────────┐
│  (aktív fül tartalma)    │
│                          │
├──────────────────────────┤
│  ♫      ♡     ( ⌁ )   ☺  │
│ Gyűjt. Kíváns. Szken. Pr.│
└──────────────────────────┘
```

| Fül | Útvonal | Tartalom |
|---|---|---|
| Gyűjtemény | `tabs/collection` | lista, keresés, formátum-szegmens, lemez részletei |
| Kívánságlista | `tabs/wishlist` | lista, „megtaláltam” ([kívánságlista](kivansaglista.md)) |
| Szkennelés | `tabs/scan` | élő vonalkód-olvasó ([szkennelés](szkenneles.md)) |
| Profil | `tabs/profile` | fiók, nyelv, értesítések, kölcsönadott lemezek, napi kérdés |

- A fülek sorrendje: Gyűjtemény, Kívánságlista, Szkennelés, Profil.
- A Szkennelés kör alakú, kiemelt gomb a hüvelykujj alatt. A mobilon érvényes kisebb `--mc-circle-*`
  tokeneket használja.
- A napi kérdés kártyaként jelenik meg a Gyűjtemény fül tetején, amíg a napi kérdés nincs megválaszolva
  ([napi kérdés](napi-kerdes.md)).

## Offline sáv

- **Belépés:** a hálózat megszűnése, bármelyik képernyőn.

| Állapot | Mit lát |
|---|---|
| online | semmi |
| offline | vékony sáv a fejléc alatt: „Nincs kapcsolat — a mentett adataidat látod” |
| offline + hálózatigényes művelet | a gomb tiltva, alatta: „Ehhez kapcsolat kell” |
| visszatért | a sáv eltűnik; a függő írások szinkronja csendben fut |
