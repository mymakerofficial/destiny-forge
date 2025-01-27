"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var body_parser_1 = require("body-parser");
var cors_1 = require("cors");
var express_1 = require("express");
var pg_1 = require("pg");
var pool = new pg_1.default.Pool({ connectionString: 'postgresql://postgres:password@localhost:54321/electric' });
var app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
app.post('/v1/sync', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var body, isInset, row, cols, colsArgs, sql, sql;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ctx.req.body];
            case 1:
                body = _a.sent();
                isInset = body.row.is_new;
                row = __assign(__assign({}, body.row), { is_synced: true, is_sent_to_server: false, is_new: false });
                cols = Object.keys(row);
                colsArgs = cols.map(function (it) { return "$".concat(it); });
                console.log(body.table, row);
                if (!isInset) return [3 /*break*/, 3];
                sql = "INSERT INTO ".concat(body.table, " (").concat(cols.join(', '), ") VALUES (").concat(colsArgs, ")");
                console.log(sql);
                return [4 /*yield*/, pool.query(sql, row)];
            case 2:
                _a.sent();
                return [3 /*break*/, 5];
            case 3:
                sql = "UPDATE ".concat(body.table, " SET (").concat(cols.join(', '), ") = (").concat(colsArgs, ") WHERE id = $id");
                console.log(sql);
                return [4 /*yield*/, pool.query(sql, row)];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [2 /*return*/, ctx.status(200).json({ status: 'OK' })];
        }
    });
}); });
app.listen(3001, function () {
    console.log("Server running");
});
