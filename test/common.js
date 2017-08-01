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
