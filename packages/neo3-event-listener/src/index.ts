/**
 * An interface that defines the event contract and event name
 */
export interface Neo3Event {
  contract: string;
  eventname: string;
}

/**
 * An interface that defines the event contract, event name and the state of the event
 */
export interface Neo3EventWithState extends Neo3Event {
  state: Neo3StackItem;
}

/**
 * An interface that defines the stack item format
 */
export interface Neo3StackItem {
  type: string;
  value?: string | boolean | number | Neo3StackItem[];
}

/**
 * An interface that defines the application log format
 */
export interface Neo3ApplicationLog {
  txid: string;
  executions: {
    trigger: string;
    vmstate: string;
    gasconsumed: string;
    stack?: Neo3StackItem[];
    notifications: Neo3EventWithState[];
  }[];
}

/**
 * The entry point of the library
 */
export interface Neo3EventListener {
  /**
   * Waits for the transaction to be completed and returns the application log
   * @param txId id od the transaction
   */
  waitForApplicationLog(txId: string): Promise<Neo3ApplicationLog>

  /**
   * Checks if the transaction was completed successfully
   * @param txResult the Neo3ApplicationLog object
   * @param eventToCheck the Neo3Event object to check if it is present in the application log
   * @param confirmStackTrue if true, checks if the stack contains true as the first element
   */
  confirmTransaction(txResult: Neo3ApplicationLog, eventToCheck?: Neo3Event | undefined, confirmStackTrue?: boolean | undefined): boolean
}
