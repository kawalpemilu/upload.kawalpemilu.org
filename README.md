# KawalPemilu - Jaga Suara 2019
by KawalPemilu team

## Background

[In 2014](https://github.com/kawalpemilu/kawalpemilu2014),
KawalPemilu crowdsourced 700+ volunteers to
[digitize over 470,000 C1 forms from KPU website](https://qr.ae/TW8oSn).
This year, [KawalPemilu - Jaga Suara 2019](https://kawalpemilu.org)
digitized C1 forms from three different sources:

* from anyone that takes photos of C1 forms directly at
  their polling booth and uploads them to our system
* from BAWASLU (General Election Watchdog), and
* from the KPU (General Elections Commission) website.

This takes crowdsourcing to the next level:
**ANYONE can actively participate in guarding the election**.

In 2019, the KawalPemilu team partnered closely with NETGRIT and branded 
the collaboration as KPJS 2019 (Kawal Pemilu Jaga Suara 2019). 
Initially, the KawalPemilu team was unsure or at least divided in opinion, 
on whether they should repeat what they did in 2014, 
whether KawalPemilu was necessary at all considering the advancements of KPU, 
most notably their KawalPemilu-like systems in a few key Pilkada between 2014-2019. 
It was pak Hadar Nafis Gumay and his NETGRIT team who managed to convince 
the KawalPemilu team that it was necessary to repeat the 2014 activities in 2019, 
but this time in a different form: crowdsourcing the collection of original C1 Plano results by photos.

## Our Goals

* To guard the (Indonesian) election by inviting the public to actively 
  participate in contributing photos of the most authentic
  C1 form (i.e., C1 Plano) at their polling booth.
* Organize the collected C1 forms, digitize, and make them easily accessible
  for the public to trace the real count of the aggregated votes from the polling stations 
  to the village, district, regency, province, and up to the national level.
* Provide a way to report back any anomaly on any level to get them verified and corrected.

## Challenges

* Recruiting ~800K (public) volunteers across Indonesia to take photos of
  the C1 forms at their polling booth.

* 4x increase in the number of C1 forms to be digitized. 
  The number of polling booths in 2019 nearly doubled to over 813,000 and 
  we would digitize both the first page (containing the "Pengguna Hak Pilih" number) 
  and the second page (containing the aggregated votes).

* Last minute inclusion support to digitize C1 forms for pileg. 
  This has at least 4 pages and each have 23 values to be entered. 

* While there has been significant advancement in machine learning to classify 
  handwritten digits, it's a challenge to build a system that assists the
  digitization process in real-time. However, an offline system 
  has proven to be useful in detecting human errors.

* The [KPU website](https://pemilu2019.kpu.go.id/#/ppwp/hitung-suara/)
  was not accessible outside Indonesia.


## System Architectures

![The KawalPemilu Sub-Systems](https://raw.githubusercontent.com/kawalpemilu/upload.kawalpemilu.org/master/web/src/assets/architecture.png)

### The Public Facing (kawalpemilu.org) website

The development of the [KawalPemilu.org](KawalPemilu.org)
website is roughly split into two stages:
* Initially, the website was developed with an objective to 
  let information out as quickly as possible. 
  It was designed to be very light so it would not burden the users'
  web browser/device and network too much.
* Later, a few weeks after the election day, 
  the website was redesigned to be more visually appealing and 
  responsive to different kind of users’ device capabilities.

The website was implemented using a 
[custom framework](https://github.com/kawalpemilu/kawalpemilu2019-www) with Webpack 
for the public website,
[hosted](https://github.com/kawalpemilu/kawalpemilu2019-www/blob/master/firebase.json)
on Firebase Hosting
and read data from KawalPemilu REST API (explained below).
[Docker](https://www.docker.com/) was used to host the 
[compilation process](https://github.com/kawalpemilu/kawalpemilu2019-www/blob/master/build.sh)
to gain some build reproducibility.

The maximum observed real-time number of active users was 7,107.

![kawalpemilu.org max real-time active users](https://raw.githubusercontent.com/kawalpemilu/upload.kawalpemilu.org/master/web/src/assets/devices.png)

The number of views of the public kawalpemilu.org website peaked at April 20, 2019 with 406,701 active users.

![kawalpemilu.org analytics](https://raw.githubusercontent.com/kawalpemilu/upload.kawalpemilu.org/master/web/src/assets/analytics.png)


### The REST API (kawal-c1.appspot.com/api/c/{wilayah_id}) website

The [REST API](https://kawal-c1.appspot.com/api/c/4) takes in a {wilayah_id} 
and returns the details of the node containing:

  *  The aggregated votes of the node (from our system and from KPU)
  
  *  The child nodes' details for navigation
  
  *  The TPS detail (for level 4) and the urls to the photos of the C1 forms
  
  *  [And more](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/shared/index.ts#L526).
  
Data from this API has been extracted and saved into a Github Repository below for archival.

  * https://github.com/kawalpemilu/kawalpemilu2019-extract

### The Data Entry (upload.kawalpemilu.org) website

Users with a Facebook account can login to the
[data entry website](https://upload.kawalpemilu.org).
Authenticated users may have one of these
[roles](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/shared/index.ts#L16):

  * **Relawan** (volunteer) is for users to upload photos directly from their mobile phones / desktop.
    During the recruitment phase, each relawan can generate a personalized code to invite their friends 
    to recruit them as Relawan as well. Finally, relawan can also report problems with 
    any uploaded photo and provide an explanation of the problem.
    
  * **Moderator** is for users to digitize the photos, tag the photos if the problem originates from the  KPU.
    Moderators can only digitize new photos (i.e., they cannot edit the existing numbers).
    This is to prevent any malicious moderator from poisoning the entire system.
    
  * **Admin** is for users to override entries that have been digitized by Moderators 
    in case there were errors. All actions are logged along with their Facebook ID.

The sourcecode (this repository) is written in Typescript.
Below are the platforms used:

* [Angular](https://angular.io/) for the
  [frontend](https://github.com/kawalpemilu/upload.kawalpemilu.org/tree/master/web)
  that displays the aggregate votes near real-time

* [Firebase Hosting](https://firebase.google.com/products/hosting/) to
  [host](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/firebase.json#L15)
  the frontend compiled js + static code

* [Compute Engine](https://cloud.google.com/compute/) for the 
  [background aggregator](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/functions/src/admin.ts)
  that computes the aggregate votes in near real-time as new digitized photo entries are submitted.

* [Google App Engine](https://cloud.google.com/appengine/) for 
  [caching](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/gae/main.py)
  and serving the API requests, to protect against DDoS.

* [Firebase Authentication](https://firebase.google.com/products/auth/) to 
  [authenticate](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/web/src/app/user.service.ts#L117)
  users using their Facebook login. 

* [Cloud Functions](https://firebase.google.com/products/functions/) to serve authenticated 
  [REST API](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/functions/src/index.ts)
  requests, rate limited to 30QPM.

* [Cloud Firestore](https://firebase.google.com/products/firestore/) for "real-time enough" 
  [database](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/firestore.rules)
  that glues the frontend, API, and the background aggregator together.

* [Cloud Storage](https://firebase.google.com/products/storage/) to store authenticated users' 
  [uploaded photos](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/storage.rules).

* Personal iMac to run some 
  [one-off](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/functions/src/tester.ts)
  [scripts](https://github.com/kawalpemilu/upload.kawalpemilu.org/blob/master/functions/src/kpu_uploads.ts)
  for precomputing / cleaning data. 

The number of views to the upload.kawalpemilu.org website peaked at 17 April 2019 with 4,792 active users:

![upload.kawalpemilu.org analytics](https://raw.githubusercontent.com/kawalpemilu/upload.kawalpemilu.org/master/web/src/assets/analytics-upload.png)


### The Bot Verifier

The [Bot Verifier](https://github.com/SamTheisens/kawalc1) is a service that attempts to automatically 
[digitize the numbers in C1 forms](https://www.youtube.com/watch?v=_cgl1tMVcJ0)
with the aid of image processing and a neural network.
The digitization process consists of the following steps:

![Verification Steps](https://raw.githubusercontent.com/kawalpemilu/upload.kawalpemilu.org/master/web/src/assets/bot-steps.png)

  * **Alignment**. In order to locate the digits in a C1 form, it is aligned with a
    [reference form](https://github.com/SamTheisens/kawalc1/blob/master/static/datasets/PPWP-2019-plano.png)
    by performing an affine transformation based on the location of
    [corresponding](https://github.com/SamTheisens/kawalc1/blob/cba7a5456abaae6dc0cb8b58d2258b986bfcb300/mengenali/registration.py#L231) 
    features in both forms.

  * **Extraction**. Once 
    [bounding boxes of the digits](https://github.com/SamTheisens/kawalc1/blob/master/static/datasets/digit_config_ppwp_scan_halaman_2_2019.json)
    are known, in order to account for 
    [slight misalignment](https://github.com/SamTheisens/kawalc1/blob/master/tests/resources/forms/original/extract/Figure_9a.png)
    due to potential elastic transformations, 
    [the biggest connected object surrounded by straight lines](https://github.com/SamTheisens/kawalc1/blob/master/tests/resources/forms/original/extract/Figure_9b.png)
    is [extracted](https://github.com/SamTheisens/kawalc1/blob/master/tests/resources/forms/original/extract/Figure_9c.png). 

  * **Digitization**. The 
    [extracted digits](https://github.com/SamTheisens/kawalc1/blob/master/tests/resources/forms/extracted/~trans~hom0.00198988848929~warp0~1773007-005324400804~11.jpg)
    are fed to a convolutional neural network that was trained on a 
    [sample set](https://youtu.be/XM7u4EVyFKg) that was extracted from the 2014 forms and labeled 
    both manually by volunteers and by using the digitization results from KawalPemilu as soon as they became available. 
    The 11 outputs of the network consist of the digits 0 through 9 and the letter X.

  * **Verification**. In principle, the digits with the highest confidence are picked 
    to form numbers. The confidence for a number is the confidence of the digits 
    that make up the number multiplied.
    
    The C1 forms contain a field for the total number of valid votes. 
    This number can be exploited as a checksum to improve accuracy. 
    
    If the confidence of any other than the most likely digit is higher than 0.1, 
    these other digits are potentially part of a valid combination of digits. 
    The total confidence for the entire number is reduced by a fixed factor when
    \# votes candidate 1 + \# votes candidate 2 is unequal to # total votes. 

For every uploaded photo or scan, an 
[image hash](https://github.com/SamTheisens/kawalc1/blob/df9a9ffa66ff9ed22e1a4888bdba808d3055cce0/mengenali/registration.py#L76)
is calculated.
This allows us to detect images that were accidentally uploaded multiple times for
[different voting stations](https://docs.google.com/spreadsheets/d/1sJPFlchxS4NaFpI0KDi4k_oZ_AV1o0GmcKOjeoHoe8E).
The image hash also allows us to detect 
[truncated image data](https://docs.google.com/spreadsheets/d/1WtpO_qdqo8SiZLa9rJfm2gj6eaX9NS46D7oEVwLByKg/edit#gid=1989612553).

During the alignment phase, a similarity measure is calculated to assess 
the quality of the alignment. The measure is based on a 
[normalized median squared euclidean distance between](https://github.com/SamTheisens/kawalc1/blob/df9a9ffa66ff9ed22e1a4888bdba808d3055cce0/mengenali/registration.py#L341) 
corresponding features. 
A low similarity may indicate a miscategorization of the form. 
If the similarity is lower than a certain threshold, 
an alignment with the other page of the C1 presidential form is attempted. 
If that succeeds, the form is categorized as a 
[mix up](https://docs.google.com/spreadsheets/d/1ICWyqSL6riziBINUvAWeA2ecYZI4XWWD-BQo6PGmbXA/)
and corrected in a 
[semi-automated](https://www.youtube.com/watch?v=9eiWMnNIuFc) fashion.

### The Error Reports website

This site is for Moderators to keep track of errors report and various statistics like the 
[timeline to reach 98.7%](https://spotfire-next.cloud.tibco.com/spotfire/wp/analysis?file=/Users/ku2oiyw5orsvztazcjcew5ibdizqgytd/Public/Election/Election%20-%20Daily%20Progress&waid=2goohDrgQ0OZHhILNx05V-2604578e4bbPSe&wavid=0):

![TPS progress](https://raw.githubusercontent.com/kawalpemilu/upload.kawalpemilu.org/master/web/src/assets/tps-progress.png)


## Total Spending

* March 2019
  * Facebook ads for post engagements Rp 700.000
  
* April 2019
  * Firebase billing $393.07 USD
  * Facebook ads for website visitor Rp 2.999.999
  * Dashboard and Reporting Rp 369.683
  * GCP for KawalC1 bot Rp 916.524.51
  
* May 2019
  * Facebook ads for Sign Up button click Rp 243.372,84
  * Firebase billing $708.45 USD
  * Dashboard and Reporting Rp 684.420
  * VPN for accessing KPU website Rp 220.000
  * Domain registration for kpemi.lu Rp 426.802,68
  
* June 2019
  * VPN for accessing KPU website Rp 220.000
  * Firebase Billing $113.24 USD

## How many person hours spent?

In addition to the total spending above:

* The website https://upload.kawalpemilu.org development was started on 
  Jan 7, 2019 and ended on July 7, 2019. 
  Felix Halim used his spare time to slowly build the frontend and backend 
  and incremental updates and maintenance. 
  This amounts to about 2-3 months worth of full time software engineering work.

* The website https://kawalpemilu.org development was started on March 28, 2019.
  This is about 1 month full time frontend job.
  The development was led by Fajran Iman Rusadi in his spare time 
  with contributions from three other people. 

* Development on the KawalC1 verification bot was started July 2014, 
  resumed February 10, 2019 and ended around July 2019. 
  Sam Theisens spent roughly half a year FTE on its development with contributions from
  [other people](https://github.com/SamTheisens/kawalc1/blob/a4f70bd387d63830d1110008d9ae3f82e9c2acbf/static/pages/contact.html#L9).

* Relawan hours spent can be estimated from the total number of uploads for C1 plano.

* Moderators hours spent can be estimated from the number of photos they digitized. 
  There are at least 802K * 2 photos. 
  A photo may be digitized at different speeds 
  (2 seconds with auto-fill, 5 seconds without autofill, 30 seconds for BAWASLU). 
  Let's take an average of 10 seconds to digitize a photo. 
  There's an additional time needed to transition between photos about another 5 seconds to take into account. 
  Thus in total, the moderators spent around (1.64M + 224K) * 2 * 15 seconds = 324 days. 
  This cost is spread unevenly over 700+ moderators according to the statistics on their [scoreboards](https://upload.kawalpemilu.org/scoreboard).

* Admins hours spent is harder to measure. 
  They constantly seek errors / discrepancies in the data. 
  Each action they take may cost several minutes.
  For example, moving a digitized photos to their correct locations,
  fix errors in the entered data, review sum mismatch and decide according to the 8 rules. 
  There are about 30K TPS with "problems".
  Assuming each TPS requires about 5 minutes to be resolved, 
  the admins spent around 30K * 5 mins = 104 days. 
  This cost is spread unevenly over 67 admins according to scoreboards. 
  The most time-consuming part is comparing the digitization result from 
  our system with KPU and decide who is at fault.

## How many errors found by the public?

There are about [17K errors reported](https://s.id/LaporanPublikKP) by the public.
Note that there are many duplicate reports. 
The duplicate reports “forced” us to create a feature to disable reporting once an error is detected or reported.

## How many human errors found by the Bot Verifier?

The agreement between human and automated digitizations is **83%**.
Agreement is defined as having identical numbers for candidate 1, candidate 2 and the total. 
Of the remaining 17%, for the cases in which the bot had a confidence of more than 0.01, 
an additional round of human verification was performed. 
A human mistake was found in 27% of these remaining cases. 
In total 1.729 human mistakes were thus detected and corrected.

## Our hope for the future

* KPU website opens for public participation in uploading photos / videos 
  of the situation near the polling booth 
  (this is to track whether the event went smoothly or maliciously).

* Eliminate rekap berjenjang (tiered recapitulation), use e-rekap.

* KPU website to have a permalink for easy reference via url to a specific page.


## References

* https://s.id/LaporanPublikKP

* http://kpemi.lu/invoice

* https://www.afr.com/world/asia/the-keyboard-warriors-protecting-indonesia-s-election-20190412-p51deq

* https://www.reuters.com/article/us-indonesia-election-volunteers/thwarting-fraud-thousands-to-crowd-source-indonesian-election-results-idUSKCN1RS0LU

* https://www.scmp.com/news/asia/southeast-asia/article/3016024/social-media-battleground-between-youth-led-democracy?fbclid=IwAR2J7e1gVGfo_J6ml5HpFE2shYzqUmA3vC0h6Tqqj1a69IfIkJTofkXDsL8
