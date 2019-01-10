import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { take, map } from 'rxjs/operators';

export interface HierarchyNode {
  id: number;
  name: string;
  parent: number;
  children: any;
  depth: number;
}

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  cache: { [id: string]: HierarchyNode } = {};

  constructor(private afd: AngularFireDatabase) {
    console.log('Loaded HierarchyService');
  }

  async get(id: number) {
    const n = this.cache[id];
    return n ? n : (this.cache[id] = await this.getFromDatabase(id));
  }

  private getFromDatabase(id: number): Promise<HierarchyNode> {
    console.log('fetch node', id);
    return this.afd
      .object(`h/${id}`)
      .valueChanges()
      .pipe(
        take(1),
        map(
          (v: any) =>
            <HierarchyNode>{
              id,
              name: v.n,
              parent: v.p,
              children: v.c,
              depth: v.d
            }
        )
      )
      .toPromise();
  }
}
