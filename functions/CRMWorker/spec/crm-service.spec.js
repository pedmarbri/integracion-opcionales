'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('CRM Service', () => {
  let CRMService;
  let soapStub;
  let clientStub;
  let stubConfig;
  let sampleOrder;
  let sampleResponse;
  let isoStub;
  let expectedInsertRequest;

  beforeEach(() => {
    sampleOrder = require('./sample-order');

    expectedInsertRequest = {
      listaContactos: {
        ContactoMasivo: [
          {
            CondicionIVA: sinon.match.string,
            PrimerNombre: sinon.match.string,
            Apellido: sinon.match.string,
            TelCasa: sinon.match.string,
            Calle: sinon.match.string,
            Numero: sinon.match.number,
            Piso: sinon.match.string,
            Dpto: sinon.match.string,
            CodigoPostal: sinon.match.string,
            Localidad: sinon.match.string,
            UP: sinon.match.bool,
            Provincia: sinon.match.string,
            Pais: sinon.match.string,
            VinculoLN: sinon.match.string,
            TipoDoc: sinon.match.string,
            NumeroDoc: sinon.match.string,
            Sexo: sinon.match.string,
            Email: sinon.match.string,
            TipoPropiedad: sinon.match.string,
            NombrePropiedad: sinon.match.string,
            Barrio: sinon.match.string
          }
        ]
      },
    };

    soapStub = {
      /**
       * @var {Sinon.SinonStub}
       */
      createClientAsync: sinon.stub()
    };

    clientStub = {
      Alta_Masiva_ContactoAsync: () => Promise.resolve(true),
      Consulta_ContactoPorDocumentoAsync: () => Promise.resolve(true)
    };

    soapStub.createClientAsync.resolves(clientStub);

    isoStub = {
      getCountryName: countryCode => countryCode === 'AR' ? 'Argentina' : 'United States'
    };

    stubConfig = {
      'soap': soapStub,
      './iso-countries': isoStub
    };

    CRMService = proxyquire('../crm-service', stubConfig);
  });

  afterEach(() => {
    delete require.cache[require.resolve('./sample-order')];
  });

  it('Returns a promise on fetchContact', () => {
    expect(CRMService.fetchContact(sampleOrder)).toEqual(jasmine.any(Promise));
  });

  it('Calls the right soap function on fetchContact with the right parameters', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    const insertContactMethodSpy = spyOn(clientStub, 'Alta_Masiva_ContactoAsync');

    const expectedRequest = {
      numDoc: '12345678',
      pagina: 1,
      filasXPagina: 1,
      tipoDoc: 'DNI'
    };

    const soapMethodExpectation = clientMock.expects('Consulta_ContactoPorDocumentoAsync')
      .once()
      .withArgs(expectedRequest)
      .resolves(sampleResponse);

    CRMService.fetchContact(sampleOrder)
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(insertContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

  it('Returns a result when fetchContact fails', (done) => {
    clientStub.Consulta_ContactoPorDocumentoAsync = () => Promise.reject({ faultstring: 'Internal error' });

    CRMService.fetchContact(sampleOrder)
      .then(result => {
        expect(result).toEqual({
          order: sampleOrder,
          contact: null,
          error: {
            faultstring: 'Internal error'
          }
        });
        done();
      })
      .catch(fail);
  });

  it('Returns a result when contact is not found', (done) => {
    clientStub.Consulta_ContactoPorDocumentoAsync = () => Promise.resolve([
      {
        Consulta_ContactoPorDocumentoResult: {
          Contactos: null
        }
      }
    ]);

    CRMService.fetchContact(sampleOrder)
      .then(fetchResult => {
        expect(fetchResult).toEqual({
          order: sampleOrder,
          contact: null
        });
        done();
      })
      .catch(fail);
  });

  it('Returns a full result when contact is found', (done) => {
    const sampleContact = {
      'ID': 'CQF8AA00BEDE',
      'VinculoConLN': 'Suscriptor',
      'IdCuenta': 'AQF8AA00BR4Y',
      'NombreCuenta': 'papo, pape',
      'Apellido': 'papo',
      'PrimerNombre': 'pape',
      'IdDomicilioPrincipal': 'aQF8AA00S0YC',
      'TelLaboral': null,
      'TelParticular': '987324623564',
      'TelCelular': '34567654323',
      'Interno': null,
      'TelDirecto': null,
      'EMail': null,
      'FechaCumpleaños': '2005-09-16T09:00:00Z',
      'FechaCreacion': '2017-09-18T23:34:38.123Z',
      'IdUsuarioCreador': 'ADMIN',
      'FechaModificacion': '2017-09-18T23:36:29.533Z',
      'IdUsuarioModificador': 'ADMIN',
      'CRMID': '1234',
      'TipoDocumento': 'DNI',
      'NumDocumento': '123123123',
      'Sexo': 'M',
      'CondicionIVA': 'Consumidor Final',
      'SinMail': 'true'
    };

    clientStub.Consulta_ContactoPorDocumentoAsync = () => Promise.resolve([
      {
        Consulta_ContactoPorDocumentoResult: {
          Contactos: {
            Contacto: [
              sampleContact
            ]
          }
        }
      }
    ]);

    CRMService.fetchContact(sampleOrder)
      .then(fetchResult => {
        expect(fetchResult).toEqual({
          order: sampleOrder,
          contact: sampleContact
        });
        done();
      })
      .catch(fail);
  });

  it('Returns a promise on insertContact', () => {
    const result = {
      order: sampleOrder,
      contact: null
    };

    expect(CRMService.insertContact(result)).toEqual(jasmine.any(Promise));
  });

  it('Inserts a new contact when one is not found', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    const queryContactMethodSpy = spyOn(clientStub, 'Consulta_ContactoPorDocumentoAsync');

    const expectedRequest = {
      listaContactos: {
        ContactoMasivo: [
          {
            CondicionIVA: 'No Responsable',
            PrimerNombre: 'Juan',
            Apellido: 'Perez',
            TelCasa: '15-1234-5678',
            Calle: 'Cabildo',
            Numero: 2779,
            Piso: '10',
            Dpto: 'A',
            CodigoPostal: '1428',
            Localidad: 'Capital Federal',
            UP: true,
            Provincia: 'Capital Federal',
            Pais: 'Argentina',
            VinculoLN: 'PROSPECT',
            TipoDoc: 'DNI',
            NumeroDoc: '12345678',
            Sexo: 'M',
            Email: 'example@domain.com',
            TipoPropiedad: 'No Informa',
            NombrePropiedad: 'No Informa',
            Barrio: 'No Informa'
          }
        ]
      },
    };

    const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
      .once()
      .withArgs(expectedRequest)
      .resolves(sampleResponse);

    CRMService.insertContact({
      order: sampleOrder,
      contact: null
    })
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(queryContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

  it('Uses shipping phone for work phone', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    const queryContactMethodSpy = spyOn(clientStub, 'Consulta_ContactoPorDocumentoAsync');

    const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
      .once()
      .withArgs(expectedInsertRequest)
      .resolves(sampleResponse);

    sampleOrder.shipping_address.telephone = '11111111';

    expectedInsertRequest.listaContactos.ContactoMasivo[0].TelCasa = '15-1234-5678';
    expectedInsertRequest.listaContactos.ContactoMasivo[0].TelTrabajo = '11111111';

    CRMService.insertContact({
      order: sampleOrder,
      contact: null
    })
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(queryContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

  it('Resolves a full result after insert', (done) => {
    const result = {
      order: sampleOrder,
      contact: null
    };

    const sampleContact = {
      'EntreCalle1': 'J RAMIREZ DE VELASCO',
      'EntreCalle2': 'F DE AGUIRRE',
      'Torre': '',
      'TipoPropiedad': '',
      'NombrePropiedad': '',
      'Escalera': '',
      'Cuerpo': '',
      'CRMIDEmpresa': 'A04008602',
      'CondicionIVA': 'No Responsable',
      'PrimerNombre': 'CARLOS',
      'SegundoNombre': '',
      'Apellido': 'RUIZ',
      'TelCasa': '1525659874',
      'TelTrabajo': '1525659874',
      'TelCelular': '0',
      'TipoCalle': 'CALLE',
      'Calle': 'FITZ ROY',
      'Numero': '930',
      'Piso': '2',
      'Dpto': 'F',
      'CodigoPostal': 'C1414CHJ',
      'Localidad': 'CIUDAD AUTONOMA BUENOS AIRES',
      'Barrio': 'CHACARITA',
      'UP': false,
      'Provincia': 'CAPITAL FEDERAL',
      'Pais': 'ARGENTINA',
      'ObsDomicilio': '',
      'VinculoLN': 'PROSPECT',
      'Origen': 'BANCO GALICIA',
      'TipoDoc': 'DNI',
      'NumeroDoc': '789456456',
      'Sexo': 'M',
      'Email': 'matias4@semexpert.com.ar',
      'CRMID': 'A04008603',
      'AddressId': 'aQF8AA00S1DC',
      'Normalizada': true,
      'TipoError': 'CampoVacioONulo',
      'IdTabla': 'CQF8AA00BEIT',
      'Resultado': true
    };

    clientStub.Alta_Masiva_ContactoAsync = () => Promise.resolve([
      {
        Alta_Masiva_ContactoResult: {
          RespuestaMasiva: [
            sampleContact
          ]
        }
      }
    ]);

    CRMService.insertContact(result)
      .then(insertResult => {
        expect(insertResult).toEqual({
          order: sampleOrder,
          contact: sampleContact
        });
        done();
      })
      .catch(fail);
  });

  it('Resolves a full result when insert fails', (done) => {
    const result = {
      order: sampleOrder,
      contact: null
    };

    const failedContact = {
      'EntreCalle1': null,
      'EntreCalle2': null,
      'CondicionIVA': 'No Responsable',
      'PrimerNombre': 'Andres',
      'Apellido': 'Arroyo',
      'TelCasa': '2613336886',
      'Calle': '25 DE MAYO OESTE',
      'Numero': '620',
      'Piso': null,
      'Dpto': null,
      'CodigoPostal': 'M5515GHN',
      'Localidad': 'MAIPU',
      'Barrio': null,
      'UP': 'false',
      'Provincia': 'MENDOZA',
      'Pais': 'Argentina',
      'VinculoLN': 'PROSPECT',
      'TipoDoc': 'DNI',
      'NumeroDoc': '95608523',
      'Sexo': 'F',
      'Email': 'davascf@gmail.com',
      'Normalizada': 'true',
      'MensajeError': 'Crm Error',
      'TipoError': 'TipoErrorCrm',
      'CampoError': 'TIPODOC',
      'Resultado': 'false'
    };

    clientStub.Alta_Masiva_ContactoAsync = () => Promise.resolve([
      {
        Alta_Masiva_ContactoResult: {
          RespuestaMasiva: [
            failedContact
          ]
        }
      }
    ]);

    CRMService.insertContact(result)
      .then(insertResult => {
        expect(insertResult).toEqual({
          order: sampleOrder,
          contact: null,
          error: new Error('[TipoErrorCrm] Crm Error')
        });
        done();
      })
      .catch(fail);
  });

  it('Resolves a full result when insert has invalid response', (done) => {
    const result = {
      order: sampleOrder,
      contact: null
    };

    clientStub.Alta_Masiva_ContactoAsync = () => Promise.resolve('Invalid answer');

    CRMService.insertContact(result)
      .then(insertResult => {
        expect(insertResult).toEqual({
          order: sampleOrder,
          contact: null,
          error: jasmine.any(Error)
        });
        done();
      })
      .catch(fail);
  });

  it('Recognizes foreign IDs', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);
    const queryContactMethodSpy = spyOn(clientStub, 'Consulta_ContactoPorDocumentoAsync');

    const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
      .once()
      .withArgs(expectedInsertRequest)
      .resolves(sampleResponse);

    sampleOrder.customer.id_type = 'DNI';
    sampleOrder.billing_address.country = 'US';

    expectedInsertRequest.listaContactos.ContactoMasivo[0].TipoDoc = 'PAS';
    expectedInsertRequest.listaContactos.ContactoMasivo[0].Pais = 'United States';

    CRMService.insertContact({
      order: sampleOrder,
      contact: null
    })
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(queryContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

  it('Allows for gender to be missing', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    const queryContactMethodSpy = spyOn(clientStub, 'Consulta_ContactoPorDocumentoAsync');

    const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
      .once()
      .withArgs(expectedInsertRequest)
      .resolves(sampleResponse);

    delete sampleOrder.customer.gender;
    expectedInsertRequest.listaContactos.ContactoMasivo[0].Sexo = null;

    CRMService.insertContact({
      order: sampleOrder,
      contact: null
    })
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(queryContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

  it('Converts Passport ID type to API code', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);

    const queryContactMethodSpy = spyOn(clientStub, 'Consulta_ContactoPorDocumentoAsync');

    expectedInsertRequest.listaContactos.ContactoMasivo[0].TipoDoc = 'PAS';
    expectedInsertRequest.listaContactos.ContactoMasivo[0].Pais = 'United States';

    const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
      .once()
      .withArgs(expectedInsertRequest)
      .resolves(sampleResponse);

    sampleOrder.customer.id_type = 'PASAPORTE';
    sampleOrder.billing_address.country = 'US';

    CRMService.insertContact({
      order: sampleOrder,
      contact: null
    })
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(queryContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

  it('Sends N/A when street number is missing', (done) => {
    const createClientSpy = spyOn(soapStub, 'createClientAsync').and.callThrough();

    /**
     * @var {Sinon.SinonMock} clientMock
     */
    const clientMock = sinon.mock(clientStub);
    const queryContactMethodSpy = spyOn(clientStub, 'Consulta_ContactoPorDocumentoAsync');
    const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
      .once()
      .withArgs(expectedInsertRequest)
      .resolves(sampleResponse);

    sampleOrder.billing_address.street = 'Cabildo 2779';
    sampleOrder.billing_address.number = 0;

    expectedInsertRequest.listaContactos.ContactoMasivo[0].Calle = 'Cabildo 2779';
    expectedInsertRequest.listaContactos.ContactoMasivo[0].Numero = 'N/A';

    const result = {
      order: sampleOrder,
      contact: null
    };

    CRMService.insertContact(result)
      .then(() => {
        expect(createClientSpy).toHaveBeenCalled();
        expect(queryContactMethodSpy).not.toHaveBeenCalled();
        soapMethodExpectation.verify();
        done();
      })
      .catch(fail);
  });

});