import * as fs from 'fs';
import { spawn } from 'child_process';

const proxy = 'socks5h://localhost:12345';

export const KPU_API = 'https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp';
export const KPU_WIL = 'https://pemilu2019.kpu.go.id/static/json/wilayah';
export const KPU_CACHE_PATH = '/Users/felixhalim/Projects/kawal-c1/kpu/cache';

export async function download(url, output): Promise<void> {
  return new Promise((resolve, reject) => {
    const params = ['-s', '--proxy', proxy, '-m', 180, '--output', output, url];
    const c = spawn('curl', params);
    c.on('close', code => {
      if (code) {
        reject(new Error(`Download error: ${url}, code: ${code}`));
        return;
      }
      try {
        if (fs.statSync(output).size < 10 << 10) {
          fs.unlinkSync(output);
          reject(new Error(`Image too small: ${url}`));
          return;
        }
        // console.log('Downloaded', url);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function downloadWithRetry(url, output) {
  for (let i = 0; ; i++) {
    try {
      await download(url, output);
      break;
    } catch (e) {
      if (i >= 3) throw e;
    }
  }
}

async function curl(url): Promise<string> {
  return new Promise((resolve, reject) => {
    const c = spawn('curl', ['-s', '--proxy', proxy, '-m', 180, url]);
    let s = '';
    c.stdout.on('data', data => (s += data));
    c.on('close', code => {
      if (code) reject(new Error(`Exit code ${code}`));
      else resolve(s);
    });
  });
}

async function getWithRetry(url) {
  for (let i = 0; ; i++) {
    try {
      return await curl(url);
    } catch (e) {
      if (i >= 3) {
        console.error('get retry', i, e.message);
        return JSON.stringify({ table: {}, images: [] });
      }
    }
  }
}

export async function getCached(
  url,
  cachedFilename = null,
  inProgressFn = null
) {
  if (cachedFilename) {
    let cacheJson: string;
    let cache: any;
    try {
      cacheJson = fs.readFileSync(cachedFilename, 'utf8');
      cache = JSON.parse(cacheJson);
      if (!inProgressFn(cache)) return cache;
    } catch (e) {}
  }

  try {
    const res = JSON.parse(await getWithRetry(url));
    if (cachedFilename) {
      const resJson = JSON.stringify(res);
      fs.writeFileSync(cachedFilename, resJson);
    }
    return res;
  } catch (e) {
    console.error(e.message);
    return { table: {}, images: [] };
  }
}

export function getPathUrlPrefix(prefix, path) {
  let url = prefix;
  for (let i = 1; i < path.length; i++) {
    url += `/${path[i]}`;
  }
  return url;
}
