import { Component, OnDestroy } from '@angular/core';
import {
  FsPath,
  TpsData,
  SumMap,
  ApproveRequest,
  SUM_KEY,
  TpsImage,
  FORM_TYPE,
  IMAGE_STATUS
} from 'shared';
import { switchMap, startWith, take } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { combineLatest, Subscription, Subject } from 'rxjs';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { User } from 'firebase';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { HierarchyService } from '../hierarchy.service';

@Component({
  selector: 'app-approver',
  templateUrl: './approver.component.html',
  styles: [
    `
      .radio-group {
        display: inline-flex;
        flex-direction: column;
      }

      .radio-group > mat-radio-button {
        margin: 7px;
      }
    `
  ]
})
export class ApproverComponent implements OnDestroy {
  LABEL = {
    [SUM_KEY.jum]: '(I.B.4) # Pengguna Hak Pilih',
    [SUM_KEY.pas1]: 'Suara # 01',
    [SUM_KEY.pas2]: 'Suara # 02',
    [SUM_KEY.sah]: 'Suara Sah',
    [SUM_KEY.tSah]: 'Suara Tidak Sah',

    [SUM_KEY.pJum]: '(I.B.4) # Pengguna Hak Pilih ',
    [SUM_KEY.pkb]: 'Partai Kebangkitan Bangsa',
    [SUM_KEY.ger]: 'Partai Gerindra',
    [SUM_KEY.pdi]: 'PDI Perjuangan',
    [SUM_KEY.gol]: 'Partai Golongan Karya',
    [SUM_KEY.nas]: 'Partai NasDem',
    [SUM_KEY.gar]: 'Partai Garuda',
    [SUM_KEY.ber]: 'Partai Berkarya',
    [SUM_KEY.sej]: 'Partai Keadilan Sejahtera',
    [SUM_KEY.per]: 'Partai Perindo',
    [SUM_KEY.ppp]: 'Partai Persatuan Pembangunan',
    [SUM_KEY.psi]: 'Partai Solidaritas Indonesia',
    [SUM_KEY.pan]: 'Partai Amanat Nasional',
    [SUM_KEY.han]: 'Partai Hanura',
    [SUM_KEY.dem]: 'Partai Demokrat',
    [SUM_KEY.pbb]: 'Partai Bulan Bintang',
    [SUM_KEY.pkp]: 'Partai Keadilan dan Persatuan Indonesia',
    [SUM_KEY.pSah]: 'Suara Sah',
    [SUM_KEY.pTSah]: 'Suara Tidak Sah'
  };

  FORM_TYPE = FORM_TYPE;
  FORM_LABEL = {
    [FORM_TYPE.ps]: `Pilpres - Sertifikat`,
    [FORM_TYPE.pp]: `Pilpres - Plano`,
    [FORM_TYPE.ds]: `DPR - Sertifikat`,
    [FORM_TYPE.dp]: `DPR - Plano`
  };

  LEMBAR: { [key in FORM_TYPE]: { [hal: string]: SUM_KEY[] } } = {
    [FORM_TYPE.ps]: {
      '1': [SUM_KEY.jum],
      '2': [SUM_KEY.pas1, SUM_KEY.pas2, SUM_KEY.sah, SUM_KEY.tSah]
    },
    [FORM_TYPE.pp]: {
      '1': [SUM_KEY.jum],
      '2': [SUM_KEY.pas1, SUM_KEY.pas2, SUM_KEY.sah, SUM_KEY.tSah]
    },
    [FORM_TYPE.ds]: {
      '1': [SUM_KEY.pJum],
      '2.1': [SUM_KEY.pkb, SUM_KEY.ger, SUM_KEY.pdi, SUM_KEY.gol],
      '2.2': [SUM_KEY.nas, SUM_KEY.gar, SUM_KEY.ber, SUM_KEY.sej],
      '2.3': [SUM_KEY.per, SUM_KEY.ppp, SUM_KEY.psi, SUM_KEY.pan],
      '2.4': [SUM_KEY.han, SUM_KEY.dem, SUM_KEY.pbb, SUM_KEY.pkp],
      '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
    },
    [FORM_TYPE.dp]: {
      '1': [SUM_KEY.pJum],
      '2.1': [SUM_KEY.pkb],
      '2.2': [SUM_KEY.ger],
      '2.3': [SUM_KEY.pdi],
      '2.4': [SUM_KEY.gol],

      '2.5': [SUM_KEY.nas],
      '2.6': [SUM_KEY.gar],
      '2.7': [SUM_KEY.ber],
      '2.8': [SUM_KEY.sej],

      '2.9': [SUM_KEY.per],
      '2.10': [SUM_KEY.ppp],
      '2.11': [SUM_KEY.psi],
      '2.12': [SUM_KEY.pan],

      '2.13': [SUM_KEY.han],
      '2.14': [SUM_KEY.dem],
      '2.15': [SUM_KEY.pbb],
      '2.16': [SUM_KEY.pkp],

      '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
    }
  };

  Object = Object;
  IMAGE_STATUS = IMAGE_STATUS;
  VALIDATORS = [Validators.pattern('^[0-9]{1,3}$')];

  // Stays constant after first set.
  kelId: number;
  tpsNo: number;
  kelName: string;
  tpsData: TpsData;

  // New TpsImage is emitted when the previous one completes.
  tps$ = new Subject<TpsImage>();

  // Reset these after digitizing an image.
  imageId: string;
  formGroup: FormGroup;
  formType: FORM_TYPE;
  halaman: string;
  approveStatus: boolean;
  autoSumSub: Subscription;

  isLoading = false;

  constructor(
    public userService: UserService,
    public location: Location,
    private fsdb: AngularFirestore,
    private api: ApiService,
    private formBuilder: FormBuilder,
    private router: Router,
    route: ActivatedRoute,
    hie: HierarchyService
  ) {
    route.paramMap
      .pipe(
        switchMap(params => {
          this.kelId = +params.get('kelId');
          this.tpsNo = +params.get('tpsNo');
          this.imageId = params.get('imageId');
          hie
            .get$(this.kelId)
            .pipe(take(1))
            .toPromise()
            .then(node => (this.kelName = node.name));
          return this.fsdb
            .doc<TpsData>(FsPath.tps(this.kelId, this.tpsNo))
            .valueChanges()
            .pipe(take(1));
        })
      )
      .subscribe(tpsData => {
        this.tpsData = tpsData;
        const img = this.tpsData.images[this.imageId];
        if (img) {
          this.tps$.next(img);
        } else {
          this.digitizeNextImage();
        }
      });
  }

  digitizeNextImage() {
    this.reset();
    let earliest: TpsImage = null;
    for (const id of Object.keys(this.tpsData.images)) {
      const img = this.tpsData.images[id];
      if (
        img.status === IMAGE_STATUS.new &&
        (!this.imageId || earliest.uploader.ts > img.uploader.ts)
      ) {
        this.imageId = id;
        earliest = img;
      }
    }

    if (this.imageId) {
      this.tps$.next(earliest);
    } else {
      this.router.navigate(['/t', this.kelId]);
    }
  }

  reset() {
    this.imageId = null;
    this.formGroup = null;
    this.formType = null;
    this.halaman = null;
    this.approveStatus = null;
    this.tryUnsubscribe();
  }

  ngOnDestroy() {
    this.tryUnsubscribe();
  }

  setFormType(type: FORM_TYPE) {
    console.log('setting', type);
    this.formType = type;
    this.halaman = null;
  }

  setHalaman(hal: string) {
    this.halaman = hal;
    const group = {};
    for (const key of this.LEMBAR[this.formType][hal]) {
      group[key] = [null, this.VALIDATORS];
    }
    this.formGroup = this.formBuilder.group(group);
    this.trySubscribe();

    setTimeout(() => {
      const inp: HTMLInputElement = document.querySelector('form input');
      inp.focus();
    }, 100);
  }

  trySubscribe() {
    this.tryUnsubscribe();
    const p1 = this.formGroup.get(SUM_KEY.pas1);
    const p2 = this.formGroup.get(SUM_KEY.pas2);
    if (!p1 || !p2) {
      return;
    }
    this.autoSumSub = combineLatest([
      p1.valueChanges.pipe(startWith(0)),
      p2.valueChanges.pipe(startWith(0))
    ]).subscribe((v: number[]) => {
      this.formGroup.get(SUM_KEY.sah).setValue(v[0] + v[1]);
    });
  }

  tryUnsubscribe() {
    if (this.autoSumSub) {
      this.autoSumSub.unsubscribe();
      this.autoSumSub = null;
    }
  }

  async approve(user: User, status: IMAGE_STATUS) {
    this.isLoading = true;
    const sum = {} as SumMap;
    if (this.formGroup) {
      this.formGroup.disable();
      for (const key of this.LEMBAR[this.formType][this.halaman]) {
        sum[key] = this.formGroup.get(key).value;
      }
    }

    try {
      const body: ApproveRequest = { sum, imageId: this.imageId, status };
      const res: any = await this.api.post(user, `approve`, body);
      if (res.ok) {
        console.log('ok');
        this.tpsData.images[this.imageId].status = status;
        setTimeout(this.digitizeNextImage.bind(this), 1000);
      } else {
        console.error(res);
        alert(JSON.stringify(res));
      }
    } catch (e) {
      console.error(e.message);
      alert(JSON.stringify(e.message));
    }

    if (this.formGroup) {
      this.formGroup.enable();
    }
    this.isLoading = false;
    this.approveStatus = true;
  }

  getFormFields() {
    const lembar = this.LEMBAR[this.formType];
    return lembar[this.halaman];
  }

  getHalaman() {
    const lembar = this.LEMBAR[this.formType];
    return Object.keys(lembar).sort((a, b) => this.toInt(a) - this.toInt(b));
  }

  toInt(s) {
    const i = s.indexOf('.');
    if (i === -1) {
      return +s * 100;
    }
    return +s.substring(0, i) * 100 + +s.substring(i + 1);
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
