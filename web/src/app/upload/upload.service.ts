import { Injectable } from '@angular/core';

import {
  AngularFireStorage,
  AngularFireUploadTask
} from '@angular/fire/storage';
import { AngularFireDatabase } from '@angular/fire/database';
import { take, filter } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  // The location to upload the image to.
  kelurahanId: number;
  tpsNo: number;

  // Internal states of upload task.
  task: AngularFireUploadTask;

  // The current upload status.
  progress: number;
  state: string;

  constructor(
    private afs: AngularFireStorage,
    private afd: AngularFireDatabase,
    private auth: AngularFireAuth
  ) {
    console.log('UploadService initalized');
  }

  async upload(kelurahanId: number, tpsNo: number, file) {
    if (this.task) {
      console.warn(`Ongoing upload: ${this.kelurahanId}/${this.tpsNo}`);
      return;
    }
    console.log('uploading', kelurahanId, tpsNo, file);
    const imageId = this.autoId();
    const filePath = `/uploads/${imageId}`;

    this.kelurahanId = kelurahanId;
    this.tpsNo = tpsNo;

    this.task = this.afs.upload(filePath, file);
    this.task.percentageChanges().subscribe(p => (this.progress = p));
    this.task.snapshotChanges().subscribe(s => (this.state = s.state));
    await this.task.then(async _ => {
      const url = await this.afd
        .object(filePath)
        .valueChanges()
        .pipe(
          filter(Boolean),
          take(1)
        )
        .toPromise();
      const imgPath = `kelurahan/${kelurahanId}/tps/${tpsNo}`;
      const data = { url };
      // TODO: avoid round trip.
      await this.afd.object(`${imgPath}/${imageId}`).set(data);
      this.task = null;
      console.log(`Upload done ${imageId}`);
    }, console.error);

    this.task = null;
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
