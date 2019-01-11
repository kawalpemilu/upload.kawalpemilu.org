import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface Tps {
  tpsNo: number;
  address: string;
}

interface State {
  kelurahanId: number;
  kelurahanName: string;
  parents: string[][];
  tpsList: Tps[];
}

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.css']
})
export class TpsComponent implements OnInit {
  state$: Observable<State>;

  constructor(public hie: HierarchyService, private route: ActivatedRoute) {}

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
          const node = await this.hie.get(id);
          const state: State = {
            kelurahanId: id,
            kelurahanName: node.name,
            tpsList: [],
            parents: node.parents,
          };
          if (Array.isArray(node.children)) {
            for (const tpsNo of node.children) {
              state.tpsList.push({
                tpsNo,
                address: 'JL.KARANG ANYAR RAYA (EX.PABRIK PAYUNG)'
              });
            }
          } else {
            for (let tpsNo = 1; tpsNo <= node.children; tpsNo++) {
              state.tpsList.push({
                tpsNo,
                address: 'JL.KARANG ANYAR RAYA (EX.PABRIK PAYUNG 2)'
              });
            }
          }
          return state;
        })
      );
    console.log('TpsComponent inited');
  }
}
