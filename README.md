# Web3 ProviderEngine

[![Greenkeeper badge](https://badges.greenkeeper.io/vapormask/provider-engine.svg)](https://greenkeeper.io/)

Web3 ProviderEngine is a tool for composing your own [web3 providers](https://github.com/vaporyco/wiki/wiki/JavaScript-API#web3).

Status: WIP - expect breaking changes and strange behaviour

### Composable

Built to be modular - works via a stack of 'sub-providers' which are like normal web3 providers but only handle a subset of rpc mvapods.

The subproviders can emit new rpc requests in order to handle their own;  e.g. `vap_call` may trigger `vap_getAccountBalance`, `vap_getCode`, and others.
The provider engine also handles caching of rpc request results.

```js
const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const VmSubprovider = require('web3-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')

var engine = new ProviderEngine()
var web3 = new Web3(engine)

// static results
engine.addProvider(new FixtureSubprovider({
  web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
  net_listening: true,
  vap_hashrate: '0x00',
  vap_mining: false,
  vap_syncing: true,
}))

// cache layer
engine.addProvider(new CacheSubprovider())

// filters
engine.addProvider(new FilterSubprovider())

// pending nonce
engine.addProvider(new NonceSubprovider())

// vm
engine.addProvider(new VmSubprovider())

// id mgmt
engine.addProvider(new HookedWalletSubprovider({
  getAccounts: function(cb){ ... },
  approveTransaction: function(cb){ ... },
  signTransaction: function(cb){ ... },
}))

// data source
engine.addProvider(new RpcSubprovider({
  rpcUrl: 'https://testrpc.vapormask.io/',
}))

// log new blocks
engine.on('block', function(block){
  console.log('================================')
  console.log('BLOCK CHANGED:', '#'+block.number.toString('hex'), '0x'+block.hash.toString('hex'))
  console.log('================================')
})

// network connectivity error
engine.on('error', function(err){
  // report connectivity errors
  console.error(err.stack)
})

// start polling for blocks
engine.start()

```

### Built For Zero-Clients

The [Vapory JSON RPC](https://github.com/vaporyco/wiki/wiki/JSON-RPC) was not designed to have one node service many clients.
However a smaller, lighter subset of the JSON RPC can be used to provide the blockchain data that an Vapory 'zero-client' node would need to function.
We handle as many types of requests locally as possible, and just let data lookups fallback to some data source ( hosted rpc, blockchain api, etc ).
Categorically, we don’t want / can’t have the following types of RPC calls go to the network:
* id mgmt + tx signing (requires private data)
* filters (requires a stateful data api)
* vm (expensive, hard to scale)

### Change Log

##### 13.0.0

- txs included in blocks via [`vap-block-tracker`](https://github.com/kumavis/vap-block-tracker)@2.0.0

##### 12.0.0

- moved block polling to [`vap-block-tracker`](https://github.com/kumavis/vap-block-tracker).

##### 11.0.0

- zero.js - replaced http subprovider with fetch provider (includes polyfill for node).

##### 10.0.0

- renamed HookedWalletSubprovider `personalRecoverSigner` to `recoverPersonalSignature`

##### 9.0.0

- `pollingShouldUnref` option now defaults to false


### Current RPC mvapod support:

##### static
- [x] web3_clientVersion
- [x] net_version
- [x] net_listening
- [x] net_peerCount
- [x] vap_protocolVersion
- [x] vap_hashrate
- [x] vap_mining
- [x] vap_syncing

##### filters
- [x] vap_newBlockFilter
- [x] vap_newPendingTransactionFilter
- [x] vap_newFilter
- [x] vap_uninstallFilter
- [x] vap_getFilterLogs
- [x] vap_getFilterChanges

##### accounts manager
- [x] vap_coinbase
- [x] vap_accounts
- [x] vap_sendTransaction
- [x] vap_sign
- [x] [vap_signTypedData](https://github.com/vaporyco/VIPs/pull/712)

##### vm
- [x] vap_call
- [x] vap_estimateGas

##### db source
- [ ] db_putString
- [ ] db_getString
- [ ] db_putHex
- [ ] db_getHex

##### compiler
- [ ] vap_getCompilers
- [ ] vap_compileLLL
- [ ] vap_compileSerpent
- [ ] vap_compileSolidity

##### shh gateway
- [ ] shh_version
- [ ] shh_post
- [ ] shh_newIdentity
- [ ] shh_hasIdentity
- [ ] shh_newGroup
- [ ] shh_addToGroup

##### data source ( fallback to rpc )
* vap_gasPrice
* vap_blockNumber
* vap_getBalance
* vap_getBlockByHash
* vap_getBlockByNumber
* vap_getBlockTransactionCountByHash
* vap_getBlockTransactionCountByNumber
* vap_getCode
* vap_getStorageAt
* vap_getTransactionByBlockHashAndIndex
* vap_getTransactionByBlockNumberAndIndex
* vap_getTransactionByHash
* vap_getTransactionCount
* vap_getTransactionReceipt
* vap_getUncleByBlockHashAndIndex
* vap_getUncleByBlockNumberAndIndex
* vap_getUncleCountByBlockHash
* vap_getUncleCountByBlockNumber
* vap_sendRawTransaction
* vap_getLogs ( not used in web3.js )

##### ( not supported )
* vap_getWork
* vap_submitWork
* vap_submitHashrate ( not used in web3.js )
