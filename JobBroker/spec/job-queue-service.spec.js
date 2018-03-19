'use strict';

const sinon = require( 'sinon' );
const jobQueueService = require('../job-queue-service');

describe('Job Queue Service', () => {
    it('Uses promises on receiveMessage', () => {
        const request = jobQueueService.receiveMessages();
        expect(request).toEqual(jasmine.any(Promise));
    });
});