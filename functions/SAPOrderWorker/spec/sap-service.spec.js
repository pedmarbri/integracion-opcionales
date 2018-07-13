'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

function setupServiceMocks(clientStub, expectedRequest, sampleResponse) {
    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

  return clientMock.expects('ZWS_GEN_PEDAsync')
      .once()
      .withArgs(expectedRequest)
      .resolves(sampleResponse);
}

describe('Sap Service', () => {
    let SapService;
    let soapStub;
    let clientStub;
    let stubConfig;
    let sampleOrder;
    let expectedRequest;
    let sampleResponse;

    beforeEach(() => {
        sampleOrder = require('./sample-order');
        expectedRequest = require('./sample-request');
        sampleResponse = require('./sample-response');

        soapStub = {
            /**
             * @var {Sinon.SinonStub}
             */
            createClientAsync: sinon.stub()
        };

        clientStub = {
            ZWS_GEN_PEDAsync: () => Promise.resolve(sampleResponse),
            addHttpHeader: () => { return this; }
        };

        soapStub.createClientAsync.resolves(clientStub);

        stubConfig = {
            'soap': soapStub
        };

        SapService = proxyquire('../sap-service', stubConfig);
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-order')];
        delete require.cache[require.resolve('./sample-request')];
        delete require.cache[require.resolve('./sample-response')];
    });

    it('Returns a promise on sendOrder', () => {
        expect(SapService.sendOrder(sampleOrder)).toEqual(jasmine.any(Promise));
    });

    it('Calls the right soap function on sendOrder with the right parameters', () => {
        const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        SapService.sendOrder(sampleOrder)
            .then(() => {
                expect(createClientSpy).toHaveBeenCalled();
                soapMethodExpectation.verify();
            })
            .catch(fail);
    });

    it('Sends authorization header to Sap', () => {
        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);
        const authorizationExpectation = clientMock.expects('addHttpHeader').atLeast(1).withArgs('Authorization');

        SapService.sendOrder(sampleOrder)
            .then(() => {
                authorizationExpectation.verify();
            })
            .catch(fail);
    });

    xit('Rejects on error response', () => {

        // TODO Currently we are treating error resopnse as a valid result.

        sampleResponse.VBELN = null;

        /**
         * @var {Sinon.SinonMock} clientMock
         */
        const clientMock = sinon.mock(clientStub);
        const soapMethodExpectation = clientMock.expects('ZWS_GEN_PEDAsync')
            .once()
            .withArgs(expectedRequest)
            .resolves(sampleResponse);

        SapService.sendOrder(sampleOrder)
            .then(fail)
            .catch(() => {
                soapMethodExpectation.verify();
            });
    });

    it('Formats shipping condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.totals.shipping = 20;

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: null,
            KBETR: 20,
            KSCHL: 'ZCEI',
            WAERS: 'ARK'
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats fixed discount condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.items[0].discount_amount = 10;
        sampleOrder.items[0].flags = [];

        expectedRequest.T_CONDITIONS.item[0].KSCHL = 'ZPBI';

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 10,
            KSCHL: 'ZBP',
            WAERS: 'ARK'
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats exclusive items condition correctly', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.items[0].discount_percent = 100;
        sampleOrder.items[0].discount_amount = 249.9;

        expectedRequest.T_CONDITIONS.item[0].KSCHL = 'ZPEE';
        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 100,
            KSCHL: 'ZBEE',
            WAERS: null
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Always treats exclusive items discounts as percent', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.items[0].discount_percent = 0;
        sampleOrder.items[0].discount_amount = 249.9;

        expectedRequest.T_CONDITIONS.item[1] = {
            KPOSN: 10,
            KBETR: 100,
            KSCHL: 'ZBEE',
            WAERS: null
        };

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats date correctly when padding is used in month', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.timestamp = '2018-01-23T18:49:03Z';
        expectedRequest.BSTDK = '20180123';

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Formats date correctly when padding is used in day', () => {
        const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);

        sampleOrder.timestamp = '2018-11-03T18:49:03Z';
        expectedRequest.BSTDK = '20181103';

        SapService.sendOrder(sampleOrder)
            .then(() => soapMethodExpectation.verify())
            .catch(fail);
    });

    it('Truncates fields to its maximum length in SAP', () => {
      const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);
      const longString = '1234567890'.repeat(100);
      const bigNumber = Number.MAX_VALUE;

      const matchNumber = maxDigits => {
          const maxValue = Math.pow(10, maxDigits);
          return sinon.match.number.and(sinon.match(value => value < maxValue));
      };

      const matchString = maxLength => {
          return sinon.match.string.and(sinon.match(value => value.length <= maxLength));
      };

      const conditionExpectation = function () {
        return {
          KPOSN: sinon.match.typeOf("null").or(matchNumber(6)),
          KSCHL: matchString(4),
          KBETR: sinon.match(matchNumber(28)),
          WAERS: sinon.match.typeOf("null").or(matchString(5))
        };
      };

      sampleOrder.order_id = longString;
      sampleOrder.shipping_method = longString;
      sampleOrder.sales_channel = longString;
      sampleOrder.customer.email = longString;
      sampleOrder.customer.first_name = longString;
      sampleOrder.customer.last_name = longString;
      sampleOrder.customer.id_type = longString;
      sampleOrder.customer.id_number = longString;
      sampleOrder.customer.gender = longString;
      sampleOrder.totals.subtotal = bigNumber;
      sampleOrder.totals.discount = bigNumber;
      sampleOrder.totals.shipping = bigNumber;
      sampleOrder.totals.finance_cost = bigNumber;
      sampleOrder.totals.grand_total = bigNumber;
      sampleOrder.billing_address.country = longString;
      sampleOrder.billing_address.region = longString;
      sampleOrder.billing_address.city = longString;
      sampleOrder.billing_address.post_code = longString;
      sampleOrder.billing_address.street = longString;
      sampleOrder.billing_address.number = bigNumber;
      sampleOrder.billing_address.floor = longString;
      sampleOrder.billing_address.apartment = longString;
      sampleOrder.billing_address.first_name = longString;
      sampleOrder.billing_address.last_name = longString;
      sampleOrder.billing_address.email = longString;
      sampleOrder.billing_address.telephone = longString;
      sampleOrder.shipping_address.country = longString;
      sampleOrder.shipping_address.region = longString;
      sampleOrder.shipping_address.city = longString;
      sampleOrder.shipping_address.post_code = longString;
      sampleOrder.shipping_address.street = longString;
      sampleOrder.shipping_address.number = bigNumber;
      sampleOrder.shipping_address.floor = longString;
      sampleOrder.shipping_address.apartment = longString;
      sampleOrder.shipping_address.first_name = longString;
      sampleOrder.shipping_address.last_name = longString;
      sampleOrder.shipping_address.email = longString;
      sampleOrder.shipping_address.telephone = longString;
      sampleOrder.items[0].sku = longString;
      sampleOrder.items[0].name = longString;
      sampleOrder.items[0].qty = bigNumber;
      sampleOrder.items[0].weight = bigNumber;
      sampleOrder.items[0].row_weight = bigNumber;
      sampleOrder.items[0].list_price = bigNumber;
      sampleOrder.items[0].discount_percent = bigNumber;
      sampleOrder.items[0].discount_amount = bigNumber;
      sampleOrder.items[0].row_total = bigNumber;
      sampleOrder.payment.method = longString;
      sampleOrder.payment.transaction_id = longString;

      expectedRequest.AD_SMTPADR = matchString(241);
      expectedRequest.AUART = matchString(4);
      expectedRequest.AUGRU = matchString(3);
      expectedRequest.BSTDK = matchString(8);
      expectedRequest.BSTKD = matchString(35);
      expectedRequest.CITY = matchString(40);
      expectedRequest.COUNTRY = matchString(3);
      expectedRequest.IHREZ = matchString(12);
      expectedRequest.KUNNR = matchString(10);
      expectedRequest.LANGU = matchString(1);
      expectedRequest.NAME1 = matchString(30);
      expectedRequest.NAME4 = matchString(30);
      expectedRequest.SPART = matchString(2);
      expectedRequest.VBELN_EXT = sinon.match.typeOf("null");
      expectedRequest.VKORG = matchString(4);
      expectedRequest.VTWEG = matchString(2);
      expectedRequest.T_ITEMS.item[0].POSNR = matchNumber(6);
      expectedRequest.T_ITEMS.item[0].MATNR = matchString(18);
      expectedRequest.T_ITEMS.item[0].WERKS = matchString(4);
      expectedRequest.T_ITEMS.item[0].LGORT = matchString(4);
      expectedRequest.T_ITEMS.item[0].MENGE = matchNumber(13);
      expectedRequest.T_ITEMS.item[0].MEINS = matchString(3);
      expectedRequest.T_ITEMS.item[0].MVGR5 = matchString(3);
      expectedRequest.T_ITEMS.item[0].KDMAT = matchString(35);
      expectedRequest.T_ITEMS.item[0].POSEX = matchString(6);
      expectedRequest.T_CONDITIONS.item[0] = conditionExpectation();

      // Add a condition for the discount and another for the shipping
      expectedRequest.T_CONDITIONS.item[1] = conditionExpectation();
      expectedRequest.T_CONDITIONS.item[2] = conditionExpectation();

      SapService.sendOrder(sampleOrder)
        .then(() => soapMethodExpectation.verify())
        .catch(fail);
    });

    it('Handles missing transaction ID as null', () => {
      const soapMethodExpectation = setupServiceMocks(clientStub, expectedRequest, sampleResponse);
      delete sampleOrder.payment.transaction_id;
      expectedRequest.IHREZ = null;

      SapService.sendOrder(sampleOrder)
        .then(() => soapMethodExpectation.verify())
        .catch(fail);
    });
});