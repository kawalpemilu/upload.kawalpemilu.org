import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Upsert, FsPath } from 'shared';
import { UserService } from '../user.service';
import { switchMap, map } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { HierarchyService } from '../hierarchy.service';

@Component({
  selector: 'app-foto',
  templateUrl: './foto.component.html',
  styles: ['']
})
export class FotoComponent implements OnInit {
  uploads$: Observable<Upsert[]>;
  isLoading = false;

  constructor(
    public userService: UserService,
    private fsdb: AngularFirestore,
    private hie: HierarchyService
  ) {
    this.uploads$ = this.userService.user$.pipe(
      switchMap(user =>
        user
          ? this.fsdb
              .collection<Upsert>(FsPath.upserts(), ref =>
                ref.where('uploader.uid', '==', user.uid).limit(10)
              )
              .valueChanges()
              .pipe(map(arr => arr.sort((a, b) => b.createdTs - a.createdTs)))
          : of([])
      )
    );
  }

  ngOnInit() {}

  hie$(kelId) {
    return this.hie.get$(kelId, false);
  }
}
