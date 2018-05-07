'use strict';

const soap = require('soap');

soap.createClientAsync('./service.wsdl')
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
                        NumeroDoc: '456456123',
                        Sexo: 'M',
                        Email: 'matias3@semexpert.com.ar'
                    }
                ]
            },
        };

        const options = {
            timeout: 10000
        };

        // client.addHttpHeader('Authorization', auth);
        // console.log(JSON.stringify(request));

        return client.Alta_Masiva_ContactoAsync(request, options);
    })
    .then(response => console.log(JSON.stringify(response)))
    .catch(console.log);