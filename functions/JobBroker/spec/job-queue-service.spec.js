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

        sqsStub = {
            receiveMessage: sinon.stub(),
            deleteMessage: sinon.stub()
        };

        sqsStub.receiveMessage.returns(sqsRequestStub);
        sqsStub.deleteMessage.returns(sqsRequestStub);

        AWSStub = { SQS: sinon.stub().returns(sqsStub) };

        stubConfig = { 'aws-sdk': AWSStub };
        jobQueueService = proxyquire('../job-queue-service', stubConfig);
    });

    it('Returns a promise on receiveMessage', () => {
        sqsRequestStub.promise.resolves([]);
        expect(jobQueueService.receiveMessages()).toEqual(jasmine.any(Promise));
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

    it('Handles rejection on receiveMessage', () => {
        let messagesHandler = jasmine.createSpy('messagesHandler');

        sqsRequestStub.promise.rejects();

        jobQueueService.receiveMessages()
            .then(messagesHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(messagesHandler).not.toHaveBeenCalled();
            });
    });

    it('Returns a promise on deleteMessage', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        sqsRequestStub.promise.resolves({});
        expect(jobQueueService.deleteMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on deleteMessage', () => {
        const message = {
            Body: JSON.stringify({foo: 'bar'}),
            MessageId: '12345',
            ReceiptHandler: '12345'
        };

        let messagesHandler = jasmine.createSpy('messagesHandler');

        sqsRequestStub.promise.rejects();

        jobQueueService.deleteMessage(message)
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
        jobQueueService.deleteMessage(message).then(result => expect(result).toEqual(message));
    });
});