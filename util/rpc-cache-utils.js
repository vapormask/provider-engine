const stringify = require('json-stable-stringify')

module.exports = {
  cacheIdentifierForPayload: cacheIdentifierForPayload,
  canCache: canCache,
  blockTagForPayload: blockTagForPayload,
  paramsWithoutBlockTag: paramsWithoutBlockTag,
  blockTagParamIndex: blockTagParamIndex,
  cacheTypeForPayload: cacheTypeForPayload,
}

function cacheIdentifierForPayload(payload, opts = {}){
  if (!canCache(payload)) return null
  const { includeBlockRef } = opts
  const params = includeBlockRef ? payload.params : paramsWithoutBlockTag(payload)
  return payload.method + ':' + stringify(params)
}

function canCache(payload){
  return cacheTypeForPayload(payload) !== 'never'
}

function blockTagForPayload(payload){
  var index = blockTagParamIndex(payload);

  // Block tag param not passed.
  if (index >= payload.params.length) {
    return null;
  }

  return payload.params[index];
}

function paramsWithoutBlockTag(payload){
  var index = blockTagParamIndex(payload);

  // Block tag param not passed.
  if (index >= payload.params.length) {
    return payload.params;
  }

  // vap_getBlockByNumber has the block tag first, then the optional includeTx? param
  if (payload.method === 'vap_getBlockByNumber') {
    return payload.params.slice(1);
  }

  return payload.params.slice(0,index);
}

function blockTagParamIndex(payload){
  switch(payload.method) {
    // blockTag is second param
    case 'vap_getBalance':
    case 'vap_getCode':
    case 'vap_getTransactionCount':
    case 'vap_getStorageAt':
    case 'vap_call':
    case 'vap_estimateGas':
      return 1
    // blockTag is first param
    case 'vap_getBlockByNumber':
      return 0
    // there is no blockTag
    default:
      return undefined
  }
}

function cacheTypeForPayload(payload) {
  switch (payload.method) {
    // cache permanently
    case 'web3_clientVersion':
    case 'web3_sha3':
    case 'vap_protocolVersion':
    case 'vap_getBlockTransactionCountByHash':
    case 'vap_getUncleCountByBlockHash':
    case 'vap_getCode':
    case 'vap_getBlockByHash':
    case 'vap_getTransactionByHash':
    case 'vap_getTransactionByBlockHashAndIndex':
    case 'vap_getTransactionReceipt':
    case 'vap_getUncleByBlockHashAndIndex':
    case 'vap_getCompilers':
    case 'vap_compileLLL':
    case 'vap_compileSolidity':
    case 'vap_compileSerpent':
    case 'shh_version':
      return 'perma'

    // cache until fork
    case 'vap_getBlockByNumber':
    case 'vap_getBlockTransactionCountByNumber':
    case 'vap_getUncleCountByBlockNumber':
    case 'vap_getTransactionByBlockNumberAndIndex':
    case 'vap_getUncleByBlockNumberAndIndex':
      return 'fork'

    // cache for block
    case 'vap_gasPrice':
    case 'vap_blockNumber':
    case 'vap_getBalance':
    case 'vap_getStorageAt':
    case 'vap_getTransactionCount':
    case 'vap_call':
    case 'vap_estimateGas':
    case 'vap_getFilterLogs':
    case 'vap_getLogs':
    case 'net_peerCount':
      return 'block'

    // never cache
    case 'net_version':
    case 'net_peerCount':
    case 'net_listening':
    case 'vap_syncing':
    case 'vap_sign':
    case 'vap_coinbase':
    case 'vap_mining':
    case 'vap_hashrate':
    case 'vap_accounts':
    case 'vap_sendTransaction':
    case 'vap_sendRawTransaction':
    case 'vap_newFilter':
    case 'vap_newBlockFilter':
    case 'vap_newPendingTransactionFilter':
    case 'vap_uninstallFilter':
    case 'vap_getFilterChanges':
    case 'vap_getWork':
    case 'vap_submitWork':
    case 'vap_submitHashrate':
    case 'db_putString':
    case 'db_getString':
    case 'db_putHex':
    case 'db_getHex':
    case 'shh_post':
    case 'shh_newIdentity':
    case 'shh_hasIdentity':
    case 'shh_newGroup':
    case 'shh_addToGroup':
    case 'shh_newFilter':
    case 'shh_uninstallFilter':
    case 'shh_getFilterChanges':
    case 'shh_getMessages':
      return 'never'
  }
}
