import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap, take } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { Observable, of } from 'rxjs';
import { User } from 'firebase';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import {
  Relawan,
  FsPath,
  CodeReferral,
  Upsert,
  MAX_RELAWAN_TRUSTED_DEPTH,
  decodeAgg
} from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { HierarchyService } from '../hierarchy.service';

interface UploadDetail {
  kelId: number;
  kelName: string;
  tpsNo: number;
  servingUrl: string;
  hasProblem: number;
  imageId: string;
  uploadTs: number;
}

@Component({
  selector: 'app-registrasi',
  templateUrl: './registrasi.component.html',
  styleUrls: ['./registrasi.component.css']
})
export class RegistrasiComponent implements OnInit {
  theCode: string;
  code$: Observable<CodeReferral>;
  uploads$: Observable<Upsert[]>;
  formGroup: FormGroup;
  isLoading = false;

  constructor(
    public userService: UserService,
    private hie: HierarchyService,
    private fsdb: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private formBuilder: FormBuilder
  ) {}

  get MAX_TRUSTED_DEPTH() {
    return MAX_RELAWAN_TRUSTED_DEPTH;
  }

  ngOnInit() {
    this.code$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.theCode = params.get('code');
        return this.theCode && this.theCode.length === 10
          ? this.fsdb
              .doc(FsPath.codeReferral(this.theCode))
              .get()
              .pipe(map(s => s.data() as CodeReferral))
          : of(null);
      })
    );
    this.uploads$ = this.userService.user$.pipe(
      switchMap(user =>
        user
          ? this.fsdb
              .collection<Upsert>(FsPath.upserts(), ref =>
                ref.where('u', '==', user.uid).limit(10)
              )
              .valueChanges()
              .pipe(
                switchMap(async uploads => {
                  const details: UploadDetail[] = [];
                  for (const u of uploads) {
                    details.push({
                      kelId: u.k,
                      kelName: (await this.hie
                        .get$(u.k)
                        .pipe(take(1))
                        .toPromise()).name,
                      tpsNo: u.n,
                      servingUrl: u.a.u,
                      imageId: u.a.i,
                      hasProblem: decodeAgg(u.a.s).masalah,
                      uploadTs: u.a.x[0]
                    });
                  }
                  return details.sort((a, b) => b.uploadTs - a.uploadTs);
                })
              )
          : of([])
      )
    );
    this.formGroup = this.formBuilder.group({
      namaCtrl: [null, [Validators.pattern('^[a-zA-Z ]{1,20}$')]]
    });
    console.log('Registrasi inited');
  }

  getScopedUrl(p) {
    return UserService.SCOPED_PREFIX + p;
  }

  getError(ctrlName: string) {
    const ctrl = this.formGroup.get(ctrlName);
    if (ctrl.hasError('pattern')) {
      return 'Nama hanya boleh alfabet dengan panjang max 20';
    }
    return '';
  }

  getReferralCodes(relawan: Relawan, claimed: boolean) {
    return Object.keys(relawan.c || {})
      .filter(code => !!relawan.c[code].c === claimed)
      .sort((a, b) => {
        const ca = relawan.c[a];
        const cb = relawan.c[b];
        return cb.t - ca.t;
      });
  }

  async registerCode(user: User) {
    this.isLoading = true;
    const url = `register/${this.theCode}`;
    console.log('register', await this.api.post(user, url, {}));
    this.isLoading = false;
    this.router.navigate(['/c', 0]);
  }

  async fotoBermasalah(user: User, u: UploadDetail) {
    this.isLoading = true;
    const res = this.api.post(user, `problem`, { imageId: u.imageId });
    console.log('problem', await res);
    this.isLoading = false;
  }

  async createReferralCode(u: User) {
    this.isLoading = true;
    const namaCtrl = this.formGroup.get('namaCtrl');
    const code = await this.api.post(u, 'register/create_code', {
      nama: namaCtrl.value
    });
    console.log('got code', code);
    namaCtrl.setValue('');
    this.isLoading = false;
  }
}
