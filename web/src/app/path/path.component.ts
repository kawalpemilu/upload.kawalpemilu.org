import { Component, OnInit, Input } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-path',
  template: `
    <p *ngIf="(paths$ | async) as paths">
      <span *ngFor="let path of paths; let i = index">
        <span *ngIf="i > 0"> &gt; </span>
        <span *ngIf="i == paths.length - 1">{{ hie.name[path] }}</span>
        <a *ngIf="i != paths.length - 1" [routerLink]="['/h', path]">{{
          hie.name[path]
        }}</a>
      </span>
    </p>
  `,
  styles: [``]
})
export class PathComponent implements OnInit {
  @Input()
  id$: Observable<number>;

  paths$: Observable<number[]>;

  constructor(public hie: HierarchyService) {}

  ngOnInit() {
    this.paths$ = this.id$.pipe(
      map(id => {
        const paths: number[] = [];
        for (let i = id; i; i = this.hie.parent[i]) {
          paths.push(i);
        }
        paths.push(0);
        paths.reverse();
        return paths;
      })
    );
  }
}
