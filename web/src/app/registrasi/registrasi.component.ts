import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UserService } from '../user.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  switchMap,
  catchError,
  map,
  tap,
  take,
  shareReplay
} from 'rxjs/operators';
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
  APP_SCOPED_PREFIX_URL,
  canGenerateCustomCode,
  PublicProfile
} from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material';
import { Title } from '@angular/platform-browser';

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
  @ViewChild('wa') waEl: ElementRef;

  code$: Observable<string>;
  state$: Observable<RegistrationState>;
  theCode: string;
  theCode$: Observable<string>;
  formGroup: FormGroup;
  error: string;
  USER_ROLE = USER_ROLE;
  isLoading = false;
  useCustomCode = false;
  claimedCodeReferrals: string[];
  unClaimedCodeReferrals: string[];
  waIsSet = false;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private titleService: Title
  ) {
    this.userService.relawan$
      .pipe(take(1))
      .toPromise()
      .then(r => {
        if (r && r.auth) {
          this.useCustomCode = canGenerateCustomCode(r.auth);
        }
      })
      .catch(console.error);
  }

  ngOnInit() {
    const code$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.theCode = params.get('code') || '';
        if (this.theCode.length !== 10) {
          this.theCode = this.theCode.toLocaleLowerCase();
        }
        return this.theCode.length > 15
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
      map(([code, relawan]) => ({ code, relawan })),
      tap(state => {
        const from = (state.code && state.code.issuer.name) || '???';
        const to = state.relawan && state.relawan.profile.name;
        if (to) {
          if (state.relawan.depth > 0) {
            this.titleService.setTitle(`${to} sebarkan undangan :: KPJS 2019`);
          } else {
            this.titleService.setTitle(`${to} diundang ${from} :: KPJS 2019`);
          }
        } else {
          this.titleService.setTitle(`Referral dari ${from} :: KPJS 2019`);
        }

        this.claimedCodeReferrals = [];
        this.unClaimedCodeReferrals = [];
        if (state.relawan) {
          console.log('conpute sort');
          Object.keys(state.relawan.code || {}).forEach(code => {
            const c = state.relawan.code[code];
            if (c.claimer) {
              this.claimedCodeReferrals.push(code);
            } else {
              this.unClaimedCodeReferrals.push(code);
            }
          });

          this.claimedCodeReferrals = this.claimedCodeReferrals.sort((a, b) => {
            const ca = state.relawan.code[a];
            const cb = state.relawan.code[b];
            const dr4 = ca.claimer
              ? (cb.claimer.dr4 || 0) - (ca.claimer.dr4 || 0)
              : 0;
            return dr4 ? dr4 : ca.claimedTs - cb.claimedTs;
          });

          this.unClaimedCodeReferrals = this.unClaimedCodeReferrals.sort(
            (a, b) => {
              const ca = state.relawan.code[a];
              const cb = state.relawan.code[b];
              return cb.issuedTs - ca.issuedTs;
            }
          );
        }
      }),
      shareReplay(1)
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
      }),
      shareReplay(1)
    );
    this.formGroup = this.formBuilder.group({
      namaCtrl: [null, [Validators.pattern('^[a-z]{1,15}$')]]
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
      return 'Nama hanya boleh lowercase, max 15 huruf';
    }
    return '';
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
    const body = { nama: namaCtrl.value };
    const code: any = await this.api.post(u, 'register/create_code', body);
    if (code.error) {
      alert(code.error);
    }
    console.log('got code', code);
    namaCtrl.setValue('');
    this.isLoading = false;
  }

  share(ccc) {
    // @ts-ignore
    FB.ui({ method: 'share', href: this.shareUrl(ccc) }, function() {});
  }

  shareUrl(ccc) {
    return `https://upload.kawalpemilu.org/c/${ccc}`;
  }

  whatsappHref(ccc) {
    if (!this.waIsSet) {
      this.waIsSet = true;
      const url = encodeURIComponent(this.shareUrl(ccc));
      const text = `Yuk ikut KawalPemilu 2019, pake referral saya: ${url} #PantauFotoUpload`;
      setTimeout(() => {
        this.waEl.nativeElement.href = `whatsapp://send?text=${text}`;
      }, 1000);
    }
  }

  isGroupReferral(p: PublicProfile) {
    return canGenerateCustomCode(p);
  }

  getIssuerName(p: PublicProfile, code: string) {
    if (this.isGroupReferral(p)) {
      return code.toUpperCase();
    }
    return p.name;
  }
}
