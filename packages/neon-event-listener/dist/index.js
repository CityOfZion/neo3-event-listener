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
        this.blockPoolingLoopActive = false;
        this.listeners = new Map();
        this.rpcClient = new Neon.rpc.RPCClient(rpcUrl);
    }
    addEventListener(contract, eventname, callback) {
        var _a;
        const listenersOfContract = this.listeners.get(contract);
        if (!listenersOfContract) {
            this.listeners.set(contract, new Map([[eventname, [callback]]]));
        }
        else {
            listenersOfContract.set(eventname, [...((_a = listenersOfContract.get(eventname)) !== null && _a !== void 0 ? _a : []), callback]);
        }
        if (!this.blockPoolingLoopActive) {
            this.blockPoolingLoopActive = true;
            this.blockPoolingLoop();
        }
    }
    removeEventListener(contract, eventname, callback) {
        const listenersOfContract = this.listeners.get(contract);
        if (listenersOfContract) {
            const listenersOfEvent = listenersOfContract.get(eventname);
            if (listenersOfEvent) {
                listenersOfContract.set(eventname, listenersOfEvent.filter(l => l !== callback));
                if (listenersOfEvent.length === 0) {
                    listenersOfContract.delete(eventname);
                    if (listenersOfContract.size === 0) {
                        this.listeners.delete(contract);
                        if (this.listeners.size === 0) {
                            this.blockPoolingLoopActive = false;
                        }
                    }
                }
            }
        }
    }
    removeAllEventListenersOfContract(contract) {
        this.listeners.delete(contract);
        if (this.listeners.size === 0) {
            this.blockPoolingLoopActive = false;
        }
    }
    removeAllEventListenersOfEvent(contract, eventname) {
        const listenersOfContract = this.listeners.get(contract);
        if (listenersOfContract) {
            listenersOfContract.delete(eventname);
            if (listenersOfContract.size === 0) {
                this.listeners.delete(contract);
                if (this.listeners.size === 0) {
                    this.blockPoolingLoopActive = false;
                }
            }
        }
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
        if (!txResult || !txResult.executions || txResult.executions.length === 0 || !txResult.executions[0].stack || txResult.executions[0].stack.length === 0) {
            return false;
        }
        const stack = txResult.executions[0].stack[0];
        return stack.value === true;
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
    blockPoolingLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            let height = yield this.rpcClient.getBlockCount();
            while (this.blockPoolingLoopActive) {
                yield this.wait(4000);
                try {
                    if (height > (yield this.rpcClient.getBlockCount())) {
                        continue;
                    }
                    const block = yield this.rpcClient.getBlock(height - 1, true);
                    for (const transaction of block.tx) {
                        if (!transaction.hash) {
                            continue;
                        }
                        const log = yield this.rpcClient.getApplicationLog(transaction.hash);
                        for (const notification of log.executions[0].notifications) {
                            const listenersOfContract = this.listeners.get(notification.contract);
                            if (!listenersOfContract) {
                                continue;
                            }
                            const listenersOfEvent = listenersOfContract.get(notification.eventname);
                            if (!listenersOfEvent) {
                                continue;
                            }
                            for (const listener of listenersOfEvent) {
                                try {
                                    listener(notification);
                                }
                                catch (e) {
                                    console.error(e);
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.error(error);
                }
                height++; // this is important to avoid skipping blocks when the code throws exceptions
            }
        });
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.NeonEventListener = NeonEventListener;
NeonEventListener.MAINNET = 'https://mainnet1.neo.coz.io:443';
NeonEventListener.TESTNET = 'https://testnet1.neo.coz.io:443';
