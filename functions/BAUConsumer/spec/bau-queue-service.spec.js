'use strict';

const sinon = require( 'sinon' );

/**
 * @type {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();

describe('BAU Queue Service', () => {

    let bauQueueService;
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
        bauQueueService = proxyquire('../bau-queue-service', stubConfig);
    });

    it('Returns a promise on receiveMessage', () => {
        sqsRequestStub.promise.resolves([]);
        expect(bauQueueService.receiveMessages()).toEqual(jasmine.any(Promise));
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

        bauQueueService.receiveMessages().then(messages => expect(messages[0].json).toEqual( { foo: 'bar' } ));
    });

    it('Handles rejection on receiveMessage', () => {
        let messagesHandler = jasmine.createSpy('messagesHandler');

        sqsRequestStub.promise.rejects();

        bauQueueService.receiveMessages()
            .then(messagesHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(messagesHandler).not.toHaveBeenCalled();
            });
    });
});