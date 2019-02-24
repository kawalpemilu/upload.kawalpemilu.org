import { Injectable } from '@angular/core';
import { HierarchyNode } from 'shared';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  hierarchy$: { [id: string]: BehaviorSubject<HierarchyNode> } = {};
  lastTs = Date.now();

  constructor(private api: ApiService, private userService: UserService) {
    console.log('Loaded HierarchyService');
  }

  get$(id: number) {
    console.log('Fetch node', id);
    if (!this.hierarchy$[id]) {
      this.hierarchy$[id] = new BehaviorSubject({} as HierarchyNode);
    }
    const ts = Date.now();
    if (ts - this.lastTs > 5000) {
      this.lastTs = ts;
    }
    this.userService.user$
      .pipe(take(1))
      .toPromise()
      .then(user =>
        this.api
          .get(user, `c/${id}?${this.lastTs}`)
          .then((c: HierarchyNode) => this.hierarchy$[id].next(c))
          .catch(console.error)
      );
    return this.hierarchy$[id].pipe(filter(s => !!s.children));
  }
}
