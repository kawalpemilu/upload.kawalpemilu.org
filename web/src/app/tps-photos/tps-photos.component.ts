import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { Aggregate, ImageMetadata, FsPath, getServingUrl } from 'shared';
import { AngularFirestore } from '@angular/fire/firestore';
import { shareReplay } from 'rxjs/operators';

interface Photo {
  u: string;
  a: Aggregate;
  m: any;
}

@Component({
  selector: 'app-tps-photos',
  template: `
    <span *ngFor="let photo of (photos$ | async)">
      <table style="display: inline">
        <tr>
          <td>
            <a href="{{ imageUrl(photo.u, 980) }}" target="_blank">
              <img
                [src]="imageUrl(photo.u, 100)"
                style="padding: 10px 10px 0 0"
              />
            </a>
          </td>
        </tr>

        <tr *ngIf="photo.m?.m">
          <td>{{ photo.m.m[0] }}</td>
        </tr>
        <tr *ngIf="photo.m?.m">
          <td>{{ photo.m.m[1] }}</td>
        </tr>

        <tr *ngIf="photo.m?.x">
          <td>
            <a href="{{ mapLink(photo.m) }}" target="_blank">GPS</a><br /><br />
          </td>
        </tr>
      </table>
    </span>
  `,
  styles: [``]
})
export class TpsPhotosComponent implements OnInit {
  @Input() kelurahanId: number;
  @Input() tpsNo: number;

  photos$: Observable<Photo[]>;

  constructor(private fsdb: AngularFirestore) {}

  ngOnInit() {
    // this.photos$ = this.fsdb
    //   .collection<Photo>(FsPath.tpsImages(this.kelurahanId, this.tpsNo))
    //   .valueChanges()
    //   .pipe(shareReplay(1));
  }

  imageUrl(url, size) {
    return getServingUrl(url, size);
  }

  mapLink(m: ImageMetadata) {
    return `https://www.google.com/maps/place/${m.y},${m.x}/@${m.y},${m.x},15z`;
  }

  // const mapLink =
  // const img =
  //   `Location:<br><a href="${mapLink}" target="_blank">` +
  //   '<img src="https://maps.googleapis.com/maps/api/staticmap?center=' +
  //   `${m.y},${m.x}&zoom=15&size=300x200&markers=${m.y},${m.x}` +
  //   '&key=AIzaSyBuqsL30sWYNULCOwbKB1InlldUHl3DWoo"></a>';
}
