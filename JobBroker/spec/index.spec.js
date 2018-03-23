'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe("Job Broker handler", () => {

    let JobBroker = {};
    let JobQueueServiceStub = {};
    let SapOrderQueueServiceStub = {};
    let OrderTableServiceStub = {};

    beforeEach(() => {
        SapOrderQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            sendMessage: sinon.stub()
        };

        OrderTableServiceStub = {
            /**
             * @var {SinonStub}
             */
            saveMessage: sinon.stub()
        };

        JobQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            receiveMessages: sinon.stub(),

            /**
             * @var {SinonStub}
             */
            deleteMessage: sinon.stub()
        };

        JobBroker = proxyquire('../index', {
            './job-queue-service': JobQueueServiceStub,
            './sap-order-queue-service': SapOrderQueueServiceStub,
            './order-table-service': OrderTableServiceStub
        });
    });

    it("is successful with no queued messages", (done) => {
        JobQueueServiceStub.receiveMessages.resolves([]);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .expectResult(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).not.toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when Job Queue cannot be accessed', (done) => {
        JobQueueServiceStub.receiveMessages.rejects();

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).not.toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot put order into DB', (done) => {
        const orderMessage = {
            json: {
                type: 'order',
                payload: {
                    order_id: '123456'
                }
            }
        };

        JobQueueServiceStub.receiveMessages.resolves([orderMessage]);
        OrderTableServiceStub.saveMessage.rejects();
        JobQueueServiceStub.deleteMessage.resolves(orderMessage);
        SapOrderQueueServiceStub.sendMessage.resolves(orderMessage);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).toHaveBeenCalled();
            })
            .verify(done);
    });
});