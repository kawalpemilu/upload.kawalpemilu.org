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
export declare class DbPath {
    static rootIds: number[];
    static hie(id: number): string;
    static hieParents(id: number): string;
    static hieAgg(id: number, cid: number): string;
    static upserts(rootId: number): string;
    static upsertsLock(rootId: number): string;
    static upsertsLockLower(rootId: number): string;
    static upsertsLockLease(rootId: number): string;
    static upsertsData(): string;
    static upsertsDataImage(imageId: string): string;
    static upsertsDataImageDone(imageId: string): string;
}
