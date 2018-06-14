'use strict';

const sinon = require('sinon');

/**
 * @var {Proxyquire}
 */
const proxyquire = require('proxyquire');

process.env.ORDER_TABLE = 'DevOrderTable';

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
            promise: () => Promise.resolve({})
        };

        dynamoDbStub = {
            update: () => dynamoDbRequestStub
        };

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
        expect(OrderTableService.saveResult(sampleResult)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveResult', () => {
        dynamoDbRequestStub.promise = () => Promise.reject(new Error('Fake'));

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });

    it('Resolves to original result on saveResult', () => {
        OrderTableService.saveResult(sampleResult)
            .then(result => expect(result).toEqual(sampleResult));
    });

    xit('Saves the error in history', () => {
        /**
         * @var {Sinon.SinonMock} tableMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        const expectedUpdateArgs = {
            TableName: 'DevOrderTable',
            Key: {
                order_id: '1234'
            },
            UpdateExpression: 'set ' + [
                '#i.crm.last_result = :last_result',
                '#i.crm.last_timestamp = :now',
                '#i.crm.#e = list_append(#i.crm.#e, :errors)'
            ].join(', '),
            ExpressionAttributeNames: {
                '#i': 'integrations',
                '#e': 'error_history'
            },
            ExpressionAttributeValues: {
                ':last_result': 'error',
                ':now': sinon.match.string,
                ':errors': [
                    {
                        integration_timestamp: sinon.match.string,
                        error_message: 'This is an error'
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        sampleResult.error = new Error("This is an error");
        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(() => updateExpectation.verify());
    });

});
