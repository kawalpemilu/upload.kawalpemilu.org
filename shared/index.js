"use strict";
exports.__esModule = true;
exports.APP_SCOPED_PREFIX_URL = 'https://www.facebook.com/app_scoped_user_id/';
exports.MAX_REFERRALS = 1000;
exports.MAX_NUM_UPLOADS = 100;
exports.MAX_URL_LENGTH = 300;
exports.MAX_REASON_LENGTH = 300;
exports.MAX_REPORT_ERRORS = 10;
exports.LOCAL_STORAGE_LAST_URL = 'last_url';
var USER_ROLE;
(function (USER_ROLE) {
    USER_ROLE[USER_ROLE["BANNED"] = -1] = "BANNED";
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
    SUM_KEY["pa"] = "pa";
    SUM_KEY["ps"] = "ps";
    SUM_KEY["pda"] = "pda";
    SUM_KEY["pna"] = "pna";
    SUM_KEY["pbb"] = "pbb";
    SUM_KEY["pkp"] = "pkp";
    SUM_KEY["pJum"] = "pJum";
    SUM_KEY["pSah"] = "pSah";
    SUM_KEY["pTSah"] = "pTSah";
})(SUM_KEY = exports.SUM_KEY || (exports.SUM_KEY = {}));
var PPWP_NAMES;
(function (PPWP_NAMES) {
    PPWP_NAMES["jum"] = "PHP";
    PPWP_NAMES["pas1"] = "S01";
    PPWP_NAMES["pas2"] = "S02";
    PPWP_NAMES["sah"] = "Sah";
    PPWP_NAMES["tSah"] = "~Sah";
})(PPWP_NAMES = exports.PPWP_NAMES || (exports.PPWP_NAMES = {}));
var DPR_NAMES;
(function (DPR_NAMES) {
    DPR_NAMES["pkb"] = "1.PKB";
    DPR_NAMES["ger"] = "2.Grnd";
    DPR_NAMES["pdi"] = "3.PDIP";
    DPR_NAMES["gol"] = "4.Glkr";
    DPR_NAMES["nas"] = "5.Nsdm";
    DPR_NAMES["gar"] = "6.Grda";
    DPR_NAMES["ber"] = "7.Berk";
    DPR_NAMES["sej"] = "8.PKS";
    DPR_NAMES["per"] = "9.Prnd";
    DPR_NAMES["ppp"] = "10.PPP";
    DPR_NAMES["psi"] = "11.PSI";
    DPR_NAMES["pan"] = "12.PAN";
    DPR_NAMES["han"] = "13.Hanu";
    DPR_NAMES["dem"] = "14.Dem";
    DPR_NAMES["pa"] = "15.PA";
    DPR_NAMES["ps"] = "16.PS";
    DPR_NAMES["pda"] = "17.PDA";
    DPR_NAMES["pna"] = "18.PNA";
    DPR_NAMES["pbb"] = "19.PBB";
    DPR_NAMES["pkp"] = "20.PKPI";
    DPR_NAMES["pJum"] = "P.PHP";
    DPR_NAMES["pSah"] = "P.Sah";
    DPR_NAMES["pTSah"] = "P.~Sah";
})(DPR_NAMES = exports.DPR_NAMES || (exports.DPR_NAMES = {}));
var FORM_TYPE;
(function (FORM_TYPE) {
    // Full blown until digitized.
    FORM_TYPE[FORM_TYPE["PPWP"] = 1] = "PPWP";
    FORM_TYPE[FORM_TYPE["DPR"] = 2] = "DPR";
    // Only up to halaman, not digitized.
    FORM_TYPE[FORM_TYPE["DPD"] = 3] = "DPD";
    FORM_TYPE[FORM_TYPE["DPRP"] = 4] = "DPRP";
    FORM_TYPE[FORM_TYPE["DPRPB"] = 5] = "DPRPB";
    FORM_TYPE[FORM_TYPE["DPRA"] = 6] = "DPRA";
    FORM_TYPE[FORM_TYPE["DPRD_PROV"] = 7] = "DPRD_PROV";
    FORM_TYPE[FORM_TYPE["DPRD_KAB_KOTA"] = 8] = "DPRD_KAB_KOTA";
    FORM_TYPE[FORM_TYPE["DPRK"] = 9] = "DPRK";
    // Up to choosing this type.
    FORM_TYPE[FORM_TYPE["OTHERS"] = 10] = "OTHERS";
    FORM_TYPE[FORM_TYPE["MALICIOUS"] = 11] = "MALICIOUS";
})(FORM_TYPE = exports.FORM_TYPE || (exports.FORM_TYPE = {}));
var IS_PLANO;
(function (IS_PLANO) {
    IS_PLANO[IS_PLANO["YES"] = 1] = "YES";
    IS_PLANO[IS_PLANO["NO"] = 2] = "NO";
})(IS_PLANO = exports.IS_PLANO || (exports.IS_PLANO = {}));
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
    FsPath.hie = function (id) {
        return "h" + (typeof id === 'number' ? '/' + id : '');
    };
    FsPath.hieCache = function (id) {
        return "hc/" + id;
    };
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
        return "c" + (code ? '/' + code : '');
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
function toChild(node) {
    var child = {};
    if (node.depth === 4) {
        for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
            var c = _a[_i];
            if (c.length !== 3)
                throw new Error('c');
            var tpsNo = c[0], nL = c[1], nP = c[2];
            child[tpsNo] = { id: tpsNo, nL: nL, nP: nP };
        }
    }
    else {
        for (var _b = 0, _c = node.children; _b < _c.length; _b++) {
            var c = _c[_b];
            if (c.length !== 5)
                throw new Error('c');
            var cid = c[0], cname = c[1], nTps = c[2], nL = c[3], nP = c[4];
            child[cid] = { id: cid, name: cname.toUpperCase(), nTps: nTps, nL: nL, nP: nP };
        }
    }
    return child;
}
exports.toChild = toChild;
function toChildren(node) {
    return Object.keys(node.child).map(function (cid) {
        var c = node.child[cid];
        return node.depth === 4
            ? [c.id, c.nL, c.nP]
            : [c.id, c.name, c.nTps, c.nL, c.nP];
    });
}
exports.toChildren = toChildren;
function lsGetItem(key) {
    if (window.localStorage) {
        try {
            var value = JSON.parse(window.localStorage.getItem(key));
            // console.log('lsGetItem', key, value);
            return value;
        }
        catch (e) {
            console.log("Unable to get from localStorage");
            return null;
        }
    }
    else {
        console.log('No localStorage');
    }
}
exports.lsGetItem = lsGetItem;
function lsSetItem(key, value) {
    if (window.localStorage) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            // console.log('lsSetItem', key);
        }
        catch (e) {
            console.log("Unable to set to localStorage");
        }
    }
    else {
        console.log('No localStorage');
    }
}
exports.lsSetItem = lsSetItem;
function enumEntries(e) {
    var o = Object.keys(e);
    var h = o.length / 2;
    var entries = [];
    for (var i = 0; i < o.length / 2; i++) {
        entries.push([o[i], o[h + i]]);
    }
    return entries;
}
exports.enumEntries = enumEntries;
