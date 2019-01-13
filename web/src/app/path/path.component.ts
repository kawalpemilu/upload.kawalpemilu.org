import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { HierarchyNode } from 'shared';

@Component({
  selector: 'app-path',
  template: `
    <p>
      <span *ngFor="let p of parents()">
        <a [routerLink]="['/h', p.id]">{{ p.name }}</a> &gt;
      </span>
      {{ node.name }}
    </p>
  `,
  styles: [``]
})
export class PathComponent implements OnInit, OnChanges {
  @Input()
  node: HierarchyNode;

  constructor(public hie: HierarchyService) {}

  ngOnInit() {}

  ngOnChanges() {}

  parents() {
    const arr = [];
    for (let i = 0; i < this.node.parentIds.length; i++) {
      arr.push({ id: this.node.parentIds[i], name: this.node.parentNames[i] });
    }
    return arr;
  }
}
