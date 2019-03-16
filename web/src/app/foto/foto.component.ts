import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  OnInit
} from '@angular/core';
import { UserService } from '../user.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UploadService } from '../upload.service';
import { UploadRequest } from 'shared';

export interface Photos {
  kelId: number;
  kelName: string;
  tpsNo: number;
  photos: UploadRequest[];
  uploadTs: number;
}

@Component({
  selector: 'app-foto',
  templateUrl: './foto.component.html',
  styles: [
    `
      .cdk-virtual-scroll-data-source .viewport {
        height: 160px;
        width: 100%;
      }

      .cdk-virtual-scroll-data-source
        .viewport
        .cdk-virtual-scroll-content-wrapper {
        display: flex;
        flex-direction: row;
      }

      .cdk-virtual-scroll-data-source .item {
        width: 125px;
        height: 100%;
      }
    `
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FotoComponent implements OnInit {
  photos$: Observable<Photos[]>;

  constructor(userService: UserService, private uploadService: UploadService) {
    this.photos$ = combineLatest(
      userService.relawanPhotos$,
      uploadService.status$
    ).pipe(
      map(([relawan, status]) => {
        const photosByTpsAndTpsNo: { [key: string]: Photos } = {};

        const getKey = (kelId: number, kelName: string, tpsNo: number) => {
          const key = kelId + '-' + tpsNo;
          if (!photosByTpsAndTpsNo[key]) {
            photosByTpsAndTpsNo[key] = {
              kelId,
              kelName,
              tpsNo,
              photos: [],
              uploadTs: 0
            };
          }
          return key;
        };

        Object.values(status)
          .sort((a, b) => b.uploadTs - a.uploadTs)
          .forEach(s => {
            const p = photosByTpsAndTpsNo[getKey(s.kelId, s.kelName, s.tpsNo)];
            p.photos.push({
              imageId: s.imageId,
              url: s.imgURL,
              ts: s.uploadTs
            } as UploadRequest);
          });

        if (relawan && relawan.uploads) {
          // The relawan.uploads is already sorted by upload time.
          relawan.uploads.forEach(u => {
            const p = photosByTpsAndTpsNo[getKey(u.kelId, u.kelName, u.tpsNo)];
            const idx = p.photos.findIndex(x => x.imageId === u.imageId);
            if (idx !== -1) {
              p.photos[idx] = u;
            } else {
              p.photos.push(u);
            }
            p.uploadTs = Math.max(p.uploadTs, u.ts);
          });
        }
        return Object.values(photosByTpsAndTpsNo);
      })
    );
  }

  ngOnInit() {
    for (const imageId of Object.keys(this.uploadService.status_)) {
      const img = this.uploadService.status_[imageId];
      if (!img.done) {
        setTimeout(() => {
          const els = document.getElementsByClassName('tips');
          if (els.length > 0) {
            els[0].scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
        break;
      }
    }
  }
}
