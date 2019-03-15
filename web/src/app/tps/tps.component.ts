import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { HierarchyNode, Aggregate, USER_ROLE } from 'shared';
import { UserService } from '../user.service';

interface Tps {
  tpsNo: number;
  laki: number;
  perempuan: number;
  agg: Aggregate;
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
  USER_ROLE = USER_ROLE;

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
            agg: state.data[arr[0]]
          };
          state.tpsList.push(t);
        });
        return state;
      })
    );

    console.log('TpsComponent inited');
  }
}
