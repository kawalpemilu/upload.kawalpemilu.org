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
    SUM_KEY["jum"] = "jum";
    SUM_KEY["pas1"] = "pas1";
    SUM_KEY["pas2"] = "pas2";
    SUM_KEY["sah"] = "sah";
    SUM_KEY["tSah"] = "tSah";
    // Common
    SUM_KEY["cakupan"] = "cakupan";
    SUM_KEY["pending"] = "pending";
    SUM_KEY["error"] = "error";
    SUM_KEY["janggal"] = "janggal";
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
    SUM_KEY["pJum"] = "pJum";
    SUM_KEY["pSah"] = "pSah";
    SUM_KEY["pTSah"] = "pTSah";
})(SUM_KEY = exports.SUM_KEY || (exports.SUM_KEY = {}));
var FORM_TYPE;
(function (FORM_TYPE) {
    FORM_TYPE["ps"] = "ps";
    FORM_TYPE["pp"] = "pp";
    FORM_TYPE["ds"] = "ds";
    FORM_TYPE["dp"] = "dp"; // DPR, Plano
})(FORM_TYPE = exports.FORM_TYPE || (exports.FORM_TYPE = {}));
var IMAGE_STATUS;
(function (IMAGE_STATUS) {
    IMAGE_STATUS["new"] = "new";
    IMAGE_STATUS["ignored"] = "ignored";
    IMAGE_STATUS["deleted"] = "deleted";
    IMAGE_STATUS["approved"] = "approved";
    IMAGE_STATUS["error"] = "error";
})(IMAGE_STATUS = exports.IMAGE_STATUS || (exports.IMAGE_STATUS = {}));
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
    FsPath.tps = function (kelId, tpsNo) {
        return "t/" + kelId + "-" + tpsNo;
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
