# Non-secret per-environment values for "dev". Commit this file.
env                 = "dev"
project_id          = "music-collection-dev"
region              = "europe-west1"
is_production       = false
hosting_sites       = ["music-collection-dev"]
build_configuration = "dev"
# A prod Firestore helyét követi — az `apply` előtt ellenőrizendő:
#   gcloud firestore databases describe --project music-collection-4e074 --format='value(locationId)'
firestore_location = "eur3"
