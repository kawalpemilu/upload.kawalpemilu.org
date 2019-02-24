import { Injectable } from '@angular/core';

import {
  AngularFireStorage,
  AngularFireUploadTask
} from '@angular/fire/storage';
import { autoId } from 'shared';

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

  constructor(private afs: AngularFireStorage) {
    console.log('UploadService initalized');
  }

  async upload(userId: string, kelurahanId: number, tpsNo: number, file) {
    if (this.task) {
      console.warn(`Upload canceled: ${this.kelurahanId}/${this.tpsNo}`);
      this.task.cancel();
    }
    const imageId = autoId();
    const filePath = `/uploads/${kelurahanId}/${tpsNo}/${userId}/${imageId}`;

    this.kelurahanId = kelurahanId;
    this.tpsNo = tpsNo;
    this.task = this.afs.upload(filePath, file);
    this.task.percentageChanges().subscribe(p => (this.progress = p));
    this.task.snapshotChanges().subscribe(s => (this.state = s.state));
    await this.task;

    this.kelurahanId = this.tpsNo = 0;
    this.task = null;
    return imageId;
  }
}
