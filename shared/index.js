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
    DbPath.hieParents = function (id) {
        return DbPath.hie(id) + "/p";
    };
    DbPath.hieDepth = function (id) {
        return DbPath.hie(id) + "/d";
    };
    DbPath.hieChildren = function (id) {
        return DbPath.hie(id) + "/c";
    };
    DbPath.hieAgg = function (id, cid) {
        return DbPath.hie(id) + "/a/" + cid;
    };
    DbPath.hieRootId = function (id) {
        return DbPath.hie(id) + "/p/0";
    };
    DbPath.upserts = function (rootId) {
        return "u/" + rootId;
    };
    DbPath.upsertsLock = function (rootId) {
        return DbPath.upserts(rootId) + "/lock";
    };
    DbPath.upsertsLockLower = function (rootId) {
        return DbPath.upsertsLock(rootId) + "/lower";
    };
    DbPath.upsertsLockLease = function (rootId) {
        return DbPath.upsertsLock(rootId) + "/lease";
    };
    DbPath.upsertsData = function () {
        return "u/d";
    };
    DbPath.upsertsDataImage = function (imageId) {
        return DbPath.upsertsData() + "/" + imageId;
    };
    DbPath.upsertsDataImageDone = function (imageId) {
        return DbPath.upsertsDataImage(imageId) + "/d";
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
    DbPath.rootIds = [
        1,
        6728,
        12920,
        14086,
        15885,
        17404,
        20802,
        22328,
        24993,
        25405,
        25823,
        26141,
        32676,
        41863,
        42385,
        51578,
        53241,
        54020,
        55065,
        58285,
        60371,
        61965,
        64111,
        65702,
        67393,
        69268,
        72551,
        74716,
        75425,
        76096,
        77085,
        78203,
        81877
    ];
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
