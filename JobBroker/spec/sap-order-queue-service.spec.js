'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('SAP Order Queue', () => {
    let sqsRequestStub;
    let sqsStub;
    let AWSStub;
    let stubConfig;
    let sapOrderQueueService;

    beforeEach(() => {
        sqsRequestStub = { promise: sinon.stub() };
        sqsStub = { sendMessage: sinon.stub() };

        sqsStub.sendMessage.returns(sqsRequestStub);

        AWSStub = { SQS: sinon.stub().returns(sqsStub) };

        stubConfig = { 'aws-sdk': AWSStub };
        sapOrderQueueService = proxyquire('../sap-order-queue-service', stubConfig);
    });

    it('Returns a promise on sendMessage', () => {
        const message = { foo: 'bar' };
        sqsRequestStub.promise.resolves( {} );

        expect(sapOrderQueueService.sendMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection', () => {
        sqsRequestStub.promise.rejects();

        let resultHandler = jasmine.createSpy('resultHandler');

        sapOrderQueueService.sendMessage()
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });
    });

});
