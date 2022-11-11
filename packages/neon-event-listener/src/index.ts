import * as Neon from '@cityofzion/neon-core'
import {
  Neo3ApplicationLog,
  Neo3Event,
  Neo3EventListener,
  Neo3EventListenerCallback,
  Neo3EventWithState,
} from '@cityofzion/neo3-event-listener'

export class NeonEventListener implements Neo3EventListener {
  static MAINNET = 'https://mainnet1.neo.coz.io:443'
  static TESTNET = 'https://testnet1.neo.coz.io:443'

  private blockPoolingLoopActive = false
  private listeners = new Map<string, Map<string, Neo3EventListenerCallback[]>>()

  private readonly rpcClient: Neon.rpc.RPCClient

  constructor(rpcUrl: string) {
    this.rpcClient = new Neon.rpc.RPCClient(rpcUrl)
  }

  addEventListener(contract: string, eventname: string, callback: Neo3EventListenerCallback) {
    const listenersOfContract = this.listeners.get(contract)
    if (!listenersOfContract) {
      this.listeners.set(contract, new Map([[eventname, [callback]]]))
    } else {
      listenersOfContract.set(eventname, [...listenersOfContract.get(eventname)!, callback])
    }
    if (!this.blockPoolingLoopActive) {
      this.blockPoolingLoopActive = true
      this.blockPoolingLoop()
    }
  }

  removeEventListener(contract: string, eventname: string, callback: Neo3EventListenerCallback) {
    const listenersOfContract = this.listeners.get(contract)
    if (listenersOfContract) {
      const listenersOfEvent = listenersOfContract.get(eventname)
      if (listenersOfEvent) {
        listenersOfContract.set(eventname, listenersOfEvent.filter(l => l !== callback))
        if (listenersOfEvent.length === 0) {
          listenersOfContract.delete(eventname)
        }
      }
      if (listenersOfContract.size === 0) {
        this.listeners.delete(contract)
      }
    }
    if (this.listeners.size === 0) {
      this.blockPoolingLoopActive = false
    }
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

  private async blockPoolingLoop(): Promise<void> {
    let height = 0
    try {
      while (this.blockPoolingLoopActive) {
        await this.wait(4000)

        const oldHeight = height
        height = await this.rpcClient.getBlockCount()

        if (height <= oldHeight) {
          continue
        }

        const block = await this.rpcClient.getBlock(height - 1, true)

        for (const transaction of block.tx) {
          if (!transaction.hash) {
            continue
          }

          const log = await this.rpcClient.getApplicationLog(transaction.hash)

          for (const notification of log.executions[0].notifications) {
            const listenersOfContract = this.listeners.get(notification.contract)
            if (!listenersOfContract) {
              continue
            }

            const listenersOfEvent = listenersOfContract.get(notification.eventname)
            if (!listenersOfEvent) {
              continue
            }

            for (const listener of listenersOfEvent) {
              listener(notification as Neo3EventWithState)
            }
          }
        }
      }
    } catch (error) {
      console.log({ error })
    }
  }

  private wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
