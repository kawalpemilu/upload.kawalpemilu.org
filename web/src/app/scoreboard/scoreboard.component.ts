import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { Title } from '@angular/platform-browser';
import { USER_ROLE } from 'shared';

@Component({
  selector: 'app-scoreboard',
  template: `
    <mat-tab-group *ngIf="userService.scoreboard$ | async as s">
      <mat-tab label="Uploaders">
        <table
          cellspacing="0"
          cellpadding="5"
          style="margin-top: 10px"
          class="alternating"
        >
          <tr [style.background-color]="'lightgray'">
            <th>#</th>
            <th width="200" align="left">Nama Orang</th>
            <th>#Pic</th>
            <th>#Kel</th>
            <th>#TPS</th>
          </tr>
          <tr *ngFor="let r of s.uploaders; let i = index">
            <td align="center">{{ i + 1 }}</td>
            <td>
              <app-orang [profile]="r.profile" [activity]="true"></app-orang>
            </td>
            <td align="center">{{ r.uploadCount }}</td>
            <td align="center">{{ r.nKel }}</td>
            <td align="center">{{ r.nTps }}</td>
          </tr>
        </table>
      </mat-tab>

      <mat-tab label="Reviewers">
        <table
          cellspacing="0"
          cellpadding="5"
          style="margin-top: 10px"
          class="alternating"
        >
          <tr [style.background-color]="'lightgray'">
            <th>#</th>
            <th width="200" align="left">Nama Orang</th>
            <th>#Reviews</th>
          </tr>
          <tr *ngFor="let r of s.reviewers; let i = index">
            <td align="center">{{ i + 1 }}</td>
            <td>
              <app-orang [profile]="r.profile" [activity]="true"></app-orang>
            </td>
            <td align="center">{{ r.reviewCount }}</td>
          </tr>
        </table>
      </mat-tab>

      <mat-tab label="Reporters">
        <table
          cellspacing="0"
          cellpadding="5"
          style="margin-top: 10px"
          class="alternating"
        >
          <tr [style.background-color]="'lightgray'">
            <th>#</th>
            <th width="200" align="left">Nama Orang</th>
            <th>#Reports</th>
          </tr>
          <tr *ngFor="let r of s.reporters; let i = index">
            <td align="center">{{ i + 1 }}</td>
            <td>
              <app-orang [profile]="r.profile" [activity]="true"></app-orang>
            </td>
            <td align="center">{{ r.reportCount }}</td>
          </tr>
        </table>
      </mat-tab>

      <ng-container
        *ngIf="(userService.relawan$ | async)?.profile.role >= USER_ROLE.ADMIN"
      >
        <mat-tab label="Referrals">
          <table
            cellspacing="0"
            cellpadding="5"
            style="margin-top: 10px"
            class="alternating"
          >
            <tr [style.background-color]="'lightgray'">
              <th>#</th>
              <th width="200" align="left">Nama Orang</th>
              <th>#DR</th>
              <th>#DDR</th>
            </tr>
            <tr *ngFor="let r of s.referrals; let i = index">
              <td align="center">{{ i + 1 }}</td>
              <td>
                <app-orang
                  [profile]="r.profile"
                  [activity]="true"
                  [showDr]="false"
                ></app-orang>
              </td>
              <td align="center">{{ r.profile.dr4 }}</td>
              <td align="center">{{ r.ddr }}</td>
            </tr>
          </table>
        </mat-tab>

        <mat-tab label="LaporKPU">
          <table
            cellspacing="0"
            cellpadding="5"
            style="margin-top: 10px"
            class="alternating"
          >
            <tr [style.background-color]="'lightgray'">
              <th>#</th>
              <th width="200" align="left">Nama Orang</th>
              <th>#KupasJeruk</th>
            </tr>
            <tr *ngFor="let r of s.laporKpus; let i = index">
              <td align="center">{{ i + 1 }}</td>
              <td>
                <app-orang
                  [profile]="r.profile"
                  [activity]="true"
                  [showDr]="false"
                ></app-orang>
              </td>
              <td align="center">{{ r.laporKpuCount }}</td>
            </tr>
          </table>
        </mat-tab>
      </ng-container>
    </mat-tab-group>

    <br /><br />
  `,
  styles: [``]
})
export class ScoreboardComponent implements OnInit {
  USER_ROLE = USER_ROLE;

  constructor(public userService: UserService, titleService: Title) {
    const uname = userService.user && userService.user.displayName;
    titleService.setTitle(`Scoreboard ${uname} :: KPJS 2019`);
  }

  ngOnInit() {}
}
