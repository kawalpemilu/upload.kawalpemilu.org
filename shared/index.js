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
    FsPath.children = function (cid) {
        return "c/" + cid;
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
function getTpsNumbers(childrenBits) {
    var tpsNumbers = [];
    for (var i = 0; i < childrenBits.length; i++) {
        for (var j = 0; j < 30; j++) {
            if (childrenBits[i] & (1 << j)) {
                tpsNumbers.push(i * 30 + j);
            }
        }
    }
    return tpsNumbers;
}
exports.getTpsNumbers = getTpsNumbers;
