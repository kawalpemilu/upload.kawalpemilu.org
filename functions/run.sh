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
    gcloud beta firestore export gs://kawal-c1.appspot.com/firestore-dump/may-29
    ;;

tester)
    npm run build && node --max-old-space-size=5120 lib/tester.js
    ;;

kpu_uploads)
    npm run build && node --max-old-space-size=5120 lib/kpu_uploads.js
    ;;

tunnel)
    ssh -vND 12345 felix@qwords1.vps.kutu.nl
    ;;

mv_upserts)
    gsutil -m mv data/upserts_* gs://kawal-c1.appspot.com/upserts/
    ;;

esac
