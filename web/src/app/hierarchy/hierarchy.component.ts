import { Component, OnInit } from '@angular/core';
import { HierarchyService, HierarchyNode } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-hierarchy',
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.css']
})
export class HierarchyComponent implements OnInit {
  state$: Observable<HierarchyNode>;

  constructor(public hie: HierarchyService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      filter(id => !isNaN(id)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get(id))
    );

    console.log('Hierarchy Component Inited');
  }
}
