'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe('Sap CM Worker', () => {
    let SapCMWorker = {};
    let SapServiceStub = {};
    let SapCMQueueServiceStub = {};
    let OrderTableServiceStub = {};
    let sampleCreditMemo;
    let sampleOrder;

    beforeEach(() => {
        sampleCreditMemo = require('./sample-creditmemo');
        sampleOrder = require('./sample-order');

        OrderTableServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            fetchOrderInfo: sinon.stub()
        };

        SapServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            sendCreditMemo: sinon.stub()
        };

        SapCMQueueServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            deleteMessage: sinon.stub()
        };

        SapCMWorker = proxyquire('../index', {
            './sap-service': SapServiceStub,
            './sap-cm-queue-service': SapCMQueueServiceStub,
            './order-table-service': OrderTableServiceStub
        });
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-creditmemo')];
        delete require.cache[require.resolve('./sample-order')];
    });

    it('Fails if body is not JSON', done => {
        return LambdaTester(SapCMWorker.handler)
            .timeout(60)
            .event({
                Body: 'Not a json'
            })
            .expectError()
            .verify(done);
    });

    it('Fails when OrderTable rejects', done => {
        OrderTableServiceStub.fetchOrderInfo.rejects(new Error('Order not found'));

        spyOn(OrderTableServiceStub, 'fetchOrderInfo').and.callThrough();
        spyOn(SapServiceStub, 'sendCreditMemo').and.callThrough();
        spyOn(SapCMQueueServiceStub, 'deleteMessage').and.callThrough();

        return LambdaTester(SapCMWorker.handler)
            .timeout(60)
            .event({
                Body: JSON.stringify(sampleCreditMemo)
            })
            .expectError(() => {
                expect(OrderTableServiceStub.fetchOrderInfo).toHaveBeenCalled();
                expect(SapServiceStub.sendCreditMemo).not.toHaveBeenCalled();
                expect(SapCMQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Sends the original event to deleteMessage', done => {
        const sampleEvent = {
            Body: JSON.stringify(sampleCreditMemo),
            ReceiptHandle: 'this-is-a-receipt-handle'
        };

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        let SapCMQueueServiceMock;
        let deleteMessageExpectation;

        SapCMQueueServiceStub.deleteMessage = () => {};
        SapCMQueueServiceMock = sinon.mock(SapCMQueueServiceStub);

        deleteMessageExpectation = SapCMQueueServiceMock.expects('deleteMessage')
            .once()
            .withArgs(sampleEvent)
            .resolves(sampleEvent);

        OrderTableServiceStub.fetchOrderInfo.resolves(sampleOrder);
        SapServiceStub.sendCreditMemo.resolves({});

        spyOn(OrderTableServiceStub, 'fetchOrderInfo').and.callThrough();
        spyOn(SapServiceStub, 'sendCreditMemo').and.callThrough();

        return LambdaTester(SapCMWorker.handler)
            .timeout(60)
            .event(sampleEvent)
            .expectResult(() => {
                expect(OrderTableServiceStub.fetchOrderInfo).toHaveBeenCalled();
                expect(SapServiceStub.sendCreditMemo).toHaveBeenCalled();
                deleteMessageExpectation.verify();
            })
            .verify(done);
    });

});