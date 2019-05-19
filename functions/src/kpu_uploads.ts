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
import {
  getPathUrlPrefix,
  getCached,
  KPU_WIL,
  KPU_CACHE_PATH,
  KPU_API,
  downloadWithRetry
} from './upload_util';

const fsdb = admin.firestore();
const rtdb = admin.database();

// Only fetch KPU if there are incomplete data.
const pendingOnly = true;

// Attempt to fetch remote data.
const isOnline = true;

// Signal to terminate the sync.
let isShutdown = false;

let updateKpuHie$ = Promise.resolve();

type Data = {
  kpu: KpuData;
  wil: any;
  res: any;
  img: { [imageId: string]: any };
  uploaded: { [filename: string]: string };
};
async function getKelData(kelId: number, path, dataFilename): Promise<Data> {
  let data: Data;
  try {
    const x = JSON.parse(fs.readFileSync(dataFilename, 'utf8'));
    data = x.kpu ? x : ({ kpu: x as KpuData } as Data);
  } catch (e) {
    data = { kpu: {} as KpuData } as Data;
  }

  if (pendingOnly) {
    const p = data.res && data.res.progress;
    if (p && p.proses === p.total) return null;
  }

  if (!data.wil) {
    const url = getPathUrlPrefix(KPU_WIL, path) + '.json';
    const cacheFn = `${KPU_CACHE_PATH}/w${kelId}.json`;
    data.wil = await getCached(url, cacheFn, () => false);
  }

  if (!data.res || !data.img || isOnline) {
    data.res = await getCached(getPathUrlPrefix(KPU_API, path) + '.json');
    data.img = {} as { [imageId: string]: any };
    await Promise.all(
      Object.keys(data.res.table)
        .filter(id => data.res.table[id]['21'] !== null)
        .map(async imageId => {
          const iurl = getPathUrlPrefix(KPU_API, path) + `/${imageId}.json`;
          data.img[imageId] = await getCached(iurl);
        })
    );
  }

  data.uploaded = data.uploaded || {};

  return data;
}

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
  return (await Promise.all(vals)).map(s => s.val() as KpuData);
}

function getDelta(oldSum: SumMap, newSum: SumMap) {
  const delta = {} as SumMap;
  for (const key of Object.keys(newSum)) {
    if (!(key in SUM_KEY)) throw new Error();
    const diff = (newSum[key] || 0) - (oldSum[key] || 0);
    if (diff) delta[key] = diff;
  }
  for (const key of Object.keys(oldSum)) {
    if (!newSum.hasOwnProperty(key)) throw new Error();
  }
  return delta;
}

async function updateKpuHie(kelId, kpu: KpuData) {
  console.log('updating kpu hie', kelId);
  const [leaf] = await getKpuFromDb([kelId]);
  const delta = getDelta(getSum(leaf), getSum(kpu));
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
  const data = await getKelData(kelId, path, dataFilename);
  if (!pendingOnly && !data) throw new Error();
  if (!data) return;

  const dir = KPU_CACHE_PATH + `/${kelId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

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
  const promises = [];
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

      promises.push(
        runUpload().catch(e => {
          if (e.message.indexOf('Image too small') === -1) {
            console.error('Upload failed', fn, e.message);
          }
          try {
            data.res.progress.proses = 0;
          } catch (ex) {
            console.error(ex);
          }
        })
      );
    }
  }
  await Promise.all(promises);

  data.kpu = kpu;
  fs.writeFileSync(dataFilename, JSON.stringify(data, null, 2));
  if (ada && !same) {
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

  let initialIdx = 0;
  while (!isShutdown) {
    const arr = Object.keys(kpuH).sort((a, b) => +a - +b);
    console.log('Total Kels', arr.length);
    let arr_idx = initialIdx;
    initialIdx = 0;
    const promises = [];
    const run = async () => {
      while (arr_idx < arr.length && !isShutdown) {
        const idx = arr_idx++;
        const id = +arr[idx];
        if (kpuH[id].depth !== 4) throw new Error();
        try {
          await kpuUploadKel(id, kpuH[id].path);
        } catch (e) {
          console.error('Kel Error', H[id].name, id, e);
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
  }
  unsub();
  console.log('Unsubscribed');
  await rtdb.app.delete();
  console.log('rtdb disconnected');
}

async function consistencyCheckLevel(depth) {
  const ids = Object.keys(H).filter(id => H[id].depth === depth);
  console.log('checking level', depth, ids.length);
  for (let i = 0; i < ids.length; i++) {
    const id = +ids[i];
    const h = H[id] as HierarchyNode;
    const cids = h.children.map(cid => cid[0]);
    const csums = await getKpuFromDb(cids);
    const [data] = await getKpuFromDb([id]);
    let isChanged = false;
    for (let j = 0; j < cids.length; j++) {
      const cid = cids[j];
      const csum = getSum(csums[j]);
      if (csums[j] && JSON.stringify(data[cid]) !== JSON.stringify(csum)) {
        // console.log('differ', cid, data[cid], 'here', csums[j]);
        data[cid] = csum;
        isChanged = true;
      }
    }
    if (!isChanged) continue;
    console.log(i, 'inconsistent', id);
    await rtdb.ref(`k/${id}`).set(data);
  }
}

async function consistencyCheck() {
  for (let depth = 3; depth >= 0; depth--) {
    await consistencyCheckLevel(depth);
  }
  console.log('All Done');
  await rtdb.app.delete();
}

// consistencyCheck().catch(console.error);
continuousKpuUpload(3).catch(console.error);
