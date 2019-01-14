"use strict";
exports.__esModule = true;
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
    DbPath.hieAgg = function (id, cid) {
        return DbPath.hie(id) + "/a/" + cid;
    };
    DbPath.upserts = function (rootId) {
        return "upserts/" + rootId;
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
        return "upserts/data";
    };
    DbPath.upsertsDataImage = function (imageId) {
        return DbPath.upsertsData() + "/" + imageId;
    };
    DbPath.upsertsDataImageDone = function (imageId) {
        return DbPath.upsertsDataImage(imageId) + "/d";
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
