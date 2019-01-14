import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { take, map } from 'rxjs/operators';
import { HierarchyNode } from 'shared';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  cache: { [id: string]: HierarchyNode } = {};

  constructor(private afd: AngularFireDatabase) {
    console.log('Loaded HierarchyService');
  }

  // TODO: disable realtime update to save banwidth?
  async get(id: number) {
    const n = this.cache[id];
    return n
      ? n
      : (this.cache[id] = await this.get$(id)
          .pipe(take(1))
          .toPromise());
  }

  get$(id: number) {
    console.log('Fetch node', id);
    return this.afd
      .object(`h/${id}`)
      .valueChanges()
      .pipe(
        map(
          (v: any) =>
            <HierarchyNode>{
              id,
              name: v.n,
              parentIds: v.p,
              parentNames: v.q,
              children: v.c,
              depth: v.d,
              aggregate: v.a
            }
        )
      );
  }
}
