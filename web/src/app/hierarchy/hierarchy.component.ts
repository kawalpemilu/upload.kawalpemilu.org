import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, shareReplay, distinctUntilChanged, filter } from 'rxjs/operators';

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
  id$: Observable<number>;
  rows$: Observable<Row[]>;

  constructor(public hie: HierarchyService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.id$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.rows$ = this.id$.pipe(
      map(id => {
        const rows: Row[] = [];
        const children = this.hie.children[id];
        if (Array.isArray(children)) {
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

  /** Returns hierarchy link if the {id} has children, otherwise tps link. */
  link(id: number) {
    return this.hie.depth(id) < 4 ? '/h' : '/t';
  }
}
