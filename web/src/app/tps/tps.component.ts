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
  items: CarouselItem[];
}

interface State extends HierarchyNode {
  tpsList: Tps[];
}

interface Slice {
  tpsLo: number;
  tpsHi: number;
  lo: number;
  hi: number;
  pending: number;
  error: number;
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
  showingSlice: Slice;
  slices: Slice[];
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
            agg: state.data[arr[0]] as TpsAggregate,
            items: null
          };
          if (t.agg) {
            t.items = this.toCarousel(state.id, t.tpsNo, t.agg.photos);
          }
          state.tpsList.push(t);
        });
        this.showingSlice = null;
        if (state.tpsList.length > 200) {
          this.populateSlices(state.tpsList, 40);
        } else if (state.tpsList.length > 100) {
          this.populateSlices(state.tpsList, 20);
        } else if (state.tpsList.length > 20) {
          this.populateSlices(state.tpsList, 10);
        } else {
          this.populateSlices(state.tpsList, 400);
          this.showingSlice = this.slices[0];
        }
        return state;
      })
    );

    console.log('TpsComponent inited');
  }

  populateSlices(arr: Tps[], jump: number) {
    this.slices = [];
    let lo = 0;
    let hi = 0;
    for (let tpsLo = 1; hi < arr.length; ) {
      const tpsHi = tpsLo + jump;
      let pending = 0;
      let error = 0;
      while (hi < arr.length && arr[hi].tpsNo < tpsHi) {
        if (arr[hi].agg && arr[hi].agg.sum) {
          pending += arr[hi].agg.sum.pending || 0;
          error += arr[hi].agg.sum.error || 0;
        }
        hi++;
      }
      this.slices.push({ tpsLo, tpsHi, lo, hi, pending, error });
      lo = hi;
      tpsLo = tpsHi;
    }
  }

  getSlice(arr: Tps[], s: Slice) {
    return arr.slice(s.lo, s.hi);
  }

  hasPpwp(sum: any) {
    return Object.keys(PPWP_NAMES).find(k => sum[k] !== undefined);
  }

  hasDpr(sum: any) {
    return Object.keys(DPR_NAMES).find(k => sum[k] !== undefined);
  }

  toCarousel(kelId, tpsNo, photos: { [url: string]: Aggregate }) {
    const arr: CarouselItem[] = [];
    const urls = Object.keys(photos).sort((a, b) => {
      const pa = photos[a];
      const pb = photos[b];
      let diff = pa.c1.type - pb.c1.type;
      if (diff) {
        return diff;
      }
      diff = pa.c1.plano - pb.c1.plano;
      if (diff) {
        return diff;
      }
      return pa.ts - pb.ts;
    });
    for (const url of urls) {
      const p = photos[url];
      const error = !!p.sum.error;
      arr.push({ kelId, tpsNo, url, ts: p.ts, sum: p.sum, error });
    }
    return arr;
  }
}
