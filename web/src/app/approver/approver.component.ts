import {
  Component,
  OnInit,
  Input,
  HostListener,
  ViewChild,
  ElementRef
} from '@angular/core';
import {
  getServingUrl,
  Upsert,
  FsPath,
  Relawan,
  ApiApproveRequest,
  SUM_KEY
} from 'shared';
import { shareReplay, filter, map, tap } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-approver',
  templateUrl: './approver.component.html',
  styles: [``]
})
export class ApproverComponent implements OnInit {
  @ViewChild('tbl') el: ElementRef;
  @Input() kelurahanId: number;
  @Input() tpsNo: number;
  @Input() color = '';
  @Input() user: Relawan;

  HEIGHT = 400;

  upsert$: Observable<Upsert>;
  formGroup: FormGroup;
  isLoading = false;

  constructor(
    private fsdb: AngularFirestore,
    formBuilder: FormBuilder,
    private api: ApiService
  ) {
    this.formGroup = formBuilder.group({
      paslon1Ctrl: [null, [Validators.pattern('^[0-9]{1,3}$')]],
      paslon2Ctrl: [null, [Validators.pattern('^[0-9]{1,3}$')]],
      sahCtrl: [null, [Validators.pattern('^[0-9]{1,3}$')]],
      tidakSahCtrl: [null, [Validators.pattern('^[0-9]{1,3}$')]]
    });

    combineLatest(
      this.formGroup.get('paslon1Ctrl').valueChanges,
      this.formGroup.get('paslon2Ctrl').valueChanges
    ).subscribe(([p1, p2]) => {
      this.formGroup.get('sahCtrl').setValue((p1 || 0) + (p2 || 0));
    });
  }

  ngOnInit() {
    this.checkVisibilityChange();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.checkVisibilityChange();
  }

  @HostListener('window:scroll', ['$event'])
  scrollHandler() {
    this.checkVisibilityChange();
  }

  checkVisibilityChange() {
    if (this.upsert$ || !this.el) {
      return;
    }
    const el = this.el.nativeElement;
    const r = el.getBoundingClientRect();
    const visible =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom - this.HEIGHT <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      r.right <= (window.innerWidth || document.documentElement.clientWidth);
    if (visible) {
      this.setUpsert();
    } else {
      console.log('notset');
    }
  }

  setUpsert() {
    this.upsert$ = this.fsdb
      .collection<Upsert>(FsPath.upserts(), ref =>
        ref
          .where('kelId', '==', this.kelurahanId)
          .where('tpsNo', '==', this.tpsNo)
          .where('deleted', '==', false)
          .orderBy('uploader.ts')
          .limit(1)
      )
      .valueChanges()
      .pipe(
        filter(arr => arr.length > 0),
        map(arr => arr[0]),
        tap(u => {
          this.formGroup.get('paslon1Ctrl').setValue(u.data.sum.paslon1);
          this.formGroup.get('paslon2Ctrl').setValue(u.data.sum.paslon2);
          this.formGroup.get('sahCtrl').setValue(u.data.sum.sah);
          this.formGroup.get('tidakSahCtrl').setValue(u.data.sum.tidakSah);
        }),
        shareReplay(1)
      );
  }

  gsu(url, size) {
    return getServingUrl(url, size);
  }

  async approve(u: Upsert, del: boolean) {
    this.isLoading = true;
    this.formGroup.disable();
    // TODO: support pileg
    const sum = {
      paslon1: this.formGroup.get('paslon1Ctrl').value,
      paslon2: this.formGroup.get('paslon2Ctrl').value,
      sah: this.formGroup.get('sahCtrl').value,
      tidakSah: this.formGroup.get('tidakSahCtrl').value,
      cakupan: del ? 0 : 1,
      pending: 0,
      error: 0
    } as { [key in SUM_KEY]: number };
    const request: ApiApproveRequest = {
      kelurahanId: u.kelId,
      tpsNo: u.tpsNo,
      data: {
        sum,
        updateTs: 0,
        imageId: u.data.imageId,
        url: null
      },
      delete: del
    };
    try {
      const res: any = await this.api.post(this.user.auth, `approve`, request);
      if (res.ok) {
        console.log('ok');
        u.deleted = del;
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

  // const mapLink =
  // const img =
  //   `Location:<br><a href="${mapLink}" target="_blank">` +
  //   '<img src="https://maps.googleapis.com/maps/api/staticmap?center=' +
  //   `${m.y},${m.x}&zoom=15&size=300x200&markers=${m.y},${m.x}` +
  //   '&key=AIzaSyBuqsL30sWYNULCOwbKB1InlldUHl3DWoo"></a>';
}
