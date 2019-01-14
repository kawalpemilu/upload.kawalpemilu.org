export interface Aggregate {
  sum: number[];
  max: number[];
}

export interface HierarchyNode {
  id: number;
  name: string;
  parentIds: number[];
  parentNames: string[];
  children: any;
  depth: number;
  aggregate: Aggregate;
}

export interface AggregateResponse {
  rootId: number;
  lockTime: number;
  totalUpdates: number;
  totalRuntime: number;
  totalBatches: number;
  readParents: number;
  readHieAggs: number;
  updateInMem: number;
  writeDbAggs: number;
  largeBatchTime: number;
  lower: string;
}

export interface ImageMetadata {
  i: string; // imageId.
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

  static upserts(rootId: number) {
    return `upserts/${rootId}`;
  }
  static upsertsLock(rootId: number) {
    return `${DbPath.upserts(rootId)}/lock`;
  }
  static upsertsLockLower(rootId: number) {
    return `${DbPath.upsertsLock(rootId)}/lower`;
  }
  static upsertsLockLease(rootId: number) {
    return `${DbPath.upsertsLock(rootId)}/lease`;
  }
  static upsertsData() {
    return `upserts/data`;
  }
  static upsertsDataImage(imageId: string) {
    return `${DbPath.upsertsData()}/${imageId}`;
  }
  static upsertsDataImageDone(imageId: string) {
    return `${DbPath.upsertsDataImage(imageId)}/d`;
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
