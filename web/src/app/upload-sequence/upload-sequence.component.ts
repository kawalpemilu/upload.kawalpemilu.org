import { Component, Input, OnInit } from '@angular/core';
import { UploadService } from '../upload.service';
import { Router } from '@angular/router';

import { UserService } from '../user.service';
import { AppComponent } from '../app.component';
import { LOCK_DOWN } from 'shared';

/**
 *
 *     Uploading: {{ uploadService.progress.toFixed(0) }}%
    <progress max="100" [value]="uploadService.progress"></progress>
<button
  (click)="uploadService.task.cancel()"
  [disabled]="
    !(
      uploadService.state === 'paused' ||
      uploadService.state === 'running'
    )
  "
>
  Cancel
</button>
 */
@Component({
  selector: 'app-upload-sequence',
  template: `
    <ng-container *ngIf="!LOCK_DOWN">
      <input
        #u
        type="file"
        (change)="upload($event)"
        [accept]="accept"
        style="display: none"
      />
      <a mat-raised-button color="primary" (click)="u.click()">
        {{ value }}
      </a>
    </ng-container>
  `,
  styles: ['']
})
export class UploadSequenceComponent implements OnInit {
  @Input() kelId: number;
  @Input() kelName: string;
  @Input() tpsNo: number;
  @Input() value = 'Upload foto';

  accept = '.png,.jpg';
  LOCK_DOWN = LOCK_DOWN;

  constructor(
    private router: Router,
    private userService: UserService,
    private uploadService: UploadService
  ) {}

  ngOnInit() {
    if (AppComponent.IN_APP_BROWSER) {
      this.accept = '';
    }
  }

  async upload(event) {
    if (LOCK_DOWN) {
      alert('LOCK_DOWN mode');
      return;
    }
    if (event.target.files.length === 0) {
      console.log('No file to be uploaded');
      return;
    }
    const file: File = event.target.files[0];
    if (!file.type.match(/image\/*/)) {
      console.log('Invalid mime: ', file.type);
      return;
    }
    return this.uploadService
      .upload(this.userService.user, this.kelId, this.kelName, this.tpsNo, file)
      .then(() => this.router.navigate(['/foto']))
      .catch(console.error);
  }
}
