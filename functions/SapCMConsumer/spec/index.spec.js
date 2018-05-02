'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe("Sap CM Consumer", () => {
    let SapCMConsumer = {};
    let SapCMQueueServiceStub = {};
    let SapCMWorkerServiceStub = {};

    const setupSpies = () => {
        spyOn(SapCMQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(SapCMWorkerServiceStub, 'process').and.callThrough();
    };

    beforeEach(() => {

        SapCMQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            receiveMessages: sinon.stub()
        };

        SapCMWorkerServiceStub = {
            /**
             * @var {SinonStub}
             */
            process: sinon.stub()
        };

        SapCMConsumer = proxyquire('../index', {
            './sap-cm-queue-service': SapCMQueueServiceStub,
            './sap-cm-worker-service': SapCMWorkerServiceStub
        });
    });

    it("Is successful with no queued messages", done => {
        SapCMQueueServiceStub.receiveMessages.resolves([]);

        setupSpies();

        return LambdaTester(SapCMConsumer.handler)
            .timeout(60)
            .expectResult(() => {
                expect(SapCMQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(SapCMWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when Job queue cannot be accessed', done => {
        SapCMQueueServiceStub.receiveMessages.rejects();

        setupSpies();

        return LambdaTester(SapCMConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(SapCMQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(SapCMWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot call worker', done => {
        SapCMQueueServiceStub.receiveMessages.resolves([{foo: 'bar'}]);
        SapCMWorkerServiceStub.process.rejects(new Error('Dummy Error'));

        setupSpies();

        return LambdaTester(SapCMConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(SapCMQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(SapCMWorkerServiceStub.process).toHaveBeenCalled();
            })
            .verify(done);
    });
});
