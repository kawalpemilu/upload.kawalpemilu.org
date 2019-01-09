import { Component, OnInit, Input } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable } from 'rxjs';

interface Photo {
  url: string;
}

@Component({
  selector: 'app-tps-photos',
  template: `
    <a
      *ngFor="let photo of (photos$ | async)"
      href="{{ imageUrl(photo.url, 800) }}"
      target="_blank"
    >
      <img [src]="imageUrl(photo.url, 100)" style="padding: 10px 10px 10px 0" />
    </a>
  `,
  styles: [``]
})
export class TpsPhotosComponent implements OnInit {
  @Input() kelurahanId: number;
  @Input() tpsNo: number;

  photos$: Observable<Photo[]>;

  constructor(private afd: AngularFireDatabase) {}

  ngOnInit() {
    this.photos$ = this.afd
      .list<Photo>(`kelurahan/${this.kelurahanId}/tps/${this.tpsNo}`)
      .valueChanges();
  }

  imageUrl(url, size) {
    return url.startsWith('http://')
      ? `https://${url.substring(7)}=s${size}`
      : url;
  }
}
