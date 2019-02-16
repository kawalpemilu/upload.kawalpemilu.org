import { Injectable } from '@angular/core';
import { HierarchyNode } from 'shared';
import { ApiService } from './api.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  cacheHierarchy$: { [id: string]: Subject<HierarchyNode> } = {};
  lastTs = Date.now();

  constructor(private api: ApiService) {
    console.log('Loaded HierarchyService');
  }

  get$(id: number) {
    console.log('Fetch node', id);
    if (!this.cacheHierarchy$[id]) {
      this.cacheHierarchy$[id] = new Subject();
    }
    const ts = Date.now();
    if (ts - this.lastTs > 5000) {
      this.lastTs = ts;
    }
    this.api
      .get(null, ApiService.HOST + `/api/c/${id}?${this.lastTs}`)
      .then((c: HierarchyNode) => this.cacheHierarchy$[id].next(c))
      .catch(console.error);
    return this.cacheHierarchy$[id];
  }
}
