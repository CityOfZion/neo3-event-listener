import * as Neon from '@cityofzion/neon-core'
import { Neo3ApplicationLog, Neo3Event, Neo3EventListener, Neo3EventWithState } from '@cityofzion/neo3-event-listener'

export class NeonEventListener implements Neo3EventListener {
  static MAINNET = 'https://mainnet1.neo.coz.io:443'
  static TESTNET = 'https://testnet1.neo.coz.io:443'

  private readonly rpcClient: Neon.rpc.RPCClient

  constructor(rpcUrl: string) {
    this.rpcClient = new Neon.rpc.RPCClient(rpcUrl)
  }

  async waitForApplicationLog(
    txId: string,
    options?: { maxAttempts?: number | undefined; waitMs?: number | undefined } | undefined
  ): Promise<Neo3ApplicationLog> {
    const maxAttempts = options?.maxAttempts ?? 8
    const waitMs = options?.waitMs ?? 2000

    let txResult: Neon.rpc.ApplicationLogJson | null = null
    let attempts = 0
    do {
      await this.wait(waitMs)
      txResult = await this.rpcClient.getApplicationLog(txId)
      attempts++
    } while (!txResult && attempts < maxAttempts)

    return txResult
  }

  confirmHalt(txResult: Neo3ApplicationLog): boolean {
    return txResult?.executions[0]?.vmstate === 'HALT'
  }

  confirmStackTrue(txResult: Neo3ApplicationLog): boolean {
    return txResult?.executions[0]?.stack[0]?.value === true
  }

  getNotificationState(txResult: Neo3ApplicationLog, eventToCheck: Neo3Event): Neo3EventWithState | undefined {
    return txResult?.executions[0].notifications.find(e => {
      return e.contract === eventToCheck.contract && e.eventname === eventToCheck.eventname
    })
  }

  confirmTransaction(
    txResult: Neo3ApplicationLog,
    eventToCheck?: Neo3Event | undefined,
    confirmStackTrue = false,
  ): boolean {
    return this.confirmHalt(txResult)
      && (!confirmStackTrue || this.confirmStackTrue(txResult))
      && (!eventToCheck || this.getNotificationState(txResult, eventToCheck) !== undefined)
  }

  private wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
