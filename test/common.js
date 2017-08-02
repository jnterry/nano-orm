////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file common.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief File which contains code common to all test scripts
////////////////////////////////////////////////////////////////////////////

global.expect = require('chai').expect;
global.Q      = require('q');

global.nano_orm = require('../nano-orm');

let any_db_q = require('any-db-q');

global.getDbConnection = function(){
	return any_db_q({ adapter: 'sqlite3'});
};

/////////////////////////////////////////////////////////////////////
/// \brief Helper function which defines a test which only passes if
/// a promise is rejected
/// \param done    The `done` callback provided by it()
/// \param promise The promise which should be rejected
/////////////////////////////////////////////////////////////////////
global.expectPromiseFails = function(done, promise){
	return promise.then((results) => {
		done(new Error("Execution shouldn't reach here; expected failure", results));
	}).fail((error) => {
		done();
	});
};
