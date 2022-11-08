import { Neo3ApplicationLog, Neo3Event, Neo3EventListener, Neo3EventWithState } from '@cityofzion/neo3-event-listener';
export declare class NeonEventListener implements Neo3EventListener {
    static MAINNET: string;
    static TESTNET: string;
    private readonly rpcClient;
    constructor(rpcUrl: string);
    waitForApplicationLog(txId: string, options?: {
        maxAttempts?: number | undefined;
        waitMs?: number | undefined;
    } | undefined): Promise<Neo3ApplicationLog>;
    confirmHalt(txResult: Neo3ApplicationLog): boolean;
    confirmStackTrue(txResult: Neo3ApplicationLog): boolean;
    getNotificationState(txResult: Neo3ApplicationLog, eventToCheck: Neo3Event): Neo3EventWithState | undefined;
    confirmTransaction(txResult: Neo3ApplicationLog, eventToCheck?: Neo3Event | undefined, confirmStackTrue?: boolean): boolean;
    private wait;
}
