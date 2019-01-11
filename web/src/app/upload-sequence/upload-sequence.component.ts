import { Component, OnInit } from '@angular/core';
import { UploadService } from '../upload/upload.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { map, retry } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { UserService } from '../user.service';
import { HttpClient } from '@angular/common/http';
import { User } from 'firebase';

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
  uploadedImageId: Promise<string>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public userService: UserService,
    public uploadService: UploadService,
    private formBuilder: FormBuilder,
    private http: HttpClient
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

  async upload(userId: string, state: UploadState, event) {
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

    this.uploadedImageId = this.uploadService.upload(
      userId,
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

  async selesai(user: User, kelurahanId: number, tpsNo: number) {
    const jokowi = this.formGroup.get('jokowiCtrl').value;
    const prabowo = this.formGroup.get('prabowoCtrl').value;
    const sah = this.formGroup.get('sahCtrl').value;
    const tidakSah = this.formGroup.get('tidakSahCtrl').value;

    Promise.all([user.getIdToken(), this.uploadedImageId]).then(
      ([idToken, imageId]) => {
        const headers = { Authorization: `Bearer ${idToken}` };
        const apiUrl = 'https://kawal-c1.firebaseapp.com/api';
        const body = {
          kelurahanId,
          tpsNo,
          jokowi,
          prabowo,
          sah,
          tidakSah,
          imageId
        };
        console.log('body', body);
        return this.http
          .post(`${apiUrl}/upload`, body, { headers })
          .pipe(retry(3))
          .toPromise();
      }
    );

    this.router.navigate(['/t', kelurahanId], { fragment: `${tpsNo}` });
  }
}
