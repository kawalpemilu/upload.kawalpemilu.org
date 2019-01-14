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
