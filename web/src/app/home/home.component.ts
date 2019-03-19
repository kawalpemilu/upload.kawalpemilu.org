import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';

@Component({
  selector: 'app-home',
  template: `
    <ng-container *ngIf="(userService.relawan$ | async) as relawan">
      <p>
        Selamat datang, <app-orang [profile]="relawan.profile"></app-orang>!
      </p>

      <p>
        Untuk mulai ikut Jaga Suara 2019, silahkan pilih dari menu di bawah ini:
      </p>
      <ul>
        <li *ngIf="relawan.depth > 0">
          <a [routerLink]="['/c', 0]">
            Rekrut teman jadi relawan
          </a>
        </li>

        <li>
          <a [routerLink]="['/h', 0]">
            Lihat cakupan TPS
          </a>
        </li>

        <li>
          <a [routerLink]="['/foto']">
            Tes upload foto
          </a>
        </li>

        <li style="color: gray">
          Lihat hasil hitung suara (live 17 April 2019)
        </li>
      </ul>
    </ng-container>
  `,
  styles: [
    `
      li {
        margin-bottom: 20px;
      }
      a {
        text-decoration: none;
      }
    `
  ]
})
export class HomeComponent implements OnInit {
  constructor(public userService: UserService) {}

  ngOnInit() {}
}
