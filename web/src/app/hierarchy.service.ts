import { Injectable } from '@angular/core';
import { HierarchyNode } from 'shared';
import { ApiService } from './api.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, take, distinctUntilChanged, map } from 'rxjs/operators';
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
    console.log('Update node', id);
    if (this.hierarchy$[id]) {
      return this.api
        .get(user, `c/${id}?${Date.now()}`)
        .then((c: HierarchyNode) => this.hierarchy$[id].next(c))
        .catch(console.error);
    }
  }

  get$(id: number, refresh = true): Observable<HierarchyNode> {
    const s = window.localStorage;
    const key = `h/${id}`;
    let cacheTimeoutMs = 1000;
    let h: HierarchyNode;
    if (s) {
      try {
        h = JSON.parse(s.getItem(key)) || {} as HierarchyNode;
        if (h && typeof h.depth === 'number') {
          const depth = Math.max(1, Math.min(4, h.depth));
          cacheTimeoutMs = Math.pow(4, 4 - depth) * 1000;
        }
      } catch (e) {
        s.clear();
        h = {} as HierarchyNode;
      }
    }

    if (!this.hierarchy$[id]) {
      this.hierarchy$[id] = new BehaviorSubject(h);
      this.lastTs = 0;
    }

    const ts = Date.now();
    if (ts - this.lastTs > cacheTimeoutMs && (refresh || this.lastTs === 0)) {
      console.log('Fetch node', id, ts - this.lastTs, cacheTimeoutMs);
      this.lastTs = ts;
      this.userService.user$
        .pipe(take(1))
        .toPromise()
        .then(user =>
          this.api
            .get(user, `c/${id}?${this.lastTs}`)
            .then((c: HierarchyNode) => {
              this.hierarchy$[id].next(c);
              if (s) {
                s.setItem(key, JSON.stringify(c));
              }
            })
            .catch(console.error)
        );
    }
    return this.hierarchy$[id].pipe(
      map(x => JSON.stringify(x)),
      distinctUntilChanged(),
      map(x => JSON.parse(x)),
      filter(node => !!node.children)
    );
  }
}
