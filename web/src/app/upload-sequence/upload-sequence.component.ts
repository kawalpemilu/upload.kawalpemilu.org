import { Component, OnInit } from '@angular/core';
import { UploadService } from '../upload/upload.service';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Location } from '@angular/common';

export class UploadState {
  kelurahanId: number;
  tpsNo: number;
}

@Component({
  selector: 'app-upload-sequence',
  templateUrl: './upload-sequence.component.html',
  styleUrls: ['./upload-sequence.component.css']
})
export class UploadSequenceComponent implements OnInit {
  state$: Observable<UploadState>;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    public uploadService: UploadService
  ) {}

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      map(
        p =>
          <UploadState>{
            kelurahanId: parseInt(p.get('kelurahanId'), 10),
            tpsNo: parseInt(p.get('tpsNo'), 10)
          }
      )
    );
  }

  async upload(state: UploadState, event) {
    this.uploadService.upload(
      state.kelurahanId,
      state.tpsNo,
      event.target.files[0]
    );
    this.location.back();
  }
}
