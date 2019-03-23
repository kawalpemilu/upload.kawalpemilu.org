import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import {
  HierarchyNode,
  USER_ROLE,
  TpsAggregate,
  DPR_NAMES,
  PPWP_NAMES,
  Aggregate
} from 'shared';
import { UserService } from '../user.service';
import { CarouselItem } from '../carousel/carousel.component';

interface Tps {
  tpsNo: number;
  laki: number;
  perempuan: number;
  agg: TpsAggregate;
}

interface State extends HierarchyNode {
  tpsList: Tps[];
  numPending: number;
}

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TpsComponent implements OnInit {
  state$: Observable<State>;
  digitize: { [tpsNo: string]: boolean } = {};
  USER_ROLE = USER_ROLE;
  PPWP_NAMES = PPWP_NAMES;
  DPR_NAMES = DPR_NAMES;
  ALL_NAMES = Object.keys(PPWP_NAMES).concat(Object.keys(DPR_NAMES));
  Object = Object;

  constructor(
    public hie: HierarchyService,
    public userService: UserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      map((state: State) => {
        state.tpsList = [];
        state.children.forEach(arr => {
          const t: Tps = {
            tpsNo: arr[0],
            laki: arr[1],
            perempuan: arr[2],
            agg: state.data[arr[0]] as TpsAggregate
          };
          state.tpsList.push(t);
        });
        return state;
      })
    );

    console.log('TpsComponent inited');
  }

  hasPpwp(sum: any) {
    return Object.keys(PPWP_NAMES).find(k => sum[k] !== undefined);
  }

  hasDpr(sum: any) {
    return Object.keys(DPR_NAMES).find(k => sum[k] !== undefined);
  }

  toCarousel(photos: { [url: string]: Aggregate }) {
    const arr: CarouselItem[] = [];
    for (const url of Object.keys(photos)) {
      const p = photos[url];
      arr.push({
        url,
        ts: p.ts,
        sum: p.sum
      });
    }
    return arr;
  }
}
