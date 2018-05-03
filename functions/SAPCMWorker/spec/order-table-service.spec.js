'use strict';

const sinon = require('sinon');

/**
 * @var {Proxyquire}
 */
const proxyquire = require('proxyquire');
proxyquire.noCallThru();

describe('Order Table Service', () => {
    let OrderTableService;
    let stubConfig;
    let AWSStub;
    let dynamoDbRequestStub;
    let dynamoDbStub;
    let sampleCreditMemo;
    let sampleResponse;
    let sampleResult;
    let sampleOrder;

    beforeEach(() => {
        sampleCreditMemo = require('./sample-creditmemo');
        sampleResponse = require('./sample-response');
        sampleOrder = require('./sample-order');

        sampleResult = {
            order: sampleCreditMemo,
            result: sampleResponse
        };

        dynamoDbRequestStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            promise: sinon.stub()
        };

        dynamoDbStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            update: sinon.stub(),

            /**
             * @var {Sinon.SinonStub}
             */
            get: sinon.stub()
        };

        dynamoDbStub.update.returns(dynamoDbRequestStub);
        dynamoDbStub.get.returns(dynamoDbRequestStub);

        AWSStub = {
            DynamoDB: {
                /**
                 * @var {Sinon.SinonStub}
                 */
                DocumentClient: sinon.stub()
            }
        };

        AWSStub.DynamoDB.DocumentClient.returns(dynamoDbStub);

        stubConfig = { 'aws-sdk': AWSStub };
        OrderTableService = proxyquire('../order-table-service', stubConfig);
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-creditmemo')];
        delete require.cache[require.resolve('./sample-response')];
        delete require.cache[require.resolve('./sample-order')];
    });

    it('Returns a promise on saveResult', () => {
        const result = {
            order: sampleCreditMemo,
            result: sampleResponse
        };

        dynamoDbRequestStub.promise.resolves({});

        expect(OrderTableService.saveResult(result)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveResult', () => {
        const result = {
            order: sampleCreditMemo,
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

    it('Returns a promise on fetchOrderInfo', () => {
        dynamoDbRequestStub.promise.resolves({});
        expect(OrderTableService.fetchOrderInfo(sampleCreditMemo)).toEqual(jasmine.any(Promise));
    });

    it('Rejects if order is not found', () => {
        dynamoDbRequestStub.promise.resolves({});

        OrderTableService.fetchOrderInfo(sampleCreditMemo)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });

    it('Rejects if order is missing SAP ID', () => {
        dynamoDbRequestStub.promise.resolves({ Item: sampleOrder });

        OrderTableService.fetchOrderInfo(sampleCreditMemo)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });

    it('Rejects if a row is not mapped', () => {
        sampleOrder.sap_id = '1234567';
        dynamoDbRequestStub.promise.resolves({ Item: sampleOrder });

        OrderTableService.fetchOrderInfo(sampleCreditMemo)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });
});
