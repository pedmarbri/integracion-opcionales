'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('Order Table', () => {
    let OrderTableService;
    let stubConfig;
    let AWSStub;
    let dynamoDbRequestStub;
    let dynamoDbStub;
    let sampleOrder;
    let sampleResponse;
    let sampleResult;

    beforeEach(() => {
        sampleOrder = require('./sample-creditmemo');
        sampleResponse = require('./sample-response');

        sampleResult = {
            order: sampleOrder,
            result: sampleResponse
        };

        dynamoDbRequestStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            promise: sinon.stub()
        };

        dynamoDbStub = {
            update: sinon.stub()
        };

        dynamoDbStub.update.returns(dynamoDbRequestStub);

        AWSStub = {
            DynamoDB: {
                DocumentClient: sinon.stub().returns(dynamoDbStub),
            }
        };

        stubConfig = { 'aws-sdk': AWSStub };
        OrderTableService = proxyquire('../order-table-service', stubConfig);
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-creditmemo')];
        delete require.cache[require.resolve('./sample-response')];
    });

    it('Returns a promise on saveResult', () => {
        const result = {
            order: sampleOrder,
            result: sampleResponse
        };

        dynamoDbRequestStub.promise.resolves({});

        expect(OrderTableService.saveResult(result)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveResult', () => {
        const result = {
            order: sampleOrder,
            result: sampleResponse
        };

        let resultHandler = jasmine.createSpy('resultHandler');
        dynamoDbRequestStub.promise.rejects();

        OrderTableService.saveResult(result)
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });
    });

    it('Resolves to the order on saveResult', () => {
        dynamoDbRequestStub.promise.resolves({});
        OrderTableService.saveResult(sampleResult)
            .then(result => expect(result).toEqual(sampleResult.order));
    });
});