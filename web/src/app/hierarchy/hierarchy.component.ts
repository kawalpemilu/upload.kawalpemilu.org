import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { HierarchyNode } from 'shared';

@Component({
  selector: 'app-hierarchy',
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.css']
})
export class HierarchyComponent implements OnInit {
  state$: Observable<HierarchyNode>;

  constructor(private hie: HierarchyService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      filter(id => !isNaN(id)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id))
    );

    console.log('Hierarchy Component Inited');
  }

  sum(node: HierarchyNode) {
    const res = [];
    if (!node.aggregate) {
      return res;
    }
    for (const c of node.children) {
      const a = node.aggregate[c[0]];
      if (a) {
        for (let i = 0; i < a.s.length; i++) {
          res[i] = (res[i] || 0) + a.s[i];
        }
      }
    }
    return res;
  }
}
