/**
 * A functions közös futtatókörnyezete: az Admin SDK indítása, a globális
 * beállítások (régió, CPU, App Check), a secretek és a közös konstansok.
 *
 * Minden `*.functions.ts` innen importál, ezért ez a modul egyszer és
 * elsőként fut le: a `setGlobalOptions` minden function-definíció előtt
 * érvényes.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

import { GatewaySettings } from './gateway-client';

/** A Firestore adatbázis helye; a triggereknek ide kell kerülniük. */
const REGION = 'europe-west4';

/** A Discogs-válaszok cache-e; csak a function (Admin SDK) éri el. */
export const DISCOGS_CACHE_COLLECTION = 'discogs-cache';
/**
 * Discogs personal access token (Secret Manager, infra/environments): 60
 * kérés/perc a token nélküli 25 helyett.
 */
export const discogsToken = defineSecret('DISCOGS_TOKEN');
/**
 * A fotós azonosítás az AI-gatewayen át megy (`vision-client.ts`). A kulcs a
 * gateway-tenant API-kulcsa (Secret Manager, infra/environments); a
 * szolgáltatói kulcsok a gatewaynél vannak, nem itt.
 */
export const gatewayApiKey = defineSecret('GATEWAY_API_KEY');
/**
 * A gateway címe `/api/v1` nélkül. Nem titok: környezetenként az
 * `apps/functions/.env.<projekt>` adja.
 */
const gatewayBaseUrl = defineString('GATEWAY_BASE_URL');

export function gatewaySettings(): GatewaySettings {
	return { baseUrl: gatewayBaseUrl.value(), apiKey: gatewayApiKey.value() };
}
/** Ennyi ideig használjuk a cache-elt kiadáslistát. */
export const DISCOGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const USER_COLLECTION = 'user';

initializeApp();
// A service accountot és a szerepköreit az infra/environments hozza létre. Teljes
// címmel adjuk meg: a `functions-runtime@` rövidítést a CLI secret-hozzáférés
// ellenőrzése nem egészíti ki, és érvénytelen taggal hívná a setIamPolicy-t.
// A GCLOUD_PROJECT-et a CLI a deploy közbeni betöltéskor is beállítja.
setGlobalOptions({
	region: REGION,
	maxInstances: 10,
	// A Cloud Run régiós kerete 20 vCPU (`CpuAllocPerProjectRegion`, 20 000
	// mvCPU), a firebase-functions viszont minden functionnek egy egész vCPU-t
	// ad — 256 MiB memória mellett is. Huszonkét functionnél ez már a deployba
	// sem fér bele: egy deploy mindegyiknek új revíziót indít (közös
	// forrás-archívum, bármelyik fájl változása átírja mindegyikük hash-ét), és
	// minden induló revízió lefoglalja a maga CPU-ját, amíg a healthcheck le nem
	// fut. A példány a deploy után is él még egy ideig, ezért a deploy körökre
	// osztása önmagában csak eltolta a problémát.
	//
	// 2026-10-04: a keret egyszer már elfogyott, 37 functionnél. Két oka volt,
	// és mindkettő tanulság. Az egyik, hogy három function egész CPU-n maradt
	// abból az időből, amikor a modellt még innen hívtuk — mióta a gateway
	// hívja, egyik sem számol, csak vár, úgyhogy ma mind a fél CPU-n fut. A
	// másik, hogy a forrásból törölt function Cloud Run szolgáltatása életben
	// maradt: a `firebase deploy` a bukásra `Skipping deletes`-szel felel, így
	// a hely, ami kellett volna, épp a hiba miatt nem szabadult fel. Törölni
	// kézzel kell: `firebase functions:delete security:<név>`.
	//
	// Fél CPU-val a mostani készlet 18,5 vCPU — másfél vCPU tartalék, ami egy
	// deploy átfedését is elbírja. Egy új function fél vCPU; harminckilencnél
	// megint a határon állunk.
	//
	// Egy alatti CPU-hoz a Cloud Run 1-es concurrency-t követel: innentől egy
	// példány egy kérést szolgál ki egyszerre, a párhuzamosságot a `maxInstances`
	// szabja. Amelyik functionnek a fél CPU kevés, az helyben felülírja.
	// ÁTMENETI ÉRTÉK. A keret egyszer megtelt, és onnan nem volt kiút: egy
	// deploy a RÉGI revízió mellé indítja az újat, tehát ahhoz, hogy egy
	// function kevesebbet kérjen, előbb el kell férnie annak, ami majd
	// kevesebbet kér. 19,5 + 0,5 = 20,0, vagyis semmit nem lehetett
	// telepíteni. A kiút a kisebb falat: egy negyed CPU befér a maradékba, és
	// ahogy a készlet lecserélődik, magától szabadul fel a hely. Ha mind a 37
	// function ezen van (9,25 vCPU), a `0.5` visszaemelhető.
	cpu: 0.25,
	concurrency: 1,
	serviceAccount: `functions-runtime@${process.env['GCLOUD_PROJECT']}.iam.gserviceaccount.com`,
	// Minden callable csak a saját appunkból hívható. A jogosultság-ellenőrzés
	// önmagában nem elég: egy ID token a böngészőből kimásolható, és onnantól a
	// végpontok scriptből, tetszőleges ütemben hívhatók — az
	// `identifyRecordFromPhoto` esetében hívásonként egy modell-kérés árán. Az
	// App Check token azt igazolja, hogy a hívás a mi appunkból jön; a kliens
	// oldali párja a `provideAppCheck` az app.config.ts-ben.
	//
	// Globálisan állítjuk, hogy egy új callable is védetten szülessen.
	enforceAppCheck: true,
});

export const database = () => getFirestore();
