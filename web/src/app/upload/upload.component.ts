import { Component, OnInit, Input } from '@angular/core';
import {
  AngularFireStorage,
  AngularFireUploadTask
} from '@angular/fire/storage';
import { AngularFireDatabase } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';

import { HierarchyService } from '../hierarchy.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
  @Input() kelurahanId: number;
  @Input() tpsNo: number;

  task: AngularFireUploadTask;
  uploadProgress$: Observable<number>;
  uploadState$: Observable<string>;
  downloadURL$: Observable<any> = new BehaviorSubject('');

  constructor(
    private afs: AngularFireStorage,
    private afd: AngularFireDatabase,
    public hie: HierarchyService
  ) {}

  ngOnInit() {}

  async upload(event) {
    const imageId = this.autoId();
    const filePath = `/uploads/${imageId}`;
    this.task = this.afs.upload(filePath, event.target.files[0]);
    this.uploadState$ = this.task.snapshotChanges().pipe(map(s => s.state));
    this.uploadProgress$ = this.task.percentageChanges();
    const url = await this.afd
      .object(filePath)
      .valueChanges()
      .pipe(
        filter(Boolean),
        take(1)
      )
      .toPromise();
    const imgPath = `kelurahan/${this.kelurahanId}/tps/${this.tpsNo}`;
    const data = { url };
    await this.afd.object(`${imgPath}/${imageId}`).set(data);
    this.uploadProgress$ = null;
  }

  /** Returns a unique 20-character wide identifier. */
  autoId(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    for (let i = 0; i < 20; i++) {
      autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
  }
}
