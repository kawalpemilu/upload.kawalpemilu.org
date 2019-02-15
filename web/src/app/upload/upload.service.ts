import { Injectable } from '@angular/core';

import {
  AngularFireStorage,
  AngularFireUploadTask
} from '@angular/fire/storage';

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
    const imageId = this.autoId();
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
