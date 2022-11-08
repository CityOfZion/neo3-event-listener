"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeonEventListener = void 0;
const Neon = require("@cityofzion/neon-core");
class NeonEventListener {
    constructor(rpcUrl) {
        this.rpcClient = new Neon.rpc.RPCClient(rpcUrl);
    }
    waitForApplicationLog(txId, options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const maxAttempts = (_a = options === null || options === void 0 ? void 0 : options.maxAttempts) !== null && _a !== void 0 ? _a : 8;
            const waitMs = (_b = options === null || options === void 0 ? void 0 : options.waitMs) !== null && _b !== void 0 ? _b : 2000;
            let txResult = null;
            let attempts = 0;
            do {
                yield this.wait(waitMs);
                txResult = yield this.rpcClient.getApplicationLog(txId);
                attempts++;
            } while (!txResult && attempts < maxAttempts);
            return txResult;
        });
    }
    confirmHalt(txResult) {
        var _a;
        return ((_a = txResult === null || txResult === void 0 ? void 0 : txResult.executions[0]) === null || _a === void 0 ? void 0 : _a.vmstate) === 'HALT';
    }
    confirmStackTrue(txResult) {
        var _a, _b;
        return ((_b = (_a = txResult === null || txResult === void 0 ? void 0 : txResult.executions[0]) === null || _a === void 0 ? void 0 : _a.stack[0]) === null || _b === void 0 ? void 0 : _b.value) === true;
    }
    getNotificationState(txResult, eventToCheck) {
        return txResult === null || txResult === void 0 ? void 0 : txResult.executions[0].notifications.find(e => {
            return e.contract === eventToCheck.contract && e.eventname === eventToCheck.eventname;
        });
    }
    confirmTransaction(txResult, eventToCheck, confirmStackTrue = false) {
        return this.confirmHalt(txResult)
            && (!confirmStackTrue || this.confirmStackTrue(txResult))
            && (!eventToCheck || this.getNotificationState(txResult, eventToCheck) !== undefined);
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.NeonEventListener = NeonEventListener;
NeonEventListener.MAINNET = 'https://mainnet1.neo.coz.io:443';
NeonEventListener.TESTNET = 'https://testnet1.neo.coz.io:443';
