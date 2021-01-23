const inherits = require('util').inherits
const Subprovider = require('./subprovider.js')

module.exports = WhitelistProvider

inherits(WhitelistProvider, Subprovider)

function WhitelistProvider(methods){
  this.methods = methods;

  if (this.methods == null) {
    this.methods = [
      'vap_gasPrice',
      'vap_blockNumber',
      'vap_getBalance',
      'vap_getBlockByHash',
      'vap_getBlockByNumber',
      'vap_getBlockTransactionCountByHash',
      'vap_getBlockTransactionCountByNumber',
      'vap_getCode',
      'vap_getStorageAt',
      'vap_getTransactionByBlockHashAndIndex',
      'vap_getTransactionByBlockNumberAndIndex',
      'vap_getTransactionByHash',
      'vap_getTransactionCount',
      'vap_getTransactionReceipt',
      'vap_getUncleByBlockHashAndIndex',
      'vap_getUncleByBlockNumberAndIndex',
      'vap_getUncleCountByBlockHash',
      'vap_getUncleCountByBlockNumber',
      'vap_sendRawTransaction',
      'vap_getLogs'
    ];
  }
}

WhitelistProvider.prototype.handleRequest = function(payload, next, end){
  if (this.methods.indexOf(payload.method) >= 0) {
    next();
  } else {
    end(new Error("Method '" + payload.method + "' not allowed in whitelist."));
  }
}
