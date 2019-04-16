export declare const APP_SCOPED_PREFIX_URL = "https://www.facebook.com/app_scoped_user_id/";
export declare const MAX_REFERRALS = 5000;
export declare const MAX_NUM_UPLOADS = 100;
export declare const MAX_URL_LENGTH = 300;
export declare const MAX_REASON_LENGTH = 300;
export declare const MAX_REPORT_ERRORS = 10;
export declare const LOCAL_STORAGE_LAST_URL = "last_url";
export declare enum USER_ROLE {
    BANNED = -1,
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
    pa = "pa",
    ps = "ps",
    pda = "pda",
    pna = "pna",
    pbb = "pbb",
    pkp = "pkp",
    pJum = "pJum",
    pSah = "pSah",
    pTSah = "pTSah"
}
export declare enum PPWP_NAMES {
    jum = "PHP",
    pas1 = "S01",
    pas2 = "S02",
    sah = "Sah",
    tSah = "~Sah"
}
export declare enum DPR_NAMES {
    pJum = "P.PHP",
    pkb = "1.PKB",
    ger = "2.Grnd",
    pdi = "3.PDIP",
    gol = "4.Glkr",
    nas = "5.Nsdm",
    gar = "6.Grda",
    ber = "7.Berk",
    sej = "8.PKS",
    per = "9.Prnd",
    ppp = "10.PPP",
    psi = "11.PSI",
    pan = "12.PAN",
    han = "13.Hanu",
    dem = "14.Dem",
    pa = "15.PA",
    ps = "16.PS",
    pda = "17.PDA",
    pna = "18.PNA",
    pbb = "19.PBB",
    pkp = "20.PKPI",
    pSah = "P.Sah",
    pTSah = "P.~Sah"
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
    MALICIOUS = 11
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
    dr4: number;
}
export interface RelawanPhotos {
    profile: PublicProfile;
    uploads: UploadRequest[];
    reports: ProblemRequest[];
    uploadCount: number;
    maxUploadCount: number;
    reportCount: number;
    maxReportCount: number;
    reviewCount: number;
    nTps: number;
    nKel: number;
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
    theCode: string;
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
export interface ErrorReports {
    [ts: string]: {
        reporter: UpsertProfile;
        reason: string;
    };
}
export interface TpsImage {
    uploader: UpsertProfile;
    reviewer: UpsertProfile;
    reports: ErrorReports;
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
    agg: number;
    bulk: boolean;
}
export interface UploadRequest {
    imageId: string;
    kelId: number;
    kelName: string;
    tpsNo: number;
    meta: ImageMetadata;
    url: string;
    ts: number;
    c1: C1Form;
    sum: SumMap;
}
export interface ApproveRequest {
    kelId: number;
    kelName: string;
    tpsNo: number;
    imageId: string;
    sum: SumMap;
    c1: C1Form;
}
export interface ProblemRequest {
    kelId: number;
    kelName: string;
    tpsNo: number;
    url: string;
    reason: string;
    ts: number;
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
        [cid: string]: ChildData;
    };
    children: any[];
    depth: number;
    data: {
        [cid: string]: TpsAggregate;
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
    static hieCache(id: number): string;
    static relawan(uid?: string): string;
    static relawanPhoto(uid?: string): string;
    static tps(kelId: number, tpsNo: number): string;
    static codeReferral(code?: string): string;
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
export declare function canGenerateCustomCode(user: any): any;
/**
 * Quota Manager.
 */
interface QuotaRestriction {
    maxCount: number;
    duration: number;
}
export declare type QuotaSpecKey = 'api';
export interface Quota {
    timestamp: number;
    count: number;
}
export declare type QuotaSegments = {
    [key: string]: Quota;
};
export declare class QuotaSpecs {
    key: QuotaSpecKey;
    static SPECS: {
        [key in QuotaSpecKey]: string[];
    };
    static UNIT_TO_MS: {
        [key: string]: number;
    };
    specs: {
        [key: string]: QuotaRestriction;
    };
    constructor(key: QuotaSpecKey);
    request(quota: QuotaSegments, now: number): QuotaSegments;
    static getDurationMs(dur: string): number;
}
export {};
