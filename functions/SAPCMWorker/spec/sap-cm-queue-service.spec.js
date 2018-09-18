'use strict';

/**
 * @var {SinonStatic}
 */
const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('Sap Credit Memo Queue service', () => {
    let sqsRequestStub;
    let sapCMQueueService;
    let stubConfig;
    let AWSStub;
    let sqsStub;

    beforeEach(() => {
        sqsRequestStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            promise: sinon.stub()
        };

        sqsStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            deleteMessage: sinon.stub()
        };

        sqsStub.deleteMessage.returns(sqsRequestStub);

        AWSStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            SQS: sinon.stub()
        };

        AWSStub.SQS.returns(sqsStub);

        stubConfig = { 'aws-sdk': AWSStub };
        sapCMQueueService = proxyquire('../sap-cm-queue-service', stubConfig);
    });

    it('Returns a promise on deleteMessage', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        sqsRequestStub.promise.resolves({});
        expect(sapCMQueueService.deleteMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on deleteMessage', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        let messagesHandler = jasmine.createSpy('messagesHandler');

        sqsRequestStub.promise.rejects();

        sapCMQueueService.deleteMessage(message)
            .then(messagesHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(messagesHandler).not.toHaveBeenCalled();
            });
    });

    it('Returns the deleted message', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        sqsRequestStub.promise.resolves({});
        sapCMQueueService.deleteMessage(message).then(result => expect(result).toEqual(message));
    });
});