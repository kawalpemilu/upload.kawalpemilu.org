import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap, filter } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { Observable, of } from 'rxjs';
import { User } from 'firebase';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Relawan, FsPath, CodeReferral, Upsert } from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';

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
    private fsdb: AngularFirestore,
    private route: ActivatedRoute,
    private api: ApiService,
    private formBuilder: FormBuilder
  ) {}

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

  getReferralCodes(relawan: Relawan) {
    console.log(relawan);
    return Object.keys(relawan.c || {});
  }

  async registerCode(user: User) {
    this.isLoading = true;
    const url = `register/${this.theCode}?abracadabra=true`;
    console.log('register', await this.api.post(user, url, {}));
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
