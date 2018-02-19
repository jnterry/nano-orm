////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file all.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief File which imports and runs all other test scripts
////////////////////////////////////////////////////////////////////////////

"use strict";

/////////////////////////////////////////////////////////////////////
/// \brief Helper function which imports a file containing a test suite
/////////////////////////////////////////////////////////////////////
function importTest(name, path){
	if(path == null){ path = name; }

	describe(name, function(){
		require("./" + path);
	});
}

describe('nano-orm', () => {
	importTest('model-properties');
	importTest('schema');
	importTest('create-instance');
	importTest('load-save-update-delete');
	importTest('find');
	importTest('datetime');
});
