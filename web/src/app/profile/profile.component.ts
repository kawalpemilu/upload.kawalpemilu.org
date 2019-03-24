import { Component, OnInit } from '@angular/core';
import {
  APP_SCOPED_PREFIX_URL,
  Relawan,
  FsPath,
  USER_ROLE,
  RelawanPhotos
} from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, of, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import {
  switchMap,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  tap,
  shareReplay
} from 'rxjs/operators';
import { User } from 'firebase';
import { ApiService } from '../api.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  cari$ = new Subject<string>();
  USER_ROLE = USER_ROLE;
  Object = Object;

  relawan$: Observable<Relawan>;
  relawanPhotos$: Observable<RelawanPhotos>;
  relawans$: Observable<Relawan[]>;
  previousRole: USER_ROLE;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private route: ActivatedRoute,
    private api: ApiService
  ) {
    const uid$ = this.route.paramMap.pipe(map(params => params.get('uid')));
    this.relawan$ = uid$.pipe(
      switchMap(uid =>
        this.fsdb
          .doc<Relawan>(FsPath.relawan(uid))
          .valueChanges()
          .pipe(
            catchError(e => {
              console.log(e.message);
              return of(null);
            }),
            tap((r: Relawan) => {
              if (r) {
                this.previousRole = r.profile.role || 0;
              }
            }),
            shareReplay(1)
          )
      )
    );

    this.relawanPhotos$ = uid$.pipe(
      switchMap(uid =>
        this.fsdb
          .doc<RelawanPhotos>(FsPath.relawanPhoto(uid))
          .valueChanges()
          .pipe(
            catchError(e => {
              console.log(e.message);
              return of(null);
            })
          )
      )
    );

    this.relawans$ = this.cari$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(prefix =>
        this.fsdb
          .collection<Relawan>(FsPath.relawan(), ref =>
            ref
              .where('lowerCaseName', '>=', prefix.toLowerCase())
              .where('lowerCaseName', '<=', prefix.toLowerCase() + '{')
              .limit(5)
          )
          .valueChanges()
      )
    );
  }

  ngOnInit() {}

  get SCOPED_PREFIX() {
    return APP_SCOPED_PREFIX_URL;
  }

  async changeRole(user: User, relawan: Relawan, role: number) {
    if (
      role === USER_ROLE.ADMIN &&
      !confirm(
        `WARNING: THIS IS IRREVERSIBLE!\nPromote ${relawan.profile.name} to ${
          USER_ROLE[role]
        }?`
      )
    ) {
      setTimeout(() => (this.previousRole = relawan.profile.role || 0), 200);
      return;
    }

    const uid = relawan.profile.uid;
    const res = await this.api.post(user, `change_role`, { uid, role });
    console.log(`Changed role to ${role}`, res);
  }

  getCodes(relawan: Relawan) {
    const c = relawan.code;
    return Object.keys(c)
      .filter(a => !!c[a].claimer)
      .sort((a, b) => {
        const x = c[a];
        const y = c[b];
        const dr4 = (y.claimer.dr4 || 0) - (x.claimer.dr4 || 0);
        return dr4 ? dr4 : x.claimedTs - y.claimedTs;
      });
  }
}
