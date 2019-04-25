"use strict";
exports.__esModule = true;
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
exports.APP_SCOPED_PREFIX_URL = 'https://www.facebook.com/app_scoped_user_id/';
exports.MAX_REFERRALS = 1500;
exports.MAX_NUM_UPLOADS = 1500;
exports.MAX_URL_LENGTH = 300;
exports.MAX_REASON_LENGTH = 300;
exports.MAX_REPORT_ERRORS = 300;
exports.LOCAL_STORAGE_LAST_URL = 'last_url';
exports.KPU_SCAN_UID = 'gEQFS1n5gpTzMTy5JASPPLk4yRA3';
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
    DPR_NAMES["pJum"] = "P.PHP";
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
    FORM_TYPE[FORM_TYPE["PEMANDANGAN"] = 11] = "PEMANDANGAN";
    FORM_TYPE[FORM_TYPE["MALICIOUS"] = 12] = "MALICIOUS";
})(FORM_TYPE = exports.FORM_TYPE || (exports.FORM_TYPE = {}));
var IS_PLANO;
(function (IS_PLANO) {
    IS_PLANO[IS_PLANO["YES"] = 1] = "YES";
    IS_PLANO[IS_PLANO["NO"] = 2] = "NO";
})(IS_PLANO = exports.IS_PLANO || (exports.IS_PLANO = {}));
var LEMBAR_KEY;
(function (LEMBAR_KEY) {
    LEMBAR_KEY[LEMBAR_KEY["PILPRES"] = 1] = "PILPRES";
    LEMBAR_KEY[LEMBAR_KEY["PARTAI4"] = 2] = "PARTAI4";
    LEMBAR_KEY[LEMBAR_KEY["PARTAI16_PLANO"] = 3] = "PARTAI16_PLANO";
    LEMBAR_KEY[LEMBAR_KEY["PARTAI4_NO_DIGITIZE"] = 4] = "PARTAI4_NO_DIGITIZE";
    LEMBAR_KEY[LEMBAR_KEY["PARTAI16_PLANO_NO_DIGITIZE"] = 5] = "PARTAI16_PLANO_NO_DIGITIZE";
    LEMBAR_KEY[LEMBAR_KEY["PARTAI5_NO_DIGITIZE"] = 6] = "PARTAI5_NO_DIGITIZE";
    LEMBAR_KEY[LEMBAR_KEY["PARTAI20_PLANO_NO_DIGITIZE"] = 7] = "PARTAI20_PLANO_NO_DIGITIZE";
    LEMBAR_KEY[LEMBAR_KEY["CALON3_NO_DIGITIZE"] = 8] = "CALON3_NO_DIGITIZE";
    LEMBAR_KEY[LEMBAR_KEY["CALON5_PLANO_NO_DIGITIZE"] = 9] = "CALON5_PLANO_NO_DIGITIZE";
})(LEMBAR_KEY = exports.LEMBAR_KEY || (exports.LEMBAR_KEY = {}));
exports.LEMBAR_SPEC = (_a = {},
    _a[LEMBAR_KEY.PILPRES] = {
        '1': [SUM_KEY.jum],
        '2': [SUM_KEY.pas1, SUM_KEY.pas2, SUM_KEY.sah, SUM_KEY.tSah]
    },
    _a[LEMBAR_KEY.PARTAI4] = {
        '1': [SUM_KEY.pJum],
        '2.1': [SUM_KEY.pkb, SUM_KEY.ger, SUM_KEY.pdi, SUM_KEY.gol],
        '2.2': [SUM_KEY.nas, SUM_KEY.gar, SUM_KEY.ber, SUM_KEY.sej],
        '2.3': [SUM_KEY.per, SUM_KEY.ppp, SUM_KEY.psi, SUM_KEY.pan],
        '2.4': [SUM_KEY.han, SUM_KEY.dem, SUM_KEY.pbb, SUM_KEY.pkp],
        '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
    },
    _a[LEMBAR_KEY.PARTAI16_PLANO] = {
        '1': [SUM_KEY.pJum],
        '2.1': [SUM_KEY.pkb],
        '2.2': [SUM_KEY.ger],
        '2.3': [SUM_KEY.pdi],
        '2.4': [SUM_KEY.gol],
        '2.5': [SUM_KEY.nas],
        '2.6': [SUM_KEY.gar],
        '2.7': [SUM_KEY.ber],
        '2.8': [SUM_KEY.sej],
        '2.9': [SUM_KEY.per],
        '2.10': [SUM_KEY.ppp],
        '2.11': [SUM_KEY.psi],
        '2.12': [SUM_KEY.pan],
        '2.13': [SUM_KEY.han],
        '2.14': [SUM_KEY.dem],
        '2.15': [SUM_KEY.pbb],
        '2.16': [SUM_KEY.pkp],
        '3': [SUM_KEY.pSah, SUM_KEY.pTSah]
    },
    _a[LEMBAR_KEY.PARTAI4_NO_DIGITIZE] = {
        '1': null,
        '2.1': null,
        '2.2': null,
        '2.3': null,
        '2.4': null,
        '3': null
    },
    _a[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE] = {
        '1': null,
        '2.1': null,
        '2.2': null,
        '2.3': null,
        '2.4': null,
        '2.5': null,
        '2.6': null,
        '2.7': null,
        '2.8': null,
        '2.9': null,
        '2.10': null,
        '2.11': null,
        '2.12': null,
        '2.13': null,
        '2.14': null,
        '2.15': null,
        '2.16': null,
        '3': null
    },
    _a[LEMBAR_KEY.PARTAI5_NO_DIGITIZE] = {
        '1': null,
        '2.1': null,
        '2.2': null,
        '2.3': null,
        '2.4': null,
        '2.5': null,
        '3': null
    },
    _a[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE] = {
        '1': null,
        '2.1': null,
        '2.2': null,
        '2.3': null,
        '2.4': null,
        '2.5': null,
        '2.6': null,
        '2.7': null,
        '2.8': null,
        '2.9': null,
        '2.10': null,
        '2.11': null,
        '2.12': null,
        '2.13': null,
        '2.14': null,
        '2.15': null,
        '2.16': null,
        '2.17': null,
        '2.18': null,
        '2.19': null,
        '2.20': null,
        '3': null
    },
    _a[LEMBAR_KEY.CALON3_NO_DIGITIZE] = {
        '1': null,
        '2.1': null,
        '2.2': null,
        '2.3': null,
        '3': null
    },
    _a[LEMBAR_KEY.CALON5_PLANO_NO_DIGITIZE] = {
        '1': null,
        '2.1': null,
        '2.2': null,
        '2.3': null,
        '2.4': null,
        '2.5': null,
        '3': null
    },
    _a);
exports.LEMBAR = (_b = {},
    _b[FORM_TYPE.PPWP] = (_c = {},
        _c[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PILPRES],
        _c[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PILPRES],
        _c),
    _b[FORM_TYPE.DPR] = (_d = {},
        _d[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO],
        _d[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4],
        _d),
    // These forms below are not digitized, only classified.
    _b[FORM_TYPE.DPRPB] = (_e = {},
        _e[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
        _e[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE],
        _e),
    _b[FORM_TYPE.DPRP] = (_f = {},
        _f[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
        _f[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE],
        _f),
    _b[FORM_TYPE.DPRK] = (_g = {},
        _g[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE],
        _g[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI5_NO_DIGITIZE],
        _g),
    _b[FORM_TYPE.DPRD_PROV] = (_h = {},
        _h[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
        _h[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE],
        _h),
    _b[FORM_TYPE.DPRD_KAB_KOTA] = (_j = {},
        _j[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI16_PLANO_NO_DIGITIZE],
        _j[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI4_NO_DIGITIZE],
        _j),
    _b[FORM_TYPE.DPRA] = (_k = {},
        _k[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI20_PLANO_NO_DIGITIZE],
        _k[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.PARTAI5_NO_DIGITIZE],
        _k),
    _b[FORM_TYPE.DPD] = (_l = {},
        _l[IS_PLANO.YES] = this.LEMBAR_SPEC[LEMBAR_KEY.CALON5_PLANO_NO_DIGITIZE],
        _l[IS_PLANO.NO] = this.LEMBAR_SPEC[LEMBAR_KEY.CALON3_NO_DIGITIZE],
        _l),
    _b[FORM_TYPE.OTHERS] = null,
    _b[FORM_TYPE.PEMANDANGAN] = null,
    _b[FORM_TYPE.MALICIOUS] = null,
    _b);
function isValidHalaman(hal) {
    if (!hal || typeof hal !== 'string')
        return false;
    var h = hal.split('.');
    if (!(+h[0] >= 1 && +h[0] <= 3))
        return false;
    if (h.length === 1)
        return true;
    return h.length === 2 && +h[1] >= 1 && +h[1] <= 20;
}
exports.isValidHalaman = isValidHalaman;
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
    return (typeof imageId === 'string' &&
        imageId.match(/^[A-Za-z0-9]{20}(--?[0-9]+-[0-9]+)*$/));
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
        return "hc2/" + id;
    };
    FsPath.relawan = function (uid) {
        return "r" + (uid ? '/' + uid : '');
    };
    FsPath.relawanPhoto = function (uid) {
        return "p2" + (uid ? '/' + uid : '');
    };
    FsPath.tps = function (kelId, tpsNo) {
        return "t2/" + kelId + "-" + tpsNo;
    };
    FsPath.kpu = function (kelId) {
        return "k/" + kelId;
    };
    FsPath.codeReferral = function (code) {
        return "c" + (code ? '/' + code : '');
    };
    FsPath.changeLog = function (logId) {
        return "l" + (logId ? '/' + logId : '');
    };
    FsPath.imageMetadata = function (imageId) {
        return "i2/" + imageId;
    };
    FsPath.upserts = function (imageId) {
        return "u2" + (imageId ? '/' + imageId : '');
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
function canGenerateCustomCode(user) {
    return (user.email || '').endsWith('_group@tfbnw.net');
}
exports.canGenerateCustomCode = canGenerateCustomCode;
function computeAction(tps) {
    var sum = { pending: 0, cakupan: 0, janggal: 0 };
    var action = { sum: sum, photos: {}, ts: 0, c1: null };
    var valid = {};
    for (var _i = 0, _a = Object.keys(tps.images); _i < _a.length; _i++) {
        var imageId = _a[_i];
        var i = tps.images[imageId];
        if (!i.c1) {
            action.sum.cakupan = 1;
            action.sum.pending = 1;
            continue;
        }
        var ignore = i.c1.type === FORM_TYPE.MALICIOUS || i.c1.type === FORM_TYPE.OTHERS;
        if (ignore) {
            action.photos[i.url] = null;
        }
        else {
            action.sum.cakupan = 1;
            action.photos[i.url] = {
                c1: i.c1,
                sum: i.sum,
                ts: i.reviewer.ts
            };
            action.ts = Math.max(action.ts, i.reviewer.ts);
        }
        for (var _b = 0, _c = Object.keys(i.sum); _b < _c.length; _b++) {
            var key = _c[_b];
            if (!valid[key]) {
                action.sum[key] = i.sum[key];
                valid[key] = !ignore && isCorrectType(i.c1, key);
                continue;
            }
            if (ignore)
                continue;
            if (action.sum[key] !== i.sum[key]) {
                action.sum.janggal = 1;
            }
        }
    }
    if (action.sum.hasOwnProperty('jum') &&
        (action.sum.hasOwnProperty('sah') || action.sum.hasOwnProperty('tSah'))) {
        if (action.sum.jum !== action.sum.sah + action.sum.tSah) {
            action.sum.janggal = 1;
        }
    }
    return action;
}
exports.computeAction = computeAction;
function isCorrectType(c1, key) {
    var plano = exports.LEMBAR[c1.type];
    if (!plano)
        return false;
    var spec = plano[c1.plano];
    if (!spec)
        return false;
    var hal = spec[c1.halaman];
    if (!hal)
        return false;
    return hal.indexOf(key) !== -1;
}
// The quota specifications: a list of quota restrictions.
var QuotaSpecs = /** @class */ (function () {
    function QuotaSpecs(key) {
        var _this = this;
        this.key = key;
        this.specs = {};
        QuotaSpecs.SPECS[key].forEach(function (s) {
            var p = s.split('@');
            _this.specs[s] = {
                maxCount: parseInt(p[0], 10),
                duration: QuotaSpecs.getDurationMs(p[1])
            };
        });
    }
    QuotaSpecs.prototype.request = function (quota, now) {
        for (var k in this.specs) {
            var s = this.specs[k];
            var q = quota[k];
            if (!q || q.timestamp + s.duration < now) {
                // Reset the quota since it's stale.
                q = { timestamp: now, count: 0 };
            }
            if (++q.count > s.maxCount) {
                // Abort, signify failure.
                return;
            }
            quota[k] = q;
        }
        return quota;
    };
    // Converts '1d' string to number in milliseconds.
    QuotaSpecs.getDurationMs = function (dur) {
        if (dur.length < 2)
            return NaN;
        var i = dur.length - 1;
        var num = parseInt(dur.substring(0, i), 10);
        var unit = QuotaSpecs.UNIT_TO_MS[dur.substring(i)];
        return num * unit;
    };
    QuotaSpecs.SPECS = {
        api: ['30@1m', '200@10m', '600@1h']
    };
    QuotaSpecs.UNIT_TO_MS = {
        d: 24 * 60 * 60 * 1000,
        h: 60 * 60 * 1000,
        m: 60 * 1000,
        s: 1000
    };
    return QuotaSpecs;
}());
exports.QuotaSpecs = QuotaSpecs;
