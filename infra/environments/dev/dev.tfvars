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
