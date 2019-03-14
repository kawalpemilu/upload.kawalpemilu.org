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

export interface PublicProfile {
  uid: string; // Firebase User ID
  link: string; // App scoped link to Facebook profile
  name: string; // User Full Name
  email: string; // User email
  pic: string; // Link to user's profile picture
  loginTs: number; // The timestamp of last login
  role: USER_ROLE;
}

export interface Relawan {
  lowerCaseName: string; // For prefix search.
  profile: PublicProfile;
  referrer: PublicProfile;
  uploads: UploadRequest[];
  numUploads: number;
  imageIds: string[];
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

export enum SUM_KEY {
  // Pilpres
  pas1 = 'pas1',
  pas2 = 'pas2',
  sah = 'sah',
  tSah = 'tSah',

  // Common
  cakupan = 'cakupan',
  pending = 'pending',
  error = 'error',

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
  pbb = 'pbb',
  pkp = 'pkp',
  pSah = 'pSah',
  pTSah = 'pTSah'
}

export interface FormLabel {
  label: string;
  form: string;
}

export const PILPRES_FORM: FormLabel[] = [
  { label: 'Suara Paslon 1', form: 'pas1' },
  { label: 'Suara Paslon 2', form: 'pas2' },
  { label: 'Suara Sah', form: 'sah' },
  { label: 'Suara Tidak Sah', form: 'tSah' }
];

export const PILEG_FORM: FormLabel[] = [
  { label: 'Partai Kebangkitan Bangsa', form: 'pkb' },
  { label: 'Partai Gerindra', form: 'ger' },
  { label: 'PDI Perjuangan', form: 'pdi' },
  { label: 'Partai Golongan Karya', form: 'gol' },
  { label: 'Partai NasDem', form: 'nas' },
  { label: 'Partai Garuda', form: 'gar' },
  { label: 'Partai Berkarya', form: 'ber' },
  { label: 'Partai Keadilan Sejahtera', form: 'sej' },
  { label: 'Partai Perindo', form: 'per' },
  { label: 'Partai Persatuan Pembangunan', form: 'ppp' },
  { label: 'Partai Solidaritas Indonesia', form: 'psi' },
  { label: 'Partai Amanat Nasional', form: 'pan' },
  { label: 'Partai Hanura', form: 'han' },
  { label: 'Partai Demokrat', form: 'dem' },
  { label: 'Partai Bulan Bintang', form: 'pbb' },
  { label: 'Partai Keadilan dan Persatuan Indonesia', form: 'pkp' },
  { label: 'Suara Sah', form: 'pSah' },
  { label: 'Suara Tidak Sah', form: 'pTSah' }
];

export interface UpsertProfile extends PublicProfile {
  ts: number; // The timestamp of the activity.
  ua: string; // The request header 'user-agent'.
  ip: string; // The ip address the request is coming from.
}

export type SumMap = { [key in SUM_KEY]: number };

export interface Action {
  sum: SumMap;
  imageIds: string[]; // Image ids to be published.
  ts: number;
}

export interface Upsert {
  request: UploadRequest,
  uploader: UpsertProfile;
  reviewer: UpsertProfile;
  reporter: UpsertProfile;
  data: UpsertData;
  meta: ImageMetadata;
  kelId: number;
  tpsNo: number;
  done: number; // Set to 0 to reprocess this upsert.
  action: Action; // The action to be performed to the aggregator.
}

export interface CodeReferral {
  issuer: PublicProfile;
  issuedTs: number; // The issued timestamp
  name: string; // The intended claimer name
  claimer: PublicProfile;
  claimedTs: number; // The claimed timestamp
  depth: number; // The referral depth
}

export interface UpsertData {
  sum: SumMap;
  imageId: string;
  url: string; // Proof of this Data.
  updateTs: number; // Last update timestamp.
}

export interface UploadRequest {
  kelId: number;
  kelName: string;
  tpsNo: number;
  data: UpsertData;
  meta: ImageMetadata;
}

export interface ApiApproveRequest {
  kelId: number;
  tpsNo: number;
  action: Action;
}

export interface HierarchyNode {
  id: number;
  name: string;
  parentIds: number[];
  parentNames: string[];
  children: any[];
  depth: number;
  data: { [key: string]: UpsertData };
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
  static relawan(uid?: string) {
    return `r${uid ? '/' + uid : ''}`;
  }

  static codeReferral(code: string) {
    return `c/${code}`;
  }

  static changeLog(logId: string) {
    return `l/${logId}`;
  }

  static imageMetadata(imageId: string) {
    return `i/${imageId}`;
  }
  static imageMetadataUserId(imageId: string) {
    return `${FsPath.imageMetadata(imageId)}/u`;
  }
  static imageMetadataServingUrl(imageId: string) {
    return `${FsPath.imageMetadata(imageId)}/v`;
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
