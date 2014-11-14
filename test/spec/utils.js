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
		expect(utils.objectifyQueryParams('http://blah.com/stuff?who=me&you=me')).toEqual({
			'who': 'me',
			'you': 'me'
		});
		expect(utils.objectifyQueryParams('http://localhost:8080/my/friend/bob')).toEqual({});
		expect(utils.objectifyQueryParams('http://localhost/dude?')).toEqual({});
		expect(utils.objectifyQueryParams('http://blah.com?bro=:me&dude=:you&so=what'))
		.toEqual({
			'bro': ':me',
			'dude': ':you',
			'so': 'what'
		});
	});
});
