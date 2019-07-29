import { link } from 'fs';

const { expect } = require('chai') 
const { Certificate } = require('thor-devkit')
const { promiseWrapper } = require('./utils')
const { isAddress, isBytes32, isHexBytes} = require('./types')

export{}
describe('connex.vendor', () => {

    it('should own 0xf2e7617c45c42967fde0514b5aa6bba56e3e11dd in user account', () => {
        expect(connex.vendor.owned('0xf2e7617c45c42967fde0514b5aa6bba56e3e11dd')).to.be.true
    })

    it('should not own 0x0000000000000000000000000000000000000000 in user account', () => {
        expect(connex.vendor.owned('0x0000000000000000000000000000000000000000')).to.be.false
    })

    it('acquire singing service should return signing service without error', () => {
        let txSigner = connex.vendor.sign('tx')
        expect(txSigner).to.not.equal(undefined)
        let certSigner = connex.vendor.sign('cert')
        expect(certSigner).to.not.equal(undefined)
    })

    it('tx signing should return txid and signer', (done) => {
        let txSigner = connex.vendor.sign('tx')
        promiseWrapper(txSigner.request([{
            to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
            value: '10000000000000000',
            data: '0x',
        }]).then(ret => {
            expect(isAddress(ret.signer), 'signer should be an address').to.be.true
            expect(isBytes32(ret.txid), 'txid should be an bytes32').to.be.true
            done()
        }), done)
    })

    it('specify signer should signed by the signer', (done) => {
        let txSigner = connex.vendor.sign('tx')
        txSigner.signer('0xf2e7617c45c42967fde0514b5aa6bba56e3e11dd')
        promiseWrapper(txSigner.request([{
            to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
            value: '10000000000000000',
            data: '0x',
        }]).then(ret => {
            expect(ret.signer).to.be.equal('0xf2e7617c45c42967fde0514b5aa6bba56e3e11dd')
            done()
        }), done)
    })

    it('tx-request: set options should not throw', () => {
        connex.vendor.sign('tx')
            .gas(21000)
            .dependsOn('0x0000000000000000000000000000000000000000000000000000000000000000')
            .link('http://localhost')
            .comment('comment')
    })

    it('identification cert signing should return valid cert response', (done) => {
        let certSigner = connex.vendor.sign('cert')
        promiseWrapper(certSigner.request({
            purpose: 'identification',
            payload: {
                type: 'text',
                content: 'random generated string'
            }
        }).then(ret => {
            expect(isHexBytes(ret.signature), 'signature be a hex format string').to.be.true
            expect(ret.annex.domain).to.be.equal(location.hostname)
            expect((connex.thor.status.head.timestamp - ret.annex.timestamp) % 10)
            expect(ret.annex.timestamp).to.be.below((new Date().getTime()) / 1000).to.be.above((new Date().getTime()) / 1000 - 60)
            expect(isAddress(ret.annex.signer), 'signer should be an address').to.be.true
            Certificate.verify({
                purpose: 'identification',
                payload: {
                    type: 'text',
                    content: 'random generated string'
                },
                domain: ret.annex.domain,
                timestamp: ret.annex.timestamp,
                signer: ret.annex.signer,
                signature: ret.signature
            })
            done()
        }), done)
    })

    it('agreement cert signing should return valid cert response', (done) => {
        let certSigner = connex.vendor.sign('cert')
            .link('http://localhost')
        promiseWrapper(certSigner.request({
            purpose: 'agreement',
            payload: {
                type: 'text',
                content: 'agreement'
            }
        }).then(ret => {
            expect(isHexBytes(ret.signature), 'signature be a hex format string').to.be.true
            expect(ret.annex.domain).to.be.equal(location.hostname)
            expect((connex.thor.status.head.timestamp - ret.annex.timestamp) % 10)
            expect(ret.annex.timestamp).to.be.below((new Date().getTime()) / 1000).to.be.above((new Date().getTime()) / 1000 - 60)
            expect(isAddress(ret.annex.signer), 'signer should be an address').to.be.true
            Certificate.verify({
                purpose: 'agreement',
                payload: {
                    type: 'text',
                    content: 'agreement'
                },
                domain: ret.annex.domain,
                timestamp: ret.annex.timestamp,
                signer: ret.annex.signer,
                signature: ret.signature
            })
            done()
        }), done)
    })

})