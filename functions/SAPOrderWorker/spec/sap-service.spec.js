'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

function setupServiceMocks(clientStub, expectedRequest, sampleResponse) {
    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    const soapMethodExpectation = clientMock.expects('ZWS_GEN_PEDAsync')
        .once()
        .withArgs(expectedRequest)
        .resolves(sampleResponse);
    return soapMethodExpectation;
}

describe('Sap Service', () => {
    let SapService;
    let soapStub;
    let clientStub;
    let stubConfig;
    let sampleOrder;
    let expectedRequest;
    let sampleResponse;

    beforeEach(() => {
        sampleOrder = require('./sample-order');
        expectedRequest = require('./sample-request');
        sampleResponse = require('./sample-response');

        soapStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            createClientAsync: sinon.stub()
        };

        clientStub = {
            ZWS_GEN_PEDAsync: () => Promise.resolve(sampleResponse),
            addHttpHeader: () => { return this; }
        };

        soapStub.createClientAsync.resolves(clientStub);

        stubConfig = {
            'soap': soapStub
        };

        SapService = proxyquire('../sap-service', stubConfig);
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-order')];
        delete require.cache[require.resolve('./sample-request')];
        delete require.cache[require.resolve('./sample-response')];
    });

    it('Returns a promise on sendOrder', () => {
        expect(SapService.sendOrder(sampleOrder)).toEqual(jasmine.any(Promise));
    });

    it('Calls the right soap function on sendOrder with the right parameters', () => {
        const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        SapService.sendOrder(sampleOrder)
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

        SapService.sendOrder(sampleOrder)
            .then(() => {
                authorizationExpectation.verify();
            })
            .catch(fail);
    });

    xit('Rejects on error response', () => {

        // TODO Currently we are treating error resopnse as a valid result.

        sampleResponse.VBELN = null;

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);
        const soapMethodExpectation = clientMock.expects('ZWS_GEN_PEDAsync')
            .once()
            .withArgs(expectedRequest)
            .resolves(sampleResponse);

        SapService.sendOrder(sampleOrder)
            .then(fail)
            .catch(() => {
                soapMethodExpectation.verify();
            });
    });

    it('Formats shipping condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.totals.shipping = 20;

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: null,
            KBETR: 20,
            KSCHL: 'ZCEI',
            WAERS: 'ARK'
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats fixed discount condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.items[0].discount_amount = 10;
        sampleOrder.items[0].flags = [];

        expectedRequest.T_CONDITIONS.item[0].KSCHL = 'ZPBI';

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 10,
            KSCHL: 'ZBP',
            WAERS: 'ARK'
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats exclusive items condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.items[0].discount_percent = 100;
        sampleOrder.items[0].discount_amount = 249.9;

        expectedRequest.T_CONDITIONS.item[0].KSCHL = 'ZPEE';
        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 100,
            KSCHL: 'ZBEE',
            WAERS: null
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Always treats exclusive items discounts as percent', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.items[0].discount_percent = 0;
        sampleOrder.items[0].discount_amount = 249.9;

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 100,
            KSCHL: 'ZBEE',
            WAERS: null
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats date correctly when padding is used in month', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.timestamp = '2018-01-23T18:49:03Z';
        expectedRequest.BSTDK = '20180123';

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats date correctly when padding is used in day', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.timestamp = '2018-11-03T18:49:03Z';
        expectedRequest.BSTDK = '20181103';

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });
});