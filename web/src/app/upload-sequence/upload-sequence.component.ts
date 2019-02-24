import { Component, OnInit } from '@angular/core';
import { UploadService } from '../upload.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { UserService } from '../user.service';
import { User } from 'firebase';
import * as piexif from 'piexifjs';
import { ImageMetadata, ApiUploadRequest, HierarchyNode } from 'shared';
import { ApiService } from '../api.service';
import { HierarchyService } from '../hierarchy.service';

export class UploadState {
  kelurahanId: number;
  tpsNo: number;
  node: HierarchyNode;
  covered = 0;
}

@Component({
  selector: 'app-upload-sequence',
  templateUrl: './upload-sequence.component.html',
  styleUrls: ['./upload-sequence.component.css']
})
export class UploadSequenceComponent implements OnInit {
  state$: Observable<UploadState>;
  formGroup: FormGroup;
  imgURL: string | ArrayBuffer;
  uploadedMetadata$: Promise<[ImageMetadata, string]>;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public userService: UserService,
    public uploadService: UploadService,
    private formBuilder: FormBuilder,
    private api: ApiService,
    private hie: HierarchyService
  ) {}

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      switchMap(p => {
        const state = {
          kelurahanId: parseInt(p.get('kelurahanId'), 10),
          tpsNo: parseInt(p.get('tpsNo'), 10)
        } as UploadState;
        return this.hie.get$(state.kelurahanId).pipe(
          map((node: HierarchyNode) => {
            state.covered = 0;
            for (const [tpsNo] of node.children) {
              if (tpsNo === state.tpsNo) {
                const a = node.aggregate[tpsNo];
                state.covered = (a && a.s[0]) || 0;
              }
            }
            state.node = node;
            return state;
          })
        );
      })
    );

    const validators = [Validators.pattern('^[0-9]{1,3}$')];
    this.formGroup = this.formBuilder.group({
      paslon1Ctrl: [null, validators]
      // paslon2Ctrl: [null, validators],
      // sahCtrl: [null, validators],
      // tidakSahCtrl: [null, validators]
    });
  }

  async upload(userId: string, state: UploadState, event) {
    if (event.target.files.length === 0) {
      console.log('No file to be uploaded');
      return;
    }
    let file: File = event.target.files[0];
    if (!file.type.match(/image\/*/)) {
      console.log('Invalid mime: ', file.type);
      return;
    }

    const m = { s: file.size, l: file.lastModified } as ImageMetadata;
    try {
      let imgURL = await this.readAsDataUrl(file);
      const exifObj = this.populateMetadata(imgURL, m);
      if (file.size > 800 * 1024) {
        imgURL = await this.compress(imgURL, 1024);
        if (exifObj) {
          try {
            // https://piexifjs.readthedocs.io/en/2.0/sample.html#insert-exif-into-jpeg
            imgURL = piexif.insert(piexif.dump(exifObj), imgURL);
          } catch (e) {
            console.error(e);
          }
        }
        file = this.dataURLtoBlob(imgURL) as File;
        m.z = file.size;
      }

      if (m.o === 1) {
        this.imgURL = imgURL;
      } else {
        this.imgURL = await this.rotateImageUrl(imgURL, m.o);
      }
    } catch (e) {
      console.error('Unable to preview', e);
      this.imgURL = 'error';
    }

    this.uploadedMetadata$ = this.uploadService
      .upload(userId, state.kelurahanId, state.tpsNo, file)
      .then(imageId => <[ImageMetadata, string]>[m, imageId]);
  }

  getError(ctrlName: string) {
    const ctrl = this.formGroup.get(ctrlName);
    if (ctrl.hasError('pattern')) {
      return 'Angka hanya boleh antara 0 sampai 999';
    }
    return '';
  }

  async selesai(user: User, kelurahanId: number, tpsNo: number) {
    this.isLoading = true;
    const [metadata, imageId] = await this.uploadedMetadata$;
    const request: ApiUploadRequest = {
      kelurahanId,
      tpsNo,
      aggregate: {
        s: [
          1,
          this.formGroup.get('paslon1Ctrl').value,
          0,
          0,
          // this.formGroup.get('paslon2Ctrl').value,
          // this.formGroup.get('sahCtrl').value,
          // this.formGroup.get('tidakSahCtrl').value,
          1
        ],
        x: []
      },
      metadata,
      imageId
    };
    try {
      const res: any = await this.api.post(user, `upload`, request);
      if (res.ok) {
        this.router.navigate(['/t', kelurahanId], { fragment: `${tpsNo}` });
      } else {
        console.error(res);
      }
    } catch (e) {
      console.error(e.message);
    }
    this.isLoading = false;
  }

  private populateMetadata(imgURL, m) {
    try {
      const exifObj = piexif.load(imgURL as string);
      const z = exifObj['0th'];
      if (z) {
        m.w = z[piexif.TagValues.ImageIFD.ImageWidth];
        m.h = z[piexif.TagValues.ImageIFD.ImageLength];
        m.m = [
          z[piexif.TagValues.ImageIFD.Make] as string,
          z[piexif.TagValues.ImageIFD.Model] as string
        ];
        m.o = z[piexif.TagValues.ImageIFD.Orientation];
      }
      const g = exifObj['GPS'];
      if (g) {
        m.y = this.convertDms(
          g[piexif.TagValues.GPSIFD.GPSLatitude],
          g[piexif.TagValues.GPSIFD.GPSLatitudeRef]
        );
        m.x = this.convertDms(
          g[piexif.TagValues.GPSIFD.GPSLongitude],
          g[piexif.TagValues.GPSIFD.GPSLongitudeRef]
        );
      }
      return exifObj;
    } catch (e) {
      return null;
    }
  }

  private readAsDataUrl(file: File): Promise<string | ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  }

  private getImage(dataUrl): Promise<HTMLImageElement> {
    const img = new Image();
    return new Promise(resolve => {
      img.src = dataUrl;
      img.onload = () => resolve(img);
    });
  }

  private async compress(dataUrl, maxDimension): Promise<string> {
    const img = await this.getImage(dataUrl);
    let width = img.width;
    let height = img.height;
    const scale = Math.min(1, maxDimension / width, maxDimension / height);
    if (scale < 1) {
      width *= scale;
      height *= scale;
    }
    const elem = document.createElement('canvas'); // Use Angular's Renderer2 method
    elem.width = width;
    elem.height = height;
    const ctx = elem.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.canvas.toDataURL('image/jpeg');
  }

  /**
   * https://piexifjs.readthedocs.io/en/2.0/sample.html#insert-exif-into-jpeg
   */
  private async rotateImageUrl(dataUrl, orientation) {
    const image = await this.getImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    let x = 0;
    let y = 0;
    ctx.save();
    switch (orientation) {
      case 2:
        x = -canvas.width;
        ctx.scale(-1, 1);
        break;

      case 3:
        x = -canvas.width;
        y = -canvas.height;
        ctx.scale(-1, -1);
        break;

      case 4:
        y = -canvas.height;
        ctx.scale(1, -1);
        break;

      case 5:
        canvas.width = image.height;
        canvas.height = image.width;
        ctx.translate(canvas.width, canvas.height / canvas.width);
        ctx.rotate(Math.PI / 2);
        y = -canvas.width;
        ctx.scale(1, -1);
        break;

      case 6:
        canvas.width = image.height;
        canvas.height = image.width;
        ctx.translate(canvas.width, canvas.height / canvas.width);
        ctx.rotate(Math.PI / 2);
        break;

      case 7:
        canvas.width = image.height;
        canvas.height = image.width;
        ctx.translate(canvas.width, canvas.height / canvas.width);
        ctx.rotate(Math.PI / 2);
        x = -canvas.height;
        ctx.scale(-1, 1);
        break;

      case 8:
        canvas.width = image.height;
        canvas.height = image.width;
        ctx.translate(canvas.width, canvas.height / canvas.width);
        ctx.rotate(Math.PI / 2);
        x = -canvas.height;
        y = -canvas.width;
        ctx.scale(-1, -1);
        break;
    }
    ctx.drawImage(image, x, y);
    ctx.restore();
    return canvas.toDataURL('image/jpeg');
  }

  /**
   * From: https://gist.github.com/wuchengwei/b7e1820d39445f431aeaa9c786753d8e
   */
  private dataURLtoBlob(dataurl) {
    const arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      u8arr = new Uint8Array(bstr.length);

    for (let n = bstr.length; n--; ) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  private convertDms(dms, direction) {
    if (!dms || !direction || dms.length < 3) {
      return null;
    }
    const degs = dms[0][0] / dms[0][1];
    const mins = dms[1][0] / dms[1][1];
    const secs = dms[2][0] / dms[2][1];
    return this.convertDMSToDD(degs, mins, secs, direction);
  }

  private convertDMSToDD(degrees, minutes, seconds, direction) {
    let dd = degrees + minutes / 60.0 + seconds / (60.0 * 60);
    if (direction === 'S' || direction === 'W') {
      dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
  }
}
