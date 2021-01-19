const ProviderEngine = require('./index.js')
const ZeroClientProvider = require('./zero.js')

// create engine
var engine = ZeroClientProvider({
  rpcUrl: 'https://testrpc-vapormask.vapory.org/',
})

// log new blocks
engine.on('block', function(block){
  console.log('BLOCK CHANGED:', '#'+block.number.toString('hex'), '0x'+block.hash.toString('hex'))
})