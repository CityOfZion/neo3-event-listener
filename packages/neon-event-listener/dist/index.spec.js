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
const index_1 = require("./index");
const Neon = require("@cityofzion/neon-core");
const assert = require("assert");
describe('Neon Tests', function () {
    it("can sign and verify", () => __awaiter(this, void 0, void 0, function* () {
        const acc = new Neon.wallet.Account('fb1f57cc1347ae5b6251dc8bae761362d2ecaafec4c87f4dc9e97fef6dd75014');
        const event-listener = new index_1.NeonEventListener(acc);
        const signed = yield event-listener.signMessage({
            version: 2,
            message: 'my random message'
        });
        console.assert(signed.salt.length > 0);
        console.assert(signed.messageHex.length > 0);
        console.assert(signed.data.length > 0);
        console.assert(signed.publicKey.length > 0);
        const verified = yield event-listener.verifyMessage(signed);
        assert(verified);
    }));
    it("can verify", () => __awaiter(this, void 0, void 0, function* () {
        const event-listener = new index_1.NeonEventListener();
        const verified = yield event-listener.verifyMessage({
            publicKey: '031757edb62014dea820a0b33a156f6a59fc12bd966202f0e49357c81f26f5de34',
            data: 'aeb234ed1639e9fcc95a102633b1c70ca9f9b97e9592cc74bfc40cbc7fefdb19ae8c6b49ebd410dbcbeec6b5906e503d528e34cd5098cc7929dbcbbaf23c5d77',
            salt: '052a55a8d56b73b342a8e41da3050b09',
            messageHex: '010001f0a0303532613535613864353662373362333432613865343164613330353062303965794a68624763694f694a49557a49314e694973496e523563434936496b705856434a392e65794a6c654841694f6a45324e444d304e7a63324e6a4d73496d6c68644349364d5459304d7a4d354d5449324d33302e7253315f73735230364c426778744831504862774c306d7a6557563950686d5448477a324849524f4a4f340000'
        });
        assert(verified);
    }));
    it("can verify it fails", () => __awaiter(this, void 0, void 0, function* () {
        const event-listener = new index_1.NeonEventListener();
        const verified = yield event-listener.verifyMessage({
            publicKey: '031757edb62014dea820a0b33a156f6a59fc12bd966202f0e49357c81f26f5de34',
            data: '4fe1b478cf76564b2133bdff9ba97d8a360ce36d0511918931cda207c2ce589dfc07ec5d8b93ce7c3b70fc88b676cc9e08f9811bf0d5b5710a20f10c58191bfb',
            salt: '733ceb4d4e8ffdc83ecc6e35c4498999',
            messageHex: '010001f05c3733336365623464346538666664633833656363366533356334343938393939436172616c686f2c206d756c65712c206f2062616775697520656820697373756d65726d6f2074616978206c696761646f206e61206d697373e36f3f0000'
        });
        assert(!verified);
    }));
});
