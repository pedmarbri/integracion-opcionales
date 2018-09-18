'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe("CRM Consumer", () => {
    let CRMConsumer = {};

    let CRMQueueServiceStub = {
        /**
         * @var {SinonStub}
         */
        receiveMessages: sinon.stub()
    };

    let CRMWorkerServiceStub = {
        /**
         * @var {SinonStub}
         */
        process: sinon.stub()
    };

    const setupSpies = () => {
        spyOn(CRMQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(CRMWorkerServiceStub, 'process').and.callThrough();
    };

    beforeEach(() => {

        CRMQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            receiveMessages: sinon.stub()
        };

        CRMWorkerServiceStub = {
            /**
             * @var {SinonStub}
             */
            process: sinon.stub()
        };

        CRMConsumer = proxyquire('../index', {
            './crm-queue-service': CRMQueueServiceStub,
            './crm-worker-service': CRMWorkerServiceStub
        });
    });

    it("Is successful with no queued messages", done => {
        CRMQueueServiceStub.receiveMessages.resolves([]);

        setupSpies();

        return LambdaTester(CRMConsumer.handler)
            .timeout(60)
            .expectResult(() => {
                expect(CRMQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(CRMWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when Job queue cannot be accessed', done => {
        CRMQueueServiceStub.receiveMessages.rejects();

        setupSpies();

        return LambdaTester(CRMConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(CRMQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(CRMWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot call worker', done => {
        CRMQueueServiceStub.receiveMessages.resolves([{foo: 'bar'}]);
        CRMWorkerServiceStub.process.rejects(new Error('Dummy Error'));

        setupSpies();

        return LambdaTester(CRMConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(CRMQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(CRMWorkerServiceStub.process).toHaveBeenCalled();
            })
            .verify(done);
    });
});
