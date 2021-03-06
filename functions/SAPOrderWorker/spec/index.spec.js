'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe('Sap Order Worker Handler', () => {
    let SapOrderWorker = {};
    let SapServiceStub = {};
    let SapOrderQueueServiceStub = {};
    let OrderTableStub = {};
    let sampleMessage = {};
    let sampleResult = {};
    let sampleOrder = {};
    let sampleResponse = {};
    let BauQueueServiceStub = {};

    beforeEach(() => {
        sampleOrder = require('./sample-order');
        sampleResponse = require('./sample-response');

        sampleResult = {
            order: sampleOrder,
            result: sampleResponse
        };

        SapServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            sendOrder: sinon.stub()
        };

        OrderTableStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            saveResult: sinon.stub()
        };

        SapOrderQueueServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            deleteMessage: sinon.stub()
        };

        BauQueueServiceStub = {
          /**
           * @var {Sinon.SinonStub}
           */
          sendMessage: sinon.stub()
        };

        sampleMessage = {
            Body: '{"foo":"bar"}'
        };

        SapOrderWorker = proxyquire('../index', {
            './sap-service': SapServiceStub,
            './sap-order-queue-service': SapOrderQueueServiceStub,
            './order-table-service': OrderTableStub,
            './bau-queue-service': BauQueueServiceStub
        });
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-order')];
        delete require.cache[require.resolve('./sample-response')];
    });

    it('Does not delete message from queue if Sap returned an error', done => {
        SapServiceStub.sendOrder.resolves(sampleResult);
        OrderTableStub.saveResult.rejects(new Error('Saved an error'));
        SapOrderQueueServiceStub.deleteMessage.resolves(sampleMessage);

        spyOn(SapServiceStub, 'sendOrder').and.callThrough();
        spyOn(OrderTableStub, 'saveResult').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'deleteMessage').and.callThrough();

        return LambdaTester(SapOrderWorker.handler)
            .event(sampleMessage)
            .timeout(60)
            .expectError(() => {
                expect(SapServiceStub.sendOrder).toHaveBeenCalled();
                expect(OrderTableStub.saveResult).toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Returns success if everything goes well', done => {
        SapServiceStub.sendOrder.resolves(sampleResult);
        OrderTableStub.saveResult.resolves(sampleOrder);
        SapOrderQueueServiceStub.deleteMessage.resolves(sampleMessage);

        spyOn(SapServiceStub, 'sendOrder').and.callThrough();
        spyOn(OrderTableStub, 'saveResult').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'deleteMessage').and.callThrough();

        return LambdaTester(SapOrderWorker.handler)
            .event(sampleMessage)
            .timeout(60)
            .expectResult(() => {
                expect(SapServiceStub.sendOrder).toHaveBeenCalled();
                expect(OrderTableStub.saveResult).toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.deleteMessage).toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Saves result when SAP request fails', done => {
        SapServiceStub.sendOrder.rejects(new Error('ESOCKETTIMEDOUT'));
        OrderTableStub.saveResult.rejects(new Error('Saved an error'));

        spyOn(SapServiceStub, 'sendOrder').and.callThrough();
        spyOn(OrderTableStub, 'saveResult').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'deleteMessage').and.callThrough();

        return LambdaTester(SapOrderWorker.handler)
            .event(sampleMessage)
            .timeout(60)
            .expectError(() => {
                expect(SapServiceStub.sendOrder).toHaveBeenCalled();
                expect(OrderTableStub.saveResult).toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Sends Message to Bau Queue', done => {
        SapServiceStub.sendOrder.resolves(sampleResult);
        OrderTableStub.saveResult.resolves(sampleOrder);
        SapOrderQueueServiceStub.deleteMessage.resolves(sampleMessage);

        spyOn(SapServiceStub, 'sendOrder').and.callThrough();
        spyOn(OrderTableStub, 'saveResult').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(BauQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(SapOrderWorker.handler)
            .timeout(60)
            .event(sampleMessage)
            .expectResult(() => {
                expect(SapServiceStub.sendOrder).toHaveBeenCalled();
                expect(OrderTableStub.saveResult).toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.deleteMessage).toHaveBeenCalled();
                expect(BauQueueServiceStub.sendMessage).toHaveBeenCalled();
            })
            .verify(done);
    });
});