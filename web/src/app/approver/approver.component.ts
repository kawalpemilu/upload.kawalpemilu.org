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
  ImageMetadata,
  Upsert,
  FsPath,
  Relawan,
  ApiApproveRequest
} from 'shared';
import { shareReplay, filter, map, tap } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
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
    if (this.upsert$) {
      return;
    }
    const el = this.el.nativeElement;
    const r = el.getBoundingClientRect();
    const visible =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom <=
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
          .where('k', '==', this.kelurahanId)
          .where('n', '==', this.tpsNo)
          .where('l', '==', false)
          .orderBy('t', 'desc')
          .limit(1)
      )
      .valueChanges()
      .pipe(
        filter(arr => arr.length > 0),
        map(arr => arr[0]),
        tap(u => {
          this.formGroup.get('paslon1Ctrl').setValue(u.a.s[0]);
          this.formGroup.get('paslon2Ctrl').setValue(u.a.s[1]);
          this.formGroup.get('sahCtrl').setValue(u.a.s[2]);
          this.formGroup.get('tidakSahCtrl').setValue(u.a.s[3]);
        }),
        shareReplay(1)
      );
  }

  gsu(url, size) {
    return getServingUrl(url, size);
  }

  mapLink(m: ImageMetadata) {
    return `https://www.google.com/maps/place/${m.y},${m.x}/@${m.y},${m.x},15z`;
  }

  async approve(u: Upsert, del: boolean) {
    this.isLoading = true;
    this.formGroup.disable();
    const request: ApiApproveRequest = {
      kelurahanId: u.k,
      tpsNo: u.n,
      aggregate: {
        s: [
          this.formGroup.get('paslon1Ctrl').value,
          this.formGroup.get('paslon2Ctrl').value,
          this.formGroup.get('sahCtrl').value,
          this.formGroup.get('tidakSahCtrl').value
        ],
        x: [],
        u: null
      },
      imageId: u.e,
      delete: del,
    };
    try {
      const res: any = await this.api.post(this.user.u, `approve`, request);
      if (res.ok) {
        console.log('ok');
      } else {
        console.error(res);
      }
    } catch (e) {
      console.error(e.message);
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
