'use strict';

const sinon = require( 'sinon' );

/**
 * @var {Proxyquire|Function}
 */
const proxyquire = require( 'proxyquire' );

proxyquire.noCallThru();

/**
 * Suppress console output
 */
console.log = console.error = console.info = () => {};

process.env.ORDER_TABLE = 'DevOrderTable';

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
        sampleOrder = require('./sample-order');
        sampleResponse = require('./sample-response');

        sampleResult = {
            order: sampleOrder,
            result: sampleResponse
        };

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
                DocumentClient: sinon.stub(),
            }
        };

        AWSStub.DynamoDB.DocumentClient.returns(dynamoDbStub);

        stubConfig = { 'aws-sdk': AWSStub };
        OrderTableService = proxyquire('../order-table-service', stubConfig);
    });

    it('Returns a promise on saveResult', () => {
        expect(OrderTableService.saveResult(sampleResult)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveResult', () => {
        let resultHandler = jasmine.createSpy('resultHandler');
        dynamoDbRequestStub.promise = () => Promise.reject(new Error('Fake'));

        OrderTableService.saveResult(sampleResult)
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });
    });

    it('Resolves to the order on saveResult', () => {
        OrderTableService.saveResult(sampleResult)
            .then(result => expect(result).toEqual(sampleResult.order));
    });

    it('Returns a promise on saveError', () => {
        expect(OrderTableService.saveError(sampleResult)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveError', () => {
        dynamoDbRequestStub.promise = () => Promise.reject(new Error('Fake'));

        OrderTableService.saveError(sampleResult)
            .then(fail)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
            });
    });

    it('Resolves to the order on saveError', () => {
        OrderTableService.saveError(sampleResult)
            .then(result => expect(result).toEqual(sampleResult.order));
    });

    it('Saves single error in error list', () => {
        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        const errorMessage = 'There is an error';
        sampleResponse.T_RETURN.item[0].MESSAGE = errorMessage;

        const expectedUpdateArgs = {
            TableName: 'DevOrderTable',
            Key: {
                order_id: '12700000000065'
            },
            UpdateExpression: 'set ' + [
                '#i.sap.last_result = :last_result',
                '#i.sap.last_timestamp = :now',
                '#i.sap.#e = list_append(#i.sap.#e, :errors)'
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
                        error_message: errorMessage
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveError(sampleResult)
            .then(() => {
                updateExpectation.verify();
            })
            .catch(fail);
    });

    xit('Saves multiple errors in error list', () => {
        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        const errorMessage = 'There is an error';
        const newError = Object.assign({}, sampleResponse.T_RETURN.item[0]);
        sampleResponse.T_RETURN.item[0].MESSAGE = errorMessage + 1;
        newError.MESSAGE = errorMessage + 2;
        sampleResponse.T_RETURN.item[1] = newError;

        const expectedUpdateArgs = {
            TableName: 'DevOrderTable',
            Key: {
                order_id: '12700000000065'
            },
            UpdateExpression: 'set ' + [
                '#i.sap.last_result = :last_result',
                '#i.sap.last_timestamp = :now',
                '#i.sap.#e = list_append(#i.sap.#e, :errors)'
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
                        error_message: errorMessage + 1
                    },
                    {
                        integration_timestamp: sinon.match.string,
                        error_message: errorMessage + 2
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveError(sampleResult)
            .then(() => {
                updateExpectation.verify();
            })
            .catch(fail);
    });

    xit('Filters out unwanted errors', () => {

    });

    xit('Row error message contains row numer', () => {

    });

    xit('Header error message does not contain row number', () => {

    });
});