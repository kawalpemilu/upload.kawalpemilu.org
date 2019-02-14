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
    FsPath.imageMetadata = function (imageId) {
        return "i/" + imageId;
    };
    FsPath.imageMetadataUserId = function (imageId) {
        return FsPath.imageMetadata(imageId) + "/u";
    };
    FsPath.imageMetadataServingUrl = function (imageId) {
        return FsPath.imageMetadata(imageId) + "/v";
    };
    FsPath.upserts = function (rootId, imageId) {
        return "u/" + rootId + "/i" + (imageId ? "/" + imageId : '');
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
var DbPath = /** @class */ (function () {
    function DbPath() {
    }
    DbPath.hie = function (id) {
        return "h/" + id;
    };
    DbPath.hieAgg = function (id, cid) {
        return DbPath.hie(id) + "/a/" + cid;
    };
    DbPath.upsert = function (rootId) {
        return "u/" + rootId;
    };
    // The last startTime of the upsertProcessor.
    DbPath.upsertLastStartTs = function (rootId) {
        return DbPath.upsert(rootId) + "/t";
    };
    // Remove ans create this path to trigger upsertProcessor function.
    DbPath.upsertCreateTrigger = function (rootId) {
        return DbPath.upsert(rootId) + "/c";
    };
    // Number of updates of the last batch.
    DbPath.upsertLastUpdateCount = function (rootId) {
        return DbPath.upsert(rootId) + "/u";
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
