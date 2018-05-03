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

    beforeEach(() => {
        SapCMWorker = proxyquire('../index', {
            './sap-service': SapServiceStub,
            './sap-cm-queue-service': SapCMQueueServiceStub,
            './order-table-service': OrderTableServiceStub
        });
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
});