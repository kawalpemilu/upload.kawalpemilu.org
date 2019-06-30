import * as admin from 'firebase-admin';
import * as fs from 'fs';

import {
  KpuData,
  SUM_KEY,
  SumMap,
  KPU_SCAN_UID,
  FsPath,
  HierarchyNode
} from 'shared';

import { H } from './hierarchy';
import { kpuH } from './kpuh';
import { kpuUploadImage, md5 } from './upload';
import { KPU_CACHE_PATH, downloadWithRetry, getKelData } from './upload_util';

const fsdb = admin.firestore();
const rtdb = admin.database();

// Only fetch KPU if there are incomplete data.
const pendingOnly = false;

// Attempt to fetch remote data.
const isOnline = true;

// Signal to terminate the sync.
let isShutdown = false;

let updateKpuHie$ = Promise.resolve();

function getSum(node: KpuData) {
  const sum = {} as SumMap;
  for (const cid of Object.keys(node || {})) {
    const data = node[cid];
    for (const key of Object.keys(data)) {
      if (!(key in SUM_KEY)) throw new Error();
      sum[key] = (sum[key] || 0) + data[key];
    }
  }
  return sum;
}

async function getKpuFromDb(ids: number[]): Promise<KpuData[]> {
  const vals = ids.map(id => rtdb.ref(`k/${id}`).once('value'));
  return (await Promise.all(vals)).map(s => s.val() || ({} as KpuData));
}

function getDelta(kelId, oldSum: SumMap, newSum: SumMap) {
  const delta = {} as SumMap;
  for (const key of Object.keys(newSum)) {
    if (!(key in SUM_KEY)) throw new Error();
    const diff = (newSum[key] || 0) - (oldSum[key] || 0);
    if (diff) delta[key] = diff;
  }
  for (const key of Object.keys(oldSum)) {
    if (!newSum.hasOwnProperty(key)) {
      console.log(kelId, 'key not found', key, newSum);
      console.log('old', oldSum);
      throw new Error();
    }
  }
  return delta;
}

async function updateKpuHie(kelId, kpu: KpuData) {
  console.log('updating kpu hie', kelId);
  const [leaf] = await getKpuFromDb([kelId]);
  const delta = getDelta(kelId, getSum(leaf), getSum(kpu));
  if (Object.keys(delta).length === 0) return;

  const h = H[kelId] as HierarchyNode;
  const ids = h.parentIds.concat(kelId);
  const kpus = await getKpuFromDb(h.parentIds);
  for (let i = 0; i < kpus.length; i++) {
    const data = (kpus[i] = kpus[i] || {});
    const cid = ids[i + 1];
    const dataSum = (data[cid] = data[cid] || ({} as SumMap));
    for (const key of Object.keys(delta)) {
      dataSum[key] = (dataSum[key] || 0) + delta[key];
    }
  }
  kpus.push(kpu);

  if (ids.length !== kpus.length) throw new Error();
  await Promise.all(ids.map((id, i) => rtdb.ref(`k/${id}`).set(kpus[i])));
}

async function kpuUploadKel(kelId: number, path) {
  const dataFilename = `${KPU_CACHE_PATH}/data/${kelId}.json`;
  const data = await getKelData(
    kelId,
    path,
    dataFilename,
    pendingOnly,
    isOnline
  );
  if (!pendingOnly && !data) throw new Error();
  if (!data) return;

  const dir = KPU_CACHE_PATH + `/${kelId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  console.log(
    'syncing',
    kelId,
    Object.keys(data.res.table).length,
    Object.keys(data.img).length
  );

  // TODO:
  // add KPU scan yang keskip...
  // set pending ke tps yang masih ada fotonya
  // grab list of ips of uploader/reviewer
  // redownload image yang broken dari kpu
  // https://upload.kawalpemilu.org/t/60729/2
  // prioritize https://docs.google.com/spreadsheets/d/1WtpO_qdqo8SiZLa9rJfm2gj6eaX9NS46D7oEVwLByKg
  // - trace ppwp 3
  // - expose relawan/kpu/bawaslu di API

  const kpu = {} as KpuData;
  let same = true;
  let ada = false;
  for (const imageId of Object.keys(data.img)) {
    const s = data.wil[imageId].nama.split(' ');
    const add =
      s[0] === 'TPS' ? 0 : s[0] === 'POS' ? 1000 : s[0] === 'KSK' ? 2000 : -1;
    if (add < 0) {
      console.error('Negative add', kelId, path, imageId);
      continue;
    }
    const tpsNo = parseInt(s[1], 10) + add;

    const sum = (kpu[tpsNo] = {} as SumMap);
    const res = data.img[imageId];
    if (res && res.chart) {
      sum[SUM_KEY.pas1] = res.chart['21'];
      sum[SUM_KEY.pas2] = res.chart['22'];
      sum[SUM_KEY.tSah] = res.suara_tidak_sah;
      sum[SUM_KEY.sah] = res.suara_sah;
      sum[SUM_KEY.jum] = res.pengguna_j;
      ada = true;
      if (JSON.stringify(data.kpu[tpsNo]) !== JSON.stringify(sum)) {
        same = false;
      }
    }

    for (const fn of res.images || []) {
      // TODO: query the actual fsdb to check if uploaded.
      if (!fn) continue;
      if (data.uploaded[fn]) {
        if ((data.uploaded[fn] + '').length === 32) {
          continue;
        }
        console.log('invalid hash', fn, data.uploaded[fn]);
      }

      const a = imageId.substring(0, 3);
      const b = imageId.substring(3, 6);
      const u = `https://pemilu2019.kpu.go.id/img/c/${a}/${b}/${imageId}/${fn}`;
      const filename = dir + `/${fn}`;
      const runUpload = async () => {
        if (isOnline && !fs.existsSync(filename))
          await downloadWithRetry(u, filename);

        if (fs.existsSync(filename)) {
          const fnHash = md5(fs.readFileSync(filename, 'utf8'));
          if (fnHash.length !== 32) throw new Error();
          if (data.uploaded[fn] !== fnHash) {
            await kpuUploadImage(KPU_SCAN_UID, kelId, tpsNo, filename);
            data.uploaded[fn] = fnHash;
          }
        }
      };

      await runUpload().catch(e => {
        console.error('Upload failed', fn, e.message);
        try {
          data.res.progress.proses = 0;
        } catch (ex) {
          console.error(ex);
        }
      });
    }
  }

  data.kpu = kpu;
  fs.writeFileSync(dataFilename, JSON.stringify(data, null, 2));
  if (ada && !same && Object.keys(kpu).length) {
    await fsdb.doc(FsPath.kpu(kelId)).set(kpu);
    updateKpuHie$ = updateKpuHie$.then(() => updateKpuHie(kelId, kpu));
  }
}

async function continuousKpuUpload(concurrency: number) {
  const tRef = fsdb.doc('tester/status');
  await tRef.set({ running: true });
  const unsub = tRef.onSnapshot(snap => {
    const status = snap.data();
    if (status && !status.running) {
      isShutdown = true;
      console.log('Shutting down... no more processing kel');
    }
  });

  const arr = Object.keys(kpuH).sort((a, b) => +a - +b);
  let initialIdx = pendingOnly ? 0 : arr.indexOf('19397');
  while (!isShutdown) {
    console.log('Total Kels', arr.length);
    let arr_idx = initialIdx;
    initialIdx = 0;
    const promises = [];
    const run = async () => {
      while (arr_idx < arr.length && !isShutdown) {
        const idx = arr_idx++;
        const id = +arr[idx];
        if (kpuH[id].depth !== 4) throw new Error();
        // if (id !== -991104) continue;
        try {
          await kpuUploadKel(id, kpuH[id].path);
        } catch (e) {
          console.error('Kel Error', H[id].name, id, 'idx', idx, e);
        }
      }
    };
    for (let i = 0; i < concurrency; i++) {
      promises.push(run());
    }
    console.log('Upload setup');
    await Promise.all(promises);
    console.log('ALL done');
    await updateKpuHie$;
    isShutdown = true;
  }
  unsub();
  console.log('Unsubscribed');
}

async function checkConsistency(id, depth) {
  if (depth === 4) {
    const kpu = (await fsdb.doc(FsPath.kpu(id)).get()).data();
    if (kpu) {
      await rtdb.ref(`k/${id}`).set(kpu);
      console.log('set', id);
    } else {
      await rtdb.ref(`k/${id}`).remove();
      console.error('remove', id);
    }
    return;
  }
  const h = H[id] as HierarchyNode;
  const cids = h.children.map(cid => cid[0]);
  const csums = await getKpuFromDb(cids);
  const [data] = await getKpuFromDb([id]);
  let isChanged = false;
  for (let j = 0; j < cids.length; j++) {
    const cid = cids[j];
    const csum = getSum(csums[j]);
    if (
      csums[j] &&
      Object.keys(csums[j]).length &&
      JSON.stringify(data[cid]) !== JSON.stringify(csum)
    ) {
      console.log('differ', cid, data[cid], 'here', csums[j]);
      data[cid] = csum;
      isChanged = true;
    }
  }
  if (!isChanged) return;
  console.log('inconsistent', id);
  await rtdb.ref(`k/${id}`).set(data);
}

async function consistencyCheckLevel(depth) {
  const ids = Object.keys(H)
    .filter(id => H[id].depth === depth)
    .sort((a, b) => +a - +b);
  console.log('checking level', depth, ids.length);
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(Promise.resolve());
  }
  let idx = 0;
  for (const id of ids) {
    promises[idx] = promises[idx].then(() => checkConsistency(+id, depth));
    idx = (idx + 1) % promises.length;
  }
  await Promise.all(promises);
}

async function consistencyCheck() {
  for (let depth = 3; depth >= 0; depth--) {
    await consistencyCheckLevel(depth);
  }
  console.log('All Done');
}

continuousKpuUpload(15).catch(console.error)
  .then(() => consistencyCheck())
  .catch(console.error)
  .then(() => rtdb.app.delete())
  .catch(console.error)
  ;

  // consistencyCheck().catch(console.error)