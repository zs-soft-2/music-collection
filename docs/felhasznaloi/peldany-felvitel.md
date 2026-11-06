# Példány gyors felvitele

**Azonosító-előtag:** COPY
**Technikai:** [példány-felvitel architektúra](../technikai/architektura/peldany-felvitel.md)
**UX:** [mobil példány-felvitel](../ux/mobil/peldany-felvitel.md)

## Felhasználói leírás

A lemezt megvetted, még a pultnál állsz. Két koppintás, és bent van a gyűjteményedben. Ha van egy perced,
ugyanott beírod:

- mennyiért és hol vetted,
- milyen állapotban van a lemez és a borító,
- és lefotózod a példányt.

A többit (polchely, történet) ráérsz otthon a weben.

## Követelmények

### REQ-COPY-001: Felvétel egy lapon

A szkennelés eredménylapjáról (REQ-SCAN-004) a „Felvétel a gyűjteménybe” egy felvételi lapot nyit, amelyen a
kiadás már ki van választva. A „Mentés” egyetlen koppintással felveszi a példányt. A további mezők nem
kötelezők.

**Felület:** mobil
**Ticket:** #106
**UX:** [Felvételi lap](../ux/mobil/peldany-felvitel.md#felvételi-lap)

### REQ-COPY-002: Vásárlás adatai

A felvételi lapon megadható a vásárlás:

- **dátuma**, alapértéke a mai nap;
- **helye**, szabad szöveg; az app felajánlja a legutóbb beírt helyeket;
- **ára és pénzneme**. A pénznem alapértéke a legutóbb használt.

**Felület:** mobil
**Ticket:** #106

### REQ-COPY-003: Állapot

A felvételi lapon megadható a lemez és a borító állapota külön, a Goldmine skálán (M, NM, VG+, VG, G, F, P).
A fokozatok rövid magyarázatot kapnak.

**Felület:** mobil
**Ticket:** #106

### REQ-COPY-004: Fotó a példányról

A felhasználó legfeljebb két fotót készíthet vagy választhat a példányról. A fotó a mentés után töltődik fel.
Offline a Fotók szakasz nem érhető el; a példány maga fotó nélkül is mentődik (REQ-COPY-007).

**Felület:** mobil
**Ticket:** #106

### REQ-COPY-005: Még egy példány

Ha a kiadás már megvan, a felvétel ugyanígy működik. A lap jelzi, hányadik példány lesz.

**Felület:** mobil
**Ticket:** #106

### REQ-COPY-006: Visszavonás

Mentés után néhány másodpercig egy „Visszavonás” gomb látszik. Ez a frissen felvett példányt nyomtalanul
törli.

**Felület:** mobil
**Ticket:** #106

### REQ-COPY-007: Felvétel offline

Ha nincs hálózat, a példány mentése akkor is sikerül. A gyűjteményben azonnal megjelenik, és a kapcsolat
visszatértekor szinkronizálódik.

**Felület:** mobil
**Ticket:** #106

## Nem része

- A polchely, a történet és a sorszám (számozott kiadás) megadása a mobilon. Ezek a weben maradnak
  (`/collection/copy/:itemId`).
- Generikus példány („van egy LP-m, de nem tudom, melyik kiadás”).
- Példány szerkesztése és elidegenítése (eladás, csere) a mobilon.
- Offline fotó-várósor. Később jöhet, ha lesz rá igény.
