import * as fs from 'fs';
import * as parse from 'csv-parse/lib/sync';

import { HierarchyNode, BAWASLU_UID } from 'shared';
import { kpuH } from './kpuh';
import { b2h } from './b2h';
import { kpuUploadImage } from './upload';

const LOCAL_FS = '/Users/felixhalim/Projects/kawal-c1/bawaslu';

async function run() {
  const B: { [id: string]: HierarchyNode } = {};

  B[0] = { name: 'IDN', children: [] } as HierarchyNode;

  const propLines = parse(fs.readFileSync(`${LOCAL_FS}/prop.csv`, 'utf-8'));
  for (let i = 1; i < propLines.length; i++) {
    const [propId, propName] = propLines[i];

    B[0].children.push([propId, propName]);

    B[propId] = {
      name: propName,
      parentIds: [],
      children: [],
      depth: 1
    } as HierarchyNode;
  }

  const kabLines = parse(fs.readFileSync(`${LOCAL_FS}/kab.csv`, 'utf-8'));
  for (let i = 1; i < kabLines.length; i++) {
    const [kabId, propId, kabName] = kabLines[i];
    if (propId !== kabId.substring(0, 2)) throw new Error();

    B[propId].children.push([kabId, kabName]);

    if (B[kabId]) throw new Error();
    B[kabId] = {
      name: kabName,
      parentIds: [propId],
      children: [],
      depth: 2
    } as HierarchyNode;
  }

  const kecLines = parse(fs.readFileSync(`${LOCAL_FS}/kec.csv`, 'utf-8'));
  for (let i = 1; i < kecLines.length; i++) {
    const [kecId, kabId, kecName] = kecLines[i];
    const propId = kecId.substring(0, 2);
    if (kabId !== kecId.substring(0, 4)) throw new Error();
    if (B[kabId].parentIds[0] !== propId) throw new Error();

    B[kabId].children.push([kecId, kecName]);

    if (B[kecId]) throw new Error();
    B[kecId] = {
      name: kecName,
      parentIds: [propId, kabId],
      children: [],
      depth: 3
    } as HierarchyNode;
  }

  const kelLines = parse(fs.readFileSync(`${LOCAL_FS}/kel.csv`, 'utf-8'));
  for (let i = 1; i < kelLines.length; i++) {
    const [kelId, kecId, kelName] = kelLines[i];
    const propId = kelId.substring(0, 2);
    const kabId = kelId.substring(0, 4);
    if (kecId !== kelId.substring(0, 6)) throw new Error();
    if (B[kecId].parentIds[0] !== propId) throw new Error();
    if (B[kecId].parentIds[1] !== kabId) throw new Error();

    B[kecId].children.push([kelId, kelName]);

    if (B[kelId]) throw new Error();
    B[kelId] = {
      name: kelName,
      parentIds: [propId, kabId, kecId],
      children: [],
      depth: 4
    } as HierarchyNode;
  }

  console.log(JSON.stringify(B));
}

type Data = {
  uploaded: { [filename: string]: number };
};

async function uploadBawasluKel(kelId, kpuKelId) {
  const propId = kelId.substring(0, 2);
  const kabId = kelId.substring(0, 4);
  const kecId = kelId.substring(0, 6);
  const dir = `${LOCAL_FS}/${propId}/${kabId}/${kecId}/${kelId}`;
  if (!fs.existsSync(dir)) {
    // console.log(`Dir not exists ${dir}`);
    return;
  }

  const dataFn = `${dir}/data.json`;
  let data: Data;
  try {
    data = JSON.parse(fs.readFileSync(dataFn, 'utf8'));
  } catch (e) {
    data = { uploaded: {} } as Data;
  }

  try {
    for (const fn of fs.readdirSync(dir)) {
      if (data.uploaded[fn] || fn === 'data.json') continue;
      const filename = `${dir}/${fn}`;
      await kpuUploadImage(BAWASLU_UID, kpuKelId, 0, filename)
        .then(() => (data.uploaded[fn] = 1))
        .catch(e => console.error(`failed`, e.message));
    }
  } catch (e) {
    console.error(kelId, kpuKelId, e);
  }

  fs.writeFileSync(dataFn, JSON.stringify(data, null, 2));
}

async function uploadBawaslu(concurrency: number) {
  const arr = Object.keys(kpuH).sort((a, b) => +a - +b);
  console.log('Total Kels', arr.length);

  const promises = [];
  for (let i = 0; i < concurrency; i++) promises.push(Promise.resolve());
  let idx = 0;

  const kelLines = parse(fs.readFileSync(`${LOCAL_FS}/kel.csv`, 'utf-8'));
  for (let i = 1; i < kelLines.length; i++) {
    const [kelId, kecId, kelName] = kelLines[i];
    if (b2h[kelId]) {
      promises[idx] = promises[idx].then(() =>
        uploadBawasluKel(kelId, b2h[kelId])
      );
      idx = (idx + 1) % concurrency;
    } else {
      console.log('ga ada ', kelId, kelName);
    }
  }
  console.log('setup');
  await Promise.all(promises);
  console.log('all done');
}

// run().catch(console.error);
uploadBawaslu(10).catch(console.error);
