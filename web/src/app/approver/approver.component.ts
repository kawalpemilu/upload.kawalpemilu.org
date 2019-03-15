import { Component, Input } from '@angular/core';
import {
  getServingUrl,
  FsPath,
  PILEG_FORM,
  PILPRES_FORM,
  TpsData,
  USER_ROLE,
  SumMap,
  ApproveRequest
} from 'shared';
import { shareReplay, take } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { ApiService } from '../api.service';
import { UploadService } from '../upload.service';
import { UserService } from '../user.service';
import { User } from 'firebase';

@Component({
  selector: 'app-approver',
  templateUrl: './approver.component.html',
  styles: [``]
})
export class ApproverComponent {
  @Input() kelurahanId: number;
  @Input() tpsNo: number;

  USER_ROLE = USER_ROLE;
  PILPRES_FORM = PILPRES_FORM;
  PILEG_FORM = PILEG_FORM;
  Object = Object;

  tps$: Observable<TpsData>;
  formGroup: FormGroup;
  isLoading = false;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private api: ApiService,
    uploadService: UploadService
  ) {
    this.formGroup = uploadService.getFormGroup('^[0-9]{1,3}$');
  }

  setTps() {
    this.tps$ = this.fsdb
      .doc<TpsData>(FsPath.tps(this.kelurahanId, this.tpsNo))
      .valueChanges()
      .pipe(
        take(1),
        shareReplay(1)
      );
  }

  gsu(url, size) {
    return getServingUrl(url, size);
  }

  async approve(user: User, imageId: string) {
    this.isLoading = true;
    this.formGroup.disable();
    const sum = {} as SumMap;
    for (const p of PILEG_FORM.concat(PILPRES_FORM)) {
      const value = this.formGroup.get(p.form).value;
      if (typeof value === 'number') {
        sum[p.form] = value;
      }
    }

    try {
      const body: ApproveRequest = { sum, imageId };
      const res: any = await this.api.post(user, `approve`, body);
      if (res.ok) {
        console.log('ok');
      } else {
        console.error(res);
        alert(JSON.stringify(res));
      }
    } catch (e) {
      console.error(e.message);
      alert(JSON.stringify(e.message));
    }
    this.formGroup.enable();
    this.isLoading = false;
  }

  getError(ctrlName: string) {
    return this.formGroup.get(ctrlName).hasError('pattern')
      ? 'Rentang angka 0..999'
      : '';
  }

  // const mapLink =
  // const img =
  //   `Location:<br><a href="${mapLink}" target="_blank">` +
  //   '<img src="https://maps.googleapis.com/maps/api/staticmap?center=' +
  //   `${m.y},${m.x}&zoom=15&size=300x200&markers=${m.y},${m.x}` +
  //   '&key=AIzaSyBuqsL30sWYNULCOwbKB1InlldUHl3DWoo"></a>';
}
