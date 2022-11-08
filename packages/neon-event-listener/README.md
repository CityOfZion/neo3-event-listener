<p align="center">
  <img
    src="../../.github/resources/images/coz.png"
    width="200px;">
</p>

<p align="center">
  Neon-EventListener - A Neo3-EventListener implementation using Neon-JS
  <br/> Made with ❤ by <b>COZ.IO</b>
</p>

# Neon-EventListener

## Install

```bash
npm i @cityofzion/neon-event-listener
```

## Initialize NeonEventListener
To use NeonEventListener as a Neo3EventListener you can simply instantiate `NeonEventListener` and pass the `NeonEventListener` instance to the SDK that requires a `Neo3EventListener`.

```ts
import { NeonEventListener } from '@cityofzion/neon-event-listener'

const neonEventListener: Neo3EventListener = new NeonEventListener(NeonEventListener.MAINNET)
```

## Usage
The usage of NeonEventListener is documented in the [Neo3-EventListener Docs](https://htmlpreview.github.io/?https://raw.githubusercontent.com/CityOfZion/neo3-event-listener/master/packages/neo3-event-listener/docs/modules.html).
