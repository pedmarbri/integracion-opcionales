'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('SAP CM Queue', () => {
    let sqsRequestStub;
    let sqsStub;
    let AWSStub;
    let stubConfig;
    let sapCMQueueService;

    beforeEach(() => {
        sqsRequestStub = { promise: sinon.stub() };
        sqsStub = { sendMessage: sinon.stub() };

        sqsStub.sendMessage.returns(sqsRequestStub);

        AWSStub = { SQS: sinon.stub().returns(sqsStub) };

        stubConfig = { 'aws-sdk': AWSStub };
        sapCMQueueService = proxyquire('../sap-cm-queue-service', stubConfig);
    });

    it('Returns a promise on sendMessage', () => {
        const message = {
            MessageId: '1234',
            Body: '{"payload":{"foo":"bar"}}',
            json: { payload: { foo: 'bar' } }
        };

        sqsRequestStub.promise.resolves( {} );

        expect(sapCMQueueService.sendMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection', () => {
        let resultHandler = jasmine.createSpy('resultHandler');
        const message = {
            MessageId: '1234',
            Body: '{"payload":{"foo":"bar"}}',
            json: { payload: { foo: 'bar' } }
        };

        sqsRequestStub.promise.rejects();

        sapCMQueueService.sendMessage(message)
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });
    });

    it('Resolves to the sent message', () => {
        const message = {
            MessageId: '1234',
            Body: '{"payload":{"foo":"bar"}}',
            json: { payload: { foo: 'bar' } }
        };

        sqsRequestStub.promise.resolves( {} );

        sapCMQueueService.sendMessage(message).then(result => expect(result).toEqual(message));
    });

});
