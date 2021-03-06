import {
  Component,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  filter,
  switchMap,
  shareReplay,
  tap
} from 'rxjs/operators';
import { HierarchyNode, SUM_KEY } from 'shared';
import { AppComponent } from '../app.component';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-hierarchy',
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.css']
})
export class HierarchyComponent implements OnInit, OnDestroy {
  @ViewChild('header') myHeaderEl: ElementRef;
  @ViewChild('footer') myFooterEl: ElementRef;

  WILAYAH = ['Nasional', 'Propinsi', 'Kabupaten', 'Kecamatan', 'Kelurahan'];

  // https://simple.wikipedia.org/wiki/Stellar_classification
  SETELLAR_COLOR = [
    '#9db4ff', // 5m blue
    '#aabfff', // 15m deep blue white
    '#cad8ff', // 45m blue white
    '#ffddb4', // 2h pale yellow orange
    '#ffbd6f', // 6h light orange red
    '#f84235', // 20h scarlet
    '#ba3059', // 2d magenta
    '#605170' // dark purple
  ];

  ROW_HEIGHT = 55;
  paddingTemp;
  state$: Observable<HierarchyNode>;
  height: number;
  width: number;
  numRows = 0;

  constructor(
    private hie: HierarchyService,
    private route: ActivatedRoute,
    private titleService: Title
  ) {}

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }

  get PATH_HEIGHT() {
    return AppComponent.PATH_HEIGHT;
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.height = window.innerHeight;
    this.width = window.innerWidth;

    const effectiveHeight =
      this.TOOLBAR_HEIGHT +
      this.PATH_HEIGHT +
      (2 + this.numRows) * this.ROW_HEIGHT;

    if (effectiveHeight < this.height) {
      const footerTop = `${effectiveHeight - this.ROW_HEIGHT}px`;
      this.myFooterEl.nativeElement.style.top = footerTop;
      this.myFooterEl.nativeElement.style.bottom = '';
    } else {
      this.myFooterEl.nativeElement.style.top = '';
      this.myFooterEl.nativeElement.style.bottom = '0px';
    }
  }

  @HostListener('window:scroll', ['$event'])
  scrollHandler() {
    if (window.pageYOffset > this.TOOLBAR_HEIGHT + this.PATH_HEIGHT) {
      this.myHeaderEl.nativeElement.classList.add('sticky');
    } else {
      this.myHeaderEl.nativeElement.classList.remove('sticky');
    }
  }

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      filter(id => !isNaN(id)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      map(state => {
        const wilayah = this.WILAYAH[state.depth];
        this.titleService.setTitle(`${wilayah} ${state.name} :: KPJS 2019`);
        this.numRows = state.children.length;
        this.onWindowResize();
        // @ts-ignore
        const sum = (state.sum = {});
        // @ts-ignore
        const kpuSum = (state.kpuSum = {});
        for (const c of state.children) {
          const d = state.data[c[0]];
          for (const key of Object.keys(SUM_KEY)) {
            sum[key] = (sum[key] || 0) + ((d && d.sum && d.sum[key]) || 0);
          }
          const k = state.kpu && state.kpu[c[0]];
          for (const key of Object.keys(SUM_KEY)) {
            kpuSum[key] = (kpuSum[key] || 0) + ((k && k[key]) || 0);
          }
        }
        return state;
      }),
      shareReplay(1)
    );

    this.onWindowResize();
    this.paddingTemp = AppComponent.PADDING;
    AppComponent.PADDING = 0;
    console.log('Hierarchy Component Inited');
  }

  ngOnDestroy() {
    AppComponent.PADDING = this.paddingTemp;
  }

  sumTps(state: HierarchyNode) {
    return state.children.map(c => c[2]).reduce((old, cur) => old + cur, 0);
  }

  trackByIdx(_, item) {
    return item[0]; // wilayah id.
  }

  coverage(state: HierarchyNode, cid: number) {
    const s = state.data[cid];
    return (s && s.sum.cakupan) || 0;
  }

  getColor(state, cid) {
    const s = state.data[cid];
    const c = this.SETELLAR_COLOR;
    if (s) {
      const ago = (Date.now() - s.ts) / 1000 / 60;
      for (let i = 0, t = 5; i < c.length; i++, t *= 3) {
        if (ago <= t) {
          return c[i];
        }
      }
    }
    return c[c.length - 1];
  }
}
