# ADR-005: A kiadás ritkasága a Discogs „have” számából és a példányszámból

**Állapot:** javasolt

## Kontextus

A collection-ök pontozásában ([REQ-SCORE-004](../../felhasznaloi/gyujtemeny-pontozas.md#req-score-004-az-album-pontja-a-hordozóból-és-a-kiadás-ritkaságából-áll))
az album pontja a kiadás ritkaságától függ, a pénzben kifejezett értéktől viszont nem függhet. A katalógus ma
nem tárol ritkaság-adatot. Ami van: a kiadás címkéi (limitált kiadás, picture disc, reissue), az éve, és a
Discogs-azonosítója ott, ahol a kiadás onnan jött.

A korábbi pontozás a címkékből számolt bónuszt. Ez két sima reissue között nem tesz különbséget, és egy
ötszáz példányos nyomást ugyanúgy kezel, mint egy tízezrest, ha mindkettő „limitált”.

## Döntés

A kiadás öt ritkasági szint egyikébe kerül. A szintet a szerver számolja és a kiadáson tárolja:

1. kurátori felülbírálat, ha van;
2. különben a kiadás példányszáma (`editionSize`) és a Discogs `community.have` értéke közül a ritkább szint;
3. Discogs-azonosító nélkül a katalógus címkéi, legfeljebb Ritka szintig.

A Discogs árait és piactér-adatait a kód nem kéri le és nem tárolja. A szint a kiadás írásakor számolódik ki, és éjszakai szeletekben
frissül, ahogy a katalógus bejárása körbeér.

## Következmények

- A pontok időben változhatnak: ha egy kiadást sokan felvesznek a Discogs-on, a szintje csökkenhet. Ez
  összhangban van azzal, hogy a pont a mostani állapotot tükrözi (REQ-SCORE-015).
- A „have” a Discogs felhasználóit méri, nem a világot. Ahol a Discogs közössége kicsi (kazetta, helyi
  kiadások), a szám alacsonyabb. Ezt hordozónkénti küszöbökkel (Q-SCORE-002) és a felülbírálattal kezeljük.
- Friss megjelenésnél az alacsony szám nem ritkaságot, hanem újdonságot jelent, ezért a két évnél fiatalabb
  kiadás szintje Discogs-adatból korlátozott.
- Új trigger és éjszakai ütemezett function. A Discogs percenkénti korlátja miatt a teljes katalógus több éjszaka
  alatt megy végig; egy lassan mozgó számhoz ez elég.
- A Discogs-azonosító nélküli kiadások alulértékeltek maradnak, amíg valaki össze nem köti őket, vagy kurátor
  felül nem bírálja a szintjüket.

## Alternatívák

- **Csak katalógus-címkék.** Nincs külső függés, de túl durva (lásd a kontextust).
- **Csak kézi szint.** Pontos lehet, de több ezer kiadásnál nem tartható, és szubjektív.
- **Discogs want/have arány.** A keresettséget méri, ami az ár felé húz; a követelmény a ritkaságot kéri.
- **Százalékos besorolás a katalóguson belül.** Önkalibráló, de a szintek a katalógus bővülésével akkor is
  elmozdulnának, ha a kiadásról semmi új nem derült ki.
- **A gyűjtő példányán megadott sorszám (`serial.total`).** A gyűjtő maga írja be, ezért nem dönthet a saját
  pontjáról.
