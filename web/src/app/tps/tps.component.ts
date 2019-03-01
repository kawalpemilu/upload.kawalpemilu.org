import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Aggregate, HierarchyNode, MAX_RELAWAN_TRUSTED_DEPTH } from 'shared';
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
  numPending: number;
}

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.css']
})
export class TpsComponent implements OnInit {
  state$: Observable<State>;

  constructor(
    public hie: HierarchyService,
    public uploadService: UploadService,
    public userService: UserService,
    private route: ActivatedRoute
  ) {}

  get MAX_TRUSTED_DEPTH() {
    return MAX_RELAWAN_TRUSTED_DEPTH;
  }

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      distinctUntilChanged(),
      switchMap(id => this.hie.get$(id)),
      map((state: State) => {
        state.numPending = 0;
        state.tpsList = [];
        state.children.forEach(arr => {
          const t: Tps = {
            tpsNo: arr[0],
            laki: arr[1],
            perempuan: arr[2],
            aggregate: state.aggregate[arr[0]]
          };
          state.numPending += (t.aggregate && t.aggregate.s[4]) || 0;
          state.tpsList.push(t);
        });
        return state;
      })
    );

    console.log('TpsComponent inited');
  }
}
