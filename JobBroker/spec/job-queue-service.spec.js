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
        sqsStub = {
            receiveMessage: sinon.stub()
        };

        sqsRequestStub = {
            promise: () => Promise.resolve([])
        };

        sqsStub.receiveMessage.returns(sqsRequestStub);

        AWSStub = {
            SQS: sinon.stub().returns(sqsStub)
        };

        stubConfig = {
            'aws-sdk': AWSStub
        };

        jobQueueService = proxyquire('../job-queue-service', stubConfig);
    });

    it('Returns a promise on receiveMessage', () => {
        const messagesPromise = jobQueueService.receiveMessages();
        expect(messagesPromise).toEqual(jasmine.any(Promise));
    });

    xit('Contains json messages', () => {

    });
});