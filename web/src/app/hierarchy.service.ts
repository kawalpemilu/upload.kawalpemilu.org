import { Injectable } from '@angular/core';
import { HierarchyNode, lsGetItem, lsSetItem } from 'shared';
import { ApiService } from './api.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, take, distinctUntilChanged, map, tap } from 'rxjs/operators';
import { UserService } from './user.service';
import { User } from 'firebase';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  hierarchy$: { [id: string]: BehaviorSubject<HierarchyNode> } = {};
  lastTs = Date.now();

  constructor(private api: ApiService, private userService: UserService) {
    console.log('Loaded HierarchyService');
  }

  async update(user: User, id: number) {
    if (this.hierarchy$[id]) {
      return this.api
        .get(user, `c/${id}?${Date.now()}`)
        .then((c: HierarchyNode) => {
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
          this.userService.user$
            .pipe(take(1))
            .toPromise()
            .then(user => this.update(user, id).catch(console.error));
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
