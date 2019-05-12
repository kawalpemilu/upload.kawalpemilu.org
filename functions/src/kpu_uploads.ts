import * as admin from 'firebase-admin';
import * as fs from 'fs';

import { KpuData, SUM_KEY, SumMap, KPU_SCAN_UID, FsPath } from 'shared';

import { H } from './hierarchy';
import { kpuH } from './kpuh';
import { kpuUploadImage } from './upload';
import {
  getPathUrlPrefix,
  getCached,
  KPU_WIL,
  KPU_CACHE_PATH,
  KPU_API,
  download
} from './upload_util';

const fsdb = admin.firestore();

const isOffline = false;
let isShutdown = false;

type Data = {
  kpu: KpuData;
  wil: any;
  res: any;
  img: { [imageId: string]: any };
  uploaded: { [filename: string]: number };
};
async function getKelData(
  kelId: number,
  path,
  dataFilename
): Promise<[Data, string]> {
  let data: Data;
  let dataJson: string = '';
  try {
    dataJson = fs.readFileSync(dataFilename, 'utf8');
    const x = JSON.parse(dataJson);
    data = x.kpu ? x : ({ kpu: x as KpuData } as Data);
  } catch (e) {
    data = { kpu: {} as KpuData } as Data;
  }

  const p = data.res && data.res.progress;
  if (p && p.proses === p.total) return [null, null];

  if (!data.wil) {
    const url = getPathUrlPrefix(KPU_WIL, path) + '.json';
    data.wil = await getCached(
      url,
      `${KPU_CACHE_PATH}/w${kelId}.json`,
      c => false
    );
  }

  if (!data.res || !data.img || !isOffline) {
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

  return [data, dataJson];
}

async function kpuUploadKel(kelId: number, path) {
  const dataFilename = `${KPU_CACHE_PATH}/data/${kelId}.json`;
  const [data, dataJson] = await getKelData(kelId, path, dataFilename);
  if (!data || !Object.keys(data.img).length) return;

  const dir = KPU_CACHE_PATH + `/${kelId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // TODO:
  // add KPU scan yang keskip...
  // set pending ke tps yang masih ada fotonya
  // grab list of ips of uploader/reviewer
  // redownload image yang broken dari kpu

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
      if (!fn || data.uploaded[fn]) continue;

      const a = imageId.substring(0, 3);
      const b = imageId.substring(3, 6);
      const u = `https://pemilu2019.kpu.go.id/img/c/${a}/${b}/${imageId}/${fn}`;
      const filename = dir + `/${fn}`;
      const runUpload = async () => {
        if (!fs.existsSync(filename)) await download(u, filename);
        await kpuUploadImage(KPU_SCAN_UID, kelId, tpsNo, filename);
        data.uploaded[fn] = 1;
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
  const newDataJson = JSON.stringify(data, null, 2);
  if (dataJson !== newDataJson) fs.writeFileSync(dataFilename, newDataJson);
  if (ada && !same) await fsdb.doc(FsPath.kpu(kelId)).set(kpu);
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

  let initialIdx = 30000;
  while (!isShutdown) {
    const arr = Object.keys(kpuH).sort((a, b) => +a - +b);
    console.log('Total Kels', arr.length);
    let arr_idx = initialIdx;
    initialIdx = 0;
    const promises = [];
    const run = async () => {
      while (arr_idx < arr.length && !isShutdown) {
        const idx = arr_idx++;
        const id = arr[idx];
        if (kpuH[id].depth !== 4) throw new Error();
        try {
          await kpuUploadKel(+id, kpuH[id].path);
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
  }
  unsub();
}
continuousKpuUpload(3).catch(console.error);
