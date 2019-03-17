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
    janggal = "janggal",
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
    PPWP = 1,
    DPR = 2,
    DPD = 3,
    DPRP = 4,
    DPRPB = 5,
    DPRA = 6,
    DPRD_PROV = 7,
    DPRD_KAB_KOTA = 8,
    DPRK = 9,
    OTHERS = 10,
    DELETED = 11
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
export declare enum IS_PLANO {
    YES = 1,
    NO = 2
}
export interface C1Form {
    type: FORM_TYPE;
    plano: IS_PLANO;
}
export interface Aggregate {
    sum: SumMap;
    ts: number;
    c1: C1Form;
}
export interface TpsAggregate extends Aggregate {
    photos: {
        [url: string]: Aggregate;
    };
}
export interface TpsImage {
    uploader: UpsertProfile;
    reviewer: UpsertProfile;
    reporter: UpsertProfile;
    c1: C1Form;
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
    action: TpsAggregate;
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
    c1: C1Form;
}
export interface ChildData {
    id: number;
    name: string;
    nTps: number;
    nL: number;
    nP: number;
}
export interface HierarchyNode {
    id: number;
    name: string;
    parentIds: number[];
    parentNames: string[];
    child?: {
        [id: string]: ChildData;
    };
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
    static hie(id?: number): string;
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
export declare function toChild(node: HierarchyNode): {
    [id: string]: ChildData;
};
export declare function toChildren(node: HierarchyNode): (string | number)[][];
export declare function lsGetItem(key: any): any;
export declare function lsSetItem(key: any, value: any): void;
export declare function enumEntries(e: any): any[][2];
