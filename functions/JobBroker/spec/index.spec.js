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
    let SapCMQueueServiceStub = {};
    let OrderTableServiceStub = {};
    let CrmQueueServiceStub = {};
    let orderMessage = {};
    let cmMessage = {};

    beforeEach(() => {
        orderMessage = {
            json: {
                type: 'order',
                payload: {
                    order_id: '123456'
                }
            }
        };

        cmMessage = {
            json: {
                type: 'creditmemo',
                payload: {
                    order_id: '123456'
                }
            }
        };

        SapOrderQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            sendMessage: sinon.stub()
        };

        SapCMQueueServiceStub = {
            /**
             * @var {SinonStub}
             */
            sendMessage: sinon.stub()
        };

        CrmQueueServiceStub = {
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
            './sap-cm-queue-service': SapCMQueueServiceStub,
            './order-table-service': OrderTableServiceStub,
            './crm-queue-service': CrmQueueServiceStub
        });
    });

    it("Is successful with no queued messages", done => {
        JobQueueServiceStub.receiveMessages.resolves([]);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(CrmQueueServiceStub, 'sendMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectResult(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).not.toHaveBeenCalled();
                expect(CrmQueueServiceStub.sendMessage).not.toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when Job Queue cannot be accessed', done => {
        JobQueueServiceStub.receiveMessages.rejects();

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(CrmQueueServiceStub, 'sendMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).not.toHaveBeenCalled();
                expect(CrmQueueServiceStub.sendMessage).not.toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot put order into DB', done => {
        JobQueueServiceStub.receiveMessages.resolves([orderMessage]);
        OrderTableServiceStub.saveMessage.rejects(new Error('Dummy Error'));
        CrmQueueServiceStub.sendMessage.resolves(orderMessage);
        JobQueueServiceStub.deleteMessage.resolves(orderMessage);
        SapOrderQueueServiceStub.sendMessage.resolves(orderMessage);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(CrmQueueServiceStub, 'sendMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).toHaveBeenCalled();
                expect(CrmQueueServiceStub.sendMessage).not.toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot send Order to CRM', done => {
        JobQueueServiceStub.receiveMessages.resolves([orderMessage]);
        OrderTableServiceStub.saveMessage.resolves(orderMessage);
        CrmQueueServiceStub.sendMessage.rejects(new Error('Dummy Error'));
        JobQueueServiceStub.deleteMessage.resolves(orderMessage);
        SapOrderQueueServiceStub.sendMessage.resolves(orderMessage);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(CrmQueueServiceStub, 'sendMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).toHaveBeenCalled();
                expect(CrmQueueServiceStub.sendMessage).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot delete order message from Job Queue', done => {
        JobQueueServiceStub.receiveMessages.resolves([orderMessage]);
        OrderTableServiceStub.saveMessage.resolves(orderMessage);
        CrmQueueServiceStub.sendMessage.resolves(orderMessage);
        JobQueueServiceStub.deleteMessage.rejects(new Error('Dummy Error'));
        SapOrderQueueServiceStub.sendMessage.resolves(orderMessage);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(CrmQueueServiceStub, 'sendMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).toHaveBeenCalled();
                expect(CrmQueueServiceStub.sendMessage).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    xit('Fails when it cannot insert Order Message into Sap Order Queue', done => {
        // V2 does not send messages to Sap Order Queue anymore

        JobQueueServiceStub.receiveMessages.resolves([orderMessage]);
        OrderTableServiceStub.saveMessage.resolves(orderMessage);
        CrmQueueServiceStub.sendMessage.resolves(orderMessage);
        JobQueueServiceStub.deleteMessage.resolves(orderMessage);
        SapOrderQueueServiceStub.sendMessage.rejects(new Error('Dummy Error'));

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveMessage').and.callThrough();
        spyOn(CrmQueueServiceStub, 'sendMessage').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveMessage).toHaveBeenCalled();
                expect(CrmQueueServiceStub.sendMessage).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot delete credit memo message from Job Queue', done => {
        JobQueueServiceStub.receiveMessages.resolves([cmMessage]);
        JobQueueServiceStub.deleteMessage.rejects(new Error('Dummy Error'));
        SapCMQueueServiceStub.sendMessage.resolves(cmMessage);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapCMQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).toHaveBeenCalled();
                expect(SapCMQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails when it cannot insert credit memo message into Sap CM Queue', done => {
        JobQueueServiceStub.receiveMessages.resolves([cmMessage]);
        JobQueueServiceStub.deleteMessage.resolves(cmMessage);
        SapCMQueueServiceStub.sendMessage.rejects(new Error('Dummy Error'));

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapCMQueueServiceStub, 'sendMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).toHaveBeenCalled();
                expect(SapCMQueueServiceStub.sendMessage).toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Fails with the wrong type of message', done => {
        cmMessage.json.type = 'wrong_type';

        JobQueueServiceStub.receiveMessages.resolves([cmMessage]);
        JobQueueServiceStub.deleteMessage.resolves(cmMessage);

        spyOn(JobQueueServiceStub, 'receiveMessages').and.callThrough();
        spyOn(JobQueueServiceStub, 'deleteMessage').and.callThrough();

        return LambdaTester(JobBroker.handler)
            .timeout(60)
            .expectError(() => {
                expect(JobQueueServiceStub.receiveMessages).toHaveBeenCalled();
                expect(JobQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });
});
