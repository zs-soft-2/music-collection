# Mobil: release-kérés

**Követelmények:** [REQ-RREQ-*](../../felhasznaloi/release-keres.md)

## Kérés lap

- **Belépés:** a szkennelés „Új a katalógusnak” eredményén a „Kérés a katalógusba” gomb.
- **Forma:** alsó lap. Felül a felismert kiadás (borító, cím, kiadó, katalógusszám, év). Alatta a
  „Megjegyzés (nem kötelező)” mező, karakterszámlálóval (0/500). Legalul a „Kérés elküldése” gomb.

| Állapot | Mit lát |
|---|---|
| alap | a fenti űrlap |
| küldés | a gomb pörög |
| elküldve | „Elküldtük. Ha jóváhagyják, a lemez a gyűjteményedbe kerül.” |
| már kérted | a gomb helyén: „Ezt már kérted, elbírálásra vár” |
| offline | a gomb tiltva: „A kéréshez kapcsolat kell” |
| hiba | piros sor, „Újra” |

## Kéréseim

- **Belépés:** Profil → „Kéréseim”, illetve a kérés értesítésére koppintva.

| Állapot | Mit lát |
|---|---|
| üres | „Még nem kértél lemezt a katalógusba” |
| lista | soronként cím, kiadás, dátum és állapot-chip: Függő (szürke), Jóváhagyva (zöld), Elutasítva (piros) |
| elutasítva | a sor alatt az admin megjegyzése |
| jóváhagyva | koppintásra a gyűjteménybeli lemez részletei nyílnak |
