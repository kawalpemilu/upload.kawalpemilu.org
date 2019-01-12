import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { take, map } from 'rxjs/operators';
import { Aggregate } from 'shared';

export interface HierarchyNode {
  id: number;
  name: string;
  parents: string[][];
  children: any;
  depth: number;
  aggregate: Aggregate;
}

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
    console.log('fetch node', id);
    return this.afd
      .object(`h/${id}`)
      .valueChanges()
      .pipe(
        map(
          (v: any) =>
            <HierarchyNode>{
              id,
              name: v.n,
              parents: v.p,
              children: v.c,
              depth: v.d,
              aggregate: v.a
            }
        )
      );
  }
}
