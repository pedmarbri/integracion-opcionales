'use strict';

/**
 * @var {SinonStatic}
 */
const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('CRM Queue service', () => {
    let sqsRequestStub;
    let CRMQueueService;
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
        CRMQueueService = proxyquire('../crm-queue-service', stubConfig);
    });

    it('Returns a promise on deleteMessage', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        sqsRequestStub.promise.resolves({});
        expect(CRMQueueService.deleteMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on deleteMessage', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        sqsRequestStub.promise.rejects();

        CRMQueueService.deleteMessage(message)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });

    it('Returns the deleted message', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        sqsRequestStub.promise.resolves({});
        CRMQueueService.deleteMessage(message).then(result => expect(result).toEqual(message));
    });
});