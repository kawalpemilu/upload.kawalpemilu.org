import { Injectable } from '@angular/core';
import { HierarchyNode } from 'shared';
import { ApiService } from './api.service';
import { ReplaySubject } from 'rxjs';
import { filter, take, distinctUntilChanged, map } from 'rxjs/operators';
import { UserService } from './user.service';
import { User } from 'firebase';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  hierarchy$: { [id: string]: ReplaySubject<HierarchyNode> } = {};
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

  get$(id: number) {
    const ts = Date.now();
    if (!this.hierarchy$[id]) {
      this.hierarchy$[id] = new ReplaySubject();
      this.lastTs = 0;
    }
    if (ts - this.lastTs > 1000) {
      console.log('Fetch node', id);
      this.lastTs = ts;
      this.userService.user$
        .pipe(take(1))
        .toPromise()
        .then(user =>
          this.api
            .get(user, `c/${id}?${this.lastTs}`)
            .then((c: HierarchyNode) => this.hierarchy$[id].next(c))
            .catch(console.error)
        );
    }
    return this.hierarchy$[id].pipe(
      map(x => JSON.stringify(x)),
      distinctUntilChanged(),
      map(x => JSON.parse(x)),
      filter(s => !!s.children)
    );
  }
}
