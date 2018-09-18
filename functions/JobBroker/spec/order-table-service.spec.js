'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('Order Table', () => {
    let OrderTableService;
    let stubConfig;
    let AWSStub;
    let dynamoDbRequestStub;
    let dynamoDbStub;

    beforeEach(() => {
        dynamoDbRequestStub = { promise: sinon.stub() };
        dynamoDbStub = { put: sinon.stub() };

        dynamoDbStub.put.returns(dynamoDbRequestStub);

        AWSStub = {
            DynamoDB: {
                DocumentClient: sinon.stub().returns(dynamoDbStub),
            }
        };

        stubConfig = { 'aws-sdk': AWSStub };
        OrderTableService = proxyquire('../order-table-service', stubConfig);
    });

    it('Returns a promise on saveMessage', () => {
        const message = {
            MessageId: '1234',
            Body: '{"payload":{"order_id":"1234567890"}}',
            json: {
                payload: {
                    order_id: '1234567890'
                }
            }
        };

        dynamoDbRequestStub.promise.resolves({});

        expect(OrderTableService.saveMessage(message)).toEqual(jasmine.any(Promise));
    });

    it('Handles rejection on saveMessage', () => {
        const message = {
            MessageId: '1234',
            Body: '{"payload":{"order_id":"1234567890"}}',
            json: {
                payload: {
                    order_id: '1234567890'
                }
            }
        };

        let resultHandler = jasmine.createSpy('resultHandler');
        dynamoDbRequestStub.promise.rejects();

        OrderTableService.saveMessage(message)
            .then(resultHandler)
            .catch(err => {
                expect(err).toEqual(jasmine.any(Error));
                expect(resultHandler).not.toHaveBeenCalled();
            });
    });

    it('Resolves to the original message on saveMessage', () => {
        const message = {
            MessageId: '1234',
            Body: '{"payload":{"order_id":"1234567890"}}',
            json: {
                payload: {
                    order_id: '1234567890'
                }
            }
        };

        dynamoDbRequestStub.promise.resolves({});
        OrderTableService.saveMessage(message).then(result => expect(result).toEqual(message));
    });
});