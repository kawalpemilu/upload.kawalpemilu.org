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
var DbPath = /** @class */ (function () {
    function DbPath() {
    }
    DbPath.hie = function (id) {
        return "h/" + id;
    };
    DbPath.hieAgg = function (id, cid) {
        return DbPath.hie(id) + "/a/" + cid;
    };
    DbPath.upserts = function (rootId) {
        return "u/" + rootId;
    };
    DbPath.upsertsLease = function (rootId) {
        return DbPath.upserts(rootId) + " l";
    };
    DbPath.upsertsPending = function (rootId) {
        return DbPath.upserts(rootId) + "/p";
    };
    DbPath.upsertsQueueCount = function (rootId) {
        return DbPath.upserts(rootId) + "/c";
    };
    DbPath.upsertsQueue = function (rootId) {
        return DbPath.upserts(rootId) + "/q";
    };
    DbPath.upsertsQueueImage = function (rootId, imageId) {
        return DbPath.upsertsQueue(rootId) + "/" + imageId;
    };
    DbPath.upsertsArchiveImage = function (rootId, imageId) {
        return DbPath.upserts(rootId) + "/a/" + imageId;
    };
    DbPath.upsertsArchiveImageDone = function (rootId, imageId) {
        return DbPath.upserts(rootId) + "/a/" + imageId + "/d";
    };
    DbPath.imageMetadata = function (imageId) {
        return "i/" + imageId;
    };
    DbPath.imageMetadataUserId = function (imageId) {
        return DbPath.imageMetadata(imageId) + "/u";
    };
    DbPath.imageMetadataServingUrl = function (imageId) {
        return DbPath.imageMetadata(imageId) + "/v";
    };
    DbPath.tpsPending = function (kelurahanId, tpsNo) {
        return "t/" + kelurahanId + "/" + tpsNo + "/p";
    };
    DbPath.tpsPendingImage = function (kelurahanId, tpsNo, imageId) {
        return DbPath.tpsPending(kelurahanId, tpsNo) + "/" + imageId;
    };
    DbPath.codeReferral = function (code) {
        return "c/" + code;
    };
    return DbPath;
}());
exports.DbPath = DbPath;
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
