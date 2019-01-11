import { Component, OnInit } from '@angular/core';
import { UploadService } from '../upload/upload.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { UserService } from '../user.service';

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
  formGroup: FormGroup;
  imgURL: string | ArrayBuffer;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public userService: UserService,
    public uploadService: UploadService,
    private formBuilder: FormBuilder
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

    const validators = [Validators.pattern('^[0-9]{1,3}$')];
    this.formGroup = this.formBuilder.group({
      jokowiCtrl: [null, validators],
      prabowoCtrl: [null, validators],
      sahCtrl: [null, validators],
      tidakSahCtrl: [null, validators]
    });
  }

  async upload(state: UploadState, event) {
    if (event.target.files.length === 0) {
      console.log('No file to be uploaded');
      return;
    }
    const file = event.target.files[0];
    if (!file.type.match(/image\/*/)) {
      console.log('Invalid mime: ', file.type);
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = e => (this.imgURL = reader.result);
    } catch (e) {
      console.error('Unable to preview', e);
      this.imgURL = 'error';
    }

    this.uploadService.upload(
      state.kelurahanId,
      state.tpsNo,
      event.target.files[0]
    );
  }

  getError(ctrlName: string) {
    const ctrl = this.formGroup.get(ctrlName);
    if (ctrl.hasError('pattern')) {
      return 'Jumlah hanya boleh antara 0 sampai 999';
    }
    return '';
  }

  selesai(kelurahanId, tpsNo) {
    // TODO: actually save the values to the server!
    this.router.navigate(['/t', kelurahanId], { fragment: tpsNo });
  }
}
