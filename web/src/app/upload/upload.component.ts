import { Component, OnInit, Input } from '@angular/core';
import { UploadService } from './upload.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
  @Input() kelurahanId: number;
  @Input() tpsNo: number;

  constructor(public uploadService: UploadService) {}

  ngOnInit() {}

  currentlyUploading() {
    return (
      this.kelurahanId === this.uploadService.kelurahanId &&
      this.tpsNo === this.uploadService.tpsNo &&
      this.uploadService.task
    );
  }
}
