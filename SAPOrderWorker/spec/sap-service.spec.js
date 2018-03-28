'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Sap Service', () => {
    let SapService;
    let soapStub;
    let clientStub;
    let stubConfig;

    const order = {
        order_id: '12700000065'
    };

    beforeEach(() => {

        soapStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            createClientAsync: sinon.stub()
        };

        clientStub = {
            ZWS_GEN_PEDAsync: () => Promise.resolve({}),
            addHttpHeader: sinon.stub()
        };

        soapStub.createClientAsync.resolves(clientStub);

        stubConfig = {
            'soap': soapStub
        };

        SapService = proxyquire('../sap-service', stubConfig);
    });

    it('Returns a promise on sendOrder', () => {
        expect(SapService.sendOrder(order)).toEqual(jasmine.any(Promise));
    });

    it('Calls the right soap function on sendOrder', () => {
        const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);

        SapService.sendOrder(order)
            .then(() => {
                expect(createClientSpy).toHaveBeenCalled();
                clientMock.expects('ZWS_GEN_PEDAsync').once();
            })
            .catch(fail);
    });

    it('Sends authorization header to Sap', () => {
        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);

        SapService.sendOrder(order)
            .then(() => {
                clientMock.expects('addHttpHeader').atLeast(1).withArgs('Authorization');
            })
            .catch(fail);
    });
});