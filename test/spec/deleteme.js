'use strict';

// This is just an example, you can delete
describe('Service: Stub', function () {

	beforeEach(module('ng-module-template'));

	var service;

	// Init
	beforeEach(inject(['stub', function(stub){
		service = stub;
	}]));

	it('should give 1', function () {
		expect(service.getOne()).toEqual(1);
	});

});
