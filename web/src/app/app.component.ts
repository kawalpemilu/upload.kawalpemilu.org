import { Component } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

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

  constructor(private afs: AngularFireStorage) { }

  upload(event) {
    const filePath = `/uploads/${this.autoId()}`;
    const fileRef = this.afs.ref(filePath);
    this.task = this.afs.upload(filePath, event.target.files[0]);
    this.uploadState$ = this.task.snapshotChanges().pipe(map(s => s.state));
    this.uploadProgress$ = this.task.percentageChanges();

    // Sets the downloadURL$ when the file has been uploaded.
    const setUrl = () => this.downloadURL$ = fileRef.getDownloadURL();
    this.task.snapshotChanges().pipe(finalize(setUrl)).subscribe();
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
