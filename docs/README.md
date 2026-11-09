# music-collection dokumentáció

A doksi az igazság forrása: egy változás előbb ide kerül, utána a kódba. A szerkezet és az azonosítók
szabályai: [`.specify/project/docs.md`](../.specify/project/docs.md).

- **Felhasználói** (`felhasznaloi/`): mit kap a felhasználó, követelmények `REQ-<TERÜLET>-nnn` formában.
- **Technikai** (`technikai/`): architektúra és döntési rekordok (ADR).
- **UX** (`ux/`): képernyők, állapotok, folyamatok.

## Területek

| Terület | Felhasználói | Technikai | UX |
|---|---|---|---|
| Mobil platform (MOB) | [mobil-platform](felhasznaloi/mobil-platform.md) | [mobil-app](technikai/architektura/mobil-app.md) | [navigáció](ux/mobil/navigacio.md) |
| Szkennelés (SCAN) | [szkenneles](felhasznaloi/szkenneles.md) | [szkenneles](technikai/architektura/szkenneles.md) | [szkenneles](ux/mobil/szkenneles.md) |
| Példány-felvitel (COPY) | [peldany-felvitel](felhasznaloi/peldany-felvitel.md) | [peldany-felvitel](technikai/architektura/peldany-felvitel.md) | [peldany-felvitel](ux/mobil/peldany-felvitel.md) |
| Kívánságlista (WISH) | [kivansaglista](felhasznaloi/kivansaglista.md) | [kivansaglista](technikai/architektura/kivansaglista.md) | [kivansaglista](ux/mobil/kivansaglista.md) |
| Release-kérés (RREQ) | [release-keres](felhasznaloi/release-keres.md) | [release-keres](technikai/architektura/release-keres.md) | [release-keres](ux/mobil/release-keres.md) |
| Értesítések (NOTIF) | [ertesitesek](felhasznaloi/ertesitesek.md) | [ertesitesek](technikai/architektura/ertesitesek.md) | [ertesitesek](ux/mobil/ertesitesek.md) |
| Lejátszási napló (PLAY) | [lejatszasi-naplo](felhasznaloi/lejatszasi-naplo.md) | [lejatszasi-naplo](technikai/architektura/lejatszasi-naplo.md) | [lejatszasi-naplo](ux/mobil/lejatszasi-naplo.md) |
| Kölcsönadás (LOAN) | [kolcsonadas](felhasznaloi/kolcsonadas.md) | [kolcsonadas](technikai/architektura/kolcsonadas.md) | [kolcsonadas](ux/mobil/kolcsonadas.md) |
| Napi kérdés (DAILY) | [napi-kerdes](felhasznaloi/napi-kerdes.md) | [napi-kerdes](technikai/architektura/napi-kerdes.md) | [napi-kerdes](ux/mobil/napi-kerdes.md) |
| Katalógus-képek (IMG) | [katalogus-kepek](felhasznaloi/katalogus-kepek.md) | — | — |

## Döntési rekordok

| ADR | Cím | Állapot |
|---|---|---|
| [ADR-001](technikai/adr/ADR-001-hibrid-mobil-app-capacitorral.md) | Hibrid mobil app Ionic + Capacitor alapon, iOS-re és Androidra | javasolt |
| [ADR-002](technikai/adr/ADR-002-mobil-ag-ujraepitese-merge-helyett.md) | A mobil app újraépítése a dev-en, nem a `mobile` ág összefésülése | javasolt |
| [ADR-003](technikai/adr/ADR-003-nativ-vonalkod-olvaso.md) | Natív vonalkód-olvasó plugin a mobilon | javasolt |
| [ADR-004](technikai/adr/ADR-004-push-fcm-mindket-platformon.md) | Push értesítések FCM-en át, mindkét platformon | javasolt |

## Mobil app: feature-ök és ticketek

Sorrendben. A „Függ” oszlop a sorszámra hivatkozik, és azt mutatja, mi kell előtte.

| # | Feature | Követelmények | Függ | Ticket |
|---|---|---|---|---|
| 1 | Mobil app újraépítése a dev-en | REQ-MOB-001, -003, -004, -005, -006 | — | #101 |
| 2 | Android platform | REQ-MOB-002 | 1 | #102 |
| 3 | Dev/prod változat és belső tesztelés | REQ-MOB-007, -008 | 2 | #103 |
| 4 | Élő vonalkód-szkennelés | REQ-SCAN-001…007, -009 | 1 | #104 |
| 5 | Fotós felismerés a mobilon | REQ-SCAN-008 | 4 | #105 |
| 6 | Példány gyors felvitele | REQ-COPY-001…007 | 4 | #106 |
| 7 | Kívánságlista a mobilon | REQ-WISH-001…005 | 4 | #107 |
| 8 | Release-kérés a mobilról | REQ-RREQ-001…004 | 4 | #108 |
| 9 | Értesítések alapjai és a kérés elbírálása | REQ-NOTIF-001, -002, -003, -007, -008, -009; REQ-RREQ-005 | 8 | #109 |
| 10 | „Feltettem” lejátszási napló | REQ-PLAY-001…006 | 1 | #110 |
| 11 | Kölcsönadás | REQ-LOAN-001…004, -006 | 1 | #111 |
| 12 | Napi kérdés a mobilon | REQ-DAILY-001…003, -005 | 1 | #112 |
| 13 | Értesítések: napi kérdés, a hét bandája, lejárt kölcsön | REQ-NOTIF-004…006; REQ-DAILY-004; REQ-LOAN-005 | 9, 11, 12 | #113 |

### Későbbi ticketek

Ezek a döntésekből következnek, és a fenti 13 után nyílnak meg:

- Vonalkód tárolása a release-en (`barcodes`), a Discogs-azonosítók visszatöltésével együtt.
- Heti összesítő értesítés a gyűjtemény előadóinak új kiadásairól.
- Prod adat-migráció, utána nyilvános App Store és Google Play kiadás CI-s feltöltéssel (fastlane).
- Kívánságlistára szánt release-kérés (`intent`), ha lesz rá igény.
- Offline fotó-várósor a példány-felvitelhez, ha lesz rá igény.
