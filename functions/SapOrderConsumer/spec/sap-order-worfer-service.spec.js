'use strict';

const sinon = require( 'sinon' );

/**
 * @type {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();

describe('Sap Order Worker Service', () => {

    let lambdaRequestStub;
    let sapOrderWorkerService;
    let stubConfig;
    let AWSStub;
    let lambdaStub;

    beforeEach(() => {
        lambdaRequestStub = {
            /**
             * @var {SinonStub}
             */
            promise: sinon.stub()
        };

        lambdaStub = {
            /**
             * @var {SinonStub}
             */
            invoke: sinon.stub()
        };

        lambdaStub.invoke.returns(lambdaRequestStub);

        AWSStub = {
            /**
             * @var {SinonStub}
             */
            Lambda: sinon.stub()
        };

        AWSStub.Lambda.returns(lambdaStub);

        stubConfig = { 'aws-sdk': AWSStub };
        sapOrderWorkerService = proxyquire('../sap-order-worker-service', stubConfig);
    });

    it('Returns a promise on process', () => {
        lambdaRequestStub.promise.resolves([]);
        expect(sapOrderWorkerService.process()).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on process', () => {
        let messagesHandler = jasmine.createSpy('messagesHandler', () => Promise.reject("Should not be called"))
            .and.callThrough();

        lambdaRequestStub.promise.rejects();

        sapOrderWorkerService.process()
            .then(messagesHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(messagesHandler).not.toHaveBeenCalled();
            });
    });

});