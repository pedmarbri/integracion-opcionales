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
        const message = {
            order: {},
            contact: {}
        };

        sqsRequestStub.promise.resolves( {} );

        expect(sapOrderQueueService.sendMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection', () => {
        let resultHandler = jasmine.createSpy('resultHandler');
        const message = {
            order: {},
            contact: {}
        };

        sqsRequestStub.promise.rejects();

        sapOrderQueueService.sendMessage(message)
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });
    });

    it('Resolves to the sent message', () => {
          const message = {
              order: {},
              contact: {}
          };

        sqsRequestStub.promise.resolves( {} );

        sapOrderQueueService.sendMessage(message).then(result => expect(result).toEqual(message));
    });

});
