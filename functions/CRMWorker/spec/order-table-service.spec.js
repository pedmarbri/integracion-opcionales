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
    let sampleResult = {
        order: {
            order_id: '1234'
        },
        contact: {
            CRMID: '1234'
        }
    };

    beforeEach(() => {
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
        };

        dynamoDbStub.update.returns(dynamoDbRequestStub);

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
    });

    it('Returns a promise on saveResult', () => {
        dynamoDbRequestStub.promise.resolves({});
        expect(OrderTableService.saveResult(sampleResult)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveResult', () => {
        dynamoDbRequestStub.promise.rejects();

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });

    it('Resolves to original result on saveResult', () => {
        dynamoDbRequestStub.promise.resolves({});
        OrderTableService.saveResult(sampleResult)
            .then(result => expect(result).toEqual(sampleResult));
    });

});
