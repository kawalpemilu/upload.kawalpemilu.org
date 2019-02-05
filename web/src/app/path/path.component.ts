import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-path',
  template: `
    <table>
      <tr>
        <td style="line-height: 175%" [style.height.px]="TOOLBAR_HEIGHT">
          <span *ngFor="let p of parents()">
            <a [routerLink]="['/h', p.id]">{{ p.name }}</a> &gt;&nbsp;
          </span>
          {{ node.name }}
        </td>
      </tr>
    </table>
  `,
  styles: [
    `
      a {
        color: blue;
        text-decoration: none;
      }
    `
  ]
})
export class PathComponent implements OnInit, OnChanges {
  @Input()
  node: HierarchyNode;

  TOOLBAR_HEIGHT = AppComponent.TOOLBAR_HEIGHT;

  constructor(public hie: HierarchyService) {}

  ngOnInit() {}

  ngOnChanges() {}

  parents() {
    const arr = [];
    if (this.node.id) {
      arr.push({ id: 0, name: 'IDN' });
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
