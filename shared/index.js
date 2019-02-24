"use strict";
exports.__esModule = true;
function extractImageMetadata(m) {
    var validM = null;
    if (m) {
        validM = {};
        ['u', 'k', 't', 'v', 'l', 's', 'z', 'w', 'h', 'o', 'y', 'x'].forEach(function (attr) {
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
    FsPath.tpsImages = function (kelurahanId, tpsNo) {
        return "t/" + kelurahanId + "/n/" + tpsNo + "/i";
    };
    FsPath.tpsImage = function (kelurahanId, tpsNo, imageId) {
        return FsPath.tpsImages(kelurahanId, tpsNo) + "/" + imageId;
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
