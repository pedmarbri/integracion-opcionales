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

    beforeEach(() => {
        sampleCreditMemo = require('./sample-creditmemo');

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
});