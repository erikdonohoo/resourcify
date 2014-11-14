'use strict';

// This is just an example, you can delete
describe('Service: ResourceUtils', function () {

	beforeEach(module('resourcify'));

	var utils;

	// Init
	beforeEach(inject(function(_resourcifyUtils_){
		utils = _resourcifyUtils_;
	}));

	it('should pull off query params', function () {
		expect(utils.objectifyQueryParams('http://blah.com/stuff?who=me&you=me')).toEqual({});
	});

});
