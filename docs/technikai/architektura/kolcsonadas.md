# Kölcsönadás architektúra

**Követelmények:** [REQ-LOAN-*](../../felhasznaloi/kolcsonadas.md)

## Adatmodell

A kölcsön a példány része: `user/{uid}/collection-item/{itemId}`. Új collection nem kell.

```ts
export interface CollectionItemLoan {
	borrower: string;        // ≤ 80 karakter
	since: number;           // epoch ms
	due: number | null;      // epoch ms
	note: string | null;     // ≤ 200 karakter
	remindedAt: number | null; // csak a szerver írja
}

export interface CollectionItemLoanRecord {
	borrower: string;
	since: number;
	returnedAt: number;
}

// CollectionItem bővítése
loan?: CollectionItemLoan | null;
loanHistory?: CollectionItemLoanRecord[]; // legfeljebb 20, a legújabb elöl
```

- **Hely:** a típusok a `libs/api/.../collection-item/collection-item.ts`-be kerülnek, az elidegenítés
  (`CollectionItemDisposal`) mintájára.
- **Időbélyegek:** epoch ms számok, ahogy a modell többi része (az alkotmány iso-dates elvét a projekt
  tudatosan kihagyta).
- **A korábbi nevek** (REQ-LOAN-001) a saját példányok `loan.borrower` és `loanHistory[].borrower` mezőiből
  jönnek, kliensoldalon. Külön tárolás nem kell.

## Rules

A `user/{uid}/collection-item/{itemId}` update-je egy `isValidLoan(data)` ellenőrzést kap:

- a `loan` vagy `null`, vagy pontosan ezeket a kulcsokat tartalmazza: `borrower`, `since`, `due`, `note`,
  `remindedAt`;
- a stringek hossza korlátos;
- a `remindedAt` a klienstől csak változatlan maradhat, vagy `null` lehet, kölcsönadáskor;
- a `loanHistory` lista legfeljebb 20 elemű.

A rules teszttel együtt változik (alkotmány: firebase-rules).

## Lánc

```
LoanSheet (mobil) → ReleaseDetailStore.lend / markReturned
  → withCopyLoan() (signalStore feature, libs/domain/music/collection-item)
  → CollectionItemStateService.dispatchUpdateEntityAction → effect → UserDataService → Firestore
LoansPage (mobil) → LoansStore → CollectionListStore (a betöltött saját példányok, szűrve: loan != null)
```

- **A „Visszakaptam”** egyetlen update: `loan: null`, a `loanHistory` elejére bekerül a lezárt rekord, és a
  lista a 20. elemnél levágódik.
- **Web (REQ-LOAN-004):** a `collection-item` lap és a polc-nézet a `loan` mezőből jelzést mutat. Szerkesztés a
  weben nincs.

## Emlékeztető

- **Ütemezés:** új `onSchedule('0 9 * * *', Europe/Budapest)`, neve `remindLoanDue`.
- **Lekérdezés:** collection-group lekérdezés a `collection-item`-re: `loan.due <= ma vége` és
  `loan.remindedAt == null`.
  - Kell hozzá collection-group index (`firestore.indexes.json`).
  - Az Admin SDK megkerüli a tulajdonosi olvasási szabályt.
- **Küldés:** `notifyUsers({ type: 'loanDue', … })` ([értesítések](ertesitesek.md)). Utána a szerver beírja a
  `loan.remindedAt`-et, így egy kölcsönre egyszer szól. A route: `/tabs/collection/{itemId}`.
- **Függőség:** az értesítési infrastruktúra (REQ-NOTIF-001…003 ticketje). Az emlékeztető nélküle nem
  készülhet el. A kölcsönadás többi része viszont igen.

## Deploy-igény

- **Rules:** az `isValidLoan` miatt.
- **Az emlékeztetőhöz:** functions és index.
