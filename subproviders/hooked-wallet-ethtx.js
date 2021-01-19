/*
 * Uses vaporyjs-tx to sign a transaction.
 *
 * The two callbacks a user needs to implement are:
 * - getAccounts() -- array of addresses supported
 * - getPrivateKey(address) -- return private key for a given address
 *
 * Optionally approveTransaction(), approveMessage() can be supplied too.
 */

const inherits = require('util').inherits
const HookedWalletProvider = require('./hooked-wallet.js')
const VapTx = require('vaporyjs-tx')
const vapUtil = require('vaporyjs-util')

module.exports = HookedWalletVapTxSubprovider

inherits(HookedWalletVapTxSubprovider, HookedWalletProvider)

function HookedWalletVapTxSubprovider(opts) {
  const self = this
  
  HookedWalletVapTxSubprovider.super_.call(self, opts)

  self.signTransaction = function(txData, cb) {
    // defaults
    if (txData.gas !== undefined) txData.gasLimit = txData.gas
    txData.value = txData.value || '0x00'

    opts.getPrivateKey(txData.from, function(err, privateKey) {
      if (err) return cb(err)

      var tx = new VapTx(txData)
      tx.sign(privateKey)
      cb(null, '0x' + tx.serialize().toString('hex'))
    })
  }

  self.signMessage = function(msgParams, cb) {
    opts.getPrivateKey(msgParams.from, function(err, privateKey) {
      if (err) return cb(err)
      var msgHash = vapUtil.sha3(msgParams.data)
      var sig = vapUtil.ecsign(msgHash, privateKey)
      var serialized = vapUtil.bufferToHex(concatSig(sig.v, sig.r, sig.s))
      cb(null, serialized)
    })
  }

}

function concatSig(v, r, s) {
  r = vapUtil.fromSigned(r)
  s = vapUtil.fromSigned(s)
  v = vapUtil.bufferToInt(v)
  r = vapUtil.toUnsigned(r).toString('hex')
  s = vapUtil.toUnsigned(s).toString('hex')
  v = vapUtil.stripHexPrefix(vapUtil.intToHex(v))
  return vapUtil.addHexPrefix(r.concat(s, v).toString("hex"))
}