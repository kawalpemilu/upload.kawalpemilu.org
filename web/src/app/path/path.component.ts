import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { HierarchyService, HierarchyNode } from '../hierarchy.service';

@Component({
  selector: 'app-path',
  template: `
    <span *ngFor="let path of paths; let i = index">
      <span *ngIf="i > 0"> &gt; </span>
      <span *ngIf="i == paths.length - 1">{{ path.name }}</span>
      <a *ngIf="i != paths.length - 1" [routerLink]="['/h', path.id]">{{
        path.name
      }}</a>
    </span>
  `,
  styles: [``]
})
export class PathComponent implements OnInit, OnChanges {
  @Input()
  id: number;

  paths: HierarchyNode[];

  constructor(public hie: HierarchyService) {}

  ngOnInit() {
    this.updatePaths();
  }

  ngOnChanges() {
    this.updatePaths();
  }

  private async updatePaths() {
    // TODO: make this O(1)
    const paths: HierarchyNode[] = [];
    for (let i = this.id; i >= 0; ) {
      const node = await this.hie.get(i);
      paths.push(node);
      i = node.parent;
    }
    this.paths = paths.reverse();
  }
}
