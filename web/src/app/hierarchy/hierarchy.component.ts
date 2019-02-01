import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  filter,
  switchMap
} from 'rxjs/operators';
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

  sum$(node: HierarchyNode) {
    return combineLatest(node.children.map(c => node.aggregate$[c[0]])).pipe(
      map((arr: any) => {
        const res = [];
        for (const a of arr) {
          for (let i = 0; i < a.s.length; i++) {
            res[i] = (res[i] || 0) + a.s[i];
          }
        }
        return res;
      })
    );
  }
}
