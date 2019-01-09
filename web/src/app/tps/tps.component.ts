import { Component, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { ActivatedRoute } from '@angular/router';
import { map, distinctUntilChanged, shareReplay, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface Row {
  tpsno: number;
  address: string;
}

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.css']
})
export class TpsComponent implements OnInit {
  id$: Observable<number>;
  rows$: Observable<Row[]>;

  constructor(public hie: HierarchyService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.id$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter(Boolean),
      map(id => parseInt(id, 10)),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.rows$ = this.id$.pipe(
      map(id => {
        const r = this.hie.children[id];
        const rows: Row[] = [];
        if (Array.isArray(r)) {
          for (const tpsno of r) {
            rows.push({
              tpsno,
              address: 'JL.KARANG ANYAR RAYA (EX.PABRIK PAYUNG)'
            });
          }
        } else {
          for (let tpsno = 1; tpsno <= r; tpsno++) {
            rows.push({
              tpsno,
              address: 'JL.KARANG ANYAR RAYA (EX.PABRIK PAYUNG 2)'
            });
          }
        }
        return rows;
      })
    );
  }
}
