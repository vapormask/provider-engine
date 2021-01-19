const inherits = require('util').inherits
const FixtureProvider = require('./fixture.js')
const version = require('../package.json').version

module.exports = DefaultFixtures

inherits(DefaultFixtures, FixtureProvider)

function DefaultFixtures() {
  const self = this
  var responses = {
    web3_clientVersion: 'ProviderEngine/v'+version+'/javascript',
    net_listening: true,
    vap_hashrate: '0x00',
    vap_mining: false,
  }
  FixtureProvider.call(self, responses)
}
