import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation
} from '@angular/core';
import { UserService } from '../user.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UploadService } from '../upload.service';
import { UploadRequest, SumMap } from 'shared';
import { CarouselItem } from '../carousel/carousel.component';

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
  styles: [``],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FotoComponent {
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

  toCarousel(kelId, tpsNo, photos: UploadRequest[]) {
    const arr: CarouselItem[] = [];
    for (const p of photos) {
      arr.push({
        kelId,
        tpsNo,
        url: p.url,
        ts: p.ts,
        sum: {} as SumMap,
        // TODO: reflect the current error state.
        error: false
      });
    }
    return arr;
  }
}
