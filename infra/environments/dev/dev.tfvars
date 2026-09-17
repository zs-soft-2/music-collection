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
