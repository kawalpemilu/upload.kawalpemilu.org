import { Injectable } from '@angular/core';
import { HierarchyNode, Aggregate } from 'shared';
import { ApiService } from './api.service';
import { from, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HierarchyService {
  cacheHierarchy: { [id: string]: HierarchyNode } = {};

  constructor(private api: ApiService) {
    console.log('Loaded HierarchyService');
  }

  get$(id: number) {
    console.log('Fetch node', id);
    return from(this.getHierarchy(id));
  }

  private async getHierarchy(id: number) {
    let c = await this.cacheHierarchy[id];
    if (c) {
      return c;
    }

    c = (await this.api.get(null, ApiService.HOST + `/api/c/${id}`)) as HierarchyNode;

    return (this.cacheHierarchy[id] = c);
  }
}
