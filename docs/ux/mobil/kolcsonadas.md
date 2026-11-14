# Mobil: kölcsönadás

**Követelmények:** [REQ-LOAN-*](../../felhasznaloi/kolcsonadas.md)

## Kölcsönadás lap

- **Belépés:** lemez részletei → „⋯” menü → „Kölcsönadtam”. Több példánynál előbb a példány választása.

```
┌──────────────────────────┐
│ Kölcsönadás              │
│ Kinek?  [ Péter        ] │
│         (Anna)(Péter)    │  ← korábbi nevek
│ Mikor?  [ 2026.11.06  ]  │
│ Meddig? [ nincs határidő]│
│ Megjegyzés [           ] │
│ ┌──────────────────────┐ │
│ │       Rögzítés       │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

| Állapot | Mit lát |
|---|---|
| alap | űrlap, a „Kinek?” kötelező |
| rögzítve | a lap bezárul; a részleteknél sáv: „Kölcsönben: Péter, ma óta” + [Visszakaptam] |
| lejárt | ugyanaz a sáv pirossal: „Kölcsönben: Péter · a határidő okt. 30. volt” |

## Kölcsönben lista

- **Belépés:** Profil → „Kölcsönben (3)”, vagy a kölcsön értesítésére koppintva (az a lemezre visz).

| Állapot | Mit lát |
|---|---|
| üres | „Minden lemezed otthon van.” |
| lista | soronként borító, cím, név, „mióta”; a lejártak piros jelzéssel elöl |

- **Gyorsművelet:** balra húzva a „Visszakaptam”.

## Jelzés a listában

A gyűjtemény-lista sorában a kölcsönben lévő példány egy kis „↗ Péter” címkét kap.
