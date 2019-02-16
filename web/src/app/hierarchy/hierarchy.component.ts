import { Component, OnInit, HostListener } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  filter,
  switchMap,
  shareReplay
} from 'rxjs/operators';
import { HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-hierarchy',
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.css']
})
export class HierarchyComponent implements OnInit {
  TOOLBAR_HEIGHT = AppComponent.TOOLBAR_HEIGHT;
  ROW_HEIGHT = 50;
  state$: Observable<HierarchyNode>;
  height: number;
  width: number;

  constructor(private hie: HierarchyService, private route: ActivatedRoute) {}

  @HostListener('window:resize', ['$event'])
  getScreenSize() {
    this.height = window.innerHeight;
    this.width = window.innerWidth;
    console.log(this.width, this.height);
  }

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      filter(id => !isNaN(id)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      shareReplay(1)
    );

    this.getScreenSize();
    console.log('Hierarchy Component Inited');
  }

  sum(state: HierarchyNode, index: number) {
    let res = 0;
    for (const c of state.children) {
      const a = state.aggregate[c[0]];
      res += (a && a.s && a.s[index]) || 0;
    }
    return res;
  }

  viewportHeight(rows: number) {
    const height = rows * (this.ROW_HEIGHT + 2) + 2;
    const slack =
      this.height - this.TOOLBAR_HEIGHT * 2 - this.ROW_HEIGHT * 2 - 15;
    return Math.min(height, slack);
  }

  trackByIdx(_, item) {
    return item[0]; // wilayah id.
  }

  ago(ts: number) {
    const m = (Date.now() - ts) / 1000 / 60;
    if (m < 1) {
      return ' (*)';
    }
    if (m < 5) {
      return ' (x)';
    }
    if (m < 20) {
      return ' (-)';
    }
    if (m < 60) {
      return ' (.)';
    }
    return '';
  }
}
