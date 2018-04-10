'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const JasmineConsoleReporter = require('jasmine-console-reporter');

const reporter = new JasmineConsoleReporter({
    colors: 1,           // (0|false)|(1|true)|2
    cleanStack: 1,       // (0|false)|(1|true)|2|3
    verbosity: 4,        // (0|false)|1|2|(3|true)|4
    listStyle: 'indent', // "flat"|"indent"
    activity: false
});

jasmine.getEnv().addReporter(reporter);

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

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);

        const soapMethodExpectation = clientMock.expects('ZWS_GEN_PEDAsync')
            .once()
            .withArgs(expectedRequest)
            .resolves(sampleResponse);

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

        // TODO Currently we a treating error resopnse as a valid result.

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
});