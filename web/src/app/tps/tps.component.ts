import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Aggregate, HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';
import { UploadService } from '../upload.service';
import { UserService } from '../user.service';

interface Tps {
  tpsNo: number;
  laki: number;
  perempuan: number;
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
  @ViewChild('header') myHeaderEl: ElementRef;

  ROW_HEIGHT = 50;
  state$: Observable<State>;
  height: number;
  width: number;

  constructor(
    public hie: HierarchyService,
    public uploadService: UploadService,
    public userService: UserService,
    private route: ActivatedRoute
  ) {}

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.height = window.innerHeight;
    this.width = window.innerWidth;
    console.log(this.width, this.height);
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
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      map((state: State) => {
        state.tpsList = state.children.map(arr => ({
          tpsNo: arr[0],
          laki: arr[1],
          perempuan: arr[2],
          aggregate: state.aggregate[arr[0]]
        }));
        return state;
      })
    );

    this.onWindowResize();
    console.log('TpsComponent inited');
  }
}
