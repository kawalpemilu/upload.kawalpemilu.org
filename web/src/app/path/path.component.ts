import { Component, Input, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-path',
  template: `
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="line-height: 175%" [style.height.px]="PATH_HEIGHT">
          <ng-container *ngIf="!isSearching">
            <span *ngFor="let id of node.parentIds; let i = index">
              <app-hie-link
                [id]="id"
                [name]="node.parentNames[i]"
              ></app-hie-link>
              &gt;&nbsp;
            </span>
            {{ node.name | uppercase }}
            <button
              mat-icon-button
              color="primary"
              [disabled]="isRefreshing"
              (click)="refresh(node.id)"
            >
              <mat-icon>refresh</mat-icon>
            </button>
            &nbsp;
            <button mat-raised-button color="primary" (click)="toggle()">
              <mat-icon>search</mat-icon>
            </button>
          </ng-container>

          <ng-container *ngIf="isSearching">
            <app-cari-kel
              (kelId)="navigate($event)"
              (cancel)="toggle()"
            ></app-cari-kel>
          </ng-container>
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
      .form {
        margin-top: 5px;
        min-width: 250px;
        max-width: 500px;
        width: 100%;
      }
    `
  ]
})
export class PathComponent implements OnInit {
  @Input() node: HierarchyNode;

  isSearching = false;
  isRefreshing = false;

  constructor(public hie: HierarchyService, private router: Router) {}

  get PATH_HEIGHT() {
    return AppComponent.PATH_HEIGHT;
  }

  ngOnInit() {}

  async refresh(id: number) {
    this.isRefreshing = true;
    await this.hie.update(id).catch(console.error);
    this.isRefreshing = false;
  }

  toggle() {
    this.isSearching = !this.isSearching;

    if (this.isSearching) {
      setTimeout(() => {
        const els = document.getElementsByClassName('searchwilayah');
        if (els.length > 0) {
          (els[0] as HTMLInputElement).focus();
        }
      }, 100);
    }
  }

  navigate(a) {
    this.router.navigate([a.depth < 4 ? '/h' : '/t', a.id]);
    this.isSearching = false;
  }
}
