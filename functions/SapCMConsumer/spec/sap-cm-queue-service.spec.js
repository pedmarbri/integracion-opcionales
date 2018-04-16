'use strict';

const sinon = require( 'sinon' );

/**
 * @type {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();

describe('Sap Credit Memo Queue Service', () => {

    let sapCMQueueService;
    let sqsStub;
    let sqsRequestStub;
    let AWSStub;
    let stubConfig;

    beforeEach(() => {
        sqsRequestStub = {
            /**
             * @var {SinonStub}
             */
            promise: sinon.stub()
        };

        sqsStub = {
            /**
             * @var {SinonStub}
             */
            receiveMessage: sinon.stub()
        };

        sqsStub.receiveMessage.returns(sqsRequestStub);

        AWSStub = {
            /**
             * @var {SinonStub}
             */
            SQS: sinon.stub()
        };

        AWSStub.SQS.returns(sqsStub);

        stubConfig = { 'aws-sdk': AWSStub };
        sapCMQueueService = proxyquire('../sap-cm-queue-service', stubConfig);
    });

    it('Returns a promise on receiveMessage', () => {
        sqsRequestStub.promise.resolves([]);
        expect(sapCMQueueService.receiveMessages()).toEqual(jasmine.any(Promise));
    });

    it('Contains json messages', () => {
        let sqsMessage = {
            Body: '{"foo":"bar"}',
            ReceiptHandler: '1234'
        };

        let sqsResult = {
            MessageId: '123',
            Messages: [ sqsMessage ]
        };

        sqsRequestStub.promise.resolves(sqsResult);

        sapCMQueueService.receiveMessages().then(messages => expect(messages[0].json).toEqual( { foo: 'bar' } ));
    });

    it('Handles rejection on receiveMessage', () => {
        let messagesHandler = jasmine.createSpy('messagesHandler');

        sqsRequestStub.promise.rejects();

        sapCMQueueService.receiveMessages()
            .then(messagesHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(messagesHandler).not.toHaveBeenCalled();
            });
    });
});