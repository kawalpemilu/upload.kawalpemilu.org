import { Component, OnInit } from '@angular/core';
import { APP_SCOPED_PREFIX_URL, Relawan, FsPath, USER_ROLE } from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, of, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import {
  switchMap,
  catchError,
  debounceTime,
  distinctUntilChanged,
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
  relawans$: Observable<Relawan[]>;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private route: ActivatedRoute,
    private api: ApiService
  ) {
    this.relawan$ = this.route.paramMap.pipe(
      switchMap(params =>
        this.fsdb
          .doc<Relawan>(FsPath.relawan(params.get('uid')))
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

  async changeRole(user: User, uid: string, role: number) {
    const res = await this.api.post(user, `change_role`, { uid, role });
    console.log(`Change role to ${role}`, res);
  }
}
