"use strict";
exports.__esModule = true;
exports.APP_SCOPED_PREFIX_URL = 'https://www.facebook.com/app_scoped_user_id/';
exports.MAX_RELAWAN_TRUSTED_DEPTH = 4;
exports.MAX_REFERRALS = 150;
var SUM_KEY;
(function (SUM_KEY) {
    SUM_KEY["paslon1"] = "paslon1";
    SUM_KEY["paslon2"] = "paslon2";
    SUM_KEY["sah"] = "sah";
    SUM_KEY["tidakSah"] = "tidakSah";
    SUM_KEY["pending"] = "pending";
    SUM_KEY["error"] = "error";
})(SUM_KEY = exports.SUM_KEY || (exports.SUM_KEY = {}));
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
var FsPath = /** @class */ (function () {
    function FsPath() {
    }
    FsPath.relawan = function (uid) {
        return "r/" + uid;
    };
    FsPath.codeReferral = function (code) {
        return "c/" + code;
    };
    FsPath.imageMetadata = function (imageId) {
        return "i/" + imageId;
    };
    FsPath.imageMetadataUserId = function (imageId) {
        return FsPath.imageMetadata(imageId) + "/u";
    };
    FsPath.imageMetadataServingUrl = function (imageId) {
        return FsPath.imageMetadata(imageId) + "/v";
    };
    FsPath.upserts = function (imageId) {
        return "u" + (imageId ? "/" + imageId : '');
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
