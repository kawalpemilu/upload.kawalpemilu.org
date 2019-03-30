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
  Aggregate,
  TpsData,
  FsPath
} from 'shared';
import { UserService } from '../user.service';
import { CarouselItem } from '../carousel/carousel.component';
import { Title } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/firestore';

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
  digitize: { [tpsNo: string]: string };
  details: { [tpsNo: string]: Observable<CarouselItem[]> };
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
    private route: ActivatedRoute,
    private titleService: Title,
    private fsdb: AngularFirestore
  ) {}

  ngOnInit() {
    let previousId = -1;
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      map((state: State) => {
        this.titleService.setTitle(`Kelurahan ${state.name} :: KPJS 2019`);
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
        if (previousId !== state.id) {
          previousId = state.id;
          this.showingSlice = null;
          this.digitize = {};
          this.details = {};
        }
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
      const va = (pa.c1.type * 10 + pa.c1.plano) * 1e14 + pa.ts;
      const vb = (pb.c1.type * 10 + pb.c1.plano) * 1e14 + pb.ts;
      return va - vb;
    });
    for (const url of urls) {
      const p = photos[url];
      const error = !!p.sum.error;
      arr.push({
        kelId,
        tpsNo,
        url,
        ts: p.ts,
        sum: p.sum,
        error,
        c1: p.c1,
        imageId: null,
        meta: null,
        reports: null,
        reviewer: null,
        uploader: null
      });
    }
    return arr;
  }

  toggleDetails(state: HierarchyNode, tpsNo: number) {
    if (this.details[tpsNo]) {
      this.details[tpsNo] = null;
      return;
    }
    this.details[tpsNo] = this.fsdb
      .doc<TpsData>(FsPath.tps(state.id, tpsNo))
      .valueChanges()
      .pipe(
        map(tps => {
          const arr: CarouselItem[] = [];
          const imageIds = Object.keys(tps.images).sort((a, b) => {
            const ia = tps.images[a];
            const ib = tps.images[b];
            const ta = (ia.c1 && ia.c1.type * 10 + ia.c1.plano) || 0;
            const tb = (ib.c1 && ib.c1.type * 10 + ib.c1.plano) || 0;
            const va = ta * 1e14 + ia.uploader.ts;
            const vb = tb * 1e14 + ib.uploader.ts;
            return va - vb;
          });
          for (const imageId of imageIds) {
            const i = tps.images[imageId];
            arr.push({
              kelId: state.id,
              tpsNo,
              c1: i.c1,
              meta: i.meta,
              url: i.url,
              imageId,
              ts: i.uploader.ts,
              sum: i.sum,
              error: false,
              reports:
                Object.keys(i.reports || {}).length > 0 ? i.reports : null,
              uploader: i.uploader,
              reviewer: i.reviewer
            });
          }
          return arr;
        })
      );
  }
}
