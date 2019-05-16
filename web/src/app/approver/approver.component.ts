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
  USER_ROLE,
  KPU_SCAN_UID,
  KpuData,
  LEMBAR,
  C1Form
} from 'shared';
import { startWith, take, distinctUntilChanged } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { combineLatest, Subscription, Subject } from 'rxjs';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';
import { Location } from '@angular/common';
import { HierarchyService } from '../hierarchy.service';
import { AngularFirePerformance } from '@angular/fire/performance';

import * as firebase from 'firebase/app';

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

  FORM_TYPE = FORM_TYPE;
  FORM_TYPE_ENTRIES = enumEntries(FORM_TYPE);

  IS_PLANO = IS_PLANO;
  LEMBAR = LEMBAR;

  USER_ROLE = USER_ROLE;

  Object = Object;
  VALIDATORS = [Validators.pattern('^[1-3]?[0-9]{1,3}$')];

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
  approveStatus: 'pending' | 'ready' | 'approved' = 'pending';
  autoSumSub: Subscription;

  isChangeKel = false;
  isLoading = false;

  kpuData: KpuData;

  constructor(
    public userService: UserService,
    public location: Location,
    private fsdb: AngularFirestore,
    private api: ApiService,
    private formBuilder: FormBuilder,
    private hie: HierarchyService,
    private perf: AngularFirePerformance
  ) {}

  async ngOnInit() {
    this.initialKelId = this.kelId;
    this.initialTpsNo = this.tpsNo;

    this.hie
      .get$(this.kelId)
      .pipe(take(1))
      .toPromise()
      .then(node => (this.kelName = node.name));

    this.kpuData = await this.fsdb
      .doc<KpuData>(FsPath.kpu(this.kelId))
      .valueChanges()
      .pipe(
        this.perf.trace('kpuData'),
        take(1)
      )
      .toPromise();

    this.fsdb
      .doc<TpsData>(FsPath.tps(this.kelId, this.tpsNo))
      .valueChanges()
      .pipe(take(1))
      .toPromise()
      .then(tpsData => {
        tpsData.autofill = tpsData.autofill || {};
        if (this.kpuData) {
          const data = this.kpuData[this.tpsNo];
          if (data) {
            const prefix = FORM_TYPE.PPWP + ';' + IS_PLANO.NO;
            tpsData.autofill[`${prefix};1;kpu`] = {
              [SUM_KEY.jum]: data[SUM_KEY.jum]
            } as SumMap;
            tpsData.autofill[`${prefix};2;kpu`] = {
              [SUM_KEY.pas1]: data[SUM_KEY.pas1],
              [SUM_KEY.pas2]: data[SUM_KEY.pas2],
              [SUM_KEY.sah]: data[SUM_KEY.sah],
              [SUM_KEY.tSah]: data[SUM_KEY.tSah]
            } as SumMap;
          }
        }
        this.tpsData = tpsData;
        const img = this.tpsData.images[this.imageId];
        if (img) {
          this.setExistingTipe(img);
          this.tps$.next(img);
          this.autofill(img);
        } else {
          this.digitizeNextImage();
        }
      });
  }

  setExistingTipe(i: TpsImage) {
    if (i.c1 && i.c1.type && i.c1.plano && i.c1.halaman) {
      // @ts-ignore
      const tipe = (i.tipe =
        i.c1.type + ';' + i.c1.plano + ';' + i.c1.halaman + ';ex');
      this.tpsData.autofill[tipe] = i.sum;
    }
  }

  autofill(i: TpsImage) {
    // @ts-ignore
    const tipe = i.tipe;
    if (tipe) {
      const t = tipe.split(';');
      this.setFormType(+t[0]);
      this.setIsPlano(+t[1]);
      this.setHalaman(t[2]);
      if (this.tpsData.autofill) {
        const sum = this.tpsData.autofill[tipe];
        if (sum) {
          for (const key of Object.keys(sum)) {
            if (!(key in SUM_KEY)) {
              delete sum[key];
            }
          }
          this.formGroup.setValue(sum);
        }
      }
    }
  }

  digitizeNextImage() {
    this.kelId = this.initialKelId;
    this.tpsNo = this.initialTpsNo;
    this.imageId = '';
    this.imageIdChange.emit('');
    this.formType = null;
    this.isPlano = null;
    this.halaman = null;
    this.formGroup = null;
    this.approveStatus = 'pending';
    this.tryUnsubscribe();
    let next: TpsImage = null;

    const imgs = this.tpsData.images;
    let lembar = 1;
    for (const id of Object.keys(imgs).sort((a, b) => {
      const x = imgs[a];
      const y = imgs[b];
      if (x.meta && x.meta.m && y.meta && y.meta.m) {
        const p = x.meta.m[0];
        const q = y.meta.m[0];
        return p < q ? -1 : p > q ? 1 : 0;
      }
      return x.uploader.ts - y.uploader.ts;
    })) {
      const i = imgs[id];
      if (i.uploader.uid === KPU_SCAN_UID) {
        // @ts-ignore
        i.tipe = FORM_TYPE.PPWP + ';' + IS_PLANO.NO + ';' + lembar + ';kpu';
        lembar = lembar === 1 ? 2 : 1;
      }
      this.setExistingTipe(i);
    }

    for (const id of Object.keys(imgs)) {
      const img = imgs[id];
      if (!img.c1 && (!this.imageId || next.uploader.ts > img.uploader.ts)) {
        this.imageId = id;
        next = img;
      }
    }
    this.tps$.next(next);
    if (this.imageId) {
      this.imageIdChange.emit(this.imageId);
      this.autofill(next);
    } else {
      this.imageId = 'done';
      this.imageIdChange.emit('done');
      setTimeout(() => {
        this.hie.update(this.initialKelId).then(() => {
          setTimeout(() => {
            this.imageId = '';
            this.imageIdChange.emit('');
            this.completed.next();
          }, 100);
        });
      }, 1000);
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
    const perf = firebase.performance();
    const trace = perf.trace('approve');
    trace.start();
    this.isLoading = true;
    const sum = {} as SumMap;
    if (this.formGroup) {
      this.formGroup.disable();
      for (const key of LEMBAR[this.formType][this.isPlano][this.halaman]) {
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
    trace.stop();
  }

  skipDulu() {
    this.tpsData.images[this.imageId].c1 = {} as C1Form;
    this.digitizeNextImage();
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
    return LEMBAR[this.formType][this.isPlano][this.halaman];
  }

  getHalaman() {
    const lembar = LEMBAR[this.formType][this.isPlano];
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
