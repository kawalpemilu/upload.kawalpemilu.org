export interface Aggregate {
  s: number[]; // Sum.
  x: number[]; // Max.
}

export interface TpsImage {
  u: string; // The Serving URL of the image.
  a: Aggregate;
}

export interface ApiUploadRequest {
  kelurahanId: number;
  tpsNo: number;
  aggregate: Aggregate;
  metadata: ImageMetadata;
  imageId: string;
}

export interface HierarchyNode {
  id: number;
  name: string;
  parentIds: number[];
  parentNames: string[];
  children: any;
  depth: number;
  // Observable<Aggregate>
  aggregate$: { [key: string]: any };
}

export interface AggregateResponse {
  rootId: number;
  lockTime: number;
  totalUpdates: number;
  totalRuntime: number;
  totalBatches: number;
  readPayload: number;
  readParents: number;
  readHieAggs: number;
  updateInMem: number;
  writeDbAggs: number;
  largeBatchTime: number;
  lease: number;
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

export interface Upsert {
  k: number; // Kelurahan ID
  n: number; // Tps No
  i: string | string[]; // IP Address
  a: Aggregate; // Value to set
  d: number; // Processed Timestamp
  m: ImageMetadata;
}

export class DbPath {
  static rootIds = [
    1,
    6728,
    12920,
    14086,
    15885,
    17404,
    20802,
    22328,
    24993,
    25405,
    25823,
    26141,
    32676,
    41863,
    42385,
    51578,
    53241,
    54020,
    55065,
    58285,
    60371,
    61965,
    64111,
    65702,
    67393,
    69268,
    72551,
    74716,
    75425,
    76096,
    77085,
    78203,
    81877
  ];

  static hie(id: number) {
    return `h/${id}`;
  }
  static hieParents(id: number) {
    return `${DbPath.hie(id)}/p`;
  }
  static hieDepth(id: number) {
    return `${DbPath.hie(id)}/d`;
  }
  static hieChildren(id: number) {
    return `${DbPath.hie(id)}/c`;
  }
  static hieAgg(id: number, cid: number) {
    return `${DbPath.hie(id)}/a/${cid}`;
  }
  static hieRootId(id: number) {
    return `${DbPath.hie(id)}/p/0`;
  }

  static upserts(rootId: number) {
    return `u/${rootId}`;
  }
  static upsertsLease(rootId: number) {
    return `${DbPath.upserts(rootId)}/l`;
  }
  static upsertsPending(rootId: number) {
    return `${DbPath.upserts(rootId)}/p`;
  }
  static upsertsQueueCount(rootId: number) {
    return `${DbPath.upserts(rootId)}/c`;
  }
  static upsertsQueue(rootId: number) {
    return `${DbPath.upserts(rootId)}/q`;
  }
  static upsertsQueueImage(rootId: number, imageId: string) {
    return `${DbPath.upsertsQueue(rootId)}/${imageId}`;
  }
  static upsertsArchiveImage(rootId: number, imageId: string) {
    return `${DbPath.upserts(rootId)}/a/${imageId}`;
  }
  static upsertsArchiveImageDone(rootId: number, imageId: string) {
    return `${DbPath.upserts(rootId)}/a/${imageId}/d`;
  }

  static imageMetadata(imageId: string) {
    return `i/${imageId}`;
  }
  static imageMetadataUserId(imageId: string) {
    return `${DbPath.imageMetadata(imageId)}/u`;
  }
  static imageMetadataServingUrl(imageId: string) {
    return `${DbPath.imageMetadata(imageId)}/v`;
  }

  static tpsPending(kelurahanId: number, tpsNo: number) {
    return `t/${kelurahanId}/${tpsNo}/p`;
  }
  static tpsPendingImage(kelurahanId: number, tpsNo: number, imageId: string) {
    return `${DbPath.tpsPending(kelurahanId, tpsNo)}/${imageId}`;
  }
}

export function getTpsNumbers(childrenBits: number[]) {
  const tpsNumbers = [];
  for (let i = 0; i < childrenBits.length; i++) {
    for (let j = 0; j < 30; j++) {
      if (childrenBits[i] & (1 << j)) {
        tpsNumbers.push(i * 30 + j);
      }
    }
  }
  return tpsNumbers;
}
