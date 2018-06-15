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

    beforeEach(() => {
        sampleOrder = require('./sample-order');

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

        stubConfig = {
            'soap': soapStub
        };

        CRMService = proxyquire('../crm-service', stubConfig);
    });

    afterEach(() => {
        delete require.cache[require.resolve('./sample-order')];
    });

    it('Returns a promise on fetchContact', () => {
        expect(CRMService.fetchContact(sampleOrder)).toEqual(jasmine.any(Promise));
    });

    it('Calls the right soap function on fetchContact with the right parameters', () => {
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
            })
            .catch(fail);
    });

    it('Returns a result when fetchContact fails', () => {
        clientStub.Consulta_ContactoPorDocumentoAsync = () => Promise.reject({faultstring: 'Internal error'});

        CRMService.fetchContact(sampleOrder)
            .then(result => {
                expect(result).toEqual({
                    order: sampleOrder,
                    contact: null,
                    error: {
                        faultstring: 'Internal error'
                    }
                });
            })
            .catch(fail);
    });

    it('Returns a result when contact is not found', () => {
        clientStub.Consulta_ContactoPorDocumentoAsync = () => Promise.resolve({
            Consulta_ContactoPorDocumentoResult: {
                Contactos: null
            }
        });

        CRMService.fetchContact(sampleOrder)
            .then(fetchResult => {
                expect(fetchResult).toEqual({
                    order: sampleOrder,
                    contact: null
                });
            });
    });

    it('Returns a full result when contact is found', () => {
        const sampleContact = {
            "ID": "CQF8AA00BEDE",
            "VinculoConLN": "Suscriptor",
            "IdCuenta": "AQF8AA00BR4Y",
            "NombreCuenta": "papo, pape",
            "Apellido": "papo",
            "PrimerNombre": "pape",
            "IdDomicilioPrincipal": "aQF8AA00S0YC",
            "TelLaboral": null,
            "TelParticular": "987324623564",
            "TelCelular": "34567654323",
            "Interno": null,
            "TelDirecto": null,
            "EMail": null,
            "FechaCumpleaños": "2005-09-16T09:00:00Z",
            "FechaCreacion": "2017-09-18T23:34:38.123Z",
            "IdUsuarioCreador": "ADMIN",
            "FechaModificacion": "2017-09-18T23:36:29.533Z",
            "IdUsuarioModificador": "ADMIN",
            "CRMID": "1234",
            "TipoDocumento": "DNI",
            "NumDocumento": "123123123",
            "Sexo": "M",
            "CondicionIVA": "Consumidor Final",
            "SinMail": "true"
        };

        clientStub.Consulta_ContactoPorDocumentoAsync = () => Promise.resolve([
            {
                Consulta_ContactoPorDocumentoResult: {
                    Contactos: {
                        Contacto: sampleContact
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
            });

    });

    it('Returns a promise on insertContact', () => {
        const result = {
            order: sampleOrder,
            contact: null
        };

        expect(CRMService.insertContact(result)).toEqual(jasmine.any(Promise));
    });

    it('Inserts a new contact when one is not found', () => {
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
                        UP: false,
                        Provincia: 'Capital Federal',
                        Pais: 'AR',
                        VinculoLN: 'PROSPECT',
                        TipoDoc: 'DNI',
                        NumeroDoc: '12345678',
                        Sexo: 'M',
                        Email: 'example@domain.com'
                    }
                ]
            },
        };

        const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
            .once()
            .withArgs(expectedRequest)
            .resolves(sampleResponse);

        const result = {
            order: sampleOrder,
            contact: null
        };

        CRMService.insertContact(result)
            .then(() => {
                expect(createClientSpy).toHaveBeenCalled();
                expect(queryContactMethodSpy).not.toHaveBeenCalled();
                soapMethodExpectation.verify();
            })
            .catch(fail);
    });

    it('Uses shipping phone for work phone', () => {
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
                        TelTrabajo: '11111111',
                        Calle: 'Cabildo',
                        Numero: 2779,
                        Piso: '10',
                        Dpto: 'A',
                        CodigoPostal: '1428',
                        Localidad: 'Capital Federal',
                        UP: false,
                        Provincia: 'Capital Federal',
                        Pais: 'AR',
                        VinculoLN: 'PROSPECT',
                        TipoDoc: 'DNI',
                        NumeroDoc: '12345678',
                        Sexo: 'M',
                        Email: 'example@domain.com'
                    }
                ]
            },
        };

        const soapMethodExpectation = clientMock.expects('Alta_Masiva_ContactoAsync')
            .once()
            .withArgs(expectedRequest)
            .resolves(sampleResponse);

        const result = {
            order: sampleOrder,
            contact: null
        };

        sampleOrder.shipping_address.telephone = '11111111';

        CRMService.insertContact(result)
            .then(() => {
                expect(createClientSpy).toHaveBeenCalled();
                expect(queryContactMethodSpy).not.toHaveBeenCalled();
                soapMethodExpectation.verify();
            })
            .catch(fail);
    });

    it('Resolves a full result after insert', () => {
        const result = {
            order: sampleOrder,
            contact: null
        };

        const sampleContact = {
            "EntreCalle1":"J RAMIREZ DE VELASCO",
            "EntreCalle2":"F DE AGUIRRE",
            "Torre":"",
            "TipoPropiedad":"",
            "NombrePropiedad":"",
            "Escalera":"",
            "Cuerpo":"",
            "CRMIDEmpresa":"A04008602",
            "CondicionIVA":"No Responsable",
            "PrimerNombre":"CARLOS",
            "SegundoNombre":"",
            "Apellido":"RUIZ",
            "TelCasa":"1525659874",
            "TelTrabajo":"1525659874",
            "TelCelular":"0",
            "TipoCalle":"CALLE",
            "Calle":"FITZ ROY",
            "Numero":"930",
            "Piso":"2",
            "Dpto":"F",
            "CodigoPostal":"C1414CHJ",
            "Localidad":"CIUDAD AUTONOMA BUENOS AIRES",
            "Barrio":"CHACARITA",
            "UP":false,
            "Provincia":"CAPITAL FEDERAL",
            "Pais":"ARGENTINA",
            "ObsDomicilio":"",
            "VinculoLN":"PROSPECT",
            "Origen":"BANCO GALICIA",
            "TipoDoc":"DNI",
            "NumeroDoc":"789456456",
            "Sexo":"M",
            "Email":"matias4@semexpert.com.ar",
            "CRMID":"A04008603",
            "AddressId":"aQF8AA00S1DC",
            "Normalizada":true,
            "TipoError":"CampoVacioONulo",
            "IdTabla":"CQF8AA00BEIT",
            "Resultado":true
        };

        clientStub.Alta_Masiva_ContactoAsync = () => Promise.resolve([
            {
                Alta_Masiva_ContactoResult: {
                    RespuestaMasiva: sampleContact
                }
            }
        ]);

        CRMService.insertContact(result)
            .then(insertResult => {
                expect(insertResult).toEqual({
                    order: sampleOrder,
                    contact: sampleContact
                });
            })
            .catch(fail);
    });

    it('Resolves a full result when insert fails', () => {
        const result = {
            order: sampleOrder,
            contact: null
        };

        const failedContact = {
            "EntreCalle1": null,
            "EntreCalle2": null,
            "CondicionIVA": "No Responsable",
            "PrimerNombre": "Andres",
            "Apellido": "Arroyo",
            "TelCasa": "2613336886",
            "Calle": "25 DE MAYO OESTE",
            "Numero": "620",
            "Piso": null,
            "Dpto": null,
            "CodigoPostal": "M5515GHN",
            "Localidad": "MAIPU",
            "Barrio": null,
            "UP": "false",
            "Provincia": "MENDOZA",
            "Pais": "AR",
            "VinculoLN": "PROSPECT",
            "TipoDoc": "DNI",
            "NumeroDoc": "95608523",
            "Sexo": "F",
            "Email": "davascf@gmail.com",
            "Normalizada": "true",
            "MensajeError": "Crm Error",
            "TipoError": "TipoErrorCrm",
            "CampoError": "TIPODOC",
            "Resultado": "false"
        };

        clientStub.Alta_Masiva_ContactoAsync = () => Promise.resolve([
            {
                Alta_Masiva_ContactoResult: {
                    RespuestaMasiva: failedContact
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
            })
            .catch(fail);
    });

    it('Resolves a full result when insert has invalid response', () => {
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
            })
            .catch(fail);
    });
});