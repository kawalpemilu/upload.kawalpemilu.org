"use strict";
exports.__esModule = true;
exports.APP_SCOPED_PREFIX_URL = 'https://www.facebook.com/app_scoped_user_id/';
exports.MAX_REFERRALS = 1000;
exports.MAX_NUM_UPLOADS = 100;
exports.LOCAL_STORAGE_LAST_URL = 'last_url';
var USER_ROLE;
(function (USER_ROLE) {
    USER_ROLE[USER_ROLE["RELAWAN"] = 0] = "RELAWAN";
    USER_ROLE[USER_ROLE["MODERATOR"] = 1] = "MODERATOR";
    USER_ROLE[USER_ROLE["ADMIN"] = 2] = "ADMIN";
})(USER_ROLE = exports.USER_ROLE || (exports.USER_ROLE = {}));
var SUM_KEY;
(function (SUM_KEY) {
    // Pilpres
    SUM_KEY["pas1"] = "pas1";
    SUM_KEY["pas2"] = "pas2";
    SUM_KEY["sah"] = "sah";
    SUM_KEY["tSah"] = "tSah";
    // Common
    SUM_KEY["cakupan"] = "cakupan";
    SUM_KEY["pending"] = "pending";
    SUM_KEY["error"] = "error";
    // Pileg
    SUM_KEY["pkb"] = "pkb";
    SUM_KEY["ger"] = "ger";
    SUM_KEY["pdi"] = "pdi";
    SUM_KEY["gol"] = "gol";
    SUM_KEY["nas"] = "nas";
    SUM_KEY["gar"] = "gar";
    SUM_KEY["ber"] = "ber";
    SUM_KEY["sej"] = "sej";
    SUM_KEY["per"] = "per";
    SUM_KEY["ppp"] = "ppp";
    SUM_KEY["psi"] = "psi";
    SUM_KEY["pan"] = "pan";
    SUM_KEY["han"] = "han";
    SUM_KEY["dem"] = "dem";
    SUM_KEY["pbb"] = "pbb";
    SUM_KEY["pkp"] = "pkp";
    SUM_KEY["pSah"] = "pSah";
    SUM_KEY["pTSah"] = "pTSah";
})(SUM_KEY = exports.SUM_KEY || (exports.SUM_KEY = {}));
exports.PILPRES_FORM = [
    { label: 'Suara Paslon 1', form: 'pas1' },
    { label: 'Suara Paslon 2', form: 'pas2' },
    { label: 'Suara Sah', form: 'sah' },
    { label: 'Suara Tidak Sah', form: 'tSah' }
];
exports.PILEG_FORM = [
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
function extractImageMetadata(m) {
    var validM = null;
    if (m) {
        validM = {};
        ['u', 'k', 't', 'v', 'l', 'a', 's', 'z', 'w', 'h', 'o', 'y', 'x'].forEach(function (attr) {
            if (typeof m[attr] === 'number') {
                validM[attr] = m[attr];
            }
        });
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
exports.extractImageMetadata = extractImageMetadata;
function getServingUrl(url, size) {
    return url ? url.replace(/^http:/, 'https:') + ("=s" + size) : '';
}
exports.getServingUrl = getServingUrl;
function isValidImageId(imageId) {
    return typeof imageId === 'string' && imageId.match(/^[A-Za-z0-9]{20}$/);
}
exports.isValidImageId = isValidImageId;
function isValidUserId(uid) {
    return typeof uid === 'string' && uid.match(/^[A-Za-z0-9]{20,35}$/);
}
exports.isValidUserId = isValidUserId;
var FsPath = /** @class */ (function () {
    function FsPath() {
    }
    FsPath.relawan = function (uid) {
        return "r" + (uid ? '/' + uid : '');
    };
    FsPath.relawanPhoto = function (uid) {
        return "p" + (uid ? '/' + uid : '');
    };
    FsPath.codeReferral = function (code) {
        return "c/" + code;
    };
    FsPath.changeLog = function (logId) {
        return "l/" + logId;
    };
    FsPath.imageMetadata = function (imageId) {
        return "i/" + imageId;
    };
    FsPath.upserts = function (imageId) {
        return "u" + (imageId ? '/' + imageId : '');
    };
    return FsPath;
}());
exports.FsPath = FsPath;
/** Returns a random n-character identifier containing [a-zA-Z0-9]. */
function autoId(n) {
    if (n === void 0) { n = 20; }
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var autoId = '';
    for (var i = 0; i < n; i++) {
        autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
}
exports.autoId = autoId;
