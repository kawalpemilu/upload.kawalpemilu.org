import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, shareReplay, distinctUntilChanged } from 'rxjs/operators';

interface Row {
  id: number;
  name: string;
}

@Component({
  selector: 'app-hierarchy',
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.css']
})
export class HierarchyComponent implements OnInit {
  path$: Observable<number[]>;
  rows$: Observable<Row[]>;

  constructor(public hie: HierarchyService, private route: ActivatedRoute) {}

  ngOnInit() {
    const id$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.path$ = id$.pipe(
      map(id => {
        const path: number[] = [];
        for (let i = parseInt(id); i; i = this.hie.parent[i]) {
          path.push(i);
        }
        path.push(0);
        return path.reverse();
      }),
      shareReplay(1)
    );

    this.rows$ = id$.pipe(
      map(id => {
        const rows: Row[] = [];
        const children = this.hie.children[id];
        if (children) {
          for (const cid of children) {
            rows.push({
              id: cid,
              name: this.hie.name[cid]
            });
          }
        }
        return rows;
      })
    );

    console.log('Hierarchy Component Inited');
  }
}
