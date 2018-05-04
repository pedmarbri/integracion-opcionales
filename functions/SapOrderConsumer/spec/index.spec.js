'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe("Sap Order Consumer", () => {
    let SapOrderConsumer = {};
    let SapOrderQueueServiceStub = {};
    let SapOrderWorkerServiceStub = {};

    const setupSpies = () => {
        spyOn(SapOrderQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(SapOrderWorkerServiceStub, 'process').and.callThrough();
    };

    beforeEach(() => {
        SapOrderQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            receiveMessages: sinon.stub()
        };

        SapOrderWorkerServiceStub = {
            /**
             * @var {SinonStub}
             */
            process: sinon.stub()
        };

        SapOrderConsumer = proxyquire('../index', {
            './sap-order-queue-service': SapOrderQueueServiceStub,
            './sap-order-worker-service': SapOrderWorkerServiceStub
        });
    });



    it('Is succesful with no queued messages', done => {
        SapOrderQueueServiceStub.receiveMessages.resolves([]);

        setupSpies();

        return LambdaTester(SapOrderConsumer.handler)
            .timeout(60)
            .expectResult(() => {
                expect(SapOrderQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(SapOrderWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when Job queue cannot be accessed', done => {
        SapOrderQueueServiceStub.receiveMessages.rejects();

        setupSpies();

        return LambdaTester(SapOrderConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(SapOrderQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(SapOrderWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot call worker', done => {
        SapOrderQueueServiceStub.receiveMessages.resolves([{foo: 'bar'}]);
        SapOrderWorkerServiceStub.process.rejects(new Error('Dummy Error'));

        setupSpies();

        return LambdaTester(SapOrderConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(SapOrderQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(SapOrderWorkerServiceStub.process).toHaveBeenCalled();
            })
            .verify(done);
    });
});