export interface Aggregate {
  s: number[]; // Sum.
  x: number[]; // Max.
  u: string; // URL proof of this Aggregate.
  i: string; // Image Id of in upserts.
}

export interface DecodedAggregate {
  jokowi: number;   // 0
  prabowo: number;  // 1
  sah: number;      // 2
  tidakSah: number; // 3
  pending: number;  // 4
  masalah: number;  // 5
}

export function encodeAgg(a: DecodedAggregate): number[] {
  return [
    a.jokowi,
    a.prabowo,
    a.sah,
    a.tidakSah,
    a.pending,
    a.masalah
  ];
}

export function decodeAgg(sum: number[]): DecodedAggregate {
  return {
    jokowi: sum[0],
    prabowo: sum[1],
    sah: sum[2],
    tidakSah: sum[3],
    pending: sum[4],
    masalah: sum[5],
  };
}

export interface ApiUploadRequest {
  kelurahanId: number;
  tpsNo: number;
  aggregate: Aggregate;
  metadata: ImageMetadata;
}

export interface ApiApproveRequest {
  kelurahanId: number;
  tpsNo: number;
  aggregate: Aggregate;
  delete: boolean;
}

export interface HierarchyNode {
  id: number;
  name: string;
  parentIds: number[];
  parentNames: string[];
  children: any[];
  depth: number;
  aggregate: { [key: string]: Aggregate };
}

export interface ImageMetadata {
  u: string; // The userId who uploaded.
  k: number; // Kelurahan ID wher it's set.
  t: number; // TPS Number where it's set.
  v: string; // The serving URL of the image.
  l: number; // Last Modified.
  s: number; // Size in Bytes.
  z: number; // Size in Bytes after compressed.
  w: number; // Original Width.
  h: number; // Original Height.
  m: [string, string]; // [Make, Model].
  o: number; // Orientation.
  y: number; // Latitude.
  x: number; // Longitude.
}

export function extractImageMetadata(m: any): ImageMetadata | null {
  let validM: ImageMetadata = null;
  if (m) {
    validM = {} as ImageMetadata;
    ['u', 'k', 't', 'v', 'l', 's', 'z', 'w', 'h', 'o', 'y', 'x'].forEach(
      attr => {
        if (typeof m[attr] === 'number') {
          validM[attr] = m[attr];
        }
      }
    );
    if (typeof m.m === 'object') {
      validM.m = ['', ''];
      if (typeof m.m[0] === 'string') {
        validM.m[0] = m.m[0].substring(0, 50);
      }
      if (typeof m.m[1] === 'string') {
        validM.m[1] = m.m[1].substring(0, 50);
      }
    }
  }
  return !validM || Object.keys(validM).length == 0 ? null : validM;
}

export function getServingUrl(url: string, size: number) {
  return url ? url.replace(/^http:/, 'https:') + `=s${size}` : '';
}

export function isValidImageId(imageId: string) {
  return typeof imageId === 'string' && imageId.match(/^[A-Za-z0-9]{20}$/);
}

export const MAX_RELAWAN_TRUSTED_DEPTH = 2;

export interface Upsert {
  u: string; // The owner user ID
  k: number; // Kelurahan ID
  n: number; // Tps No
  p: number[]; // Process only these indices
  i: string | string[]; // IP Address
  a: Aggregate; // Value to set
  d: number; // Processed Timestamp
  r: string; // Approved by
  w: string; // Approver name
  o: string; // Approver profile link
  g: Aggregate; // Previous value of 'a' before approval
  l: boolean; // Deleted
  t: number; // Creation Timestamp
  m: ImageMetadata;
}

export interface CodeReferral {
  i: string; // The issuer uid
  n: string; // The issuer name
  l: string; // The issuer profile link
  t: number; // The issued timestamp
  d: number; // The referral depth
  m: string; // The intended claimer name
  c: string; // The claimer uid
  e: string; // The claimer name
  r: string; // The claimer profile link
  a: number; // The claimed timestamp
}

export interface Relawan {
  f: string; // First name
  l: string; // App scoped link to profile
  n: string; // Full name
  p: string; // Link to profile picture
  d: number; // Referral depth (0: ninja, 1: admin, 2: trusted, 3+:normal)
  b: string; // Referrer uid
  e: string; // Referrer name
  r: string; // Referrer profile link
  c: { [code: string]: CodeReferral }; // Code referrals
  u: any; // firebaseUser reference.
}

export class FsPath {
  static relawan(uid: string) {
    return `r/${uid}`;
  }

  static codeReferral(code: string) {
    return `c/${code}`;
  }

  static imageMetadata(imageId: string) {
    return `i/${imageId}`;
  }
  static imageMetadataUserId(imageId: string) {
    return `${FsPath.imageMetadata(imageId)}/u`;
  }
  static imageMetadataServingUrl(imageId: string) {
    return `${FsPath.imageMetadata(imageId)}/v`;
  }

  static upserts(imageId?: string) {
    return `u` + (imageId ? `/${imageId}` : '');
  }
}

/** Returns a random n-character identifier containing [a-zA-Z0-9]. */
export function autoId(n = 20): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < n; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}
