export declare const APP_SCOPED_PREFIX_URL = "https://www.facebook.com/app_scoped_user_id/";
export declare const MAX_RELAWAN_TRUSTED_DEPTH = 4;
export declare const MAX_REFERRALS = 150;
export declare const MAX_NUM_UPLOADS = 100;
export interface PublicProfile {
    uid: string;
    link: string;
    name: string;
    email: string;
    pic: string;
    loginTs: number;
}
export interface Relawan {
    profile: PublicProfile;
    referrer: PublicProfile;
    numUploads: number;
    imageIds: string[];
    depth: number;
    code: {
        [code: string]: CodeReferral;
    };
    auth: any;
}
export declare enum SUM_KEY {
    paslon1 = "paslon1",
    paslon2 = "paslon2",
    sah = "sah",
    tidakSah = "tidakSah",
    cakupan = "cakupan",
    pending = "pending",
    error = "error"
}
export interface Upsert {
    uploader: PublicProfile;
    uploadTs: number;
    reviewer: PublicProfile;
    reviewTs: number;
    reporter: PublicProfile;
    reportTs: number;
    data: UpsertData;
    meta: ImageMetadata;
    kelId: number;
    tpsNo: number;
    delta: {
        [key in SUM_KEY]: 0 | 1;
    };
    ip: string | string[];
    done: number;
    deleted: boolean;
}
export interface CodeReferral {
    issuer: PublicProfile;
    issuedTs: number;
    name: string;
    claimer: PublicProfile;
    claimedTs: number;
    depth: number;
}
export interface UpsertData {
    sum: {
        [key in SUM_KEY]: number;
    };
    imageId: string;
    url: string;
    updateTs: number;
}
export interface ApiUploadRequest {
    kelurahanId: number;
    tpsNo: number;
    data: UpsertData;
    metadata: ImageMetadata;
}
export interface ApiApproveRequest {
    kelurahanId: number;
    tpsNo: number;
    data: UpsertData;
    delete: boolean;
}
export interface HierarchyNode {
    id: number;
    name: string;
    parentIds: number[];
    parentNames: string[];
    children: any[];
    depth: number;
    data: {
        [key: string]: UpsertData;
    };
}
export interface ImageMetadata {
    u: string;
    k: number;
    t: number;
    v: string;
    l: number;
    a: number;
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
export declare function getServingUrl(url: string, size: number): string;
export declare function isValidImageId(imageId: string): RegExpMatchArray;
export declare class FsPath {
    static relawan(uid: string): string;
    static codeReferral(code: string): string;
    static imageMetadata(imageId: string): string;
    static imageMetadataUserId(imageId: string): string;
    static imageMetadataServingUrl(imageId: string): string;
    static upserts(imageId?: string): string;
}
/** Returns a random n-character identifier containing [a-zA-Z0-9]. */
export declare function autoId(n?: number): string;
