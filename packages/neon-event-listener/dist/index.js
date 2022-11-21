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
    constructor(rpcUrl, options = { debug: false }) {
        this.options = options;
        this.blockPollingLoopActive = false;
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
        if (!this.blockPollingLoopActive) {
            this.blockPollingLoopActive = true;
            this.blockPollingLoop();
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
                            this.blockPollingLoopActive = false;
                        }
                    }
                }
            }
        }
    }
    removeAllEventListenersOfContract(contract) {
        this.listeners.delete(contract);
        if (this.listeners.size === 0) {
            this.blockPollingLoopActive = false;
        }
    }
    removeAllEventListenersOfEvent(contract, eventname) {
        const listenersOfContract = this.listeners.get(contract);
        if (listenersOfContract) {
            listenersOfContract.delete(eventname);
            if (listenersOfContract.size === 0) {
                this.listeners.delete(contract);
                if (this.listeners.size === 0) {
                    this.blockPollingLoopActive = false;
                }
            }
        }
    }
    waitForApplicationLog(txId, options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const maxAttempts = (_a = options === null || options === void 0 ? void 0 : options.maxAttempts) !== null && _a !== void 0 ? _a : 20;
            const waitMs = (_b = options === null || options === void 0 ? void 0 : options.waitMs) !== null && _b !== void 0 ? _b : 1000;
            let attempts = 0;
            let error = new Error("Couldn't get application log");
            do {
                try {
                    return yield this.rpcClient.getApplicationLog(txId);
                }
                catch (e) {
                    error = e;
                }
                attempts++;
                yield this.wait(waitMs);
            } while (attempts < maxAttempts);
            throw error;
        });
    }
    confirmHalt(txResult) {
        var _a, _b;
        if (((_a = txResult === null || txResult === void 0 ? void 0 : txResult.executions[0]) === null || _a === void 0 ? void 0 : _a.vmstate) !== 'HALT')
            throw new Error('Transaction failed. VMState: ' + ((_b = txResult === null || txResult === void 0 ? void 0 : txResult.executions[0]) === null || _b === void 0 ? void 0 : _b.vmstate));
    }
    confirmStackTrue(txResult) {
        if (!txResult || !txResult.executions || txResult.executions.length === 0 || !txResult.executions[0].stack || txResult.executions[0].stack.length === 0) {
            throw new Error('Transaction failed. No stack found in transaction result');
        }
        const stack = txResult.executions[0].stack[0];
        if (stack.value !== true) {
            throw new Error('Transaction failed. Stack value is not true');
        }
    }
    getNotificationState(txResult, eventToCheck) {
        return txResult === null || txResult === void 0 ? void 0 : txResult.executions[0].notifications.find(e => {
            return e.contract === eventToCheck.contract && e.eventname === eventToCheck.eventname;
        });
    }
    confirmTransaction(txResult, eventToCheck, confirmStackTrue = false) {
        this.confirmHalt(txResult);
        if (confirmStackTrue) {
            this.confirmStackTrue(txResult);
        }
        if (eventToCheck) {
            const state = this.getNotificationState(txResult, eventToCheck);
            if (!state) {
                throw new Error('Transaction failed. Event not found in transaction result');
            }
        }
    }
    blockPollingLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            let height = yield this.rpcClient.getBlockCount();
            while (this.blockPollingLoopActive) {
                yield this.wait(4000);
                try {
                    this.options.debug && console.log('Checking block ' + height);
                    if (height > (yield this.rpcClient.getBlockCount())) {
                        this.options.debug && console.log('Block height is ahead of node. Waiting for node to catch up...');
                        continue;
                    }
                    const block = yield this.rpcClient.getBlock(height - 1, true);
                    for (const transaction of block.tx) {
                        if (!transaction.hash) {
                            this.options.debug && console.log('Transaction hash not found. Skipping transaction');
                            continue;
                        }
                        const log = yield this.rpcClient.getApplicationLog(transaction.hash);
                        for (const notification of log.executions[0].notifications) {
                            const listenersOfContract = this.listeners.get(notification.contract);
                            if (!listenersOfContract) {
                                this.options.debug && console.log('No listeners for contract ' + notification.contract);
                                continue;
                            }
                            const listenersOfEvent = listenersOfContract.get(notification.eventname);
                            if (!listenersOfEvent) {
                                this.options.debug && console.log('No listeners for event ' + notification.eventname);
                                continue;
                            }
                            for (const listener of listenersOfEvent) {
                                try {
                                    this.options.debug && console.log('Calling listener');
                                    listener(notification);
                                }
                                catch (e) {
                                    this.options.debug && console.error(e);
                                }
                            }
                        }
                    }
                    height++; // this is important to avoid skipping blocks when the code throws exceptions
                }
                catch (error) {
                    this.options.debug && console.error(error);
                }
            }
            this.options.debug && console.log('Block polling loop stopped');
        });
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.NeonEventListener = NeonEventListener;
NeonEventListener.MAINNET = 'https://mainnet1.neo.coz.io:443';
NeonEventListener.TESTNET = 'https://testnet1.neo.coz.io:443';
