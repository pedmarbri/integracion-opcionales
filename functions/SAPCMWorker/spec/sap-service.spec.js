'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

function setupServiceMocks(clientStub, expectedRequest, sampleResponse) {
    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    return clientMock.expects('ZWS_GEN_NCAsync')
        .once()
        .withArgs(expectedRequest)
        .resolves(sampleResponse);
}

describe('Sap Service', () => {
    let SapService;
    let soapStub;
    let clientStub;
    let stubConfig;
    let sampleCreditMemo;
    let expectedRequest;
    let sampleResponse;

    beforeEach(() => {
        sampleCreditMemo = require('./sample-creditmemo');
        expectedRequest = require('./sample-request');
        sampleResponse = require('./sample-response');

        soapStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            createClientAsync: sinon.stub()
        };

        clientStub = {
            ZWS_GEN_NCAsync: () => Promise.resolve(sampleResponse),
            addHttpHeader: () => { return this; }
        };

        soapStub.createClientAsync.resolves(clientStub);

        stubConfig = {
            'soap': soapStub
        };

        SapService = proxyquire('../sap-service', stubConfig);
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-creditmemo')];
        delete require.cache[require.resolve('./sample-request')];
        delete require.cache[require.resolve('./sample-response')];
    });

    it('Returns a promise on sendCreditMemo', () => {
        expect(SapService.sendCreditMemo(sampleCreditMemo)).toEqual(jasmine.any(Promise));
    });

    it('Calls the right soap function on sendCreditMemo with the right parameters', () => {
        const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);

        const soapMethodExpectation = clientMock.expects('ZWS_GEN_NCAsync')
            .once()
            .withArgs(expectedRequest)
            .resolves(sampleResponse);

        sampleCreditMemo.sap_order_id = '1234567890';
        sampleCreditMemo.items[0].sap_row = 10;

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => {
                expect(createClientSpy).toHaveBeenCalled();
                soapMethodExpectation.verify();
            })
            .catch(fail);
    });

    it('Sends authorization header to Sap', () => {
        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);
        const authorizationExpectation = clientMock.expects('addHttpHeader').atLeast(1).withArgs('Authorization');

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => {
                authorizationExpectation.verify();
            })
            .catch(fail);
    });

    it('Rejects on error response', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleResponse.VBELN = null;

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(fail)
            .catch(() => {
                soapMethodExpectation.verify();
            });
    });

    it('Formats shipping condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleCreditMemo.sap_order_id = '1234567890';
        sampleCreditMemo.items[0].sap_row = 10;
        sampleCreditMemo.totals.shipping = 20;

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: null,
            KBETR: 20,
            KSCHL: 'ZCEI',
            WAERS: 'ARK'
        };

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats fixed discount condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleCreditMemo.sap_order_id = '1234567890';
        sampleCreditMemo.items[0].sap_row = 10;
        sampleCreditMemo.items[0].discount_amount = 10;

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 10,
            KSCHL: 'ZBP',
            WAERS: 'ARK'
        };

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats exclusive items condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleCreditMemo.sap_order_id = '1234567890';
        sampleCreditMemo.items[0].sap_row = 10;
        sampleCreditMemo.items[0].flags = [ 'exclusive' ];
        sampleCreditMemo.items[0].discount_percent = 100;
        sampleCreditMemo.items[0].discount_amount = 249.9;

        expectedRequest.T_CONDITIONS.item[0].KSCHL = 'ZPEE';
        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 100,
            KSCHL: 'ZBEE',
            WAERS: null
        };

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });


    it('Always treats exclusive items discounts as percent', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleCreditMemo.sap_order_id = '1234567890';
        sampleCreditMemo.items[0].sap_row = 10;
        sampleCreditMemo.items[0].flags = [ 'exclusive' ];
        sampleCreditMemo.items[0].discount_percent = 0;
        sampleCreditMemo.items[0].discount_amount = 249.9;

        expectedRequest.T_CONDITIONS.item[0].KSCHL = 'ZPEE';
        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 100,
            KSCHL: 'ZBEE',
            WAERS: null
        };

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats date correctly when padding is used in month', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleCreditMemo.sap_order_id = '1234567890';
        sampleCreditMemo.items[0].sap_row = 10;
        
        sampleCreditMemo.timestamp = '2018-01-23T18:49:03Z';
        expectedRequest.BSTDK = '20180123';

        SapService.sendCreditMemo(sampleCreditMemo)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });
});