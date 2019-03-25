import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';

@Component({
  selector: 'app-scoreboard',
  template: `
    <h2>Top Uploaders</h2>
    <table
      *ngIf="(userService.topUploaders$ | async) as arr"
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
      <tr *ngFor="let r of arr; let i = index">
        <td align="center">{{ i + 1 }}</td>
        <td>
          <app-orang [profile]="r.profile" [activity]="true"></app-orang>
        </td>
        <td align="center">
          {{ r.count }}
        </td>
        <td align="center">
          {{ r.nKel }}
        </td>
        <td align="center">
          {{ r.nTps }}
        </td>
      </tr>
    </table>
  `,
  styles: [``]
})
export class ScoreboardComponent implements OnInit {
  constructor(public userService: UserService) {}

  ngOnInit() {}
}
