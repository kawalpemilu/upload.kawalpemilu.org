import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-kontak',
  template: `
    <p>
      <mat-divider></mat-divider>
    </p>

    <ng-container *ngIf="showInfo">
      <h3>Pastikan suara rakyat di Pemilu tidak dicurangi!</h3>
      <p>
        Yuk jaga suara Pemilu 2019 dengan merekrut
        <b>sejuta lebih relawan</b> untuk <i>upload</i> foto C1 dari semua TPS
        di Indonesia.
      </p>

      <p>
        Peran kamu penting banget:
      </p>
      <ul>
        <li>
          <b>Mulai sekarang</b>: login untuk mulai tes foto dan mengenal cara
          kerja situs kami.<br /><br />
        </li>
        <li>
          <b>Di hari-H</b>: #PantauFotoUpload foto C1 dari TPS tempat kamu
          nyoblos (dan TPS-TPS sebelahnya kalau memungkinkan :)
        </li>
      </ul>
    </ng-container>

    <p>
      Kontak kami:
    </p>

    <table>
      <tr>
        <td>
          <img
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGfSURBVGhD7Zm5SgRBFEUnU8wMBHHBxCU1EYz9ExPBDxAM1Uj8DZNx+wEDEwNzwchEMRTFJTFxOQ8UiksN9uvHdHdQB040Vaf6KcP0TPcKhUKh08ziKb7hd8PamWe4gLWYwSfMxZvUrsGuxc0J5oJteIxu3jEXa8NXdKORpgmfHw4ECZ8fDgQJnx8OZJjDddzFfdzBLdzAJUwJnx8OJEzgEX6idv/cxBR93U048MsU3qH21M4OcI7aytnJAVZQO4Ps5AB7qB3zA/t4gPZmNlcxRfe4CQfAbgS1Y67hf+geN+EAXKB2HrEKus9NOACXqJ17rILucxMOQBkg0Y03sIx2S5B6i9qxLyi6zpzEFN3nxhvYRt3jsfV7ocgAXziCKbrGjTcQGeABFV3jxhuIDGBvdkXXuPEGIgMcoqJr3HgDozguXqF2blDXjaGi+9yEA5D7HLjGKug+N+EAlAES3YQDUAZIdBMOQBkg0U0bzwQGWevHXXu4kIu1oX23drOIz5gLNqldwzzWYhrt4YL9C3PxYfqC9pevffGFQqEwbHq9H/o+wcEOE9/RAAAAAElFTkSuQmCC"
          />
        </td>
        <td>
          <a target="_blank" href="https://m.me/kawalpemilu.org"
            >https://m.me/kawalpemilu.org</a
          >
        </td>
      </tr>

      <tr>
        <td>
          <img
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJjSURBVGhD7dnNi01xHMfxq0Q2UuQhw8ZDsrLAgrIwNpOFPTaKnWRD2UhJNhb4H0SMmiGbKVYeSlbsWLAgCw95WBHx/jKnTp9+53d+3/M191qcT72amXu+5/M7zdP9nXsHffr06fNfZw0m8QW/hszWvIkN6JQxfECqfJjsGuxa3LmBVOEoXIc7X5EqG4XPcEdLhp3w+uGCYMLrhwuCCa8fLggmvH64QLIMp3AHd3EZW1DPutmPlvD6uYL5OPz306LsxDto50+cxgk8wiFU0Vl3cgX7YI+d/PNVPiuQunh1HpuwGhY97k6u4Diqxy9iEZpyDvWeFPs//xLXMA8WnXEnV3AQ9WPPsQupPER9tslVLEAVPe5OrmA5vkFn7mE/FqPKY+hciu539Lg7bQVnoTOVH3iKKbyafazNQtSjx93JFUzgCB5A57qwHadGZ9zJFeyFHo+wf6EanXEnV2DPA8+gM12dgUZn3Gkr2IZ/dcOzHRqdcaekwG737MbnO3S+lP0dpaJz7pQUHMUTRG5+7O8pFZ1zp6RgCV5AZ0vdQvXMq9FZd0oL1uI+dL7NG9gOtSk67463YAduQ89LeY+tyEXPcae0wH4FxmH7fD0n5TU2oy16njtNBUtxDLb9td3jW+hsE9tarEJJ9Fx3cgX2it0llDwP2E2L/XR2wxPtcaekwDZge2B3VVcwA9uRTuMCDmAluqRk/WzCBcGE1w8XBBNeP1wQTHj9cEEw4fVH8Z5Ak04v7tqbC6myUbA3WdzZiI9IFQ6TXcN6dIq9yGRvLtiPMFU+lz7BvvOdL75Pnz595jqDwW/XRAVU+F6J5QAAAABJRU5ErkJggg=="
          />
        </td>
        <td>
          <a
            target="_blank"
            href="https://mobile.twitter.com/messages/compose?recipient_id=2648297252"
            >@KawalPemilu2019</a
          >
        </td>
      </tr>
    </table>

    <p>
      Lihat situs
      <a href="http://2014.kawalpemilu.org" target="_blank">KawalPemilu 2014</a>
      yang lalu.
    </p>
  `,
  styles: [``]
})
export class KontakComponent implements OnInit {
  @Input() showInfo = true;

  constructor() {}

  ngOnInit() {}
}
