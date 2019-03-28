import { Component, OnInit, Input } from '@angular/core';
import { SumMap, PPWP_NAMES, DPR_NAMES } from 'shared';

export interface CarouselItem {
  kelId: number;
  tpsNo: number;
  url: string;
  ts: number;
  sum: SumMap;
  error: boolean;
}

@Component({
  selector: 'app-carousel',
  template: `
    <div class="cdk-virtual-scroll-data-source">
      <cdk-virtual-scroll-viewport
        orientation="horizontal"
        itemSize="125"
        [style.height.px]="height"
        class="viewport"
      >
        <div *cdkVirtualFor="let p of photos" class="item">
          <table
            cellpadding="0"
            cellspacing="0"
            [style.background-color]="p.error ? '#FDD' : ''"
          >
            <tbody>
              <tr>
                <td align="center" width="125" height="125" colspan="2">
                  <app-thumbnail
                    *ngIf="!p.url.startsWith('data')"
                    [url]="p.url"
                    [srcSize]="110"
                    [maxHeight]="'110px'"
                    [maxWidth]="'110px'"
                    [linkSize]="1280"
                  ></app-thumbnail>
                  <img
                    *ngIf="p.url.startsWith('data')"
                    [src]="p.url"
                    style="max-height:110px; max-width:110px; height:auto; width:auto;"
                  />
                </td>
              </tr>
              <tr>
                <td align="center" colspan="2">
                  <ng-container *ngIf="p.url.startsWith('data'); else showdate">
                    Uploading &nbsp;
                    <mat-spinner
                      style="display: inline"
                      [diameter]="20"
                    ></mat-spinner>
                  </ng-container>
                  <ng-template #showdate>
                    {{ p.ts | date: 'short' }}
                    <ng-container *ngIf="lapor">
                      <br />
                      <app-lapor-button
                        [kelId]="p.kelId"
                        [tpsNo]="p.tpsNo"
                        [url]="p.url"
                      ></app-lapor-button>
                    </ng-container>
                  </ng-template>
                </td>
              </tr>
              <ng-container *ngFor="let key of ALL_NAMES">
                <tr *ngIf="p.sum[key] !== undefined">
                  <td align="right">
                    {{ PPWP_NAMES[key] || DPR_NAMES[key] }}:
                  </td>
                  <td align="right" width="40" style="padding-right: 5px">
                    {{ p.sum[key] }}
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>
  `,
  styles: [``]
})
export class CarouselComponent implements OnInit {
  @Input() photos: CarouselItem[];
  @Input() height: number;
  @Input() lapor = false;

  PPWP_NAMES = PPWP_NAMES;
  DPR_NAMES = DPR_NAMES;
  ALL_NAMES = Object.keys(PPWP_NAMES).concat(Object.keys(DPR_NAMES));

  constructor() {}

  ngOnInit() {}
}
