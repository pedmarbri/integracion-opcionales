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
    let sampleResult;

    beforeEach(() => {

        sampleResult = {
            order: {
                order_id: '1234'
            },
            contact: {
                CRMID: '1234'
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
                DocumentClient: sinon.stub()
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

    it('Saves the error in history', () => {
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
                '#i.crm.#e = list_append(#i.crm.#e, :error)'
            ].join(', '),
            ExpressionAttributeNames: {
                '#i': 'integrations',
                '#e': 'error_history'
            },
            ExpressionAttributeValues: {
                ':last_result': 'error',
                ':now': sinon.match.string,
                ':error': [
                    {
                        integration_timestamp: sinon.match.string,
                        error_message: 'Error: This is an error'
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

    it('Saves Address ID when available', () => {
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
          'integrations.crm.last_result = :res',
          'integrations.crm.last_timestamp = :now',
          'crm_contact_id = if_not_exists(crm_contact_id, :ccid)',
          'crm_address_id = if_not_exists(crm_address_id, :caid)'
        ].join(', '),
        ExpressionAttributeValues: {
          ':res': 'ok',
          ':now': sinon.match.string,
          ':ccid': sinon.match.string,
          ':caid': '333555777'
        }
      };

      const updateExpectation = tableMock.expects('update')
        .once()
        .withArgs(expectedUpdateArgs)
        .returns(dynamoDbRequestStub);

      sampleResult.contact.AddressId = '333555777';

      OrderTableService.saveResult(sampleResult)
        .then(() => updateExpectation.verify())
        .catch(fail);
    });

});
