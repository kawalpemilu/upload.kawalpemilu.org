import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation
} from '@angular/core';
import { UserService } from '../user.service';
import { Observable, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { UploadService } from '../upload.service';
import { UploadRequest, SumMap } from 'shared';
import { CarouselItem } from '../carousel/carousel.component';
import { Title } from '@angular/platform-browser';

export interface Photos {
  kelId: number;
  kelName: string;
  tpsNo: number;
  photos: UploadRequest[];
  uploadTs: number;
  items: CarouselItem[];
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

  constructor(
    userService: UserService,
    uploadService: UploadService,
    titleService: Title
  ) {
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
              uploadTs: 0,
              items: null
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
        const uname = userService.user && userService.user.displayName;
        titleService.setTitle(`Foto ${uname} :: KPJS 2019`);
        return Object.values(photosByTpsAndTpsNo).map(p => {
          p.items = this.toCarousel(p.kelId, p.tpsNo, p.photos);
          return p;
        });
      }),
      shareReplay(1)
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
        sum: p.sum || {} as SumMap,
        // TODO: reflect the current error state.
        error: false,
        c1: p.c1,
        imageId: p.imageId,
        meta: p.meta,
        reports: null,
        uploader: null,
        reviewer: null
      });
    }
    return arr;
  }
}
