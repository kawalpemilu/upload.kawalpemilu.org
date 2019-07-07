export const LOCK_DOWN = true;

export const APP_SCOPED_PREFIX_URL =
  'https://www.facebook.com/app_scoped_user_id/';
export const MAX_REFERRALS = 1500;
export const MAX_NUM_UPLOADS = 1500;
export const MAX_URL_LENGTH = 300;
export const MAX_REASON_LENGTH = 300;
export const MAX_REPORT_ERRORS = 300;
export const MAX_LAPOR_KPU = 300;
export const LOCAL_STORAGE_LAST_URL = 'last_url';
export const KPU_SCAN_UID = 'gEQFS1n5gpTzMTy5JASPPLk4yRA3';
export const BAWASLU_UID = 'JxtI70W33rWM0EfMlZSbaiRfsEk2';
export const BOT_UID = '9PJkYzjbjCUFtO8N8wvZRoqShDB2';

export enum USER_ROLE {
  BANNED = -1,
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
  error = 'error', // Ada angka yang bisa diperbaiki Admins.
  janggal = 'janggal', // Ada angka yang mismatch dan tidak bisa diperbaiki.
  laporKpu = 'laporKpu', // Laporkan kejanggalan ini ke KPU.

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
  pJum = 'P.PHP',
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
  PEMANDANGAN,
  MALICIOUS
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
  // TODO: migrate depth here.
}

export interface RelawanPhotos {
  profile: PublicProfile;
  uploads: UploadRequest[];
  reports: ProblemRequest[];
  laporKpus: LaporKpuRequest[];
  uploadCount: number; // Number of uploaded photos.
  maxUploadCount: number; // Whitelist this person to go beyond.
  reportCount: number; // Number of reported photos.
  maxReportCount: number; // Whitelist this person to go beyond.
  reviewCount: number; // The number of images reviewed.
  laporKpuCount: number; // The number of janggal photos lapored ke KPU.
  maxLaporKpuCount: number; // The max number of janggal photos lapored ke KPU.
  nTps: number; // Number of different TPS uploaded.
  nKel: number; // Number of different kelurahans uploaded.
}

export interface Relawan {
  lowerCaseName: string; // For prefix search.
  profile: PublicProfile;
  referrer: PublicProfile;
  depth: number; // Referral depth
  code: { [code: string]: CodeReferral }; // Code referrals
  auth: any; // firebase.User reference.
  theCode: string; // The code to refer others.
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

export type Halaman =
  | '0' // Invalid halaman
  | '1'
  | '2'
  | '2.1'
  | '2.2'
  | '2.3'
  | '2.4'
  | '2.5'
  | '2.6'
  | '2.7'
  | '2.8'
  | '2.9'
  | '2.10'
  | '2.11'
  | '2.12'
  | '2.13'
  | '2.14'
  | '2.15'
  | '2.16'
  | '2.17'
  | '2.18'
  | '2.19'
  | '2.20'
  | '3';

export enum LEMBAR_KEY {
  PILPRES = 1,
  PARTAI4,
  PARTAI16_PLANO,
  PARTAI4_NO_DIGITIZE,
  PARTAI16_PLANO_NO_DIGITIZE,
  PARTAI5_NO_DIGITIZE,
  PARTAI20_PLANO_NO_DIGITIZE,
  CALON3_NO_DIGITIZE,
  CALON5_PLANO_NO_DIGITIZE
}

export type LembarSpec = { [halaman in Halaman]: SUM_KEY[] };

export const LEMBAR_SPEC: { [key in LEMBAR_KEY]: LembarSpec } = {
  [LEMBAR_KEY.PILPRES]: {
    '1': [SUM_KEY.jum],
    '2': [SUM_KEY.pas1, SUM_KEY.pas2, SUM_KEY.sah, SUM_KEY.tSah]
  } as LembarSpec,

  [LEMBAR_KEY.PARTAI4]: {
    '1': [SUM_KEY.pJum],
    '2.1': [SUM_KEY.pkb, SUM_KEY.ger, SUM_KEY.pdi, SUM_KEY.gol],
    '2.2': [SUM_KEY.nas, SUM_KEY.gar, SUM_KEY.ber, SUM_KEY.sej],
    '2.3': [SUM_KEY.per, SUM_KEY.ppp, SUM_KEY.psi, SUM_KEY.pan],
    '2.4': [SUM_KEY.han, SUM_KEY.dem, SUM_KEY.pbb, SUM_KEY.pkp],
    '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
  } as LembarSpec,

  [LEMBAR_KEY.PARTAI16_PLANO]: {
    '1': [SUM_KEY.pJum],

    '2.1': [SUM_KEY.pkb],
    '2.2': [SUM_KEY.ger],
    '2.3': [SUM_KEY.pdi],
    '2.4': [SUM_KEY.gol],

    '2.5': [SUM_KEY.nas],
    '2.6': [SUM_KEY.gar],
    '2.7': [SUM_KEY.ber],
    '2.8': [SUM_KEY.sej],

    '2.9': [SUM_KEY.per],
    '2.10': [SUM_KEY.ppp],
    '2.11': [SUM_KEY.psi],
    '2.12': [SUM_KEY.pan],

    '2.13': [SUM_KEY.han],
    '2.14': [SUM_KEY.dem],
    '2.15': [SUM_KEY.pbb],
    '2.16': [SUM_KEY.pkp],

    '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
  } as LembarSpec,

  [LEMBAR_KEY.PARTAI4_NO_DIGITIZE]: {
    '1': null,
    '2.1': null,
    '2.2': null,
    '2.3': null,
    '2.4': null,
    '3': null
  } as LembarSpec,

  [LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE]: {
    '1': null,

    '2.1': null,
    '2.2': null,
    '2.3': null,
    '2.4': null,

    '2.5': null,
    '2.6': null,
    '2.7': null,
    '2.8': null,

    '2.9': null,
    '2.10': null,
    '2.11': null,
    '2.12': null,

    '2.13': null,
    '2.14': null,
    '2.15': null,
    '2.16': null,

    '3': null
  } as LembarSpec,

  [LEMBAR_KEY.PARTAI5_NO_DIGITIZE]: {
    '1': null,
    '2.1': null,
    '2.2': null,
    '2.3': null,
    '2.4': null,
    '2.5': null,
    '3': null
  } as LembarSpec,

  [LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE]: {
    '1': null,

    '2.1': null,
    '2.2': null,
    '2.3': null,
    '2.4': null,

    '2.5': null,
    '2.6': null,
    '2.7': null,
    '2.8': null,

    '2.9': null,
    '2.10': null,
    '2.11': null,
    '2.12': null,

    '2.13': null,
    '2.14': null,
    '2.15': null,
    '2.16': null,

    '2.17': null,
    '2.18': null,
    '2.19': null,
    '2.20': null,

    '3': null
  } as LembarSpec,

  [LEMBAR_KEY.CALON3_NO_DIGITIZE]: {
    '1': null,
    '2.1': null,
    '2.2': null,
    '2.3': null,
    '3': null
  } as LembarSpec,

  [LEMBAR_KEY.CALON5_PLANO_NO_DIGITIZE]: {
    '1': null,
    '2.1': null,
    '2.2': null,
    '2.3': null,
    '2.4': null,
    '2.5': null,
    '3': null
  } as LembarSpec
};

export const LEMBAR: {
  [key in FORM_TYPE]: { [key2 in IS_PLANO]: LembarSpec }
} = {
  [FORM_TYPE.PPWP]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PILPRES],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PILPRES]
  },
  [FORM_TYPE.DPR]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4]
  },
  // These forms below are not digitized, only classified.
  [FORM_TYPE.DPRPB]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
  },
  [FORM_TYPE.DPRP]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
  },
  [FORM_TYPE.DPRK]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI5_NO_DIGITIZE]
  },
  [FORM_TYPE.DPRD_PROV]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
  },
  [FORM_TYPE.DPRD_KAB_KOTA]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE]
  },
  [FORM_TYPE.DPRA]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI5_NO_DIGITIZE]
  },
  [FORM_TYPE.DPD]: {
    [IS_PLANO.YES]: this.LEMBAR_SPEC[LEMBAR_KEY.CALON5_PLANO_NO_DIGITIZE],
    [IS_PLANO.NO]: this.LEMBAR_SPEC[LEMBAR_KEY.CALON3_NO_DIGITIZE]
  },
  [FORM_TYPE.OTHERS]: null,
  [FORM_TYPE.PEMANDANGAN]: null,
  [FORM_TYPE.MALICIOUS]: null
};

export function isValidHalaman(c1: C1Form) {
  if (c1.type === FORM_TYPE.PPWP || c1.type === FORM_TYPE.DPR) {
    return !!(
      LEMBAR[c1.type] &&
      LEMBAR[c1.type][c1.plano] &&
      LEMBAR[c1.type][c1.plano][c1.halaman]
    );
  }

  const hal = c1.halaman;
  if (!hal || typeof hal !== 'string') return false;
  const h = hal.split('.');
  if (!(+h[0] >= 1 && +h[0] <= 3)) return false;
  if (h.length === 1) return true;
  return h.length === 2 && +h[1] >= 1 && +h[1] <= 20;
}

export interface C1Form {
  type: FORM_TYPE;
  plano: IS_PLANO;
  halaman: Halaman;
}

export interface Aggregate {
  sum: SumMap;
  ts: number;
  c1: C1Form;
}

export interface TpsAggregate extends Aggregate {
  photos: { [url: string]: Aggregate };
}

export interface ErrorReports {
  [ts: string]: {
    reporter: UpsertProfile;
    reason: string;
  };
}

export type Autofill = {
  // The key is a dot separated value of:
  // formType.isPlano.halaman.comment
  [key: string]: SumMap;
};

export interface TpsImage {
  uploader: UpsertProfile;
  reviewer: UpsertProfile;
  reports: ErrorReports;
  c1: C1Form; // Null if unknown.
  sum: SumMap;
  url: string;
  meta: ImageMetadata;
}

export interface TpsData {
  images: { [imageId: string]: TpsImage };
  autofill?: Autofill;
  imgCount: number;
  laporKpu: boolean;
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
  bulk: boolean; // Is this referral generated for bulk referral?
}

export interface UploadRequest {
  imageId: string;
  kelId: number;
  kelName: string;
  tpsNo: number;
  meta: ImageMetadata;
  url: string;
  ts: number;
  // Will be filled when approved.
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

export interface LaporKpuRequest {
  kelId: number;
  kelName: string;
  tpsNo: number;
  ts: number;
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
  child?: { [cid: string]: ChildData };
  children: any[];
  depth: number;
  data: { [cid: string]: TpsAggregate };
  kpu: KpuData;
  rekap: KpuData
}

export type KpuData = {
  [cid: string]: SumMap;
};

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
  return (
    typeof imageId === 'string' &&
    imageId.match(/^[A-Za-z0-9]{20}(--?[0-9]+-[0-9]+)*$/)
  );
}

export function isValidUserId(uid: string) {
  return typeof uid === 'string' && uid.match(/^[A-Za-z0-9]{20,35}$/);
}

export class FsPath {
  static hie(id?: number) {
    return `h${typeof id === 'number' ? '/' + id : ''}`;
  }

  static hieCache(id: number) {
    return `hc2/${id}`;
  }

  static relawan(uid?: string) {
    return `r${uid ? '/' + uid : ''}`;
  }

  static relawanPhoto(uid?: string) {
    return `p2${uid ? '/' + uid : ''}`;
  }

  static tps(kelId: number, tpsNo: number) {
    return `t2/${kelId}-${tpsNo}`;
  }

  static kpu(kelId: number) {
    return `k/${kelId}`;
  }

  static scoreboard() {
    return `s/s`;
  }

  static codeReferral(code?: string) {
    return `c${code ? '/' + code : ''}`;
  }

  static changeLog(logId?: string) {
    return `l${logId ? '/' + logId : ''}`;
  }

  static imageMetadata(imageId: string) {
    return `i2/${imageId}`;
  }

  static upserts(imageId?: string) {
    return `u2${imageId ? '/' + imageId : ''}`;
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

export function canGenerateCustomCode(user) {
  return (user.email || '').endsWith('_group@tfbnw.net');
}

export function computeAction(tps: TpsData, tpsNo: number) {
  const sum = { pending: 0, cakupan: 0, janggal: 0 } as SumMap;
  const action = { sum, photos: {}, ts: 0, c1: null };
  const valid = {};
  for (const imageId of Object.keys(tps.images).sort((a, b) => {
    const ra = tps.images[a].reviewer;
    const rb = tps.images[b].reviewer;
    return ((rb && rb.ts) || 0) - ((ra && ra.ts) || 0);
  })) {
    const i = tps.images[imageId];
    if (!i.c1) {
      action.sum.cakupan = tpsNo > 0 ? 1 : 0;
      action.sum.pending = 1;
      continue;
    }
    const ignore =
      i.c1.type === FORM_TYPE.MALICIOUS || i.c1.type === FORM_TYPE.OTHERS;
    if (ignore) {
      if (!action.photos.hasOwnProperty(i.url)) {
        action.photos[i.url] = null;
      }
    } else {
      action.sum.cakupan = tpsNo > 0 ? 1 : 0;
      action.photos[i.url] = {
        c1: i.c1,
        sum: i.sum,
        ts: i.reviewer.ts
      };
      action.ts = Math.max(action.ts, i.reviewer.ts);
    }
    for (const key of Object.keys(i.sum)) {
      if (!valid[key]) {
        action.sum[key] = i.sum[key];
        valid[key] = !ignore && isCorrectType(i.c1, key);
        continue;
      }
      if (ignore || !isCorrectType(i.c1, key)) continue;
      if (action.sum[key] !== i.sum[key]) {
        action.sum.janggal = 1;
      }
    }
  }
  if (valid['jum'] && (valid['sah'] || valid['tSah'])) {
    if (action.sum.jum !== action.sum.sah + action.sum.tSah) {
      action.sum.janggal = 1;
    }
  }
  if (valid['pas1'] && valid['pas2'] && valid['sah']) {
    if (action.sum.sah !== action.sum.pas1 + action.sum.pas2) {
      action.sum.janggal = 1;
    }
  }
  action.sum.laporKpu = tps.laporKpu && action.sum.janggal ? 1 : 0;
  return action;
}

function isCorrectType(c1: C1Form, key) {
  const plano = LEMBAR[c1.type];
  if (!plano) return false;
  const spec = plano[c1.plano];
  if (!spec) return false;
  const hal = spec[c1.halaman];
  if (!hal) return false;
  return hal.indexOf(key) !== -1;
}

/**
 * Quota Manager.
 */

// Allow up to {maxCount} requests for given {duration}.
interface QuotaRestriction {
  maxCount: number;
  duration: number;
}

export type QuotaSpecKey = 'api';

// The number of request {count} since {timestamp}.
export interface Quota {
  timestamp: number;
  count: number;
}

export type QuotaSegments = { [key: string]: Quota };

// The quota specifications: a list of quota restrictions.
export class QuotaSpecs {
  static SPECS: { [key in QuotaSpecKey]: string[] } = {
    api: ['30@1m', '200@10m', '600@1h']
  };

  static UNIT_TO_MS: { [key: string]: number } = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000
  };

  specs: { [key: string]: QuotaRestriction } = {};

  constructor(public key: QuotaSpecKey) {
    QuotaSpecs.SPECS[key].forEach(s => {
      const p = s.split('@');
      this.specs[s] = {
        maxCount: parseInt(p[0], 10),
        duration: QuotaSpecs.getDurationMs(p[1])
      };
    });
  }

  request(quota: QuotaSegments, now: number) {
    for (const k in this.specs) {
      const s = this.specs[k];
      let q = quota[k];
      if (!q || q.timestamp + s.duration < now) {
        // Reset the quota since it's stale.
        q = { timestamp: now, count: 0 };
      }
      if (++q.count > s.maxCount) {
        // Abort, signify failure.
        return;
      }
      quota[k] = q;
    }
    return quota;
  }

  // Converts '1d' string to number in milliseconds.
  static getDurationMs(dur: string): number {
    if (dur.length < 2) return NaN;
    const i = dur.length - 1;
    const num = parseInt(dur.substring(0, i), 10);
    const unit = QuotaSpecs.UNIT_TO_MS[dur.substring(i)];
    return num * unit;
  }
}

export function isSuperAdmin(uid: string) {
  return (
    uid === '5F1DwscbfSUFVoEmZACJKXZFHgk2' ||
    uid === 'RPvv6e5Udseed9nY4usyhFpJXhJ3' ||
    uid === 'aBttjSmH0hVbxi3rpxpDYKfgg5z1' ||
    uid === 'GoDw4BKzhYhLbaViofhpncfWOpM2'
  );
}
