import { Component, OnInit, Input, Inject } from '@angular/core';
import { UserService } from '../user.service';
import { ApiService } from '../api.service';
import { HierarchyService } from '../hierarchy.service';
import { ProblemRequest, MAX_REASON_LENGTH, MAX_URL_LENGTH } from 'shared';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';

@Component({
  selector: 'app-lapor-reason',
  template: `
    <h1 mat-dialog-title>Laporkan Kesalahan</h1>
    <div mat-dialog-content>
      <p>Tulis kesalahan yang ingin kamu laporkan (max 300 huruf):</p>
      <mat-form-field>
        <input
          #reason
          matInput
          [(ngModel)]="data.reason"
          autocomplete="off"
          autofocus
        />
      </mat-form-field>
    </div>
    <div mat-dialog-actions>
      <button
        mat-raised-button
        color="primary"
        [mat-dialog-close]="data.reason"
        [disabled]="
          !reason.value.length || reason.value.length > MAX_REASON_LENGTH
        "
      >
        Laporkan
      </button>
      <button mat-raised-button color="warn" (click)="onNoClick()">
        Batalkan
      </button>
    </div>
  `
})
export class LaporReasonDialogComponent {
  MAX_REASON_LENGTH = MAX_REASON_LENGTH;

  constructor(
    public dialogRef: MatDialogRef<LaporReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProblemRequest
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-lapor-button',
  template: `
    <table class="lapor" (click)="laporKesalahan()">
      <tr>
        <td>Lapor</td>
        <td>
          <mat-spinner *ngIf="data.reason" diameter="20"></mat-spinner>
          <mat-icon *ngIf="!data.reason">error_outline</mat-icon>
        </td>
      </tr>
    </table>
  `,
  styles: [
    `
      .lapor {
        color: red;
        cursor: pointer;
        height: 35px;
      }
    `
  ]
})
export class LaporButtonComponent implements OnInit {
  @Input() kelId: number;
  @Input() tpsNo: number;
  @Input() url: string;

  data: ProblemRequest;

  constructor(
    public userService: UserService,
    public dialog: MatDialog,
    private api: ApiService,
    private hie: HierarchyService
  ) {}

  ngOnInit() {
    this.data = {
      kelId: this.kelId,
      kelName: '',
      tpsNo: this.tpsNo,
      url: this.url,
      reason: '',
      ts: 0
    };
  }

  async laporKesalahan() {
    if (this.data.url.length > MAX_URL_LENGTH) {
      alert('URL teralu panjang');
      return false;
    }

    const config = { width: '250px', data: {} };
    const dialogRef = this.dialog.open(LaporReasonDialogComponent, config);

    dialogRef.afterClosed().subscribe(async reason => {
      if (reason) {
        this.data.reason = reason;
        await this.api.post(this.userService.user, `problem`, this.data);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.hie.update(this.kelId);
      }
    });
  }
}
