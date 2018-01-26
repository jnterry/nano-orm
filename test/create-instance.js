////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file create-instance.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief Tests a Model's named constructor methods (createXXX)
////////////////////////////////////////////////////////////////////////////

require('./common');

let User = nano_orm.defineModel('user', ['username', 'password']);

describe('create', () => {

	it('No params results in default values for all parameters', () => {
		let user = User.create();

		expect(user.id      ).is.deep.equal(0);
		expect(user.username).is.deep.equal(null);
		expect(user.password).is.deep.equal(null);
	});

	it('Incomplete params results in default values for only missing parameters', () => {
		let user = User.create({password: '999'});

		expect(user.id      ).is.deep.equal(0);
		expect(user.username).is.deep.equal(null);
		expect(user.password).is.deep.equal('999');
	});

	it('Complete params fills in all data fields of instance', () => {

		let user = User.create({password: '123', username: 'Jim'});

		expect(user.id      ).is.deep.equal(0);
		expect(user.username).is.deep.equal('Jim');
		expect(user.password).is.deep.equal('123');
	});
});

describe('createFromRow', () => {
	// Creating from a row containing all the expected fields
	// works correctly
	it('Complete row results in valid instance', () => {
		let user = User.createFromRow({ id       : 100,
		                                username : 'test_user',
		                                password : 'hello :)',
		                              });

		expect(user.id      ).is.deep.equal(100        );
		expect(user.username).is.deep.equal('test_user');
		expect(user.password).is.deep.equal('hello :)' );
	});

	// Creating from a row containing all the expected fields
	// plus some extra is NOT an error (eg, if you want to wrap
	// a table managed elsewhere, but only use certain fields)
	it('Row with extra fields results in valid instance', () => {
		let user = User.createFromRow({ id       : 50,
		                                username : 'John',
		                                password : '987',
		                                homepage : 'http://example.com/john',
		                              });

		expect(user.id      ).is.deep.equal(50    );
		expect(user.username).is.deep.equal('John');
		expect(user.password).is.deep.equal('987' );
	});

	it('Row with missing data fields results in exception', () => {
		expect(() => User.createFromRow({ id: 5, username: '' })).to.throw();
	});

	it('Row with missing id field results in exception', () => {
		expect(() => User.createFromRow({ password: '', username: '' })).to.throw();
	});
});

describe('createFromRows', () => {
	it('Array of length 0 results in empty array', () => {
		let user = User.createFromRows([]);
		expect(user).is.deep.equal([]);
	});

	it('Array of length 1 results in single valid instance', () => {
		let user = User.createFromRows([
			{ id: 10, username: 'Tim', password: 'stuff' }
		]);

		expect(user[0].id      ).is.deep.equal(10     );
		expect(user[0].username).is.deep.equal('Tim'  );
		expect(user[0].password).is.deep.equal('stuff');
	});

	it('Array of length 2 results in 2 valid instances', () => {
		let user = User.createFromRows([
			{ id: 10, username: 'Tim', password: 'stuff' },
			{ id: 11, username: 'Bob', password: 'thing' }
		]);

		expect(user[0].id      ).is.deep.equal(10     );
		expect(user[0].username).is.deep.equal('Tim'  );
		expect(user[0].password).is.deep.equal('stuff');

		expect(user[1].id      ).is.deep.equal(11     );
		expect(user[1].username).is.deep.equal('Bob'  );
		expect(user[1].password).is.deep.equal('thing');
	});

	it('Array containing invalid objects throws error', () => {
		expect(() => User.createFromRows([
			{ id: 10, username: 'Tim', password: 'stuff' },
			{ id: 11, username: 'Bob', password: 'thing' },
			{},
		])).to.throw();
	});
});
