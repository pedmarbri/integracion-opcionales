'use strict';

const sinon = require( 'sinon' );

/**
 * @var {Proxyquire|Function}
 */
const proxyquire = require( 'proxyquire' );

proxyquire.noCallThru();

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
            result: sampleResponse,
            rows: {
                'OPC11086300001': 10
            }
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

    afterEach(() => {
        delete require.cache[require.resolve('./sample-order')];
        delete require.cache[require.resolve('./sample-request')];
        delete require.cache[require.resolve('./sample-response')];
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

    it('Rejects the promise after saving an error', () => {
        sampleResponse.VBELN = null;

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(result => expect(result).toEqual(jasmine.any(Error)));
    });

    it('Resolves to the order on saveResult', () => {
        sampleResponse.VBELN = null;

        OrderTableService.saveResult(sampleResult)
            .then(result => expect(result).toEqual(sampleResult.order));
    });

    it('Saves successful result to table', () => {
        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        sampleResponse.T_RETURN.item = [sampleResponse.T_RETURN.item[0]];

        const expectedUpdateArgs = {
            TableName: 'DevOrderTable',
            Key: {
                order_id: '12700000000065'
            },
            UpdateExpression: 'set ' + [
                '#i.sap.last_result = :lr',
                '#i.sap.last_timestamp = :now',
                'sap_id = :si',
                'sap_rows = :sr'
            ].join(', '),
            ExpressionAttributeNames: {
                '#i': 'integrations'
            },
            ExpressionAttributeValues: {
                ':lr': 'ok',
                ':si': '1234567890',
                ':now': sinon.match.string,
                ':sr': {
                    'OPC11086300001': 10
                }
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveResult(sampleResult)
            .then(() => {
                updateExpectation.verify();
            })
            .catch(fail);
    });

    it('Saves single error in error list', () => {
        sampleResponse.VBELN = null;

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        sampleResponse.T_RETURN.item = [sampleResponse.T_RETURN.item[0]];

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
                        error_message: sinon.match.string
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(() => {
                updateExpectation.verify();
            });
    });

    it('Saves multiple errors in error list', () => {
        sampleResponse.VBELN = null;

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
                        error_message: sinon.match.string
                    },
                    {
                        integration_timestamp: sinon.match.string,
                        error_message: sinon.match.string
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(() => {
                updateExpectation.verify();
            });
    });

    it('Filters out unwanted errors', () => {
        sampleResponse.VBELN = null;

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        const errorMessage = 'There is an error';
        const newError = Object.assign({}, sampleResponse.T_RETURN.item[0]);
        const successMessage = Object.assign({}, sampleResponse.T_RETURN.item[0]);
        sampleResponse.T_RETURN.item[0].MESSAGE = errorMessage + 1;
        newError.MESSAGE = errorMessage + 2;
        successMessage.TYPE = 'S';
        sampleResponse.T_RETURN.item.push(newError);
        sampleResponse.T_RETURN.item.push(successMessage);

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
                        error_message: sinon.match.string
                    },
                    {
                        integration_timestamp: sinon.match.string,
                        error_message: sinon.match.string
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(() => {
                updateExpectation.verify();
            });
    });

    it('Row error message contains row numer', () => {
        sampleResponse.VBELN = null;

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);
        sampleResponse.T_RETURN.item = [
            {
                "TYPE": "E",
                "ID": "V1",
                "NUMBER": "382",
                "MESSAGE": "An error",
                "LOG_NO": null,
                "LOG_MSG_NO": "000000",
                "MESSAGE_V1": "OPC110XXXX83000010",
                "MESSAGE_V2": "0002",
                "MESSAGE_V3": "02",
                "MESSAGE_V4": "ES",
                "PARAMETER": "SALES_ITEM_IN",
                "ROW": 1,
                "FIELD": null,
                "SYSTEM": "ALE_ADM"
            }
        ];

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
                        error_message: "[V1-382] (SALES_ITEM_IN 1) An error"
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(() => {
                updateExpectation.verify();
            });
    });

    it('Header error message does not contain row number', () => {
        sampleResponse.VBELN = null;

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const tableMock = sinon.mock(dynamoDbStub);

        const errorMessage = 'There is an error';
        sampleResponse.T_RETURN.item = [sampleResponse.T_RETURN.item[0]];
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
                        error_message: "[V1-515] (SALES_HEADER_IN) " + errorMessage
                    }
                ]
            }
        };

        const updateExpectation = tableMock.expects('update')
            .once()
            .withArgs(expectedUpdateArgs)
            .returns(dynamoDbRequestStub);

        OrderTableService.saveResult(sampleResult)
            .then(fail)
            .catch(() => {
                updateExpectation.verify();
            });
    });
});