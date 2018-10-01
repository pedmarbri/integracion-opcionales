'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe("BAU Consumer", () => {
    let BAUConsumer = {};

    let BAUQueueServiceStub = {
        /**
         * @var {SinonStub}
         */
        receiveMessages: sinon.stub()
    };

    let BAUWorkerServiceStub = {
        /**
         * @var {SinonStub}
         */
        process: sinon.stub()
    };

    const setupSpies = () => {
        spyOn(BAUQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(BAUWorkerServiceStub, 'process').and.callThrough();
    };

    beforeEach(() => {

        BAUQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            receiveMessages: sinon.stub()
        };

        BAUWorkerServiceStub = {
            /**
             * @var {SinonStub}
             */
            process: sinon.stub()
        };

        BAUConsumer = proxyquire('../index', {
            './bau-queue-service': BAUQueueServiceStub,
            './bau-worker-service': BAUWorkerServiceStub
        });
    });

    it("Is successful with no queued messages", done => {
        BAUQueueServiceStub.receiveMessages.resolves([]);

        setupSpies();

        return LambdaTester(BAUConsumer.handler)
            .timeout(60)
            .expectResult(() => {
                expect(BAUQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(BAUWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when Job queue cannot be accessed', done => {
        BAUQueueServiceStub.receiveMessages.rejects();

        setupSpies();

        return LambdaTester(BAUConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(BAUQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(BAUWorkerServiceStub.process).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot call worker', done => {
        BAUQueueServiceStub.receiveMessages.resolves([{foo: 'bar'}]);
        BAUWorkerServiceStub.process.rejects(new Error('Dummy Error'));

        setupSpies();

        return LambdaTester(BAUConsumer.handler)
            .timeout(60)
            .expectError(() => {
                expect(BAUQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(BAUWorkerServiceStub.process).toHaveBeenCalled();
            })
            .verify(done);
    });
});
