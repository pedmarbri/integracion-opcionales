'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('BAU Service', () => {
  let BAUService;
  let stubConfig;
  let sampleOrder;
  let sqlStub;
  let poolStub;
  let connectionStub;

  beforeEach(() => {
    sampleOrder = require('./sample-order');

    connectionStub = {
      input: () => connectionStub,
      query: () => Promise.resolve(true)
    };

    poolStub = {
      request: () => connectionStub,
      close: () => {}
    };

    sqlStub = {
      connect: () => Promise.resolve(poolStub)
    };

    stubConfig = {
      mssql: sqlStub
    };

    BAUService = proxyquire('../bau-service', stubConfig);
  });

  it('Returns a promise on saveOrder', () => {
    expect(BAUService.saveOrder(sampleOrder)).toEqual(jasmine.any(Promise));
  });

  xit('saveOrder inserts all the required records', done => {
    const inputSpy = spyOn(connectionStub, 'input').and.callThrough();
    const querySpy = spyOn(connectionStub, 'query').and.callThrough();
    const closeSpy = spyOn(poolStub, 'close').and.callThrough();

    BAUService.saveOrder(sampleOrder)
      .then(() => {
        expect(inputSpy).toHaveBeenCalledWith('order_id', jasmine.any(Object), 'A123456');
        expect(inputSpy).toHaveBeenCalledWith('glamit_id', jasmine.any(Object), '12700000000065');
        expect(inputSpy).toHaveBeenCalledWith('timestamp', jasmine.any(Object), jasmine.any(Date));
        expect(inputSpy).toHaveBeenCalledWith('crm_id', jasmine.any(Object), 'AAA123');
        expect(inputSpy).toHaveBeenCalledWith('total', jasmine.any(Object), 1499.4);
        expect(inputSpy).toHaveBeenCalledWith('sku', jasmine.any(Object), 'OPC11086300001');
        expect(inputSpy).toHaveBeenCalledWith('row_total', jasmine.any(Object), 1499.4);
        expect(inputSpy.calls.count()).toBe(8);
        expect(querySpy).toHaveBeenCalled();
        expect(closeSpy).toHaveBeenCalled();
        done();
      })
      .catch(fail);
  });

  xit('Closes connection on error', done => {
    const querySpy = spyOn(connectionStub, 'query').and.returnValue(Promise.reject("Error"));
    const closeSpy = spyOn(poolStub, 'close').and.callThrough();

    BAUService.saveOrder(sampleOrder)
      .then(() => {
        fail("Should not resolve");
        done();
      })
      .catch(() => {
        expect(querySpy).toHaveBeenCalled();
        expect(closeSpy).toHaveBeenCalled();
        done();
      });
  });

  xit('Runs all queries inside a transaction', done => {

  });
});