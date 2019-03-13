import { Component, Input } from '@angular/core';
import { UploadService } from '../upload.service';
import { Router } from '@angular/router';

import { UserService } from '../user.service';

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
    <input
      #u
      type="file"
      (change)="upload($event)"
      accept=".png,.jpg"
      style="display: none"
    />
    <a mat-raised-button color="primary" (click)="u.click()">
      {{ value }}
    </a>
  `,
  styles: ['']
})
export class UploadSequenceComponent {
  @Input() kelId: number;
  @Input() tpsNo: number;
  @Input() value = 'Upload foto';

  constructor(
    private router: Router,
    private userService: UserService,
    private uploadService: UploadService
  ) {}

  async upload(event) {
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
      .upload(this.userService.user, this.kelId, this.tpsNo, file)
      .then(() => this.router.navigate(['/f']))
      .catch(console.error);
  }
}
