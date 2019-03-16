import { Injectable } from '@angular/core';

import * as piexif from 'piexifjs';

import {
  AngularFireStorage,
  AngularFireUploadTask
} from '@angular/fire/storage';
import { autoId, ImageMetadata, UploadRequest } from 'shared';
import { ApiService } from './api.service';
import { User } from 'firebase';
import { BehaviorSubject} from 'rxjs';

export interface UploadStatus {
  imageId: string;

  // The location to upload the image to.
  kelId: number;
  kelName: string;
  tpsNo: number;

  // Internal states of upload task.
  task: AngularFireUploadTask;

  imgURL: string | ArrayBuffer;
  metadata: ImageMetadata;

  done: boolean;
  uploadTs: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  status$ = new BehaviorSubject<{ [key: string]: UploadStatus }>({});
  status_: { [key: string]: UploadStatus } = {};

  constructor(private afs: AngularFireStorage, private api: ApiService) {
    console.log('UploadService initalized');
  }

  async upload(
    user: User,
    kelId: number,
    kelName: string,
    tpsNo: number,
    file
  ) {
    const metadata = { s: file.size, l: file.lastModified } as ImageMetadata;
    let imgURL: string | ArrayBuffer;
    try {
      imgURL = await this.readAsDataUrl(file);
      const exifObj = this.populateMetadata(imgURL, metadata);
      if (file.size > 800 * 1024) {
        imgURL = await this.compress(imgURL, 2048);
        if (exifObj) {
          try {
            // https://piexifjs.readthedocs.io/en/2.0/sample.html#insert-exif-into-jpeg
            imgURL = piexif.insert(piexif.dump(exifObj), imgURL);
          } catch (e) {
            console.error(e);
          }
        }
        file = this.dataURLtoBlob(imgURL) as File;
        metadata.z = file.size;
      }
      if (metadata.o !== 1) {
        imgURL = await this.rotateImageUrl(imgURL, metadata.o);
      }
    } catch (e) {
      console.error('Unable to preview', e);
      return null;
    }

    const imageId = autoId();
    const filePath = `/uploads/${kelId}/${tpsNo}/${user.uid}/${imageId}`;
    const status: UploadStatus = {
      imageId,
      kelId: kelId,
      kelName,
      tpsNo,
      task: this.afs.upload(filePath, file),
      imgURL,
      metadata,
      done: false,
      uploadTs: Date.now()
    };
    status.task.then(async () => {
      const request: UploadRequest = {
        imageId: status.imageId,
        kelId,
        kelName: '', // Will be populated on the server.
        tpsNo,
        meta: metadata,
        url: null, // Will be populated on the server.
        ts: null // Will be populated on the server.
      };
      const res: any = await this.api.post(user, `upload`, request);
      if (!res.ok) {
        throw new Error(res.error);
      }
      status.done = true;
    });
    this.status_[imageId] = status;
    this.status$.next(this.status_);
    return status;
  }

  private readAsDataUrl(file: File): Promise<string | ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
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

  private getImage(dataUrl): Promise<HTMLImageElement> {
    const img = new Image();
    return new Promise(resolve => {
      img.src = dataUrl;
      img.onload = () => resolve(img);
    });
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
