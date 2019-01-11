import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { HierarchyService, HierarchyNode } from '../hierarchy.service';

@Component({
  selector: 'app-path',
  template: `
    <p>
      <span *ngFor="let p of parents">
        <a [routerLink]="['/h', p[0]]">{{ p[1] }}</a> &gt;
      </span>
      {{ top }}
    </p>
  `,
  styles: [``]
})
export class PathComponent implements OnInit, OnChanges {
  @Input()
  parents: string[][];

  @Input()
  top: string;

  constructor(public hie: HierarchyService) {}

  ngOnInit() {}

  ngOnChanges() {}
}
