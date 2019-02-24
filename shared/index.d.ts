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
    children: any[];
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
    u: string;
    k: number;
    n: number;
    i: string | string[];
    a: Aggregate;
    d: number;
    m: ImageMetadata;
}
export interface CodeReferral {
    i: string;
    n: string;
    l: string;
    t: number;
    d: number;
    m: string;
    c: string;
    e: string;
    r: string;
    a: number;
}
export interface Relawan {
    f: string;
    l: string;
    n: string;
    p: string;
    d: number;
    b: string;
    e: string;
    r: string;
    c: {
        [code: string]: CodeReferral;
    };
}
export declare class FsPath {
    static relawan(uid: string): string;
    static codeReferral(code: string): string;
    static imageMetadata(imageId: string): string;
    static imageMetadataUserId(imageId: string): string;
    static imageMetadataServingUrl(imageId: string): string;
    static upserts(imageId?: string): string;
    static tpsImages(kelurahanId: number, tpsNo: number): string;
    static tpsImage(kelurahanId: number, tpsNo: number, imageId: string): string;
}
/** Returns a random n-character identifier containing [a-zA-Z0-9]. */
export declare function autoId(n?: number): string;
