import { Injectable } from '@angular/core';
import {
  HierarchyNode,
  lsGetItem,
  lsSetItem,
  SumMap,
  LOCK_DOWN,
  FsPath,
  toChildren
} from 'shared';
import { ApiService } from './api.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, take, distinctUntilChanged, map } from 'rxjs/operators';
import { UserService } from './user.service';
import { AngularFirestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  hierarchy$: { [id: string]: BehaviorSubject<HierarchyNode> } = {};
  lastTs = Date.now();

  constructor(
    private api: ApiService,
    private userService: UserService,
    private fsdb: AngularFirestore
  ) {
    console.log('Loaded HierarchyService');
  }

  async update(id: number) {
    if (this.hierarchy$[id]) {
      const h$ = LOCK_DOWN
        ? this.fsdb
            .doc<HierarchyNode>(FsPath.hieCache(id))
            .get()
            .pipe(take(1))
            .toPromise()
            .then(snap => {
              const c = snap.data() as HierarchyNode;
              c.children = toChildren(c);
              delete c.child;
              return c;
            })
        : this.api.get(this.userService.user, `c/${id}?${Date.now()}`);
      return h$
        .then((c: HierarchyNode) => {
          Object.keys(c.data || {})
            .filter(cid => !c.data[cid].sum)
            .forEach(cid => (c.data[cid].sum = {} as SumMap));
          this.hierarchy$[id].next(c);
          lsSetItem(`h/${id}`, c);
        })
        .catch(console.error);
    }
  }

  get$(id: number, refresh = true): Observable<HierarchyNode> {
    if (!this.hierarchy$[id]) {
      const h: HierarchyNode = lsGetItem(`h/${id}`) || ({} as HierarchyNode);
      this.hierarchy$[id] = new BehaviorSubject(h);
      this.lastTs = 0;
    }

    this.hierarchy$[id]
      .pipe(take(1))
      .toPromise()
      .then(h => {
        let cacheTimeoutMs = 1000;
        if (typeof h.depth === 'number') {
          const depth = Math.max(1, Math.min(4, h.depth));
          cacheTimeoutMs = Math.pow(4, 4 - depth) * 1000;
        }

        const ts = Date.now();
        if (
          ts - this.lastTs > cacheTimeoutMs &&
          (refresh || this.lastTs === 0)
        ) {
          console.log('Fetch node', id, ts - this.lastTs, cacheTimeoutMs);
          this.lastTs = ts;
          return this.update(id).catch(console.error);
        }
      });

    return this.hierarchy$[id].pipe(
      map(x => JSON.stringify(x)),
      distinctUntilChanged(),
      map(x => JSON.parse(x)),
      filter(node => !!node.children)
    );
  }
}
