const { spawn } = require('child_process');
const fs = require('fs');

const KPU_API = 'https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp';
const KPU_WIL = 'https://pemilu2019.kpu.go.id/static/json/wilayah';

const LOCAL_FS = '/Users/felixhalim/Projects/kawal-c1/kpu/cache';
const proxy = 'socks5h://localhost:12345';

async function curl(url) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-s', '--proxy', proxy, url]);
    let s = '';
    curl.stdout.on('data', data => (s += data));
    curl.on('close', code => {
      if (code) reject(new Error(`Exit code ${code}`));
      else resolve(s);
    });
  });
}

async function download(url, output) {
  return new Promise((resolve, reject) => {
    const params = ['-s', '--proxy', proxy, '--output', output, url];
    const curl = spawn('curl', params);
    curl.on('close', code => {
      if (code) reject(new Error(`Exit code ${code}`));
      else resolve();
    });
  });
}

async function downloadWithRetry(url, output) {
  for (let i = 0; i < 3; i++) {
    try {
      await download(url, output);
      const s = fs.statSync(output);
      if (s.size < 10 << 10) {
        // console.error('image too small', url);
        fs.unlinkSync(output);
      } else {
        console.log('downloaded', url);
      }
      return;
    } catch (e) {
      console.error('download retry', i, e.message);
    }
  }
}

async function getWithRetry(url) {
  console.log('fetching', url);
  for (let i = 0; i < 3; i++) {
    try {
      return await curl(url);
    } catch (e) {
      console.error('get retry', i, e.message);
    }
  }
  return { table: {}, images: [] };
}

async function getCached(url, cachedFilename, inProgressFn) {
  try {
    const cache = JSON.parse(fs.readFileSync(cachedFilename, 'utf8'));
    if (!inProgressFn(cache)) return cache;
  } catch (e) {}

  try {
    const res = JSON.parse(await getWithRetry(url));
    fs.writeFileSync(cachedFilename, JSON.stringify(res));
    return res;
  } catch (e) {
    console.error(e.message);
    return { table: {}, images: [] };
  }
}

function getPathUrlPrefix(prefix, path) {
  let url = prefix;
  for (let i = 1; i < path.length; i++) {
    url += `/${path[i]}`;
  }
  return url;
}

async function fetchImageJson(imageId, path) {
  const dir = LOCAL_FS + '/' + path[path.length - 1];
  try {
    fs.mkdirSync(dir);
  } catch (e) {}

  return getCached(
    getPathUrlPrefix(KPU_API, path) + `/${imageId}.json`,
    dir + `/${imageId}.json`,
    c => c.images.length !== 2
  );
}

async function downloadImage(fn, imageId, path) {
  const a = imageId.substring(0, 3);
  const b = imageId.substring(3, 6);
  const url = `https://pemilu2019.kpu.go.id/img/c/${a}/${b}/${imageId}/${fn}`;

  const dir = LOCAL_FS + '/' + path[path.length - 1];
  const filename = dir + `/${fn}`;
  if (!fs.existsSync(filename)) {
    await downloadWithRetry(url, filename);
  }
}

async function sedot(id, depth, path) {
  path = path.slice();
  path.push(id);
  const url = getPathUrlPrefix(KPU_API, path) + '.json';
  const inProgressFn = c => c.progress.proses < c.progress.total;
  // const inProgressFn = c => false;
  const res = await getCached(url, `${LOCAL_FS}/${id}.json`, inProgressFn);
  const arr = Object.keys(res.table).filter(id => res.table[id]['21'] !== null);
  if (depth === 4) {
    const wurl = getPathUrlPrefix(KPU_WIL, path) + '.json';
    await getCached(wurl, `${LOCAL_FS}/w${id}.json`, c => false);
    return await Promise.all(
      arr.map(async imageId => {
        const i = await fetchImageJson(imageId, path);
        if (!i.images) {
          console.error('null images', id, depth, path, imageId);
        } else {
          await Promise.all(
            i.images.map(fn => downloadImage(fn, imageId, path))
          );
        }
      })
    );
  }

  if (depth < 2) {
    for (const cid of arr) {
      if (id === -99) {
        const cpath = path.slice();
        for (let i = 2; i > 0; i--) {
          cpath.push(+cid + i);
        }
        await sedot(+cid, depth + 3, cpath);
      } else {
        await sedot(+cid, depth + 1, path);
      }
    }
    return;
  }

  await Promise.all(arr.map(cid => sedot(+cid, depth + 1, path)));
}

async function fixHierarchy() {
  const prefix = 'exports.H = ';
  const hie_path = '../functions/src/hierarchy.js';
  const hie_txt = fs.readFileSync(hie_path, 'utf8');
  const H = JSON.parse(hie_txt.substring(prefix.length, hie_txt.length - 1));

  async function rec(id, depth, path) {
    path = path.slice();
    path.push(id);

    const h = H[id];
    if (!h) throw new Error(`unknown id ${id} ${path}`);

    const url =
      getPathUrlPrefix(KPU_WIL, depth === 0 ? path.concat(0) : path) + '.json';
    const res = await getCached(url, `${LOCAL_FS}/w${id}.json`, c => false);

    let nChildren = 0;
    if (depth === 4) {
      const exTps = {};
      h.children.forEach(c => {
        exTps[c[0]] = 1;
        if (c[0] > 1000 && id >= 0) {
          throw new Error('toobig ' + id + ' ' + c[0]);
        }
      });

      for (const tid of Object.keys(res)) {
        const s = res[tid].nama.split(' ');
        if (s[0] !== 'TPS' && s[0] !== 'POS' && s[0] !== 'KSK')
          throw new Error(`nama: ${s[0]}`);
        const tpsNo = parseInt(s[1], 10);
        if (!exTps[tpsNo] && id >= 0) {
          let j = h.children.length;
          for (let i = 0; i < h.children.length; i++) {
            if (h.children[i][0] > tpsNo) {
              j = i;
              break;
            }
          }
          console.error('Missing TPS', id, tpsNo, h.children);
          h.children.splice(j, 0, [tpsNo, -1, -1]);
        }
        nChildren++;
      }
    } else {
      const cids = {};
      h.children.forEach(c => (cids[c[0]] = 1));

      if (depth < 2) {
        for (const cid of Object.keys(res)) {
          if (!cids[cid]) throw new Error();
          nChildren++;
          await rec(+cid, depth + 1, path);
        }
      } else {
        const promises = [];
        for (const key of Object.keys(res)) {
          const cid = +key;
          const cname = res[cid].nama;
          if (!cids[cid]) {
            if (H[cid]) {
              console.log('ADA TAPI MISSING', cid, cname, id);
              if (H[cid].depth !== 4) throw new Error(H[cid].depth);
              nChildren--;
            } else {
              const names = h.parentNames.slice();
              names.push(h.name);
              const nTps = await addTpsLn(cid, cname, depth + 1, path, names);
              h.children.push([cid, cname, nTps, -1, -1]);
              console.log('\n\n\nadded', cid, cname);
            }
          }
          nChildren++;
          promises.push(rec(+cid, depth + 1, path));
        }
        await Promise.all(promises);
      }
      if (nChildren > h.children.length && id !== 83553 && id !== 72398 && id !== 930135) {
        // console.error('here', nChildren, h.children.length, path, res, h);
        throw new Error(`Child mismatch ${nChildren} != ${h.children.length}`);
      }
    }
  }

  async function addTpsLn(id, name, depth, parentIds, parentNames) {
    if (H[id]) throw new Error();
    const children = [];
    H[id] = { id, name, depth, parentIds, parentNames, children, data: {} };

    const path = parentIds.slice();
    path.push(id);
    const names = parentNames.slice();
    names.push(name);
    const url = getPathUrlPrefix(KPU_WIL, path) + '.json';
    const res = await getCached(url, `${LOCAL_FS}/w${id}.json`, c => false);
    // console.log(id, res);

    if (depth === 4) {
      for (const key of Object.keys(res)) {
        const s = res[key].nama.split(' ');
        let tpsNo = parseInt(s[1], 10);
        if (tpsNo > 795) throw new Error('' + tpsNo);
        if (s[0] === 'TPS') {
          // if (tpsNo > 90) throw new Error('' + tpsNo);
        } else if (s[0] === 'POS') {
          tpsNo += 1000;
        } else if (s[0] === 'KSK') {
          tpsNo += 2000;
        }
        children.push([tpsNo, -1, -1]);
      }
      console.log('t', H[id]);
      return children.length;
    }

    let totTps = 0;
    for (const key of Object.keys(res)) {
      const cid = +key;
      const cname = res[cid].nama;
      const nTps = await addTpsLn(cid, cname, depth + 1, path, names);
      children.push([cid, cname, nTps, -1, -1]);
      totTps += nTps;
    }
    console.log('h', H[id]);
    return totTps;
  }

  if (!H[-99]) {
    const nTps = await addTpsLn(-99, 'Luar Negeri', 1, [0], ['IDN']);
    H[0].children.push([-99, 'Luar Negeri', nTps, -1, -1]);
    console.log('Tot TPS LN', nTps);
  }

  const m = H[18880].children.find(a => a[0] === 931304);
  if (m) {
    m[0] = 18887;
    console.log(H[18880]);
  }

  await rec(0, 0, []);

  const hieFn = '/Users/felixhalim/Projects/kawal-c1/kpu/hierarchy.js';
  fs.writeFileSync(hieFn, `exports.H = ${JSON.stringify(H)};`);
}

fixHierarchy().catch(console.error);

// sedot(32676, 1, [0]).catch(console.error);
// sedot(0, 0, []).catch(console.error);
