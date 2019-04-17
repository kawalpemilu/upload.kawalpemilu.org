import {
  Component,
  OnDestroy,
  Input,
  OnInit,
  Output,
  EventEmitter
} from '@angular/core';
import {
  FsPath,
  TpsData,
  SumMap,
  ApproveRequest,
  SUM_KEY,
  TpsImage,
  FORM_TYPE,
  enumEntries,
  IS_PLANO,
  Halaman,
  HierarchyNode,
  USER_ROLE
} from 'shared';
import { startWith, take, distinctUntilChanged } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { combineLatest, Subscription, Subject } from 'rxjs';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { Location } from '@angular/common';
import { HierarchyService } from '../hierarchy.service';

enum LEMBAR_KEY {
  PILPRES = 1,
  PARTAI4,
  PARTAI16_PLANO,
  PARTAI4_NO_DIGITIZE,
  PARTAI16_PLANO_NO_DIGITIZE,
  PARTAI5_NO_DIGITIZE,
  PARTAI20_PLANO_NO_DIGITIZE,
  CALON3_NO_DIGITIZE,
  CALON5_PLANO_NO_DIGITIZE
}

type LembarSpec = { [halaman in Halaman]: SUM_KEY[] };

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
export class ApproverComponent implements OnInit, OnDestroy {
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

  LEMBAR_SPEC: { [key in LEMBAR_KEY]: LembarSpec } = {
    [LEMBAR_KEY.PILPRES]: {
      '1': [SUM_KEY.jum],
      '2': [SUM_KEY.pas1, SUM_KEY.pas2, SUM_KEY.sah, SUM_KEY.tSah]
    } as LembarSpec,

    [LEMBAR_KEY.PARTAI4]: {
      '1': [SUM_KEY.pJum],
      '2.1': [SUM_KEY.pkb, SUM_KEY.ger, SUM_KEY.pdi, SUM_KEY.gol],
      '2.2': [SUM_KEY.nas, SUM_KEY.gar, SUM_KEY.ber, SUM_KEY.sej],
      '2.3': [SUM_KEY.per, SUM_KEY.ppp, SUM_KEY.psi, SUM_KEY.pan],
      '2.4': [SUM_KEY.han, SUM_KEY.dem, SUM_KEY.pbb, SUM_KEY.pkp],
      '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
    } as LembarSpec,

    [LEMBAR_KEY.PARTAI16_PLANO]: {
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
    } as LembarSpec,

    [LEMBAR_KEY.PARTAI4_NO_DIGITIZE]: {
      '1': null,
      '2.1': null,
      '2.2': null,
      '2.3': null,
      '2.4': null,
      '3': null
    } as LembarSpec,

    [LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE]: {
      '1': null,

      '2.1': null,
      '2.2': null,
      '2.3': null,
      '2.4': null,

      '2.5': null,
      '2.6': null,
      '2.7': null,
      '2.8': null,

      '2.9': null,
      '2.10': null,
      '2.11': null,
      '2.12': null,

      '2.13': null,
      '2.14': null,
      '2.15': null,
      '2.16': null,

      '3': null
    } as LembarSpec,

    [LEMBAR_KEY.PARTAI5_NO_DIGITIZE]: {
      '1': null,
      '2.1': null,
      '2.2': null,
      '2.3': null,
      '2.4': null,
      '2.5': null,
      '3': null
    } as LembarSpec,

    [LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE]: {
      '1': null,

      '2.1': null,
      '2.2': null,
      '2.3': null,
      '2.4': null,

      '2.5': null,
      '2.6': null,
      '2.7': null,
      '2.8': null,

      '2.9': null,
      '2.10': null,
      '2.11': null,
      '2.12': null,

      '2.13': null,
      '2.14': null,
      '2.15': null,
      '2.16': null,

      '2.17': null,
      '2.18': null,
      '2.19': null,
      '2.20': null,

      '3': null
    } as LembarSpec,

    [LEMBAR_KEY.CALON3_NO_DIGITIZE]: {
      '1': null,
      '2.1': null,
      '2.2': null,
      '2.3': null,
      '3': null
    } as LembarSpec,

    [LEMBAR_KEY.CALON5_PLANO_NO_DIGITIZE]: {
      '1': null,
      '2.1': null,
      '2.2': null,
      '2.3': null,
      '2.4': null,
      '2.5': null,
      '3': null
    } as LembarSpec
  };

  LEMBAR: { [key in FORM_TYPE]: { [key2 in IS_PLANO]: LembarSpec } } = {
    [FORM_TYPE.PPWP]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PILPRES],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PILPRES]
    },
    [FORM_TYPE.DPR]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4]
    },
    // These forms below are not digitized, only classified.
    [FORM_TYPE.DPRPB]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
    },
    [FORM_TYPE.DPRP]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
    },
    [FORM_TYPE.DPRK]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI5_NO_DIGITIZE]
    },
    [FORM_TYPE.DPRD_PROV]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
    },
    [FORM_TYPE.DPRD_KAB_KOTA]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
    },
    [FORM_TYPE.DPRA]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI5_NO_DIGITIZE]
    },
    [FORM_TYPE.DPD]: {
      [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.CALON5_PLANO_NO_DIGITIZE],
      [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.CALON3_NO_DIGITIZE]
    },
    [FORM_TYPE.OTHERS]: null,
    [FORM_TYPE.PEMANDANGAN]: null,
    [FORM_TYPE.MALICIOUS]: null
  };

  FORM_TYPE = FORM_TYPE;
  FORM_TYPE_ENTRIES = enumEntries(FORM_TYPE);

  IS_PLANO = IS_PLANO;

  USER_ROLE = USER_ROLE;

  Object = Object;
  VALIDATORS = [Validators.pattern('^[0-9]{1,3}$')];

  initialKelId: number;
  initialTpsNo: number;
  @Input() kelId: number;
  @Input() tpsNo: number;
  @Input() imageId: string;
  kelName: string;
  tpsData: TpsData;

  @Output() imageIdChange = new EventEmitter<string>();
  @Output() completed = new EventEmitter();

  // New TpsImage is emitted when the previous one completes.
  tps$ = new Subject<TpsImage>();

  // Reset these after digitizing an image.
  formGroup: FormGroup;
  formType: FORM_TYPE;
  isPlano: IS_PLANO;
  halaman: Halaman;
  approveStatus: 'pending' | 'ready' | 'approved';
  autoSumSub: Subscription;

  isChangeKel = false;
  isLoading = false;

  constructor(
    public userService: UserService,
    public location: Location,
    private fsdb: AngularFirestore,
    private api: ApiService,
    private formBuilder: FormBuilder,
    private hie: HierarchyService
  ) {}

  ngOnInit() {
    this.initialKelId = this.kelId;
    this.initialTpsNo = this.tpsNo;

    this.hie
      .get$(this.kelId)
      .pipe(take(1))
      .toPromise()
      .then(node => (this.kelName = node.name));

    this.fsdb
      .doc<TpsData>(FsPath.tps(this.kelId, this.tpsNo))
      .valueChanges()
      .pipe(take(1))
      .toPromise()
      .then(tpsData => {
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
    this.imageId = '';
    this.imageIdChange.emit('');
    this.formType = null;
    this.isPlano = null;
    this.halaman = null;
    this.formGroup = null;
    this.approveStatus = 'pending';
    this.tryUnsubscribe();
    let next: TpsImage = null;
    for (const id of Object.keys(this.tpsData.images)) {
      const img = this.tpsData.images[id];
      if (!img.c1 && (!this.imageId || next.uploader.ts > img.uploader.ts)) {
        this.imageId = id;
        this.imageIdChange.emit(id);
        next = img;
      }
    }
    this.tps$.next(next);

    if (!this.imageId) {
      this.imageId = 'done';
      this.imageIdChange.emit('done');
      this.hie.update(this.initialKelId).then(() => {
        setTimeout(() => {
          this.imageId = '';
          this.imageIdChange.emit('');
          this.completed.next();
        }, 100);
      });
    }
  }

  ngOnDestroy() {
    this.tryUnsubscribe();
  }

  trySubscribe() {
    this.tryUnsubscribe();
    const p1 = this.formGroup.get(SUM_KEY[SUM_KEY.pas1]);
    const p2 = this.formGroup.get(SUM_KEY[SUM_KEY.pas2]);
    if (!p1 || !p2) {
      return;
    }
    this.autoSumSub = combineLatest([
      p1.valueChanges.pipe(
        startWith(0),
        distinctUntilChanged()
      ),
      p2.valueChanges.pipe(
        startWith(0),
        distinctUntilChanged()
      )
    ]).subscribe((v: number[]) => {
      this.formGroup.get(SUM_KEY[SUM_KEY.sah]).setValue(v[0] + v[1]);
    });
  }

  tryUnsubscribe() {
    if (this.autoSumSub) {
      this.autoSumSub.unsubscribe();
      this.autoSumSub = null;
    }
  }

  async approve() {
    this.isLoading = true;
    const sum = {} as SumMap;
    if (this.formGroup) {
      this.formGroup.disable();
      for (const key of this.LEMBAR[this.formType][this.isPlano][
        this.halaman
      ]) {
        sum[key] = this.formGroup.get(key).value;
      }
    }

    try {
      const user = this.userService.user;
      const body: ApproveRequest = {
        kelId: this.kelId,
        kelName: '',
        tpsNo: this.tpsNo,
        sum,
        imageId: this.imageId,
        c1: {
          type: this.formType,
          plano: this.isPlano,
          halaman: this.halaman || '0'
        }
      };
      const res: any = await this.api.post(user, `approve`, body);
      if (res.ok) {
        console.log('ok');
        this.approveStatus = 'approved';
        this.tpsData.images[this.imageId].c1 = body.c1;
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
  }

  setFormType(type: FORM_TYPE) {
    this.formType = +type;
    this.approveStatus =
      this.formType === FORM_TYPE.OTHERS ||
      this.formType === FORM_TYPE.PEMANDANGAN ||
      this.formType === FORM_TYPE.MALICIOUS
        ? 'ready'
        : 'pending';
    this.isPlano = null;
    this.halaman = null;
    this.formGroup = null;
    this.tryUnsubscribe();
  }

  setIsPlano(plano: IS_PLANO) {
    this.approveStatus = 'pending';
    this.isPlano = plano;
    this.halaman = null;
    this.formGroup = null;
    this.tryUnsubscribe();
  }

  setHalaman(hal: Halaman) {
    this.halaman = hal;
    if (!this.getLembar()) {
      this.approveStatus = 'ready';
      return;
    }

    const group = {};
    for (const key of this.getLembar()) {
      group[key] = [null, this.VALIDATORS];
    }
    this.formGroup = this.formBuilder.group(group);
    this.trySubscribe();

    setTimeout(() => {
      const inp: HTMLInputElement = document.querySelector('form input');
      if (inp) {
        inp.focus();
      }
    }, 100);
  }

  getLembar() {
    return this.LEMBAR[this.formType][this.isPlano][this.halaman];
  }

  getHalaman() {
    const lembar = this.LEMBAR[this.formType][this.isPlano];
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

  changeKel() {
    this.isChangeKel = true;
    setTimeout(() => {
      const els = document.getElementsByClassName('searchwilayah');
      if (els.length > 0) {
        (els[0] as HTMLInputElement).focus();
      }
    }, 100);
  }

  changeKelId(state: HierarchyNode) {
    this.kelId = state.id;
    this.hie
      .get$(this.kelId)
      .pipe(take(1))
      .toPromise()
      .then(node => {
        this.kelName = node.name;
        this.isChangeKel = false;
      });
  }

  // const mapLink =
  // const img =
  //   `Location:<br><a href="${mapLink}" target="_blank">` +
  //   '<img src="https://maps.googleapis.com/maps/api/staticmap?center=' +
  //   `${m.y},${m.x}&zoom=15&size=300x200&markers=${m.y},${m.x}` +
  //   '&key=AIzaSyBuqsL30sWYNULCOwbKB1InlldUHl3DWoo"></a>';
}
