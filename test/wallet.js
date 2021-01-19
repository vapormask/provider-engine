const test = require('tape')
const Transaction = require('vaporyjs-tx')
const vapUtil = require('vaporyjs-util')
const ProviderEngine = require('../index.js')
const FixtureProvider = require('../subproviders/fixture.js')
const NonceTracker = require('../subproviders/nonce-tracker.js')
const HookedWalletProvider = require('../subproviders/hooked-wallet.js')
const HookedWalletTxProvider = require('../subproviders/hooked-wallet-vaptx.js')
const TestBlockProvider = require('./util/block.js')
const createPayload = require('../util/create-payload.js')
const injectMetrics = require('./util/inject-metrics')


test('tx sig', function(t){
  t.plan(12)

  var privateKey = new Buffer('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex')
  var address = new Buffer('1234362ef32bcd26d3dd18ca749378213625ba0b', 'hex')
  var addressHex = '0x'+address.toString('hex')
  
  // sign all tx's
  var providerA = injectMetrics(new HookedWalletProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
    signTransaction: function(txParams, cb){
      var tx = new Transaction(txParams)
      tx.sign(privateKey)
      var rawTx = '0x'+tx.serialize().toString('hex')
      cb(null, rawTx)
    },
  }))

  // handle nonce requests
  var providerB = injectMetrics(new NonceTracker())
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    vap_gasPrice: '0x1234',
    vap_getTransactionCount: '0x00',
    vap_sendRawTransaction: function(payload, next, done){
      var rawTx = vapUtil.toBuffer(payload.params[0])
      var tx = new Transaction(rawTx)
      var hash = '0x'+tx.hash().toString('hex')
      done(null, hash)
    },
  }))
  // handle block requests
  var providerD = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)
  engine.addProvider(providerC)
  engine.addProvider(providerD)

  var txPayload = {
    method: 'vap_sendTransaction',
    params: [{
      from: addressHex,
      to: addressHex,
      value: '0x01',
      gas: '0x1234567890',
    }]
  }

  engine.start()
  engine.sendAsync(createPayload(txPayload), function(err, response){
    t.ifError(err, 'did not error')
    t.ok(response, 'has response')

    // intial tx request
    t.equal(providerA.getWitnessed('vap_sendTransaction').length, 1, 'providerA did see "signTransaction"')
    t.equal(providerA.getHandled('vap_sendTransaction').length, 1, 'providerA did handle "signTransaction"')

    // tx nonce
    t.equal(providerB.getWitnessed('vap_getTransactionCount').length, 1, 'providerB did see "vap_getTransactionCount"')
    t.equal(providerB.getHandled('vap_getTransactionCount').length, 0, 'providerB did NOT handle "vap_getTransactionCount"')
    t.equal(providerC.getWitnessed('vap_getTransactionCount').length, 1, 'providerC did see "vap_getTransactionCount"')
    t.equal(providerC.getHandled('vap_getTransactionCount').length, 1, 'providerC did handle "vap_getTransactionCount"')

    // gas price
    t.equal(providerC.getWitnessed('vap_gasPrice').length, 1, 'providerB did see "vap_gasPrice"')
    t.equal(providerC.getHandled('vap_gasPrice').length, 1, 'providerB did handle "vap_gasPrice"')  

    // send raw tx
    t.equal(providerC.getWitnessed('vap_sendRawTransaction').length, 1, 'providerC did see "vap_sendRawTransaction"')
    t.equal(providerC.getHandled('vap_sendRawTransaction').length, 1, 'providerC did handle "vap_sendRawTransaction"')

    engine.stop()
    t.end()
  })

})

test('no such account', function(t){
  t.plan(1)

  var addressHex = '0x1234362ef32bcd26d3dd18ca749378213625ba0b'
  var otherAddressHex = '0x4321362ef32bcd26d3dd18ca749378213625ba0c'
  
  // sign all tx's
  var providerA = injectMetrics(new HookedWalletProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
  }))

  // handle nonce requests
  var providerB = injectMetrics(new NonceTracker())
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    vap_gasPrice: '0x1234',
    vap_getTransactionCount: '0x00',
    vap_sendRawTransaction: function(payload, next, done){
      var rawTx = vapUtil.toBuffer(payload.params[0])
      var tx = new Transaction(rawTx)
      var hash = '0x'+tx.hash().toString('hex')
      done(null, hash)
    },
  }))
  // handle block requests
  var providerD = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)
  engine.addProvider(providerC)
  engine.addProvider(providerD)

  var txPayload = {
    method: 'vap_sendTransaction',
    params: [{
      from: otherAddressHex,
      to: addressHex,
      value: '0x01',
      gas: '0x1234567890',
    }]
  }

  engine.start()
  engine.sendAsync(createPayload(txPayload), function(err, response){
    t.ok(err, 'did error')

    engine.stop()
    t.end()
  })

})


test('sign message', function(t){
  t.plan(3)

  var privateKey = new Buffer('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex')
  var addressHex = '0x1234362ef32bcd26d3dd18ca749378213625ba0b'
  
  var messageToSign = 'haay wuurl'
  var signedResult = '0x2c865e6843caf741a694522f86281c9ee86294ade3c8cd1889c9f2c9a24e20802b2b6eb79ba49412661bdbf40245d9b01abb393a843734e5be79b38e7dd408ef1c'

  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
    getPrivateKey: function(address, cb){
      cb(null, privateKey)
    },
  }))

  // handle block requests
  var providerB = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)

  var payload = {
    method: 'vap_sign',
    params: [
      addressHex,
      messageToSign,
    ],
  }

  engine.start()
  engine.sendAsync(createPayload(payload), function(err, response){
    t.ifError(err, 'did not error')
    t.ok(response, 'has response')

    t.equal(response.result, signedResult, 'signed response is correct')

    engine.stop()
    t.end()
  })

})
