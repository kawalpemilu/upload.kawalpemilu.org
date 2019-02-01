import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import {
  DbPath,
  getTpsNumbers,
  Aggregate,
  ImageMetadata,
  TpsImage
} from 'shared';
import { AngularFireDatabase } from '@angular/fire/database';
import { User } from 'firebase';
import { take } from 'rxjs/operators';
import { Upsert } from 'shared';

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

    DbPath.rootIds.map(rootId => {
      this.afd
        .object(DbPath.upsertsQueueCount(rootId))
        .valueChanges()
        .subscribe(val => {
          console.log(rootId, val);
        });
    });
  }

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
    const kelurahanIds = await this.api
      .getStatic<number[]>('/assets/kelurahan_ids.js');
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
