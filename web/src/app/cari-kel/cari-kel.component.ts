import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  switchMap,
  filter,
  debounceTime,
  distinctUntilChanged
} from 'rxjs/operators';
import { HierarchyNode } from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-cari-kel',
  template: `
    <form class="form" style="min-width: 300px">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <mat-form-field style="width: 100%">
              <input
                class="searchwilayah"
                type="text"
                placeholder="Cari nama Kelurahan"
                aria-label="Number"
                matInput
                [formControl]="myControl"
                [matAutocomplete]="auto"
              />
              <mat-autocomplete
                #auto="matAutocomplete"
                autoActiveFirstOption
                (optionSelected)="
                  myControl.setValue(''); kelId.next($event.option.value)
                "
              >
                <mat-option
                  *ngFor="let option of (filteredOptions$ | async)"
                  [value]="option"
                >
                  {{ option.parentNames[3] }} &gt; {{ option.name }}
                </mat-option>
              </mat-autocomplete>
            </mat-form-field>
          </td>
          <td width="30">
            <button mat-icon-button (click)="cancel.next()">
              <mat-icon>cancel</mat-icon>
            </button>
          </td>
        </tr>
      </table>
    </form>
  `,
  styles: [``]
})
export class CariKelComponent implements OnInit {
  @Output() kelId = new EventEmitter();
  @Output() cancel = new EventEmitter();

  myControl = new FormControl();
  filteredOptions$: Observable<HierarchyNode[]>;

  constructor(private fsdb: AngularFirestore) {}

  ngOnInit() {
    this.filteredOptions$ = this.myControl.valueChanges.pipe(
      filter(Boolean),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(prefix =>
        this.fsdb
          .collection<HierarchyNode>('h', ref =>
            ref
              .where('depth', '==', 4)
              .where('name', '>=', ('' + prefix).toUpperCase())
              .where('name', '<=', ('' + prefix).toUpperCase() + '{')
              .limit(10)
          )
          .valueChanges()
      )
    );
  }
}
