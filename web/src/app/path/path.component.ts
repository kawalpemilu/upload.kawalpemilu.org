import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { HierarchyNode } from 'shared';

@Component({
  selector: 'app-path',
  template: `
    <p style="line-height: 200%">
      <span *ngFor="let p of parents()">
        <a [routerLink]="['/h', p.id]" class="wilayah">{{ p.name }}</a>
        &gt;&nbsp;
      </span>
      {{ node.name }}
    </p>
  `,
  styles: [
    `
      p {
        font-family: Arial, Helvetica, sans-serif;
      }
    `
  ]
})
export class PathComponent implements OnInit, OnChanges {
  @Input()
  node: HierarchyNode;

  constructor(public hie: HierarchyService) {}

  ngOnInit() {}

  ngOnChanges() {}

  parents() {
    const arr = [];
    if (this.node.id) {
      arr.push({ id: 0, name: 'Nasional' });
    }
    if (this.node.parentIds) {
      for (let i = 0; i < this.node.parentIds.length; i++) {
        arr.push({
          id: this.node.parentIds[i],
          name: this.node.parentNames[i]
        });
      }
    }
    return arr;
  }
}
