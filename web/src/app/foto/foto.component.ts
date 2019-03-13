import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation
} from '@angular/core';
import { UserService } from '../user.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UpsertData } from 'shared';
import { HierarchyService } from '../hierarchy.service';
import { UploadService } from '../upload.service';

export interface Photos {
  kelId: number;
  tpsNo: number;
  photos: UpsertData[];
  uploadTs: number;
}

@Component({
  selector: 'app-foto',
  templateUrl: './foto.component.html',
  styles: [
    `
      .cdk-virtual-scroll-data-source .viewport {
        height: 200px;
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
export class FotoComponent {
  photos$: Observable<Photos[]>;

  constructor(
    private hie: HierarchyService,
    userService: UserService,
    uploadService: UploadService
  ) {
    this.photos$ = combineLatest(
      userService.relawan$,
      uploadService.status$
    ).pipe(
      map(([relawan, status]) => {
        const photosByTpsAndTpsNo: { [key: string]: Photos } = {};

        const getKey = (kelId: number, tpsNo: number) => {
          const key = kelId + '-' + tpsNo;
          if (!photosByTpsAndTpsNo[key]) {
            photosByTpsAndTpsNo[key] = {
              kelId,
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
            const p = photosByTpsAndTpsNo[getKey(s.kelurahanId, s.tpsNo)];
            p.photos.push({
              sum: {},
              imageId: s.imageId,
              url: s.imgURL,
              updateTs: s.uploadTs,
              status: s
            } as UpsertData);
          });

        if (relawan) {
          // The relawan.uploads is already sorted by upload time.
          relawan.uploads.forEach(u => {
            const p = photosByTpsAndTpsNo[getKey(u.kelId, u.tpsNo)];
            const idx = p.photos.findIndex(x => x.imageId === u.data.imageId);
            if (idx !== -1) {
              p.photos[idx] = u.data;
            } else {
              p.photos.push(u.data);
            }
            p.uploadTs = Math.max(p.uploadTs, u.data.updateTs);
          });
        }
        return Object.values(photosByTpsAndTpsNo);
      })
    );
  }

  hie$(kelId) {
    return this.hie.get$(kelId, false);
  }
}
