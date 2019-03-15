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
  SUM_KEY,
  PILEG_FORM,
  PILPRES_FORM,
  Aggregate
} from 'shared';
import { shareReplay, filter, map, tap } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { ApiService } from '../api.service';
import { UploadService } from '../upload.service';

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

  PILPRES_FORM = PILPRES_FORM;
  PILEG_FORM = PILEG_FORM;
  HEIGHT = 400;

  upsert$: Observable<Upsert>;
  formGroup: FormGroup;
  isLoading = false;

  constructor(
    private fsdb: AngularFirestore,
    private api: ApiService,
    private uploadService: UploadService
  ) {}

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
          this.formGroup = this.uploadService.getFormGroup('^[0-9]{1,3}$');
          for (const p of PILEG_FORM.concat(PILPRES_FORM)) {
            this.formGroup.get(p.form).setValue(u.action.sum[p.form]);
          }
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
    const sum = {
      cakupan: del ? 0 : 1,
      pending: 0,
      error: 0
    } as { [key in SUM_KEY]: number };
    for (const p of PILEG_FORM.concat(PILPRES_FORM)) {
      sum[p.form] = this.formGroup.get(p.form).value;
    }

    const action: Aggregate = { sum, ts: 0, urls: [u.request.imageId] };
    try {
      const res: any = await this.api.post(this.user.auth, `approve`, action);
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
