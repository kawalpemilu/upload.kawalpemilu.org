import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import {
  HierarchyNode,
  USER_ROLE,
  TpsAggregate,
  DPR_NAMES,
  PPWP_NAMES,
  Aggregate,
  TpsData,
  FsPath,
  Relawan
} from 'shared';
import { UserService } from '../user.service';
import { CarouselItem } from '../carousel/carousel.component';
import { Title } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/firestore';
import { ApiService } from '../api.service';

interface Tps {
  tpsNo: number;
  laki: number;
  perempuan: number;
  agg: TpsAggregate;
  items: CarouselItem[];
}

interface State extends HierarchyNode {
  tpsList: Tps[];
  relawan: Relawan;
}

interface Slice {
  tpsLo: number;
  tpsHi: number;
  lo: number;
  hi: number;
  pending: number;
  error: number;
  janggal: number;
  laporKpu: number;
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
  isLoading = false;

  constructor(
    public hie: HierarchyService,
    private api: ApiService,
    private userService: UserService,
    private route: ActivatedRoute,
    private titleService: Title,
    private fsdb: AngularFirestore
  ) {}

  ngOnInit() {
    let previousId = -1;
    let reqTpsNo = 0;
    this.state$ = this.route.paramMap.pipe(
      map(params => {
        reqTpsNo = parseInt(params.get('tpsNo'), 10) || 0;
        return parseInt(params.get('id'), 10);
      }),
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
        if (state.id < 0) {
          this.populateSlices(state.tpsList, 4000);
          this.showingSlice = this.slices[0];
        } else {
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
          if (!this.showingSlice) {
            for (const slice of this.slices) {
              if (slice.tpsLo <= reqTpsNo && reqTpsNo < slice.tpsHi) {
                this.showingSlice = slice;
                break;
              }
            }
          }
        }
        return state;
      }),
      switchMap((state: State) =>
        this.userService.relawan$.pipe(
          map(relawan => {
            state.relawan = relawan;
            return state;
          })
        )
      ),
      tap(() => {
        if (reqTpsNo > 0) {
          setTimeout(() => {
            const el = document.getElementById('t' + reqTpsNo);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 1000);
        }
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
      let janggal = 0;
      let laporKpu = 0;
      while (hi < arr.length && arr[hi].tpsNo < tpsHi) {
        if (arr[hi].agg && arr[hi].agg.sum) {
          pending += arr[hi].agg.sum.pending || 0;
          error += arr[hi].agg.sum.error || 0;
          janggal += arr[hi].agg.sum.janggal || 0;
          laporKpu += arr[hi].agg.sum.laporKpu || 0;
        }
        hi++;
      }
      if (hi > lo) {
        this.slices.push({
          tpsLo,
          tpsHi,
          lo,
          hi,
          pending,
          error,
          janggal,
          laporKpu
        });
      }
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

  normalizeHalaman(hal) {
    const s = hal.split('.');
    let num = +s[0];
    if (s.length === 2) {
      num += +s[1] / 100;
    }
    return num;
  }

  toCarousel(kelId, tpsNo, photos: { [url: string]: Aggregate }) {
    const arr: CarouselItem[] = [];
    const urls = Object.keys(photos).sort((a, b) => {
      const pa = photos[a];
      const pb = photos[b];
      const pah = this.normalizeHalaman(pa.c1.halaman);
      const pbh = this.normalizeHalaman(pb.c1.halaman);
      const va = ((pa.c1.type * 3 + pa.c1.plano) * 4 + +pah) * 1e14 + pa.ts;
      const vb = ((pb.c1.type * 3 + pb.c1.plano) * 4 + +pbh) * 1e14 + pb.ts;
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

  toggleDetails(state: State, tpsNo: number) {
    if (!(state.relawan.profile.role >= USER_ROLE.MODERATOR)) {
      return;
    }
    this.hie.update(state.id);
    if (this.details[tpsNo]) {
      this.details[tpsNo] = null;
      return;
    }
    this.refreshDetail(state.id, tpsNo);
  }

  refreshDetail(kelId, tpsNo) {
    this.details[tpsNo] = this.fsdb
      .doc<TpsData>(FsPath.tps(kelId, tpsNo))
      .valueChanges()
      .pipe(
        map(tps => {
          const arr: CarouselItem[] = [];
          const imageIds = Object.keys((tps && tps.images) || []).sort(
            (a, b) => {
              const ia = tps.images[a];
              const ib = tps.images[b];
              const ca = ia.c1;
              const cb = ib.c1;
              const ta = ca && (ca.type * 10 + ca.plano) * 10 + +ca.halaman;
              const tb = cb && (cb.type * 10 + cb.plano) * 10 + +cb.halaman;
              const va = (ta || 0) * 1e14 + ia.uploader.ts;
              const vb = (tb || 0) * 1e14 + ib.uploader.ts;
              return va - vb;
            }
          );
          for (const imageId of imageIds) {
            const i = tps.images[imageId];
            arr.push({
              kelId,
              tpsNo,
              c1: i.c1,
              meta: i.meta,
              url: i.url,
              imageId,
              ts: i.uploader.ts,
              sum: i.sum,
              error: i.sum && !!i.sum.error,
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

  getNormalizedTps(tpsNo) {
    if (tpsNo >= 2000) {
      return { name: 'KSK', no: tpsNo - 2000 };
    }
    if (tpsNo >= 1000) {
      return { name: 'POS', no: tpsNo - 1000 };
    }
    return { name: 'TPS', no: tpsNo };
  }

  async laporKpu(kelId, tpsNo) {
    this.isLoading = true;
    try {
      const data = { kelId, kelName: '', tpsNo, ts: 0 };
      const res: any = await this.api.post(
        this.userService.user,
        `laporKpu`,
        data
      );
      if (res.error) {
        alert(res.error);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.hie.update(kelId);
    } catch (e) {
      alert(e.message);
      console.error(e);
    }
    this.isLoading = false;
  }
}
