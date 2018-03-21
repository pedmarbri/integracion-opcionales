'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('Job Queue Service', () => {

    let jobQueueService;
    let sqsStub;
    let sqsRequestStub;
    let AWSStub;
    let stubConfig;

    beforeEach(() => {
        sqsRequestStub = { promise: sinon.stub() };
        sqsStub = { receiveMessage: sinon.stub() };

        sqsStub.receiveMessage.returns(sqsRequestStub);

        AWSStub = { SQS: sinon.stub().returns(sqsStub) };

        stubConfig = { 'aws-sdk': AWSStub };
        jobQueueService = proxyquire('../job-queue-service', stubConfig);
    });

    it('Returns a promise on receiveMessage', () => {
        let messagesPromise;

        sqsRequestStub.promise.resolves([]);
        messagesPromise = jobQueueService.receiveMessages();

        expect(messagesPromise).toEqual(jasmine.any(Promise));
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

        jobQueueService.receiveMessages().then(messages => expect(messages[0].json).toEqual( { foo: 'bar' } ));
    });

    it('Handles rejection', () => {
        sqsRequestStub.promise.rejects();

        let messagesHandler = jasmine.createSpy('messagesHandler');

        jobQueueService.receiveMessages()
            .then(messagesHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(messagesHandler).not.toHaveBeenCalled();
            });
    });
});