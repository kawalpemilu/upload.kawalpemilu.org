export const APP_SCOPED_PREFIX_URL =
  'https://www.facebook.com/app_scoped_user_id/';
export const MAX_REFERRALS = 1000;
export const MAX_NUM_UPLOADS = 100;
export const LOCAL_STORAGE_LAST_URL = 'last_url';

export enum USER_ROLE {
  RELAWAN = 0,
  MODERATOR = 1,
  ADMIN = 2
}

export enum SUM_KEY {
  // Pilpres
  jum = 'jum',
  pas1 = 'pas1',
  pas2 = 'pas2',
  sah = 'sah',
  tSah = 'tSah',

  // Common
  cakupan = 'cakupan',
  pending = 'pending',
  error = 'error',
  janggal = 'janggal',

  // Pileg
  pkb = 'pkb',
  ger = 'ger',
  pdi = 'pdi',
  gol = 'gol',
  nas = 'nas',
  gar = 'gar',
  ber = 'ber',
  sej = 'sej',
  per = 'per',
  ppp = 'ppp',
  psi = 'psi',
  pan = 'pan',
  han = 'han',
  dem = 'dem',
  pa = 'pa', // Partai lokal Aceh
  ps = 'ps', // Partai lokal Aceh
  pda = 'pda', // Partai lokal Aceh
  pna = 'pna', // Partai lokal Aceh
  pbb = 'pbb',
  pkp = 'pkp',
  pJum = 'pJum',
  pSah = 'pSah',
  pTSah = 'pTSah'
}

export enum PPWP_NAMES {
  jum = 'PHP',
  pas1 = 'S01',
  pas2 = 'S02',
  sah = 'Sah',
  tSah = '~Sah'
}

export enum DPR_NAMES {
  pkb = '1.PKB',
  ger = '2.Grnd',
  pdi = '3.PDIP',
  gol = '4.Glkr',
  nas = '5.Nsdm',
  gar = '6.Grda',
  ber = '7.Berk',
  sej = '8.PKS',
  per = '9.Prnd',
  ppp = '10.PPP',
  psi = '11.PSI',
  pan = '12.PAN',
  han = '13.Hanu',
  dem = '14.Dem',
  pa = '15.PA', // Partai lokal Aceh
  ps = '16.PS', // Partai lokal Aceh
  pda = '17.PDA', // Partai lokal Aceh
  pna = '18.PNA', // Partai lokal Aceh
  pbb = '19.PBB',
  pkp = '20.PKPI',
  pJum = 'P.PHP',
  pSah = 'P.Sah',
  pTSah = 'P.~Sah'
}

export enum FORM_TYPE {
  // Full blown until digitized.
  PPWP = 1,
  DPR,

  // Only up to halaman, not digitized.
  DPD,
  DPRP,
  DPRPB,
  DPRA,
  DPRD_PROV,
  DPRD_KAB_KOTA,
  DPRK,

  // Up to choosing this type.
  OTHERS,
  DELETED
}

export type SumMap = { [key in SUM_KEY]: number };

export interface PublicProfile {
  uid: string; // Firebase User ID
  link: string; // App scoped link to Facebook profile
  name: string; // User Full Name
  email: string; // User email
  pic: string; // Link to user's profile picture
  loginTs: number; // The timestamp of last login
  role: USER_ROLE;
  dr4: number; // Number of downstream referrals.
}

export interface RelawanPhotos {
  profile: PublicProfile;
  uploads: UploadRequest[];
  count: number;
}

export interface Relawan {
  lowerCaseName: string; // For prefix search.
  profile: PublicProfile;
  referrer: PublicProfile;
  depth: number; // Referral depth
  code: { [code: string]: CodeReferral }; // Code referrals
  auth: any; // firebase.User reference.
}

export interface ChangeLog {
  auid: string; // Actor uid that initiates the change.
  tuid: string; // Target uid that received the change.
  role: USER_ROLE; // The new role of the target uid.
  ts: number; // The timestamp of this change log.
}

export interface UpsertProfile extends PublicProfile {
  ts: number; // The timestamp of the activity.
  ua: string; // The request header 'user-agent'.
  ip: string; // The ip address the request is coming from.
}

export enum IS_PLANO {
  YES = 1,
  NO
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
  photos: { [url: string]: Aggregate };
}

export interface TpsImage {
  uploader: UpsertProfile;
  reviewer: UpsertProfile;
  reporter: UpsertProfile;
  c1: C1Form; // Null if unknown.
  sum: SumMap;
  url: string;
  meta: ImageMetadata;
}

export interface TpsData {
  images: { [imageId: string]: TpsImage };
  imgCount: number;
}

export interface Upsert {
  request: UploadRequest;
  uploader: UpsertProfile;
  reviewer: UpsertProfile;
  reporter: UpsertProfile;
  done: number; // Set to 0 to reprocess this upsert.
  action: TpsAggregate; // The action to be performed to the aggregator.
}

export interface CodeReferral {
  issuer: PublicProfile;
  issuedTs: number; // The issued timestamp
  name: string; // The intended claimer name
  claimer: PublicProfile;
  claimedTs: number; // The claimed timestamp
  depth: number; // The referral depth
  agg: number; // Whether it has been aggregated to the Relawan profile.
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
  id: number; // TpsNo if the parent is a kelurahan.
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
  child?: { [id: string]: ChildData };
  children: any[];
  depth: number;
  data: { [key: string]: Aggregate };
}

export interface ImageMetadata {
  u: string; // The userId who uploaded.
  k: number; // Kelurahan ID wher it's set.
  t: number; // TPS Number where it's set.
  v: string; // The serving URL of the image.
  l: number; // Last Modified Timestamp.
  a: number; // Created Timestamp.
  s: number; // Size in Bytes.
  z: number; // Size in Bytes after compressed.
  w: number; // Original Width.
  h: number; // Original Height.
  m: [string, string]; // [Make, Model].
  o: number; // Orientation.
  y: number; // Latitude.
  x: number; // Longitude.
}

export function extractImageMetadata(m: any): ImageMetadata | null {
  let validM: ImageMetadata = null;
  if (m) {
    validM = {} as ImageMetadata;
    ['u', 'k', 't', 'v', 'l', 'a', 's', 'z', 'w', 'h', 'o', 'y', 'x'].forEach(
      attr => {
        if (typeof m[attr] === 'number') {
          validM[attr] = m[attr];
        }
      }
    );
    if (typeof m.m === 'object') {
      validM.m = ['', ''];
      if (typeof m.m[0] === 'string') {
        validM.m[0] = m.m[0].substring(0, 50);
      }
      if (typeof m.m[1] === 'string') {
        validM.m[1] = m.m[1].substring(0, 50);
      }
    }
  }
  return !validM || Object.keys(validM).length == 0 ? null : validM;
}

export function getServingUrl(url: string, size: number) {
  return url ? url.replace(/^http:/, 'https:') + `=s${size}` : '';
}

export function isValidImageId(imageId: string) {
  return typeof imageId === 'string' && imageId.match(/^[A-Za-z0-9]{20}$/);
}

export function isValidUserId(uid: string) {
  return typeof uid === 'string' && uid.match(/^[A-Za-z0-9]{20,35}$/);
}

export class FsPath {
  static hie(id?: number) {
    return `h${typeof id === 'number' ? '/' + id : ''}`;
  }

  static hieCache(id: number) {
    return `hc/${id}`;
  }

  static relawan(uid?: string) {
    return `r${uid ? '/' + uid : ''}`;
  }

  static relawanPhoto(uid?: string) {
    return `p${uid ? '/' + uid : ''}`;
  }

  static tps(kelId: number, tpsNo: number) {
    return `t/${kelId}-${tpsNo}`;
  }

  static codeReferral(code?: string) {
    return `c${code ? '/' + code : ''}`;
  }

  static changeLog(logId: string) {
    return `l/${logId}`;
  }

  static imageMetadata(imageId: string) {
    return `i/${imageId}`;
  }

  static upserts(imageId?: string) {
    return `u${imageId ? '/' + imageId : ''}`;
  }
}

/** Returns a random n-character identifier containing [a-zA-Z0-9]. */
export function autoId(n = 20): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < n; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}

export function toChild(node: HierarchyNode) {
  const child: { [id: string]: ChildData } = {};
  if (node.depth === 4) {
    for (const c of node.children) {
      if (c.length !== 3) throw new Error('c');
      const [tpsNo, nL, nP] = c;
      child[tpsNo] = { id: tpsNo, nL, nP } as ChildData;
    }
  } else {
    for (const c of node.children) {
      if (c.length !== 5) throw new Error('c');
      const [cid, cname, nTps, nL, nP] = c;
      child[cid] = { id: cid, name: cname.toUpperCase(), nTps, nL, nP };
    }
  }
  return child;
}

export function toChildren(node: HierarchyNode) {
  return Object.keys(node.child).map(cid => {
    const c = node.child[cid];
    return node.depth === 4
      ? [c.id, c.nL, c.nP]
      : [c.id, c.name, c.nTps, c.nL, c.nP];
  });
}

export function lsGetItem(key) {
  if (window.localStorage) {
    try {
      const value = JSON.parse(window.localStorage.getItem(key));
      // console.log('lsGetItem', key, value);
      return value;
    } catch (e) {
      console.log(`Unable to get from localStorage`);
      return null;
    }
  } else {
    console.log('No localStorage');
  }
}

export function lsSetItem(key, value) {
  if (window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      // console.log('lsSetItem', key);
    } catch (e) {
      console.log(`Unable to set to localStorage`);
    }
  } else {
    console.log('No localStorage');
  }
}

export function enumEntries(e: any): any[][2] {
  const o = Object.keys(e);
  const h = o.length / 2;
  const entries = [];
  for (let i = 0; i < o.length / 2; i++) {
    entries.push([o[i], o[h + i]]);
  }
  return entries;
}
