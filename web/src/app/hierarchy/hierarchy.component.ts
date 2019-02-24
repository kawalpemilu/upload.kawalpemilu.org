import {
  Component,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef
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
import { HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-hierarchy',
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.css']
})
export class HierarchyComponent implements OnInit {
  @ViewChild('header') myHeaderEl: ElementRef;
  @ViewChild('footer') myFooterEl: ElementRef;

  ROW_HEIGHT = 40;
  state$: Observable<HierarchyNode>;
  height: number;
  width: number;
  numRows = 0;

  constructor(private hie: HierarchyService, private route: ActivatedRoute) {}

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }

  getWilayah(state: HierarchyNode) {
    if (!state) {
      return '';
    }
    const level = ['Propinsi', 'Kabupaten', 'Kecamatan', 'Kelurahan'];
    return `Nama ${level[state.depth]}`;
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.height = window.innerHeight;
    this.width = window.innerWidth;

    const effectiveHeight =
      this.TOOLBAR_HEIGHT * 2 + (2 + this.numRows) * this.ROW_HEIGHT;

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
    if (window.pageYOffset > this.TOOLBAR_HEIGHT * 2) {
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
      tap(state => {
        this.numRows = state.children.length;
        this.onWindowResize();
      }),
      shareReplay(1)
    );

    this.onWindowResize();
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

  sumTps(state: HierarchyNode) {
    return state.children.map(c => c[2]).reduce((old, cur) => old + cur, 0);
  }

  trackByIdx(_, item) {
    return item[0]; // wilayah id.
  }

  coverage(state: HierarchyNode, cid: number) {
    const s = state.aggregate[cid];
    return (s && s.s[4]) || 0;
  }

  ago(state: HierarchyNode, cid: number) {
    const s = state.aggregate[cid];
    if (s) {
      const m = (Date.now() - s.x[0]) / 1000 / 60;
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
    }
    return '';
  }
}
