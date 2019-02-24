import { Component, Input } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-path',
  template: `
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="line-height: 175%" [style.height.px]="TOOLBAR_HEIGHT">
          <span *ngFor="let id of node.parentIds; let i = index">
            <a [routerLink]="['/h', id]">{{
              node.parentNames[i] | uppercase
            }}</a>
            &gt;&nbsp;
          </span>
          {{ node.name | uppercase }}
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
export class PathComponent {
  @Input()
  node: HierarchyNode;

  constructor(public hie: HierarchyService) {}

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }
}
