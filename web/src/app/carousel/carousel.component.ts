import {
  Component,
  OnInit,
  Input,
  Inject,
  Output,
  EventEmitter
} from '@angular/core';
import {
  SumMap,
  PPWP_NAMES,
  DPR_NAMES,
  C1Form,
  FORM_TYPE,
  IS_PLANO,
  ImageMetadata,
  ErrorReports,
  PublicProfile,
  USER_ROLE,
  ApproveRequest
} from 'shared';
import {
  MatBottomSheetRef,
  MatBottomSheet,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material';
import { UserService } from '../user.service';
import { ApiService } from '../api.service';

export interface CarouselItem {
  kelId: number;
  tpsNo: number;
  c1: C1Form;
  meta: ImageMetadata;
  url: string;
  imageId: string;
  ts: number;
  sum: SumMap;
  error: boolean;
  reports: ErrorReports;
  uploader: PublicProfile;
  reviewer: PublicProfile;
}

@Component({
  selector: 'app-bottom-sheet-error',
  template: `
    <mat-nav-list>
      <div *ngFor="let r of reports">
        <app-orang
          [profile]="r.reporter"
          [activity]="true"
          [blankTarget]="true"
        ></app-orang
        >:
        {{ r.reason }}
      </div>
    </mat-nav-list>
  `
})
export class BottomSheetErrorComponent {
  reports: any[] = [];

  constructor(
    private bottomSheetRef: MatBottomSheetRef<BottomSheetErrorComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: ErrorReports
  ) {
    for (const ts of Object.keys(data || {})) {
      const d = data[ts];
      this.reports.push({
        reporter: d.reporter,
        reason: d.reason,
        ts: +ts
      });
    }
  }

  openLink(event: MouseEvent): void {
    this.bottomSheetRef.dismiss();
    event.preventDefault();
  }
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
                <td align="center" width="120" height="125" colspan="2">
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
                    loading="lazy"
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
              <tr *ngIf="p.uploader as uploader">
                <td colspan="2" align="center" style="word-break: break-word">
                  by
                  <app-orang
                    [profile]="uploader"
                    [activity]="true"
                    [blankTarget]="true"
                  ></app-orang>
                  <ng-container *ngIf="p.meta as meta">
                    <app-meta [meta]="meta"></app-meta>
                  </ng-container>
                </td>
              </tr>
              <tr *ngIf="p.reports as reports">
                <td colspan="2" align="center">
                  <button
                    mat-button
                    color="warn"
                    (click)="openReports(reports)"
                  >
                    Lihat Laporan
                  </button>
                </td>
              </tr>
              <tr *ngIf="p.reviewer as reviewer">
                <td colspan="2" align="center">
                  <br />
                  {{ reviewer.ts | date: 'short' }}
                  <app-orang
                    [profile]="reviewer"
                    [activity]="true"
                    [showDr]="false"
                    [blankTarget]="true"
                  ></app-orang>
                </td>
              </tr>
              <ng-template #pending>
                <tr>
                  <td colspan="2" align="center">
                    <p style="color: orange">
                      Terima kasih, foto kamu akan diproses.
                    </p>
                  </td>
                </tr>
              </ng-template>
              <tr *ngIf="p.c1 as c1; else pending">
                <td colspan="2" align="center">
                  <ng-container [ngSwitch]="c1.type">
                    <ng-container *ngSwitchCase="FORM_TYPE.MALICIOUS">
                      <p>Foto ini <b style="color: red">MALICIOUS</b></p>
                    </ng-container>
                    <ng-container *ngSwitchCase="FORM_TYPE.OTHERS">
                      <p>Foto ini tidak ditampilkan ke publik.</p>
                    </ng-container>
                    <ng-container *ngSwitchCase="FORM_TYPE.PEMANDANGAN">
                      <p>Pemandangan di TPS.</p>
                    </ng-container>
                    <ng-container *ngSwitchDefault>
                      {{ FORM_TYPE[c1.type] }}
                      {{ c1.plano == IS_PLANO.YES ? '(P)' : '' }}
                      {{ c1.halaman }}
                    </ng-container>
                  </ng-container>
                </td>
              </tr>
              <ng-container *ngFor="let key of ALL_NAMES">
                <tr *ngIf="p.sum[key] !== undefined">
                  <td align="right">
                    {{ PPWP_NAMES[key] || DPR_NAMES[key] }}:
                  </td>
                  <td align="center" width="40" style="padding-right: 5px">
                    {{ p.sum[key] }}
                  </td>
                </tr>
              </ng-container>

              <ng-container *ngIf="p.reviewer">
                <ng-container *ngIf="userService.relawan$ | async as r">
                  <tr *ngIf="r.profile.role >= USER_ROLE.ADMIN" height="50">
                    <td colspan="2" align="center">
                      <button mat-raised-button color="warn" (click)="edit(p)">
                        Edit &nbsp;
                        <mat-icon>edit</mat-icon>
                      </button>

                      <p *ngIf="p.c1.type !== FORM_TYPE.OTHERS">
                        <button
                          mat-raised-button
                          color="warn"
                          #ot
                          (click)="ot.disabled = true; others(p)"
                        >
                          OTHER
                          <mat-icon>delete</mat-icon>
                        </button>
                      </p>
                    </td>
                  </tr>
                </ng-container>
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

  @Output() edited = new EventEmitter();
  @Output() changed = new EventEmitter();

  USER_ROLE = USER_ROLE;
  IS_PLANO = IS_PLANO;
  FORM_TYPE = FORM_TYPE;
  PPWP_NAMES = PPWP_NAMES;
  DPR_NAMES = DPR_NAMES;
  ALL_NAMES = Object.keys(PPWP_NAMES).concat(Object.keys(DPR_NAMES));

  constructor(
    private bottomSheet: MatBottomSheet,
    private api: ApiService,
    public userService: UserService
  ) {}

  ngOnInit() {}

  openReports(reports) {
    this.bottomSheet.open(BottomSheetErrorComponent, { data: reports });
  }

  edit(p: CarouselItem) {
    this.edited.next(p);
  }

  async others(p: CarouselItem) {
    try {
      const user = this.userService.user;
      const body: ApproveRequest = {
        kelId: p.kelId,
        kelName: '',
        tpsNo: p.tpsNo,
        sum: {} as SumMap,
        imageId: p.imageId,
        c1: {
          type: FORM_TYPE.OTHERS,
          plano: null,
          halaman: '0'
        }
      };
      const res: any = await this.api.post(user, `approve`, body);
      if (res.ok) {
        console.log('ok');
        this.changed.next(p);
      } else {
        console.error(res);
        alert(JSON.stringify(res));
      }
    } catch (e) {
      console.error(e.message);
      alert(JSON.stringify(e.message));
    }
  }
}
