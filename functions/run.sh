case "$1" in

ssh)
    gcloud compute --project "kawal-c1" ssh --zone "us-central1-c" "admin"
    ;;

admin)
    (
        cd ../shared
        npm run build
    ) &&
        npm run build &&
        node --max-old-space-size=5120 lib/admin.js
    ;;

referral)
    (
        cd ../shared
        npm run build
    ) &&
        npm run build &&
        node --max-old-space-size=1024 lib/referral.js
    ;;

backup)
    gcloud beta firestore export gs://kawal-c1.appspot.com/firestore-dump/apr-19
    ;;

esac
