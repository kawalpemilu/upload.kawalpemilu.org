import { Component, OnInit, HostListener } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Aggregate, HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';

interface Tps {
  tpsNo: number;
  address: string;
  aggregate: Aggregate;
}

interface State extends HierarchyNode {
  tpsList: Tps[];
}

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.css']
})
export class TpsComponent implements OnInit {
  ROW_HEIGHT = 180;
  state$: Observable<State>;
  height: number;
  width: number;

  constructor(public hie: HierarchyService, private route: ActivatedRoute) {}

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }

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
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      map((state: State) => {
        state.tpsList = state.children.map(tpsNo => ({
          tpsNo,
          address: 'JL.KARANG ANYAR RAYA (EX.PABRIK PAYUNG 2)',
          aggregate: state.aggregate[tpsNo]
        }));
        return state;
      })
    );

    this.getScreenSize();
    console.log('TpsComponent inited');
  }

  // TODO: use CSS rather than computing every time.
  viewportHeight(rows: number) {
    return this.height - this.TOOLBAR_HEIGHT * 3 - 15;
  }
}
