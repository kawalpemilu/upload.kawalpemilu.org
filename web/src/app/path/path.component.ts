import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';

@Component({
  selector: 'app-path',
  template: `
    <span *ngFor="let path of paths; let i = index">
      <span *ngIf="i > 0"> &gt; </span>
      <span *ngIf="i == paths.length - 1">{{ hie.name[path] }}</span>
      <a *ngIf="i != paths.length - 1" [routerLink]="['/h', path]">{{
        hie.name[path]
      }}</a>
    </span>
  `,
  styles: [``]
})
export class PathComponent implements OnInit, OnChanges {
  @Input()
  id: number;

  paths: number[];

  constructor(public hie: HierarchyService) {}

  ngOnInit() {
    this.paths = this.getPaths(this.id);
  }

  ngOnChanges() {
    this.paths = this.getPaths(this.id);
  }

  private getPaths(id: number) {
    const paths: number[] = [];
    for (let i = id; i; i = this.hie.parent[i]) {
      paths.push(i);
    }
    paths.push(0);
    paths.reverse();
    return paths;
  }
}
