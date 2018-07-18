'use strict';

const sinon = require( 'sinon' );
const proxyquire = require( 'proxyquire' ).noCallThru();

describe('BAU Queue', () => {
  let sqsRequestStub;
  let sqsStub;
  let AWSStub;
  let stubConfig;
  let bauQueueService;

  beforeEach(() => {
    sqsRequestStub = { promise: sinon.stub() };
    sqsStub = { sendMessage: sinon.stub() };

    sqsStub.sendMessage.returns(sqsRequestStub);

    AWSStub = { SQS: sinon.stub().returns(sqsStub) };

    stubConfig = { 'aws-sdk': AWSStub };
    bauQueueService = proxyquire('../bau-queue-service', stubConfig);
  });

  it('Returns a promise on sendMessage', () => {
    const message = {
      order: {},
      contact: {}
    };

    sqsRequestStub.promise.resolves( {} );

    expect(bauQueueService.sendMessage(message)).toEqual(jasmine.any(Promise));
  });

  it('Handles rejection', () => {
    let resultHandler = jasmine.createSpy('resultHandler');
    const message = {
      order: {},
      contact: {}
    };

    sqsRequestStub.promise.rejects();

    bauQueueService.sendMessage(message)
      .then(resultHandler)
      .catch(err => {
        expect(err).toEqual(jasmine.any(Error));
        expect(resultHandler).not.toHaveBeenCalled();
      });
  });

  it('Resolves to the sent message', () => {
    const message = {
      order: {},
      contact: {}
    };

    sqsRequestStub.promise.resolves( {} );

    bauQueueService.sendMessage(message).then(result => expect(result).toEqual(message));
  });

});
