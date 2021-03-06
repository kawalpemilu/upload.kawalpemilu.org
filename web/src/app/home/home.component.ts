import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-home',
  template: `
    <ng-container *ngIf="(userService.relawan$ | async) as relawan; else login">
      <p>
        Selamat datang,
        <app-orang [profile]="relawan.profile" [showDr]="false"></app-orang>
      </p>

      <p>
        Silahkan pilih dari menu di bawah ini:
      </p>
      <ul>
        <li *ngIf="relawan.depth > 0">
          <a [routerLink]="['/c', 0]">
            Rekrut teman jadi relawan
          </a>
        </li>

        <li>
          <a [routerLink]="['/foto']">
            Upload foto
          </a>
        </li>

        <li>
          <a [routerLink]="['/h', 0]">
            Lihat cakupan TPS
          </a>
        </li>
      </ul>

      <app-kontak [showInfo]="false"></app-kontak>
    </ng-container>

    <ng-template #login>
      <p>
        Untuk mengakses sistem ini, silahkan login dahulu:
      </p>

      <!-- <p></p>
<button
  style="width: 250px; text-align: left"
  mat-raised-button
  (click)="userService.login('google')"
>
  <img
    style="padding:8px"
    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAT5SURBVGhD7ZhtTFtVGMfvvYUW5jSabItb2CAZYcFNXqaObiAzM2MD5WXzlQlhmywQCBGGgwkkV0HoAAFBYLKCI+hiwAiF9lb2gbQlwAfd2NjcPs0vrjJfop80OKHP8Vx2igVP8ba93RrTf/L70j7Pef7PuefltoxffvnluRDPBMCpwFwo4gTI4W5DBvsnJLM2tI9B6DkGwX4G8GdzkM39AAXcKJQHHhdzSPqDE5QFqCGfm4QX2AX0LDbrAjhnHvK4KagKjCXD3T8Br4zAxq+Js0sz5xLiE8rlZqCSCSXDe1dQxjZDEgtUMx4ABxgblLIaUkZ+oS5mDZ6pm7TicoJrXMX7Q0nKyiPUyTyGN+CPtILeAIrZj0hpzwX9TDAcYX+mFfIK+ZyZlJZHi5uVVsgbyG7+FNtGLeQEfPYvoALuEpRyVVAfsBev5XXAMxvgHcXzqJR9d/G0EWMoufKbb1BthYP4MqIVWwGksAvwtqJLyubDMWvQW4reZY3IbV4UFHNfO5p0Br55rdjU4yRNsvC5vxWyuFnvmLcEbYYx1V1UpkAokW5cBE5wl9EAoyBpviNkUZ3BoEW6AhFKYv9t/t7McyTFd4QQw4FFaV1qQESvRCib+8e8uOYLmU0kxbcE5qDdy8zbMWP4e0sKihXdJNz3BGZlBbUBApwP/AmKGBUJ9z2BRTVIM24Hf99KQiVpY9k1JAfbKibg1UbtLTKsc4FZ9S3NuB38hJJJqCTRzLhLfPXIHBnWuXADv9GM24FxZQQJlSSaEXeJrBgHMqxz4Qbu0ozbgQnmYRIqSTQj7rKl/DIiwzrX/6EBn11C4kYmwzoXPmWu04zbwZs4hYRKEs2Iu8S/p5ewiS2qL2nG7eBbuo2EShLNiLukn+mzkmGda7WL7FfTI6hG2P1HU786mITLpvaBgrVRlSYbzbidolaNnoQ7F5iC1TTzM2MbUfZwMnpxKAO1GZ/6hITLppK22h6aaUc02pIjJNy5yMvcbbtxvKTQFxcjUfpQ+qJ5kazh5IWO0e2bSYrHajmbF7aj0rLq7G+vHF/gTby0f/PwSaQRzf9uXisumSXjjlQZEqwDyPPfAjz/ijJN8+kdmmlHTrS0TJCU/xZeRiG3xtb/lTuSRDVvp8awZ9qTJsQZzf6g8wbNsCNbTk8jTfdJ1/6CrDOor9JMr6Rcv3f2nPHJEJImWd2GyND89urvaIZX8lqD9gZJk66hr7aF4bVuo5leSZYu2dYh7OyRcjr1XYx6qEV4pusNnJMxeBi91NRBNW0nomIS+HMnXbo8l9QpxDSnUgw7Q9zcdXr1lXbjTr5feGJfvzF8/QVTxLrzQnR8hzG2utqw55LYrGNO6uAhdPQsjzaVz1AbKPywvpPYcU/1QpykpeQpb/YWorDT3ywz/3J9z01iw31NTYUEl+kT79CKys3RC8fQjirLovmk9wd+KWlqkufCNJlCH63UJ8zSispNZn8mymputfJ9pRtIeXmEmwiqEdTXXdkT7lArqK8YjeHe+82tHY1qyJR4OrlCpi7F9rExpp6U8a76hmPD6wxx04d1qVQzrnBoKA3VGtTTn+Njmwx//9Q7Gr2rUYgbP647ME8ztxo5wwfn64S4yc8M0TFkuAcn8XVCK0QfazY+ra/QJ3yfN7x/Lhuf9+ITytClodd1KSB+Vj6SaG0UdglaY0yOHO9RfvnlF8P8Da+9ZrALdO66AAAAAElFTkSuQmCC"
  />
  Login with Google
</button> -->

      <p></p>
      <button
        style="width: 250px; text-align: left"
        mat-raised-button
        (click)="userService.login('facebook')"
      >
        <img
          style="padding:8px"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHsSURBVGhD7ZjNLgNhGEZ7ZS1i5a/TEvdDLCywE0sXoTMSEZZW4t8FWEqIlg0Lo41nIprzxfv1pWMxJzm7d56e9GfTWkVFRcX/ptFMk3orPa63Oi+NVpqPw8Frfb7m3oIyRqORpOv0AmN2TTlxTCSdJoyVYr2ZzSvLzuAjpLFSTNIjZdkZ53feYE9ZdmCkVJVlh0bKVFl2aMTr1FKWb+xc5efXD3m395q/v+ffoGcKlWWHRjxOLmb5yem9Uhl6rlBZdmjE42b/nf8Jeq5QWXZoxOPFzYMyw9BzhcqyQyMeu89vyvxidessn17ex/thlWWHRjwO/2AHTLYzvCWVZYdGPBJ0F1JZdmjEI0F3IZVlh0ZijeGp+4obhcqyQyOxxnB5+4gbhcqyQyOxxrB3cIcbhcqyQyOxxrC9e4sbhcqyQyMeCboLqSw7NOKRoLuQyrJDIx4JugupLDs04pGgu5DKskMjHgm6C6ksOzTikaC7kMqyQyMeCboLqSw7NOKRoLuQyrJDIx4JugupLDs04pGgu5DKskMjHgm6C6ksOzTikaC7kMqy89t/LRJ0F3CEvxaT9AiGynGkP3eb2TyOleBEqzOrrDj6D68Nj5XginJGo//xzenr1Bsa/kt7/d/gYb2dzSijoqKi4l9Sq30A+M9r/MIZv3oAAAAASUVORK5CYII="
        />
        Login with Facebook
      </button>

      <!-- <p></p>
<button
  style="width: 250px; text-align: left"
  mat-raised-button
  (click)="userService.login('twitter')"
>
  <img
    style="padding:8px"
    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMJSURBVGhD7ZhfiA1RHMePO/emWOVPlJQ3kSIST1IkSZT8eRCR7Jt/KXmSfVDkkS28iJS950x3lza8CU8UJUq8EF50u+zeO+fMtqh7fc/sr9tlDzszZ2aVzqe+zZ07c37f3/kz55wZ5nA4HA6HIy6isdjj6iL0xuMy9IRqFLh84Ql5lvWr+XTXL5T65HL6mQ6YbGat1hQ6TUdPq6CTRNI/EK9lFFeywFV3dP+d2gxPBLtw/khXOPovFX61CwGGoV76JxUof9mYtEHokeeo6LfonMvPTNRnU5jkwHhLOziSYH7Lo0uxQUJ72zGSiKsvJV+tYLfqs9B7GyhcMgpCHu4MivNBNtCYQ5cnBkMPrfi+M0Y8ye8FoSrQY1Tka0nIZRQxGWi9o4bgn5DURrrlrxR5uHp8+QTictQrq60ULjkeD7cZA0Oo3ACrBEvoViN4CA+aysZUregHaylUSvRsgNnBEHxMXDZRkbtRK91vTqVSbTDkjhnLxRDK7qEwdiDYpd+D/0ENGrcno4eu0liEJPYZ7ouncrCDUrDkZnM6euGt0SRPldUmyiA9egrEON6vpzO07EujUU6yXoE1GALH20G5HOk0yFV4tthgaxqlkZ5Sn1ppNMhbXL2mFOxBLzwxmuQqeZXs7Sn54Sp06djeZLKELQzZZwMqsFsv70az7FUzrSnW6G0BhtMzg2G24vI8WWYLthXbddfC4Do0ajS3FWY6JsIFZJktSL7XaJqp5AWyywERzEUlqmbjDMTlR733Ird8KIpwDcyGxpnbCgsXFGuLbo/epHH1wJhISmGbcoaiTx56fUBFeqwrg0nB+qNBKmAavbDol35TYnHE5Y0079l2YJFBlx+w2p1GL0LqdK4tr7ezepgUebDO48FOGJ7CQnYPLR4Yk4or/ZLP5XqyyZHbwzMxL5+DWTbbaAy1qNX9ahc5TBL9ch5a/gTMXxkTm0B6qKH8Ef19hyL+Q0SwFAkdQq9cQ1JPcXyHlq3j2ESyQzh+wPWHOF5BhbuZP7KQSjocDofD4fgPYewnh1ftHbHR+OoAAAAASUVORK5CYII="
  />
  Login with Twitter
</button> -->

      <p *ngIf="!SUPPORTED_BROWSER" style="font-weight: bold; color: orange">
        Jika kamu tidak bisa login atau mengupload, coba gunakan browser Chrome
        atau Safari.
      </p>

      <app-kontak></app-kontak>
    </ng-template>
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

  get SUPPORTED_BROWSER() {
    return AppComponent.SUPPORTED_BROWSER;
  }
}
