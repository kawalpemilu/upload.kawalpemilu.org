import { Component, Input, OnInit } from '@angular/core';
import { HierarchyService } from '../hierarchy.service';
import { HierarchyNode } from 'shared';
import { AppComponent } from '../app.component';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/firestore';
import {
  switchMap,
  filter,
  debounceTime,
  distinctUntilChanged
} from 'rxjs/operators';
import { Router } from '@angular/router';

interface LocationOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-path',
  template: `
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="line-height: 175%" [style.height.px]="TOOLBAR_HEIGHT">
          <ng-container *ngIf="!isSearching">
            <span *ngFor="let id of node.parentIds; let i = index">
              <app-hie-link
                [id]="id"
                [name]="node.parentNames[i]"
              ></app-hie-link>
              &gt;&nbsp;
            </span>
            {{ node.name | uppercase }}
            <button mat-icon-button color="primary" (click)="toggle()">
              <mat-icon>search</mat-icon>
            </button>
          </ng-container>

          <ng-container *ngIf="isSearching">
            <form class="form">
              <mat-form-field class="full-width">
                <input
                  class="searchwilayah"
                  type="text"
                  placeholder="Cari nama wilayah"
                  aria-label="Number"
                  matInput
                  [formControl]="myControl"
                  [matAutocomplete]="auto"
                />
                <mat-autocomplete
                  #auto="matAutocomplete"
                  autoActiveFirstOption
                  (optionSelected)="navigate($event.option.value)"
                >
                  <mat-option
                    *ngFor="let option of (filteredOptions$ | async)"
                    [value]="option"
                  >
                    {{ option.name }} ({{ option.id }})
                  </mat-option>
                </mat-autocomplete>
              </mat-form-field>

              &nbsp;
              <button mat-icon-button (click)="toggle()">
                <mat-icon>cancel</mat-icon>
              </button>
            </form>
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
        min-width: 250px;
        max-width: 500px;
        width: 100%;
      }
      .full-width {
        width: 250px;
      }
    `
  ]
})
export class PathComponent implements OnInit {
  @Input() node: HierarchyNode;

  isSearching = false;
  myControl = new FormControl();
  filteredOptions$: Observable<LocationOption[]>;

  constructor(
    public hie: HierarchyService,
    private fsdb: AngularFirestore,
    private router: Router
  ) {}

  get TOOLBAR_HEIGHT() {
    return AppComponent.TOOLBAR_HEIGHT;
  }

  ngOnInit() {
    this.filteredOptions$ = this.myControl.valueChanges.pipe(
      filter(Boolean),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(prefix =>
        this.fsdb
          .collection<LocationOption>('h', ref =>
            ref
              .where('name', '>=', ('' + prefix).toUpperCase())
              .where('name', '<=', ('' + prefix).toUpperCase() + '{')
              .limit(10)
          )
          .valueChanges()
      )
    );
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
    this.myControl.setValue('');
  }
}
