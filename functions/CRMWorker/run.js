'use strict';

const soap = require('soap');

soap.createClientAsync('./crm-service-dev.wsdl')
    .then(client => {
        // const auth = 'Basic ' + new Buffer(SAP_HTTP_USER + ':' + SAP_HTTP_PASS).toString('base64');

        const request = {
            listaContactos: {
                ContactoMasivo: [
                    {
                        Torre: '',
                        TipoPropiedad: '',
                        NombrePropiedad: '',
                        Escalera: '',
                        Cuerpo: '',
                        CRMIDEmpresa: '',
                        CondicionIVA: 'No Responsable',
                        PrimerNombre: 'CARLOS',
                        SegundoNombre: '',
                        Apellido: 'RUIZ',
                        TelCasa: '1525659874',
                        TelTrabajo: '1525659874',
                        TelCelular: '0',
                        TipoCalle: 'CALLE',
                        Calle: 'FITZ ROY',
                        Numero: 930,
                        Piso: 2,
                        Dpto: 'F',
                        CodigoPostal: 1414,
                        Localidad: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                        Barrio: '',
                        UP: false,
                        Provincia: 'CIUDAD AUTONOMA DE BUENOS AIRES',
                        Pais: 'ARGENTINA',
                        ObsDomicilio: '',
                        VinculoLN: 'PROSPECT',
                        Origen: 'BANCO GALICIA',
                        TipoDoc: 'DNI',
                        NumeroDoc: '789456456',
                        Sexo: 'M',
                        Email: 'matias4@semexpert.com.ar'
                    }
                ]
            },
        };

        const request2 = {
            numDoc: '456123123',
            pagina: 1,
            filasXPagina: 1,
            tipoDoc: 'DNI'
        };

        const options = {
            timeout: 10000
        };

        return client.Alta_Masiva_ContactoAsync(request, options);

        // return client.Consulta_ContactoPorDocumentoAsync(request2, options);

    })
    .then(response => console.log(JSON.stringify(response)))
    .catch(console.log);