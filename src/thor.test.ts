import '@vechain/connex'
const { ensureBlock, ensureStatus, ensureTransaction, ensureTransactionReceipt, ensureAccount, ensureVMOutput, ensureEventCriteria, ensureEventLog, ensureTransferLog } = require('./validator')
const { expect } = require('chai')
const { isSemVer, isHexBytes, isAddress, isBytes32 } = require('./types')
const { promiseWrapper } = require('./utils')

const transferEventABI = { "anonymous": false, "inputs": [{ "indexed": true, "name": "_from", "type": "address" }, { "indexed": true, "name": "_to", "type": "address" }, { "indexed": false, "name": "_value", "type": "uint256" }], "name": "Transfer", "type": "event" }
const candidateEventABI = { "anonymous": false, "inputs": [{ "indexed": true, "name": "nodeMaster", "type": "address" }, { "indexed": false, "name": "action", "type": "bytes32" }], "name": "Candidate", "type": "event" }
const nameABI = { "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "pure", "type": "function" }
const transferABI = { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }
const addMasterABI = { "constant": false, "inputs": [{ "name": "_nodeMaster", "type": "address" }, { "name": "_endorsor", "type": "address" }, { "name": "_identity", "type": "bytes32" }], "name": "add", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }

describe('connex', () => {

    it('connex should be attached to global object', () => {
        expect(connex).to.be.an('object')
    })

    it('ensure connex object properties', () => {
        expect(connex).to.have.all.keys('version', 'thor','vendor')
    })

})

describe('connex.version', () => {

    it('connex.version should be a valid SemVer', () => {
        expect(isSemVer(connex.version)).to.be.true
    })

})

describe('connex.thor', () => {

    it('ensure connex.thor object properties', () => {
        expect(connex.thor).to.have.all.keys('genesis', 'status', 'ticker', 'account', 'block', 'transaction', 'filter','explain')
    })

    describe('connex.thor.genesis', () => { 
        
        it('ensure connex.thor.genesis object properties', () => {
            expect(connex.thor.genesis, 'ensure genesis block object keys').to.satisfy((obj: Connex.Thor.Block) => {
                const keys = ['beneficiary', 'gasLimit', 'gasUsed', 'id', 'isTrunk', 'number', 'parentID', 'receiptsRoot', 'signer', 'size', 'stateRoot', 'timestamp', 'totalScore', 'transactions', 'txsRoot']
                for (let key of keys) {
                    if (!obj.hasOwnProperty(key)) {
                        return false
                    }
                }
                return true
            })
        })

        it('connex.thor.genesis ID should be testnet\'s genesis ID', () => {
            expect(connex.thor.genesis.id).to.be.equal('0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127', "Implementation test only can be run under testnet environment")
        })

        it('connex.thor.genesis should be an block', () => {
            ensureBlock(connex.thor.genesis)
        })
    })

    describe('connex.thor.status', () => {

        it('connex.thor.status should be an status', () => {
            ensureStatus(connex.thor.status)
        })
        
    })

    describe('connex.thor.ticker', () => {

        it('connex.thor.ticker should be resolved without error thrown', done => {
            const ticker = connex.thor.ticker()
            ticker.next().then(() => {
                done()
            }).catch(e => {
                done(e)
            })
        })

        it('connex.thor.ticker should resolve ', done => {
            const ticker = connex.thor.ticker()
            new Promise((resolve) => {
                setTimeout(resolve, 15*1000)
            }).then(() => {
                return ticker.next()
            }).then(() => {
                done()
            }).catch(e => {
                done(e)
            })
        })

    })

    describe('connex.thor.account', () => {

        it('get account should return a account detail', done => {
            promiseWrapper(connex.thor.account('0xe59d475abe695c7f67a8a2321f33a856b0b4c71d').get().then(acc => {
                ensureAccount(acc)
                done()
            }), done)
        })

        it('get code should return code', done => {
            promiseWrapper(connex.thor.account('0x0000000000000000000000000000456e65726779').getCode().then(code => {
                expect(isHexBytes(code.code), 'code should be a hex format string').to.be.true
                done()
            }), done)
        })

        it('get storage should return storage', done => {
            promiseWrapper(connex.thor.account('0x0000000000000000000000000000456e65726779').getStorage('0x0000000000000000000000000000000000000000000000000000000000000001').then(storage => {
                expect(isHexBytes(storage.value), 'code should be a hex format string').to.be.true
                done()
            }), done)
        })

        it('ensure account\'s revision', () => {
            const a = connex.thor.account('0x0000000000000000000000000000456e65726779')
            expect(a.address).to.be.equal('0x0000000000000000000000000000456e65726779')
        })

        describe('connex.thor.account(...).method', () => {

            it('call name method should return name', (done) => {
                const nameMethod = connex.thor.account('0x0000000000000000000000000000456e65726779').method(nameABI)
                promiseWrapper(nameMethod.call().then(output => {
                    ensureVMOutput(output)
                    expect(output.decoded).to.have.property('0', 'VeThor')
                    done()
                }), done)
            })

            it('call contract method set low gas should revert and gasUsed should be the setted gas', (done) => {
                const nameMethod = connex.thor.account('0x0000000000000000000000000000456e65726779').method(nameABI)
                nameMethod.gas(1)
                nameMethod.gasPrice('1000000000000000')
                promiseWrapper(nameMethod.call().then(output => {
                    ensureVMOutput(output)
                    expect(output.gasUsed).to.be.equal(1)
                    expect(output.reverted).to.be.true
                    done()
                }), done)
            })

            it('set value and convert to clause should return clause with correct value', () => {
                const nameMethod = connex.thor.account('0x0000000000000000000000000000456e65726779').method(nameABI)
                nameMethod.value(0x64)
                const clause = nameMethod.asClause()
                expect(clause).to.have.property('to', '0x0000000000000000000000000000456e65726779')
                expect(clause).to.have.property('value', '100')
                expect(clause).to.have.property('data', '0x06fdde03')
            })

            it("add master by non-executor should have revert reason returned", (done) => {
                const addMasterMethod = connex.thor.account('0x0000000000000000000000417574686f72697479').method(addMasterABI)
                promiseWrapper(addMasterMethod.call('0x0000000000000000000000417574686f72697479', '0x0000000000000000000000417574686f72697479', '0x0000000000000000000000000000000000000000000000417574686f72697479').then(output => {
                    expect(output).to.have.property('reverted', true)
                    expect(output).to.have.property('decoded')
                    expect(output.decoded).to.have.property('revertReason', 'builtin: executor required')
                    done()
                }), done)
            })

            it("add master by executor should not revert", (done) => {
                const addMasterMethod = connex.thor.account('0x0000000000000000000000417574686f72697479').method(addMasterABI).caller('0xB5A34b62b63A6f1EE99DFD30b133B657859f8d79')
                promiseWrapper(addMasterMethod.call('0x0000000000000000000000417574686f72697479', '0x0000000000000000000000417574686f72697479', '0x0000000000000000000000000000000000000000000000417574686f72697479').then(output => {
                    expect(output).to.have.property('reverted', false)
                    done()
                }), done)
            })
        })

        describe('connex.thor.account(...).event', () => { 

            it('asCriteria should produce correct criteria', () => {
                const transferEvent = connex.thor.account('0x0000000000000000000000000000456e65726779').event(transferEventABI)
                const criteria = transferEvent.asCriteria({
                    _to: '0xd3ae78222beadb038203be21ed5ce7c9b1bff602'
                })
                ensureEventCriteria(criteria)
                expect(criteria).to.have.property('address', '0x0000000000000000000000000000456e65726779')
                expect(criteria).to.have.property('topic0', '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
                expect(criteria).to.have.property('topic2', '0x000000000000000000000000d3ae78222beadb038203be21ed5ce7c9b1bff602')
            })

            it('filter should accept criteria and range', (done) => {
                const transferEvent = connex.thor.account('0x0000000000000000000000000000456e65726779').event(transferEventABI)
                const criteria = transferEvent.asCriteria({
                    _to: '0xd3ae78222beadb038203be21ed5ce7c9b1bff602'
                })
                const filter = transferEvent.filter([]).criteria([criteria]).range({ unit: 'block', from: 0, to: 0 })
                // ensure block 0 to block 1 does not contain energy transfer event
                promiseWrapper(filter.apply(0, 1).then(logs => {
                    expect(logs.length).to.be.equal(0)
                    done()
                }),done)
            })

            it('filter should return the candidate event log', (done) => {
                const transferEvent = connex.thor.account('0x0000000000000000000000417574686f72697479').event(candidateEventABI)
                const filter = transferEvent.filter([]).order('desc')
                promiseWrapper(filter.apply(0,1).then(logs => { 
                    expect(logs.length).to.be.equal(1)

                    const log = logs[0]
                    const decoded = logs[0].decoded as { [index: string]: any }
                    
                    ensureEventLog(log, true)
                    expect(decoded).to.have.any.keys('0', '1', 'action', 'nodeMaster')
                    expect(isAddress(decoded['nodeMaster']), 'nodeMaster should be an address').to.be.true
                    expect(isBytes32(decoded['action']), 'action should be an address').to.be.true
                    done()
                }), done)
            })

        })

    })

    describe('connex.thor.block', () => { 
        
        it('getBlock should return a block', done => {
            promiseWrapper(connex.thor.block(0).get().then(blk =>{
                ensureBlock(blk)
                done()
            }), done)
        })

        it('ensure block visitor\'s revision', () => {
            const b = connex.thor.block(1)
            expect(b.revision).to.be.equal(1)
        })

        it('block without revision should give the revision of head block id', () => {
            expect(connex.thor.block().revision).to.be.equal(connex.thor.status.head.id)
        })

        it('getBlock should accept block ID as parameter', done => {
            promiseWrapper(connex.thor.block(connex.thor.genesis.id).get().then(blk => {
                ensureBlock(blk)
                done()
            }), done)
        })

        it('getBlock invalid block ID should return null', done => {
            promiseWrapper(connex.thor.block('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').get().then(blk => {
                expect(blk).to.be.null
                done()
            }), done)
        })

    })

    describe('connex.thor.transaction', () => { 

        it('getTransaction should return a transaction', done => {
            promiseWrapper(connex.thor.transaction('0x9daa5b584a98976dfca3d70348b44ba5332f966e187ba84510efb810a0f9f851').get().then(tx => {
                ensureTransaction(tx)
                done()
            }), done)
        })

        it('ensure transaction visitor\'s revision', () => {
            const txid = '0x9daa5b584a98976dfca3d70348b44ba5332f966e187ba84510efb810a0f9f851'
            const t = connex.thor.transaction(txid)
            expect(t.id).to.be.equal(txid)
        })

        it('getTransaction invalid block ID should return null', done => {
            promiseWrapper(connex.thor.transaction('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').get().then(tx => {
                expect(tx).to.be.null
                done()
            }), done)
        })

        it('getTransactionReceipt should return a transaction receipt', done => {
            promiseWrapper(connex.thor.transaction('0x9daa5b584a98976dfca3d70348b44ba5332f966e187ba84510efb810a0f9f851').getReceipt().then(receipt => {
                ensureTransactionReceipt(receipt)
            }).then(() => {
                return connex.thor.transaction('0x316072e16a794a8f385e9f261a102c49947aa82a0355006289707b667e841cdc').getReceipt()
            }).then(receipt => {
                ensureTransactionReceipt(receipt)
                done()
            }), done)
        })

        it('getTransactionReceipt invalid block ID should return null', done => {
            promiseWrapper(connex.thor.transaction('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').getReceipt().then(receipt => {
                expect(receipt).to.be.null
                done()
            }), done)
        })

    })

    describe('connex.thor.filter', () => { 

        it('filter transfer event should return the transfer log', (done) => {
            const filter = connex.thor.filter('transfer').order('desc').criteria([{ txOrigin: '0xe59D475Abe695c7f67a8a2321f33A856B0B4c71d' }])
            promiseWrapper(filter.apply(0, 1).then(logs => {
                expect(logs.length).to.be.equal(1)
                ensureTransferLog(logs[0], true)
                done()
            }), done)
        })

    })

    describe('connex.thor.explain', () => { 

        it('explain should return valid vmoutput', (done) => {
            const transferMethod = connex.thor.account('0x0000000000000000000000000000456e65726779').method(transferABI)
            const energyClause = transferMethod.asClause('0xd3ae78222beadb038203be21ed5ce7c9b1bff602', 1)

            const explainer = connex.thor.explain()
            explainer
                .gas(200000)
                .gasPrice('1000000000000000')
                .caller('0xe59d475abe695c7f67a8a2321f33a856b0b4c71d')
            
            promiseWrapper(explainer.execute([
                {
                    to: '0xd3ae78222beadb038203be21ed5ce7c9b1bff602',
                    value: 1,
                    data: '0x'
                },
                energyClause
            ]).then(outputs => {
                expect(outputs.length).to.be.equal(2)
                outputs.forEach(output => {
                     ensureVMOutput(output)
                })
                done()
            }), done)
        })

        it('explain should decode revert reason if there is reverted clause', (done) => {
            const addMasterMethod = connex.thor.account('0x0000000000000000000000417574686f72697479').method(addMasterABI)

            const explainer = connex.thor.explain()
            explainer
                .gas(200000)

            promiseWrapper(explainer.execute([
                addMasterMethod.asClause('0x0000000000000000000000417574686f72697479', '0x0000000000000000000000417574686f72697479', '0x0000000000000000000000000000000000000000000000417574686f72697479')
            ]).then(outputs => {
                const VMOut = outputs[0]

                expect(VMOut).to.have.property('reverted', true)
                expect(VMOut).to.have.property('decoded')
                expect(VMOut.decoded).to.have.property('revertReason', 'builtin: executor required')
                done()
            }), done)
        })

    })

})
