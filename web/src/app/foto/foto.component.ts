import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Upsert, FsPath } from 'shared';
import { UserService } from '../user.service';
import { switchMap, take, filter } from 'rxjs/operators';
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
    this.uploads$ = this.userService.userRelawan$.pipe(
      switchMap(async user => {
        const imageIds = (user && user.imageIds) || [];
        const promises = imageIds
          .slice(0, 5) // TODO: use infinite scroll
          .map(imageId => FsPath.upserts(imageId))
          .map(path => this.fsdb.doc<Upsert>(path).get())
          .map(snapshot => snapshot.pipe(take(1)).toPromise());
        return (await Promise.all(promises)).map(s => s.data() as Upsert);
      })
    );
  }

  ngOnInit() {}

  hie$(kelId) {
    return this.hie.get$(kelId);
  }
}
