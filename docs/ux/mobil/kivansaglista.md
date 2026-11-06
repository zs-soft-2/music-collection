# Mobil: kívánságlista

**Követelmények:** [REQ-WISH-*](../../felhasznaloi/kivansaglista.md)

## Lista

- **Belépés:** a Kívánságlista fül.

| Állapot | Mit lát |
|---|---|
| töltés | csontváz-sorok |
| üres | „Még nem keresel semmit. Szkennelj be egy lemezt, és tedd a listára.” + Szkennelés gomb |
| lista | soronként: borító, cím, előadó, keresett formátumok chipként |
| keresés üres | „Nincs találat erre: …” |
| megtaláltak is | a megtalált tételek halványítva, pipával, a lista alján |

```
┌──────────────────────────┐
│ Kívánságlista            │
│ [🔍 Keresés            ] │
│ (Mind)(LP)(CD) ○ Megtal. │
│ ┌────┐ Blue Train        │
│ │ ▒▒ │ John Coltrane     │
│ └────┘ LP          ✓ ›   │
│ ┌────┐ Mingus Ah Um      │
│ │ ▒▒ │ Charles Mingus    │
│ └────┘ LP · CD     ✓ ›   │
└──────────────────────────┘
```

- **Gyorsművelet:** a ✓ gomb „Megtaláltam”. Utána alsó sáv jelenik meg:
  „Megtaláltad! · Felveszed a gyűjteménybe?”, a [Felvétel] gomb a felvételi lapot nyitja.
- **Eltávolítás:** balra húzva piros „Eltávolítás” gomb, utána megerősítő kérdés.

## Felvétel a listára

- **Belépés:** a szkennelés eredménylapján a „Kívánságlistára” gomb.
- **Forma:** kis alsó lap:
  - formátum-chipek, többet is lehet választani; az alapérték a szkennelt kiadás formátuma;
  - opcionális „Bolti link” mező;
  - „Felvétel” gomb.
- **Már a listán:** a gomb helyén „Már a kívánságlistádon van”.
