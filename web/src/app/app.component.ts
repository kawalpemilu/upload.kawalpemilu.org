import { Component } from '@angular/core';
import {
  AngularFireStorage,
  AngularFireUploadTask
} from '@angular/fire/storage';
import { AngularFireDatabase } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HierarchyService } from './hierarchy.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  task: AngularFireUploadTask;
  uploadProgress$: Observable<number> = new BehaviorSubject(0);
  uploadState$: Observable<string>;
  downloadURL$: Observable<any> = new BehaviorSubject('');

  constructor(
    private afs: AngularFireStorage,
    private afd: AngularFireDatabase,
    public hie: HierarchyService
  ) {}

  upload(event) {
    const filePath = `/uploads/${this.autoId()}`;
    this.task = this.afs.upload(filePath, event.target.files[0]);
    this.uploadState$ = this.task.snapshotChanges().pipe(map(s => s.state));
    this.uploadProgress$ = this.task.percentageChanges();
    this.downloadURL$ = this.afd.object(filePath).valueChanges();
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
