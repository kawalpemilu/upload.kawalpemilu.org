import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { HierarchyNode } from 'shared';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  constructor(public userService: UserService, private api: ApiService) {}

  async ngOnInit() {}

  async kelurahanIds() {
    const arr = await this.api.get(null, '/assets/kelurahan_ids.js');
    console.log(arr);
  }

  async raw() {
    const raw = (await this.api.get(null, '/assets/raw.js')) as any;

    // TPS
    const NO_TPS = 0;
    const PRABOWO_TPS = 1;
    const JOKOWI_TPS = 2;
    const SAH_TPS = 3;
    const TIDAK_SAH_TPS = 4;
    const TERDATA_TPS = 5;
    const ERROR_TPS = 6;

    // aggregate
    const TEMPAT_ID = 0;
    const ORTU_ID = 1;
    const NAMA = 2;
    const JUMLAH_TPS = 3;
    const ANAK = 4;
    const PRABOWO = 5;
    const JOKOWI = 6;
    const SAH = 7;
    const TIDAK_SAH = 8;
    const TPS_TERDATA = 9;
    const TPS_ERROR = 10;

    // rebuild map
    const data = {};
    for (let i = 0; i < raw.length; i++) {
      data[raw[i][TEMPAT_ID]] = raw[i];
    }

    const h = {};
    const t = {};
    let now = Date.now();
    const parentIds = [];
    const upsertsData = {};

    rec([], 0, 'Nasional', 0);
    console.log(JSON.stringify(h));

    function rec(parents: [number, string][], id, name, depth) {
      const arr = data[id][ANAK];
      const node = (h[id] = {
        n: name,
        d: depth,
        c: [],
        p: parents.map(c => c[0]),
        q: parents.map(c => c[1])
      });
      parentIds[depth] = id;
      if (depth === 4) {
        if (arr.length === 0) {
          throw new Error('empty');
        }
        const c = node.c;
        const u = (t[id] = {});
        const ts = now++;
        arr
          .map(r => +r[NO_TPS])
          .forEach(tpsNo => {
            const imageId = `i${id}-${tpsNo}`;
            const a = { s: [1, 2, 3, 4, 1], x: [ts] };
            u[tpsNo] = constructTps(imageId, a);
            const idx = `${parentIds[1]}-${ts}`;
            upsertsData[imageId] = constructUpsert(id, tpsNo, a, idx);
            const i = Math.floor(tpsNo / 30);
            while (i >= c.length) {
              c.push(0);
            }
            c[i] += Math.pow(2, tpsNo % 30);
          });
        return;
      }
      for (const r of arr) {
        const a = data[r];
        const cid = a[TEMPAT_ID] as number;
        const cname = a[NAMA] as string;
        parents.push([cid, cname]);
        rec(parents, cid, cname, depth + 1);
        parents.pop();
        node.c.push([cid, cname]);
      }
    }

    function constructTps(imageId, a) {
      return {
        p: {
          [imageId]: {
            u:
              'https://lh3.googleusercontent.com/' +
              'hJNMRNckvFNLdDDbtfjyvpC-u0Iov_wZPYeF6Zw' +
              'vF3JfZK4kswubbiPUkYT82syEpGqksUSj-PwTtJxwTQ=s980',
            a
          }
        }
      };
    }

    function constructUpsert(id, tpsNo, a, idx) {
      return {
        a: a,
        d: 0,
        i: '36.70.102.81',
        k: id,
        n: tpsNo,
        t: idx,
        m: { m: ['Google', 'Pixel XL'], x: 106, y: -6 }
      };
    }
  }
}
