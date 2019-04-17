const request = require('request');
const Agent = require('socks5-https-client/lib/Agent');

const KPU_API = 'https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp';
const LOCAL_FS = '/Users/felixhalim/Projects/kawal-c1/kpu/cache';

const fs = require('fs');

// const prefix = 'exports.H = ';
// const hie_path = '../functions/src/hierarchy.js';
// const hie_txt = fs.readFileSync(hie_path, 'utf8');
// const H = JSON.parse(hie_txt.substring(prefix.length, hie_txt.length - 1));

const inProgressFn = c => false; // c => c.progress.proses < c.progress.total

async function get(url, pipeToFile) {
  return new Promise((resolve, reject) => {
    console.log('fetching', url);
    const options = {
      url,
      strictSSL: false,
      agentClass: Agent,
      agentOptions: {
        socksHost: 'localhost',
        socksPort: 12345
      }
    };
    if (pipeToFile) options.encoding = null;
    request(options, function(err, res) {
      if (err) reject(err);
      else {
        if (pipeToFile) {
          const buffer = Buffer.from(res.body, 'utf8');
          fs.writeFileSync(pipeToFile, buffer);
        }
        resolve(res.body);
      }
    });
  });
}

async function getCached(url, cachedFilename) {
  try {
    const cache = JSON.parse(fs.readFileSync(cachedFilename, 'utf8'));
    if (!inProgressFn(cache)) return cache;
  } catch (e) {}

  const res = JSON.parse(await get(url));
  fs.writeFileSync(cachedFilename, JSON.stringify(res));
  return res;
}

const path = [];
function getPathUrlPrefix() {
  let url = KPU_API;
  for (let i = 1; i < path.length; i++) {
    url += `/${path[i]}`;
  }
  return url;
}

async function fetchImageJson(imageId) {
  const dir = LOCAL_FS + '/' + path[path.length - 1];
  try {
    fs.mkdirSync(dir);
  } catch (e) {}

  return getCached(
    getPathUrlPrefix() + `/${imageId}.json`,
    dir + `/${imageId}.json`,
    c => c.images.length !== 2
  );
}

async function downloadImage(fn, imageId) {
  const a = imageId.substring(0, 3);
  const b = imageId.substring(3, 6);
  const url = `https://pemilu2019.kpu.go.id/img/c/${a}/${b}/${imageId}/${fn}`;

  const dir = LOCAL_FS + '/' + path[path.length - 1];
  const filename = dir + `/${fn}`;
  if (!fs.existsSync(filename)) {
    await get(url, filename);
  }
}

async function sedot(id, depth) {
  if (id < 0) {
    console.error('negative id', id);
    return;
  }

  path.push(id);
  //   const arr = H[id].children;
  const url = getPathUrlPrefix() + '.json';
  const res = await getCached(url, `${LOCAL_FS}/${id}.json`);
  if (depth === 4) {
    for (const imageId of Object.keys(res.table)) {
      const vote = res.table[imageId];
      if (vote['21'] !== null) {
        const i = await fetchImageJson(imageId);
        await Promise.all(i.images.map(fn => downloadImage(fn, imageId)));
      }
    }
  } else {
    for (const cid of Object.keys(res.table)) {
      const t = res.table[cid];
      if (t['21'] !== null) {
        await sedot(+cid, depth + 1);
      }
    }
    // for (const cid of arr) {
    //   await sedot(cid[0], depth + 1);
    // }
  }
  path.pop();
}

sedot(0, 0).catch(console.error);
