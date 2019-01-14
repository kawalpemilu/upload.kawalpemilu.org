import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AngularFireDatabase } from '@angular/fire/database';

import { Aggregate, HierarchyNode, getTpsNumbers } from 'shared';

interface Tps {
  tpsNo: number;
  address: string;
  aggregate$: Observable<Aggregate>;
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
  state$: Observable<State>;

  constructor(
    public hie: HierarchyService,
    private route: ActivatedRoute,
    private afd: AngularFireDatabase
  ) {}

  ngOnInit() {
    this.state$ = this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        filter(Boolean),
        map(id => parseInt(id, 10)),
        distinctUntilChanged()
      )
      .pipe(
        switchMap(async id => {
          const state = (await this.hie.get(id)) as State;
          const tpsNumbers = getTpsNumbers(state.children);
          state.tpsList = tpsNumbers.map(tpsNo => ({
            tpsNo,
            address: 'JL.KARANG ANYAR RAYA (EX.PABRIK PAYUNG 2)',
            aggregate$: this.afd
              .object<Aggregate>(`h/${id}/a/${tpsNo}`)
              .valueChanges()
          }));
          return state;
        })
      );
    console.log('TpsComponent inited');
  }
}
