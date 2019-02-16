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
    children: number[];
    depth: number;
    aggregate: {
        [key: string]: Aggregate;
    };
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
    d: number;
    m: ImageMetadata;
}
export declare class FsPath {
    static relawan(uid: string): string;
    static children(cid: number): string;
    static imageMetadata(imageId: string): string;
    static imageMetadataUserId(imageId: string): string;
    static imageMetadataServingUrl(imageId: string): string;
    static upserts(imageId?: string): string;
    static tpsImages(kelurahanId: number, tpsNo: number): string;
    static tpsImage(kelurahanId: number, tpsNo: number, imageId: string): string;
}
export declare function getTpsNumbers(childrenBits: number[]): any[];
