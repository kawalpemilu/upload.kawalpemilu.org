import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { TpsImage } from 'shared';
import { AngularFireDatabase } from '@angular/fire/database';
import { User } from 'firebase';

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

  async ngOnInit() {}

  async kelurahanIds() {
    const arr = await this.api.get(null, '/assets/kelurahan_ids.js');
    console.log(arr);
  }

  constructTpsImage(a) {
    const ti: TpsImage = {
      u:
        'http://lh3.googleusercontent.com/' +
        'hJNMRNckvFNLdDDbtfjyvpC-u0Iov_wZPYeF6Zw' +
        'vF3JfZK4kswubbiPUkYT82syEpGqksUSj-PwTtJxwTQ',
      a
    };
    return ti;
  }

  async zero(user: User) {
    console.log('zero', user, await user.getIdToken());
    // return;

    const kelurahanIds = await this.api.getStatic<number[]>(
      '/assets/kelurahan_ids.js'
    );

    for (let i = 0; i < kelurahanIds.length; i++) {
      const j = Math.floor(Math.random() * (i + 1));
      if (i !== j) {
        const t = kelurahanIds[i];
        kelurahanIds[i] = kelurahanIds[j];
        kelurahanIds[j] = t;
      }
    }
    console.log(kelurahanIds);

    let skipped = 0;
    for (const batch = []; kelurahanIds.length; ) {
      const kelurahanId = kelurahanIds.pop();
      if (localStorage[kelurahanId]) {
        skipped++;
        continue;
      }
      batch.push(kelurahanId);
      if (batch.length > 5000 || kelurahanIds.length === 0) {
        console.log(await this.zeroBatch(batch));
        console.log('skipped', skipped);
        break;
      }
    }
  }

  async zeroBatch(batch: number[]) {
    const tpsNosByKel: any = {};
    const aggregatesByBatch = await Promise.all(
      batch.map(async kelurahanId => {
        // const childrenBits = (await this.afd
        //   .list(DbPath.hieChildren(kelurahanId))
        //   .valueChanges()
        //   .pipe(take(1))
        //   .toPromise()) as number[];
        // tpsNosByKel[kelurahanId] = getTpsNumbers(childrenBits);
        // const aggregates = Promise.all<Aggregate>(
        //   tpsNosByKel[kelurahanId].map(
        //     tpsNo =>
        //       this.afd
        //         .object(DbPath.hieAgg(kelurahanId, tpsNo))
        //         .valueChanges()
        //         .pipe(take(1))
        //         .toPromise() as Promise<Aggregate>
        //   )
        // );
        // return aggregates;
      })
    );

    let curls = '';
    let cnt = 0;
    for (let i = 0; i < batch.length; i++) {
      const kelurahanId = batch[i];
      const tpsNos = tpsNosByKel[kelurahanId];
      const aggregates = aggregatesByBatch[i];

      for (let k = 0; k < tpsNos.length; k++) {
        const tpsNo = tpsNos[k];
        const aggregate = aggregates[k];
        let nonZero = false;
        for (let j = 0; j < 5; j++) {
          if (aggregate.s[j]) {
            aggregate.s[j] = 0;
            nonZero = true;
          }
        }
        if (!nonZero) {
          localStorage[kelurahanId] = true;
          continue;
        }
        localStorage[kelurahanId] = true;
        // console.log(kelurahanId, tpsNo, aggregate.s);

        let imageId = `testing${kelurahanId}t${tpsNo}r`;
        while (imageId.length < 20) {
          imageId += Math.floor(Math.random() * 10);
        }
        curls += `bash upsert.sh '{"kelurahanId":${kelurahanId},"tpsNo":${tpsNo},\
        "aggregate":{"s":[0,0,0,0,0],"x":[0]},"metadata":{},"imageId":"${imageId}"}' &\n`;

        if (++cnt % 500 === 0) {
          curls += 'sleep 1\n';
        }
        // this.api
        //   .post(user, `${ApiService.HOST}/api/upload`, body)
        //   .then((res: any) => {
        //     if (!res.ok) {
        //       console.error('res', kelurahanId, tpsNo, res);
        //     }
        //   });
      }
    }
    return curls;
  }
}
