'use strict';

const LambdaTester = require('lambda-tester');
const proxyquire = require( 'proxyquire' ).noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe("Job Broker handler", () => {

    let AWSStub = {};
    let sqsStub = {};
    let JobBroker = {};
    let dynamoDBStub = {};

    beforeEach(() => {
        sqsStub = {
            receiveMessage: sinon.stub(),
            sendMessage: sinon.stub(),
            deleteMessage: sinon.stub()
        };

        AWSStub = {
            SQS: sinon.stub().returns(sqsStub),
            DynamoDB: sinon.stub().returns(dynamoDBStub)
        };

        JobBroker = proxyquire('../index', {
            'aws-sdk': AWSStub
        });
    });

    it("is successful with no queued messages", (done) => {
        sqsStub.receiveMessage.yieldsAsync(null, []);

        return LambdaTester(JobBroker.handler)
            .expectResult()
            .verify(done);
    });
});