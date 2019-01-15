import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { DbPath, getTpsNumbers, Aggregate } from 'shared';
import { AngularFireDatabase } from '@angular/fire/database';
import { User } from 'firebase';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  constructor(
    public userService: UserService,
    private api: ApiService,
    private afd: AngularFireDatabase
  ) {}

  async ngOnInit() {
    // await this.afd.object('upserts').remove();
    // console.log('removed');
  }

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
    let maxTps = 100;

    rec([], 0, 'Nasional', 0);
    console.log(JSON.stringify(t));
    console.log(JSON.stringify(upsertsData));

    function rec(parents: [number, string][], id, name, depth) {
      // if (maxTps < 0) {
      //   return;
      // }
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
            maxTps--;
          });
        return;
      }
      if (id) {
        parents.push([id, name]);
      }
      for (const r of arr) {
        const a = data[r];
        const cid = a[TEMPAT_ID] as number;
        const cname = a[NAMA] as string;
        rec(parents, cid, cname, depth + 1);
        node.c.push([cid, cname]);
      }
      if (id) {
        parents.pop();
      }
    }

    function constructTps(imageId, a) {
      return {
        p: {
          [imageId]: {
            u:
              'http://lh3.googleusercontent.com/' +
              'hJNMRNckvFNLdDDbtfjyvpC-u0Iov_wZPYeF6Zw' +
              'vF3JfZK4kswubbiPUkYT82syEpGqksUSj-PwTtJxwTQ',
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

  async zero(user: User) {
    const kelurahanIds = (await this.api.kelurahanIds$.toPromise()) as any[];
    kelurahanIds.sort((a, b) => a - b);
    console.log(kelurahanIds);
    for (let i = 0; i < 100; i++) {
      const kelurahanId = kelurahanIds[i];
      const childrenBits = (await this.afd
        .list(DbPath.hieChildren(kelurahanId))
        .valueChanges()
        .pipe(take(1))
        .toPromise()) as number[];
      for (const tpsNo of getTpsNumbers(childrenBits)) {
        const aggregates = (await this.afd
          .object(DbPath.hieAgg(kelurahanId, tpsNo))
          .valueChanges()
          .pipe(take(1))
          .toPromise()) as Aggregate;
        console.log(kelurahanId, tpsNo, aggregates.s);
        for (let j = 0; j < 5; j++) {
          aggregates.s[j] = 0;
        }

        this.api
          .post(user, `${ApiService.HOST}/api/upload`, {
            kelurahanId,
            tpsNo,
            aggregates,
            metadata: { i: 'vJVwly28IC3fK2ExYMaG' }
          })
          .then(res => {
            console.log('res', kelurahanId, tpsNo);
          });
      }
    }
  }
}
