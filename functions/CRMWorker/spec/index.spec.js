'use strict';

const LambdaTester = require('lambda-tester');

/**
 * @var {Proxyquire}
 */
const proxyquire = require( 'proxyquire' );
proxyquire.noCallThru();
const sinon = require( 'sinon' );

LambdaTester.checkForResourceLeak(true);

describe('CRM Worker', () => {
    let CRMWorker = {};
    let CRMServiceStub = {};
    let CRMQueueServiceStub = {};
    let OrderTableServiceStub = {};
    let SapOrderQueueServiceStub = {};
    let sampleOrder;
    let sampleEvent;


    beforeEach(() => {
        sampleOrder = require('./sample-order');

        OrderTableServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            saveResult: sinon.stub()
        };

        CRMServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            fetchContact: sinon.stub(),

            /**
             * @var {Sinon.SinonStub}
             */
            insertContact: sinon.stub()
        };

        CRMQueueServiceStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            deleteMessage: sinon.stub()
        };

        SapOrderQueueServiceStub = {
            /**
             *  @var {Sinon.SinonStub}
             */
            sendMessage: sinon.stub()
        };

        sampleEvent = {
            Body: JSON.stringify(sampleOrder)
        };

        CRMWorker = proxyquire('../index', {
            './crm-service': CRMServiceStub,
            './crm-queue-service': CRMQueueServiceStub,
            './order-table-service': OrderTableServiceStub,
            './sap-order-queue-service': SapOrderQueueServiceStub
        });
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-order')];
    });

    it('Fails if body is not JSON', done => {
        return LambdaTester(CRMWorker.handler)
            .timeout(60)
            .event({
                Body: 'Not a json'
            })
            .expectError()
            .verify(done);
    });

    function setupSpies() {
        spyOn(CRMServiceStub, 'fetchContact').and.callThrough();
        spyOn(CRMServiceStub, 'insertContact').and.callThrough();
        spyOn(OrderTableServiceStub, 'saveResult').and.callThrough();
        spyOn(CRMQueueServiceStub, 'deleteMessage').and.callThrough();
        spyOn(SapOrderQueueServiceStub, 'sendMessage').and.callThrough();
    }

    it('Fails when CRM rejects', done => {
        CRMServiceStub.fetchContact.rejects(new Error('An error ocurred'));

        setupSpies();

        return LambdaTester(CRMWorker.handler)
            .timeout(60)
            .event(sampleEvent)
            .expectError(() => {
                expect(CRMServiceStub.fetchContact).toHaveBeenCalled();
                expect(CRMServiceStub.insertContact).not.toHaveBeenCalled();
                expect(OrderTableServiceStub.saveResult).not.toHaveBeenCalled();
                expect(CRMQueueServiceStub.deleteMessage).not.toHaveBeenCalled();
                expect(SapOrderQueueServiceStub.sendMessage).not.toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Does not create a contact when one is found', done => {
        CRMServiceStub.fetchContact.resolves({
            contact: {
                CRMID: '123'
            }
        });

        setupSpies();

        return LambdaTester(CRMWorker.handler)
            .timeout(60)
            .event(sampleEvent)
            .expectResult(() => {
                expect(CRMServiceStub.fetchContact).toHaveBeenCalled();
                expect(CRMServiceStub.insertContact).not.toHaveBeenCalled();
                expect(OrderTableServiceStub.saveResult).toHaveBeenCalled();
                expect(CRMQueueServiceStub.deleteMessage).toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Creates a new contact when one is not found', done => {
        CRMServiceStub.fetchContact.resolves({
            contact: null
        });

        CRMServiceStub.insertContact.resolves({
            contact: {
                CRMID: '123'
            }
        });

        setupSpies();

        return LambdaTester(CRMWorker.handler)
            .timeout(60)
            .event(sampleEvent)
            .expectResult(() => {
                expect(CRMServiceStub.fetchContact).toHaveBeenCalled();
                expect(CRMServiceStub.insertContact).toHaveBeenCalled();
                expect(OrderTableServiceStub.saveResult).toHaveBeenCalled();
                expect(CRMQueueServiceStub.deleteMessage).toHaveBeenCalled();
            })
            .verify(done);
    });

    it('Sends Message to Sap Order Queue', done => {
      CRMServiceStub.fetchContact.resolves({
        contact: {
          CRMID: '123'
        }
      });

      setupSpies();

      return LambdaTester(CRMWorker.handler)
        .timeout(60)
        .event(sampleEvent)
        .expectResult(() => {
          expect(CRMServiceStub.fetchContact).toHaveBeenCalled();
          expect(OrderTableServiceStub.saveResult).toHaveBeenCalled();
          expect(CRMQueueServiceStub.deleteMessage).toHaveBeenCalled();
          expect(SapOrderQueueServiceStub.sendMessage).toHaveBeenCalled();
        })
        .verify(done);
    });

    it('Sends the original event to deleteMessage', done => {
        const sampleEvent = {
            Body: JSON.stringify(sampleOrder),
            ReceiptHandle: 'this-is-a-receipt-handle'
        };

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        let SapCMQueueServiceMock;
        let deleteMessageExpectation;

        CRMQueueServiceStub.deleteMessage = () => {};
        SapCMQueueServiceMock = sinon.mock(CRMQueueServiceStub);

        deleteMessageExpectation = SapCMQueueServiceMock.expects('deleteMessage')
            .once()
            .withArgs(sampleEvent)
            .resolves(sampleEvent);

        CRMServiceStub.fetchContact.resolves({
            order: sampleOrder,
            contact: {
                CRMID: '12456789'
            }
        });

        return LambdaTester(CRMWorker.handler)
            .timeout(60)
            .event(sampleEvent)
            .expectResult(() => {
                deleteMessageExpectation.verify();
            })
            .verify(done);
    });

});