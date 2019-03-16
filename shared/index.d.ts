export declare const APP_SCOPED_PREFIX_URL = "https://www.facebook.com/app_scoped_user_id/";
export declare const MAX_REFERRALS = 1000;
export declare const MAX_NUM_UPLOADS = 100;
export declare const LOCAL_STORAGE_LAST_URL = "last_url";
export declare enum USER_ROLE {
    RELAWAN = 0,
    MODERATOR = 1,
    ADMIN = 2
}
export declare enum SUM_KEY {
    jum = "jum",
    pas1 = "pas1",
    pas2 = "pas2",
    sah = "sah",
    tSah = "tSah",
    cakupan = "cakupan",
    pending = "pending",
    error = "error",
    pkb = "pkb",
    ger = "ger",
    pdi = "pdi",
    gol = "gol",
    nas = "nas",
    gar = "gar",
    ber = "ber",
    sej = "sej",
    per = "per",
    ppp = "ppp",
    psi = "psi",
    pan = "pan",
    han = "han",
    dem = "dem",
    pbb = "pbb",
    pkp = "pkp",
    pJum = "pJum",
    pSah = "pSah",
    pTSah = "pTSah"
}
export declare enum FORM_TYPE {
    ps = "ps",
    pp = "pp",
    ds = "ds",
    dp = "dp"
}
export declare type SumMap = {
    [key in SUM_KEY]: number;
};
export interface PublicProfile {
    uid: string;
    link: string;
    name: string;
    email: string;
    pic: string;
    loginTs: number;
    role: USER_ROLE;
}
export interface RelawanPhotos {
    profile: PublicProfile;
    uploads: UploadRequest[];
    count: number;
}
export interface Relawan {
    lowerCaseName: string;
    profile: PublicProfile;
    referrer: PublicProfile;
    depth: number;
    code: {
        [code: string]: CodeReferral;
    };
    auth: any;
}
export interface ChangeLog {
    auid: string;
    tuid: string;
    role: USER_ROLE;
    ts: number;
}
export interface UpsertProfile extends PublicProfile {
    ts: number;
    ua: string;
    ip: string;
}
export interface Aggregate {
    sum: SumMap;
    urls: string[];
    ts: number;
}
export interface TpsImage {
    uploader: UpsertProfile;
    reviewer: UpsertProfile;
    reporter: UpsertProfile;
    status: 'new' | 'ignore' | 'delete' | 'publish' | 'error';
    sum: SumMap;
    url: string;
    meta: ImageMetadata;
}
export interface TpsData {
    images: {
        [imageId: string]: TpsImage;
    };
    imgCount: number;
}
export interface Upsert {
    request: UploadRequest;
    uploader: UpsertProfile;
    reviewer: UpsertProfile;
    reporter: UpsertProfile;
    done: number;
    action: Aggregate;
}
export interface CodeReferral {
    issuer: PublicProfile;
    issuedTs: number;
    name: string;
    claimer: PublicProfile;
    claimedTs: number;
    depth: number;
}
export interface UploadRequest {
    imageId: string;
    kelId: number;
    kelName: string;
    tpsNo: number;
    meta: ImageMetadata;
    url: string;
    ts: number;
}
export interface ApproveRequest {
    imageId: string;
    sum: SumMap;
}
export interface HierarchyNode {
    id: number;
    name: string;
    parentIds: number[];
    parentNames: string[];
    children: any[];
    depth: number;
    data: {
        [key: string]: Aggregate;
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
export declare function isValidUserId(uid: string): RegExpMatchArray;
export declare class FsPath {
    static relawan(uid?: string): string;
    static relawanPhoto(uid?: string): string;
    static tps(kelId: number, tpsNo: number): string;
    static codeReferral(code: string): string;
    static changeLog(logId: string): string;
    static imageMetadata(imageId: string): string;
    static upserts(imageId?: string): string;
}
/** Returns a random n-character identifier containing [a-zA-Z0-9]. */
export declare function autoId(n?: number): string;
