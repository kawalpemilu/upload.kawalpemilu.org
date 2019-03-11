import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { APP_SCOPED_PREFIX_URL, Relawan, FsPath, USER_ROLE } from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, of, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import {
  switchMap,
  catchError,
  debounceTime,
  distinctUntilChanged,
  startWith
} from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  cari$ = new Subject<string>();
  USER_ROLE = USER_ROLE;

  relawan$: Observable<Relawan>;
  relawans$: Observable<Relawan[]>;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private route: ActivatedRoute
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
      startWith(''),
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
}
