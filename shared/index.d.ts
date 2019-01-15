export interface Aggregate {
    s: number[];
    x: number[];
}
export interface TpsImage {
    u: string;
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
    aggregate: {
        [key: string]: Aggregate;
    };
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
    u: string;
    k: number;
    t: number;
    v: string;
    l: number;
    s: number;
    z: number;
    w: number;
    h: number;
    m: [string, string];
    o: number;
    y: number;
    x: number;
}
export declare function extractImageMetadata(m: any): ImageMetadata | null;
export interface Upsert {
    k: number;
    n: number;
    i: string | string[];
    a: Aggregate;
    t: string;
    d: number;
    m: ImageMetadata;
}
export declare class DbPath {
    static rootIds: number[];
    static hie(id: number): string;
    static hieParents(id: number): string;
    static hieDepth(id: number): string;
    static hieChildren(id: number): string;
    static hieAgg(id: number, cid: number): string;
    static hieRootId(id: number): string;
    static upserts(rootId: number): string;
    static upsertsLock(rootId: number): string;
    static upsertsLockLower(rootId: number): string;
    static upsertsLockLease(rootId: number): string;
    static upsertsData(): string;
    static upsertsDataImage(imageId: string): string;
    static upsertsDataImageDone(imageId: string): string;
    static imageMetadata(imageId: string): string;
    static imageMetadataUserId(imageId: string): string;
    static imageMetadataServingUrl(imageId: string): string;
    static tpsPending(kelurahanId: number, tpsNo: number): string;
    static tpsPendingImage(kelurahanId: number, tpsNo: number, imageId: string): string;
}
export declare function getTpsNumbers(childrenBits: number[]): any[];
