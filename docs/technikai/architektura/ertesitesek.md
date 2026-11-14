# Értesítések architektúra

**Követelmények:** [REQ-NOTIF-*](../../felhasznaloi/ertesitesek.md)
**Döntés:** [ADR-004](../adr/ADR-004-push-fcm-mindket-platformon.md)

## Áttekintés

```
Kliens (mobil)                              Szerver (apps/functions)
──────────────                              ────────────────────────
NotificationSettingsPage → store            esemény (trigger / schedule)
  → PushRegistrationService (absztrakt)       → notifyUsers({ type, uids | topic, payload })
      └─ CapacitorPushRegistration              → beállítás-szűrés (setting/notifications)
         (@capacitor-firebase/messaging)        → eszköz-tokenek (user/{uid}/device/*)
  → DeviceEffect → DeviceRepository             → messaging().sendEach(...)
      → user/{uid}/device/{deviceId}            → halott token → device doksi törlése
  → NotificationSettingsEffect
      → user/{uid}/setting/notifications
```

## Adatmodell

| Útvonal | Mezők | Ki írja |
|---|---|---|
| `user/{uid}/device/{deviceId}` | `token: string`, `platform: 'ios' \| 'android'`, `appVersion: string`, `locale: 'hu' \| 'en'`, `updatedAt: number` (epoch ms) | a tulajdonos kliense; a szerver törli a halott tokent |
| `user/{uid}/setting/notifications` | `requestDecision: boolean`, `dailyQuestion: boolean`, `bandOfTheWeek: boolean`, `loanDue: boolean`, `updatedAt: number` | a tulajdonos kliense |
| `user/{uid}/notification-log/{type}-{day}` | `sentAt: number` | csak a szerver (napi egy típusonként, idempotencia) |

- **`deviceId`:** a `@capacitor/device` `getId()`. Telepítésenként stabil, így ugyanaz az eszköz nem
  sokszorozódik.
- **Hiányzó beállítás-dokumentum** = minden típus alapértéke (REQ-NOTIF-002).
- **Rules:**
  - `device`: tulajdonos olvas és ír, kulcskészlet-ellenőrzéssel (`token` legfeljebb 4096 karakteres string,
    `platform` a felsoroltak egyike);
  - `notification-log`: tulajdonos olvas, kliens nem ír.
  - A `setting/{settingId}` szabály már engedi a tulajdonosnak.
  - A rules teszttel együtt változik (alkotmány: firebase-rules).

## Kliens

- **Regisztráció:**
  1. `FirebaseMessaging.requestPermissions()`;
  2. ha megadta: `getToken()`, és a `device` dokumentum írása;
  3. `tokenReceived` figyelő a token-frissítésre.
- **Kijelentkezés (REQ-NOTIF-008):** a `device` dokumentum törlése és `deleteToken()`. Ez a
  `NativeAuthenticationProviderService.signOut` előtt fut, amíg még van jogosultság a törléshez.
- **Koppintás (REQ-NOTIF-007):** a `notificationActionPerformed` figyelő a payload `data.route` mezőjét
  átadja a routernek.
- **Natív beállítás:**
  - iOS: Push Notifications és Background Modes → Remote notifications capability, APNs kulcs a Firebase
    konzolon (dev és prod);
  - Android: a `google-services.json` elég. Android 13+ esetén a `POST_NOTIFICATIONS` engedélyt a plugin
    kéri.

## Szerver

- **Közös küldő:** `apps/functions/src/notification-send.ts`, `notifyUsers({ type, uids, build })`.
  1. Felhasználónként beolvassa a `setting/notifications`-t, és kiszűri, aki kikapcsolta a típust.
  2. Ellenőrzi a `notification-log`-ot (napi egy típusonként).
  3. Beolvassa a `device` dokumentumokat, és felhasználónként egy `sendEach` hívást indít.
  4. A `messaging/registration-token-not-registered` és a `messaging/invalid-registration-token` hibánál
     törli a `device` dokumentumot.
  5. A szöveget a `device.locale` szerint választja (REQ-NOTIF-009). A szövegek a functions saját
     fordítás-táblájában vannak, mert a functions nem lát libeket.
- **Új function exportja:** minden új function az `apps/functions/src/index.ts`-ből exportálódik, különben a
  deploy törli.

### Release-kérés elbírálása

- **Trigger:** `onDocumentUpdated('release-request/{requestId}')`. Akkor tüzel, ha a `status` `pending`-ről
  `approved`-ra vagy `rejected`-re vált.
  - Egy helyen fogja meg a callable-ös jóváhagyást és a kliensoldali elutasítást is.
- **Címzett:** a `userId`. **Route:** `/tabs/profile/requests`.

### Napi kérdés emlékeztető

- **Ütemezés:** új `onSchedule('0 18 * * *', Europe/Budapest)`, neve `remindDailyQuestion`.
- **Kit érint:** azokat, akiknek van `device` dokumentumuk és nincs `user/{uid}/daily-answer/{ma}`
  dokumentumuk.
  - A `device` collection-group lekérdezés kell hozzá. Ez a szerveren fut, a kliensnek nem kell rules.
  - Kell hozzá collection-group index vagy mező-kivétel a `device` collectionre
    (`firestore.indexes.json`).
- **Route:** `/tabs/daily-question`.

### A hét bandája

- **Forrás:** a `composeBandOfTheWeekDaily` (00:15) a hét új dokumentumát írja; csak új hét esetén küld.
- **Kinek:** minden `device`-szal rendelkező felhasználónak, beállítás-szűréssel.
  - Ha a felhasználószám nő, FCM topicra (`band-of-the-week-hu`, `-en`) kell váltani.
- **Küldési idő:** a 00:15-ös futás ne ébresszen fel senkit. A küldés reggel 09:00-kor megy egy külön
  ütemezésből, ha azon a héten még nem ment ki.

### Kölcsön határideje

[kölcsönadás architektúra](kolcsonadas.md#emlékeztető).

## Deploy-igény

- functions (trigger és ütemezések), Firestore rules, indexek;
- APNs kulcs feltöltése a Firebase konzolra, kézzel, projektenként;
- a Cloud Scheduler API a dev és a prod projektben már engedélyezett.

A deployt a maintainer végzi (alkotmány: no-live-changes).
