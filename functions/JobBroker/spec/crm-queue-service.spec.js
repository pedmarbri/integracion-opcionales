'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('SAP Order Queue', () => {
    let CrmQueueService;
    let AWSStub;
    let sqsStub;
    let sqsRequestStub;
    let stubConfig;

    beforeEach(() => {
        sqsRequestStub = { promise: sinon.stub() };
        sqsStub = { sendMessage: sinon.stub() };

        sqsStub.sendMessage.returns(sqsRequestStub);
        AWSStub = { SQS: sinon.stub().returns(sqsStub) };

        stubConfig = { 'aws-sdk': AWSStub };
        CrmQueueService = proxyquire('../crm-queue-service', stubConfig);
    });

    it('Returns a promise on sendMessage', () => {
        const message = {
            MessageId: '1234',
            Body: '{"foo":"bar"}',
            json: { payload: { foo: 'bar' } }
        };

        sqsRequestStub.promise.resolves( {} );
        expect(CrmQueueService.sendMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection', () => {
        let resultHandler = jasmine.createSpy('resultHandler', () => Promise.reject(new Error('Should not be called')))
            .and.callThrough();

        const message = {
            MessageId: '1234',
            Body: '{"foo":"bar"}',
            json: { payload: { foo: 'bar' } }
        };

        sqsRequestStub.promise.rejects(new Error());

        CrmQueueService.sendMessage(message)
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });

    });

    it('Resolves to the sent message', () => {
        const message = {
            MessageId: '1234',
            Body: '{"foo":"bar"}',
            json: { payload: { foo: 'bar' } }
        };

        sqsRequestStub.promise.resolves({});


        CrmQueueService.sendMessage(message).then(result => expect(result).toEqual(message));
    });
});
