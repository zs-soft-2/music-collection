# Doksi-szerkezet (music-collection)

A `docs-first` profil olvassa (`.specify/kit/docs-first.md`). A projekt saját fájlja, a zs-kit nem írja felül.
A doksik nyelve magyar. A doksi az igazság forrása: egy változás előbb a doksiba kerül, utána a kódba,
és a végén a kódot vetjük össze vele.

## Három ág

| Ág | Hely | Mit tartalmaz |
|---|---|---|
| Felhasználói | `docs/felhasznaloi/<terület>.md` | Mit kap a felhasználó: a terület leírása és a követelmények |
| Technikai | `docs/technikai/` | Architektúra (`architektura/<terület>.md`) és döntési rekordok (`adr/`) |
| UX | `docs/ux/<felület>/<terület>.md` | Képernyők, állapotok, folyamatok |

A belépési pont a `docs/README.md`: az összes terület egy táblában, mindhárom ág linkjével.

## Követelmények

- Helyük: `docs/felhasznaloi/<terület>.md`, a `## Követelmények` szakasz alatt.
- Az azonosító formája: `REQ-<TERÜLET>-<nnn>`, például `REQ-SCAN-004`. A `<TERÜLET>` a fájl elején áll
  (`**Azonosító-előtag:** SCAN`).
- Fájlonként folyamatosan számozunk. Az új követelmény a fájl következő szabad számát kapja. Törölt számot
  nem adunk ki újra.
- Alpont: `REQ-SCAN-004/2`.
- Minden követelmény egy `### REQ-…: <rövid cím>` fejléc, alatta a követelmény szövege („A felhasználó …”,
  „Az app …”), és szükség szerint ezek a sorok:
  - `**Felület:** mobil | web | mindkettő`
  - `**UX:** [képernyő](../ux/…#horgony)`
  - `**Technikai:** [szakasz](../technikai/architektura/…#horgony)`
  - `**Ticket:** #n`: miután a ticket megnyílt.

## Eltérés-jelölő

Ha a kód még nem teljesíti a követelményt, a követelmény alá kerül egy sor:

```
**Eltérés:** <mit csinál másképp a kód> — #<issue>
```

Minden ilyen sor megnevezi az issue-t, amelyik lezárja. Ha az issue elkészült, a sor törlődik.
A még meg nem valósított, új követelményeknél nem írunk eltérést: ott a `**Ticket:**` sor jelzi, hogy
melyik ticket valósítja meg.

## Képernyők

- Helyük: `docs/ux/<felület>/<terület>.md`, ahol a `<felület>` értéke `mobil` vagy `web`.
- Minden képernyő egy `## <Képernyő neve>` szakasz, benne:
  - belépési pont (honnan jut ide a felhasználó),
  - állapotok táblája (`üres`, `töltés`, `találat`, `hiba`, `offline` …),
  - drótváz (szöveges vázlat),
  - folyamat (lépések vagy Mermaid diagram).
- Az új állapot vázlata kézzel készül, a megvalósítás után pedig valódi felvételre cseréljük.
- Felvétel:
  - weben: fejetlen Chrome-mal, CDP viewport-emulációval (a `--window-size` mobil nézethez nem elég);
  - mobilon: `npm run start:mobile` a böngészőben, ugyanígy 390×844-es viewporttal.
  - Felvevő script: `tools/ux-capture/` (CDP-alapú, web és 390×844-es mobil viewport). Az első mobil
    ticket (a mobil app újraépítése) készíti el, a többi már használja.

## Architektúra

- Helye: `docs/technikai/architektura/<terület>.md`. A szakaszok: komponens → store → effect → repository
  lánc, callable-ök és triggerek, adatmodell (Firestore útvonalak, mezők), jogosultságok, rules, deploy-igény.
- Döntési rekord: `docs/technikai/adr/ADR-<nnn>-<rövid-név>.md`, folyamatos számozással.
  - Mezők: Állapot (javasolt / elfogadott / leváltva), Kontextus, Döntés, Következmények, Alternatívák.

## Nyitott kérdések

- Helyük: annak a doksinak a `## Nyitott kérdések` szakasza, amelyikre vonatkoznak.
- Az azonosító formája: `Q-<TERÜLET>-<nnn>`. Minden kérdés felsorolja a lehetőségeket és a javaslatot.
- Ha a kérdés eldőlt, követelménnyé, döntéssé vagy „Nem része” sorrá válik, és a kérdés törlődik.

## Ticket-javaslatok

A `speckit-feature-define` a `.specify/kit-ui/drafts/<slug>/ticket.md` fájlba írja a javaslatot. Ez a hely
gitignore-olt. Minden AC megnevezi a követelmény-azonosítókat, amelyeket megvalósít. A ticket nyelve magyar,
a projekt ticket-stílusában.
