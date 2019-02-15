import { Injectable } from '@angular/core';
import { HierarchyNode, Aggregate } from 'shared';
import { ApiService } from './api.service';
import { from, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  rootIds: Promise<any>;
  cacheHierarchy: { [id: string]: HierarchyNode } = {};

  constructor(private api: ApiService) {
    this.rootIds = this.api.getStatic(`/assets/r.js?1`).then(r => {
      const map = {};
      for (const rootId of Object.keys(r)) {
        const ids = r[rootId];
        let prev = 0;
        for (let i = 0; i < ids.length; i++) {
          prev += ids[i];
          map[prev] = rootId;
        }
      }
      return map;
    });
    console.log('Loaded HierarchyService');
  }

  get$(id: number) {
    console.log('Fetch node', id);
    return from(this.getHierarchy(id));
  }

  private async getHierarchy(id: number) {
    const c = await this.cacheHierarchy[id];
    if (c) {
      return c;
    }

    if (!id) {
      const arr: any = await this.api.getStatic(`/assets/h/h0.js`);
      const children = [];
      for (let i = 0; i < arr.length; i += 2) {
        children.push([arr[i], arr[i + 1]]);
      }
      return (this.cacheHierarchy[id] = <HierarchyNode>{
        id: 0,
        name: 'IDN',
        parentIds: [],
        parentNames: [],
        children,
        depth: 0,
        aggregate$: this.getAggregateChildren$(id, children)
      });
    }

    const rootId = (await this.rootIds)[id];
    this.rec(await this.api.getStatic(`/assets/h/h${rootId}.js`), 1, [], []);
    return this.cacheHierarchy[id];
  }

  private rec(h, depth, parentIds, parentNames) {
    const id = h[0];
    const name = h[1];
    const children = [];
    parentIds.push(id);
    parentNames.push(name);
    for (let i = 2; i < h.length; i++) {
      const [childId, childName] = h[i];
      if (depth === 4) {
        children.push(h[i]);
      } else {
        children.push([childId, childName]);
        this.rec(h[i], depth + 1, parentIds, parentNames);
      }
    }
    parentIds.pop();
    parentNames.pop();
    this.cacheHierarchy[id] = <HierarchyNode>{
      id,
      name,
      parentIds: parentIds.slice(),
      parentNames: parentNames.slice(),
      children,
      depth,
      aggregate$: this.getAggregateChildren$(id, children)
    };
  }

  private getAggregateChildren$(id, children: any) {
    const agg = {};
    children.forEach(c => {
      agg[c[0]] = this.getAggregate$(id, c[0]);
    });
    return agg;
  }

  getAggregate$(parent, child) {
    // TODO: use API
    const a: Aggregate = { s: [0, 0, 0, 0, 0], x: [0] };
    return of(a);
  }
}
