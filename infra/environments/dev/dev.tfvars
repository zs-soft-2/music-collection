# Non-secret per-environment values for "dev". Commit this file.
env           = "dev"
project_id    = "music-collection-16676"
region        = "europe-west1"
is_production = false
# A projekt alapértelmezett hosting site-ja (`music-collection-16676`) a Firebase-szel együtt jött
# létre, nem kell tofu-ból teremteni; a deploy az `app` targeten (.firebaserc) éri el.
hosting_sites       = []
build_configuration = "dev"
# A dev környezetbe a `dev` ágról telepítünk (.github/workflows/deploy.yml).
deployment_branches = ["dev"]
# A MEGLÉVŐ dev adatbázis helye (létrehozás után nem módosítható). Az első apply előtt
# state alá kell venni: tofu import -var-file=dev.tfvars module.firebase.google_firestore_database.default \
#   "projects/music-collection-16676/databases/(default)"
firestore_location = "europe-west4"
# A dev adatbázison be van kapcsolva (a konzolban kapcsolták be, 2026-09-19-én
# vettük át); nélküle egy apply kikapcsolná.
firestore_point_in_time_recovery = true
# App Check: a reCAPTCHA kulcs innen ad tokent. A localhost a `nx serve`-hez
# kell; enélkül a callable-ök a fejlesztői gépen is elutasítanának mindent.
app_check_domains = [
  "music-collection-16676.web.app",
  "music-collection-16676.firebaseapp.com",
  "localhost",
]
# A localhost-fejlesztés debug tokenje: a `nx serve` ezzel vált App Check
# tokent, a valódi reCAPTCHA pontozása helyett. A token a state-ben él, a
# fejlesztő a `tofu output -raw app_check_debug_token`-nel kéri el
# (tools/app-check/generate-debug-token.mjs). Prodban nincs ilyen.
app_check_debug_token = true

# App Check enforcement. A callable-öket a kód maga védi; a Firestore-t és a
# Storage-ot csak ez. Nélküle a szabályok publikus ágai (katalógus, borítók,
# bundle-ök) bárki scriptjéből olvashatók — az apiKey és a projekt-azonosító a
# kliens bundle-jében van —, és az olvasási költség is velük megy.
#
# A Firestore ENFORCED: a kliens minden lekérdezése az SDK-n át megy, ami maga
# viszi az App Check tokent (`app.config.ts`), a scriptek pedig Admin SDK-val
# dolgoznak, amit az enforcement nem érint. A localhoston a debug token vagy a
# reCAPTCHA ad tokent — enélkül a `nx serve` most már olvasni sem tud, nem csak
# callable-t hívni.
#
# A Storage egyelőre csak mér. A képek nem az SDK-n keresztül jelennek meg,
# hanem sima <img>-ből, közvetlen letöltési címről (avatar-rétegek token
# nélkül, borítók és példányfotók letöltési tokennel) — egy <img> kérés nem visz
# App Check fejlécet. Az UNENFORCED egy-két nap alatt megmutatja a konzol App
# Check lapján, hogy ezek a kérések ellenőrizetlennek számítanak-e; ha nem, ez
# a sor ENFORCED-ra vált, ha igen, előbb a képek kiszolgálását kell átrakni.
app_check_services = {
  "firestore.googleapis.com"       = "ENFORCED"
  "firebasestorage.googleapis.com" = "UNENFORCED"
}

# Havi költségkeret (USD — a számlázási fiók pénzneme). Nem plafon: a Google a
# túllépéskor tovább szolgál ki, csak levelet küld. Küszöbök: 50%, 90%, 100% a
# tényleges költésre, és 100% az előrejelzettre — ez utóbbi szólal meg elsőként,
# ha egy script megugrasztja a hónap ütemét.
#
# A fogyasztás érdemi része (a modellhívások) a saját AI-gatewayre kerül át, és
# ott van szabályozva; ez a keret a mögötte maradó GCP-számlára (Firestore-
# olvasás, Storage, functionök) figyel.
budget_amount = 5

# Firestore olvasás-riasztás: gördülő órás ablakban ennyi dokumentum-olvasás
# fölött szól. A dev rendes órás csúcsa ~41 ezer (katalógus-scriptek), a
# 2026-09-21-i elszabadulásé 187 719 — az 50 ezer e kettő közé esik.
firestore_read_alert_threshold = 50000
