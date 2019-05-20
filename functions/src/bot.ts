import * as admin from 'firebase-admin';
import * as fs from 'fs';

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

import { spawn } from 'child_process';

import {
  SumMap,
  FsPath,
  Aggregate,
  TpsData,
  HierarchyNode,
  Autofill,
  FORM_TYPE,
  IS_PLANO,
  SUM_KEY
} from 'shared';

import { H } from './hierarchy';

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const fsdb = admin.firestore();
const rtdb = admin.database();

const hJson = JSON.parse(fs.readFileSync('h.json', 'utf8')) as {
  [key: string]: { [key: string]: Aggregate };
};

async function curl(url): Promise<string> {
  return new Promise((resolve, reject) => {
    const c = spawn('curl', ['-s', '-m', 60, url]);
    let s = '';
    c.stdout.on('data', data => (s += data));
    c.on('close', code => {
      if (code) reject(new Error(`Exit code ${code}`));
      else resolve(s);
    });
  });
}

async function digitize(kelId, tpsNo, imageUrl) {
  const host = 'slim-kawal-c1-bot.dahsy.at:8002'; // 43.252.136.103:8001
  const hal1 = 'digit_config_ppwp_scan_halaman_1_2019.json';
  const hal2 = 'digit_config_ppwp_scan_halaman_2_2019.json';
  const config = `${hal1},${hal2}`;
  const params =
    'storeFiles=true&baseUrl=http://lh3.googleusercontent.com&featureAlgorithm=akaze';
  const url = `http://${host}/download/${kelId}/${tpsNo}/${imageUrl}=s1280?configFile=${config}&${params}`;
  for (let nTry = 3; nTry-- > 0; ) {
    try {
      return JSON.parse(await curl(url));
    } catch (e) {}
  }
  return null;
}

async function autofillKelTps(kelId, tpsNo) {
  const tRef = fsdb.doc(FsPath.tps(kelId, tpsNo));
  const d = (await tRef.get()).data() as TpsData;
  let needUpdate = false;
  const data = d.autofill || ({} as Autofill);
  for (const imageId of Object.keys(d.images).sort(
    (a, b) => d.images[a].uploader.ts - d.images[b].uploader.ts
  )) {
    const i = d.images[imageId];
    // if (i.uploader.uid !== KPU_SCAN_UID) continue;
    const imageUrl = i.url.substring(i.url.lastIndexOf('/') + 1);
    const res = await digitize(kelId, tpsNo, imageUrl);
    if (!res || res.outcome.confidence < 0.5) continue;
    const o = res.outcome;
    if (o.phpJumlah !== undefined) {
      const key = FORM_TYPE.PPWP + '.' + IS_PLANO.NO + '.1.sam';
      if (!data[key]) data[key] = {} as SumMap;
      const a = data[key];
      a[SUM_KEY.jum] = o.phpJumlah;
      a['c'] = o.confidence;
    }
    if (o.jokowi) {
      const key = FORM_TYPE.PPWP + '.' + IS_PLANO.NO + '.2.sam';
      if (!data[key]) data[key] = {} as SumMap;
      const a = data[key];
      a[SUM_KEY.pas1] = o.jokowi;
      a[SUM_KEY.pas2] = o.prabowo;
      a[SUM_KEY.sah] = o.jumlah;
      a[SUM_KEY.tSah] = o.tidakSah;
      a['c'] = o.confidence;
    }
    needUpdate = true;
  }
  if (needUpdate) {
    console.log(JSON.stringify(data, null, 4));
    d.autofill = data;
    await tRef.update(d);
    console.log('outcome', kelId, tpsNo, data);
  }
}

async function autofillKel(kelId: number, tpsNos: number[]) {
  const paralellism = 3;
  const arr = [];
  for (let i = 0; i < paralellism; i++) arr.push(Promise.resolve());
  let idx = 0;
  for (const tpsNo of tpsNos) {
    arr[idx] = arr[idx].then(() => autofillKelTps(kelId, tpsNo));
    idx = (idx + 1) % paralellism;
  }
  await Promise.all(arr);
  process.exit(0);
}

async function autofill() {
  const arr = [];
  Object.keys(H).forEach(id => {
    const h = H[id] as HierarchyNode;
    if (h.depth !== 4) return;

    const ch = hJson[id];
    if (!ch) return;

    const entry = { kelId: id, tpsNos: [] };
    for (const [tpsNo] of h.children) {
      const a = ch[tpsNo];
      if (!a) continue;
      if (a.sum.pending) {
        entry.tpsNos.push(tpsNo);
      }
    }
    arr.push(entry);
  });

  for (const entry of arr.sort((a, b) => b.tpsNos.length - a.tpsNos.length)) {
    await autofillKel(entry.kelId, entry.tpsNos);
  }
}

async function genCsv() {
  const arr = [];
  for (const kelId of Object.keys(H)) {
    const h = H[kelId] as HierarchyNode;
    if (h.depth !== 4) continue;

    const ch = hJson[kelId];
    if (!ch) continue;

    // if (arr.length > 5) break;
    console.log('processing', kelId, arr.length);

    let kpu = null;

    for (const [tpsNo] of h.children) {
      const a = ch[tpsNo];
      if (!a || tpsNo < 1) continue;
      if (a.sum.pending) {
        const tps = (await fsdb
          .doc(FsPath.tps(+kelId, tpsNo))
          .get()).data() as TpsData;
        for (const imageId of Object.keys(tps.images)) {
          const i = tps.images[imageId];
          if (i.reviewer) continue;

          if (!kpu) {
            kpu = (await rtdb.ref(`k/${kelId}`).once('value')).val();
            if (!kpu) {
              console.log('missing KPU', kelId, kpu);
              continue;
            }
          }

          if (!i.meta['m']) {
            console.log('no meta');
            continue;
          }

          arr.push({
            kelId,
            tpsNo,
            filename: i.meta['m'][0],
            imageId,
            imageUrl: i.url,
            ...kpu[tpsNo]
          });
        }
      }
    }
  }

  const csvWriter = createCsvWriter({
    path: 'bot.csv',
    header: [
      { id: 'kelId', title: 'kelId' },
      { id: 'tpsNo', title: 'tpsNo' },
      { id: 'filename', title: 'filename' },
      { id: 'jum', title: 'jum' },
      { id: 'pas1', title: 'pas1' },
      { id: 'pas2', title: 'pas2' },
      { id: 'sah', title: 'sah' },
      { id: 'tSah', title: 'tSah' },
      { id: 'imageId', title: 'imageId' },
      { id: 'imageUrl', title: 'imageUrl' }
    ]
  });

  await csvWriter.writeRecords(arr);

  return rtdb.app.delete();
}

// autofill().catch(console.error);
genCsv().catch(console.error);
