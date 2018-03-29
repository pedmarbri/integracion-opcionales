'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Sap Service', () => {
    let SapService;
    let soapStub;
    let clientStub;
    let stubConfig;
    let sampleOrder;
    let expectedRequest;

    beforeEach(() => {
        sampleOrder = require('./sample-order');
        expectedRequest = require('./sample-request');

        soapStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            createClientAsync: sinon.stub()
        };

        clientStub = {
            ZWS_GEN_PEDAsync: () => Promise.resolve({}),
            addHttpHeader: () => { return this; }
        };

        soapStub.createClientAsync.resolves(clientStub);

        stubConfig = {
            'soap': soapStub
        };

        SapService = proxyquire('../sap-service', stubConfig);
    });

    it('Returns a promise on sendOrder', () => {
        expect(SapService.sendOrder(sampleOrder)).toEqual(jasmine.any(Promise));
    });

    it('Calls the right soap function on sendOrder with the right parameters', () => {
        const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);

        const soapMethodExpectation = clientMock.expects('ZWS_GEN_PEDAsync').once().withArgs(expectedRequest);

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
});