import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, catchError, map } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { Observable, of, combineLatest } from 'rxjs';
import { User } from 'firebase';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import {
  Relawan,
  FsPath,
  CodeReferral,
  USER_ROLE,
  LOCAL_STORAGE_LAST_URL,
  lsSetItem,
  APP_SCOPED_PREFIX_URL
} from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material';

interface RegistrationState {
  relawan: Relawan;
  code: CodeReferral;
}

@Component({
  selector: 'app-copy-snack-bar-component',
  template: `
    Kode referral telah dicopy
  `,
  styles: ['']
})
export class CopySnackBarComponent {}

@Component({
  selector: 'app-registrasi',
  templateUrl: './registrasi.component.html',
  styles: [
    `
      .moderator {
        color: brown;
      }
      .admin {
        color: red;
      }
    `
  ]
})
export class RegistrasiComponent implements OnInit {
  state$: Observable<RegistrationState>;
  theCode: string;
  theCode$: Observable<string>;
  formGroup: FormGroup;
  error: string;
  USER_ROLE = USER_ROLE;
  isLoading = false;
  useSuperCode = true;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const code$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.theCode = params.get('code');
        return !this.theCode || this.theCode.length !== 10
          ? of(null)
          : this.fsdb
              .doc<CodeReferral>(FsPath.codeReferral(this.theCode))
              .valueChanges()
              .pipe(
                map(c => (c && (c.bulk || !c.claimer) ? c : null)),
                catchError(e => {
                  this.error = e.message;
                  return of(null);
                }),
                switchMap(c => {
                  if (c) {
                    const url = `/c/${this.theCode}`;
                    console.log('Save last url: ', url);
                    lsSetItem(LOCAL_STORAGE_LAST_URL, url);
                    return this.userService.relawan$.pipe(
                      map(relawan => {
                        if (relawan && relawan.depth > 0) {
                          console.log('Kamu tidak memerlukan kode lagi');
                          return null;
                        }
                        return c;
                      })
                    );
                  }
                  return of(c);
                })
              );
      })
    );

    this.state$ = combineLatest(code$, this.userService.relawan$).pipe(
      map(([code, relawan]) => ({ code, relawan }))
    );

    this.theCode$ = this.userService.relawan$.pipe(
      switchMap(async r => {
        if (!r) {
          return '';
        }
        if (r.theCode) {
          return r.theCode;
        }
        const body = { code: 1, link: APP_SCOPED_PREFIX_URL + r.profile.link };
        const res: any = await this.api.post(r.auth, `register/login`, body);
        if (res.ok) {
          return res.code;
        }
        return '';
      })
    );
    this.formGroup = this.formBuilder.group({
      namaCtrl: [null, [Validators.pattern('^[a-zA-Z ]{1,50}$')]]
    });
    console.log('Registrasi inited');
  }

  async registerCode(user: User, code: CodeReferral) {
    this.isLoading = true;
    const url = `register/${this.theCode}`;
    const reg: any = await this.api.post(user, url, {});
    console.log('register', reg);
    if (reg.error) {
      this.error = reg.error;
    } else {
      this.router.navigate(['/c', 0]);
    }
    this.isLoading = false;
  }

  getError(ctrlName: string) {
    const ctrl = this.formGroup.get(ctrlName);
    if (ctrl.hasError('pattern')) {
      return 'Nama hanya boleh alphabet, max 50 huruf';
    }
    return '';
  }

  getReferralCodes(relawan: Relawan, claimed: boolean) {
    return Object.keys(relawan.code || {})
      .filter(code => !!relawan.code[code].claimer === claimed)
      .sort((a, b) => {
        const ca = relawan.code[a];
        const cb = relawan.code[b];
        const dr4 = ca.claimer
          ? (cb.claimer.dr4 || 0) - (ca.claimer.dr4 || 0)
          : 0;
        return dr4 ? dr4 : ca.claimedTs - cb.claimedTs;
      });
  }

  copyCode(el) {
    el.select();

    // https://stackoverflow.com/questions/34045777/copy-to-clipboard-using-javascript-in-ios
    const oldContentEditable = el.contentEditable,
      oldReadOnly = el.readOnly,
      range = document.createRange();

    el.contentEditable = true;
    el.readOnly = false;
    range.selectNodeContents(el);

    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(range);

    el.setSelectionRange(0, 999); // A big number, to cover anything that could be inside the element.

    el.contentEditable = oldContentEditable;
    el.readOnly = oldReadOnly;

    document.execCommand('copy');

    this.snackBar.openFromComponent(CopySnackBarComponent, {
      duration: 1500
    });
  }

  async createReferralCode(u: User) {
    this.isLoading = true;
    const namaCtrl = this.formGroup.get('namaCtrl');
    const nama = { nama: namaCtrl.value };
    const code: any = await this.api.post(u, 'register/create_code', nama);
    if (code.error) {
      alert(code.error);
    }
    console.log('got code', code);
    namaCtrl.setValue('');
    this.isLoading = false;
  }
}
