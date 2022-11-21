import {
  Neo3ApplicationLog,
  Neo3Event,
  Neo3EventListener,
  Neo3EventListenerCallback,
  Neo3EventWithState,
  Neo3StackItem,
} from '@cityofzion/neo3-event-listener'
import * as Neon from '@cityofzion/neon-core'

export class NeonEventListener implements Neo3EventListener {
  static MAINNET = 'https://mainnet1.neo.coz.io:443'
  static TESTNET = 'https://testnet1.neo.coz.io:443'

  private blockPollingLoopActive = false
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
      listenersOfContract.set(eventname, [...(listenersOfContract.get(eventname) ?? []), callback])
    }
    if (!this.blockPollingLoopActive) {
      this.blockPollingLoopActive = true
      this.blockPollingLoop()
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
          if (listenersOfContract.size === 0) {
            this.listeners.delete(contract)
            if (this.listeners.size === 0) {
              this.blockPollingLoopActive = false
            }
          }
        }
      }
    }
  }

  removeAllEventListenersOfContract(contract: string) {
    this.listeners.delete(contract)
    if (this.listeners.size === 0) {
      this.blockPollingLoopActive = false
    }
  }

  removeAllEventListenersOfEvent(contract: string, eventname: string) {
    const listenersOfContract = this.listeners.get(contract)
    if (listenersOfContract) {
      listenersOfContract.delete(eventname)
      if (listenersOfContract.size === 0) {
        this.listeners.delete(contract)
        if (this.listeners.size === 0) {
          this.blockPollingLoopActive = false
        }
      }
    }
  }

  async waitForApplicationLog(
    txId: string,
    options?: { maxAttempts?: number | undefined; waitMs?: number | undefined } | undefined
  ): Promise<Neo3ApplicationLog> {
    const maxAttempts = options?.maxAttempts ?? 20
    const waitMs = options?.waitMs ?? 1000

    let attempts = 0
    let error = new Error("Couldn't get application log")
    do {
      try {
        return await this.rpcClient.getApplicationLog(txId)
      } catch (e) {
        error = e
      }
      attempts++
      await this.wait(waitMs)
    } while (attempts < maxAttempts)

    throw error
  }

  confirmHalt(txResult: Neo3ApplicationLog) {
    if (txResult?.executions[0]?.vmstate !== 'HALT') throw new Error('Transaction failed. VMState: ' + txResult?.executions[0]?.vmstate)
  }

  confirmStackTrue(txResult: Neo3ApplicationLog) {
    if (!txResult || !txResult.executions || txResult.executions.length === 0 || !txResult.executions[0].stack || txResult.executions[0].stack.length === 0) {
      throw new Error('Transaction failed. No stack found in transaction result')
    }
    const stack: Neo3StackItem = txResult.executions[0].stack[0]
    if (stack.value !== true) {
      throw new Error('Transaction failed. Stack value is not true')
    }
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
  ) {
    this.confirmHalt(txResult)
    if (confirmStackTrue) {
      this.confirmStackTrue(txResult)
    }
    if (eventToCheck) {
      const state = this.getNotificationState(txResult, eventToCheck)
      if (!state) {
        throw new Error('Transaction failed. Event not found in transaction result')
      }
    }
  }

  private async blockPollingLoop(): Promise<void> {
    let height = await this.rpcClient.getBlockCount()

    while (this.blockPollingLoopActive) {
      await this.wait(4000)

      try {
        if (height > await this.rpcClient.getBlockCount()) {
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
              try {
                listener(notification as Neo3EventWithState)
              } catch (e) {
                console.error(e)
              }
            }
          }
        }

      } catch (error) {
        console.error(error)
      }

      height++ // this is important to avoid skipping blocks when the code throws exceptions
    }
  }

  private wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
