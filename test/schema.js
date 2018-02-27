////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file schema.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief File which tests JSON schema generation
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common');

let ajv = new require('ajv')();

describe('Bad model_fields', () => {
	it('undefined', () => {
		expect(() => {
			nano_orm.defineModel('user');
		}).to.throw();
	});

	it('null', () => {
		expect(() => {
			nano_orm.defineModel('user', null);
		}).to.throw();
	});

	it('string', () => {
		expect(() => {
			nano_orm.defineModel('user', 'field_name');
		}).to.throw();
	});

	it('integer', () => {
		expect(() => {
			nano_orm.defineModel('user', 5);
		}).to.throw();
	});

	it('Empty Array', () => {
		expect(() => {
			nano_orm.defineModel('user', []);
		}).to.throw();
	});

	it('Object without name field', () => {
		expect(() => {
			nano_orm.defineModel('user', [{}]);
		}).to.throw();
	});

	it('Object without name field after valid descriptor', () => {
		expect(() => {
			nano_orm.defineModel('user', [{name: 'username'}, {}]);
		}).to.throw();
	});

	it('Duplicate field name', () => {
		expect(() => {
			nano_orm.defineModel('user', ['username', 'password', 'username']);
		}).to.throw();
	});

	it('Duplicate field name with object descriptor', () => {
		expect(() => {
			nano_orm.defineModel('user', [{ name: 'username' }, { name: 'password' }, { name: 'username' }]);
		}).to.throw();
	});

	it('Duplicate field name mixed', () => {
		expect(() => {
			nano_orm.defineModel('user', ['username', { name: 'password' }, { name: 'username' }]);
		}).to.throw();
	});
});

describe('Valid model fields', () => {

	it('Names only', () => {
		let User = nano_orm.defineModel('user', ['username', 'password']);

		expect(User.getFieldNames()  ).to.deep.equal(['username', 'password']);

		expect(User.schema           ).to.be.an('object');
		expect(User.schema.name      ).to.deep.equal('user');

		expect(User.schema.properties).to.be.an('object');
		expect(User.schema.properties.username).to.deep.equal({});
		expect(User.schema.properties.password).to.deep.equal({});

		expect(User.schema.required       ).to.be.an('array');
		expect(User.schema.required.length).to.deep.equal(3);
		expect(User.schema.required       ).to.include('id'      );
		expect(User.schema.required       ).to.include('username');
		expect(User.schema.required       ).to.include('password');

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);
	});

	it('Field specifier objects - no required', () => {
		let User = nano_orm.defineModel('user', [
			{ name: 'username' },
			{ name: 'password' },
		]);

		expect(User.getFieldNames()  ).to.deep.equal(['username', 'password']);

		expect(User.schema           ).to.be.an('object');
		expect(User.schema.name      ).to.deep.equal('user');

		expect(User.schema.properties).to.be.an('object');
		expect(User.schema.properties.username).to.deep.equal({});
		expect(User.schema.properties.password).to.deep.equal({});

		expect(User.schema.required  ).to.be.an('array');
		expect(User.schema.required.length).to.deep.equal(3);
		expect(User.schema.required  ).to.include('id'      );
		expect(User.schema.required  ).to.include('username');
		expect(User.schema.required  ).to.include('password');

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);
	});

	it('Field specifier objects - with required', () => {
		let User = nano_orm.defineModel('user', [
			{ name: 'username', required: true },
			{ name: 'password', required: false},
		]);

		expect(User.getFieldNames()  ).to.deep.equal(['username', 'password']);

		expect(User.schema           ).to.be.an('object');
		expect(User.schema.name      ).to.deep.equal('user');

		expect(User.schema.properties).to.be.an('object');
		expect(User.schema.properties.username).to.deep.equal({});
		expect(User.schema.properties.password).to.deep.equal({});

		expect(User.schema.required  ).to.be.an('array');
		expect(User.schema.required.length).to.deep.equal(2);
		expect(User.schema.required  ).to.include('id'      );
		expect(User.schema.required  ).to.include('username');

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);
	});

	it('Mixed elements', () => {
		let User = nano_orm.defineModel('user', [
			'username',
			{ name: 'password', required: false, minLength: 6},
		]);

		expect(User.getFieldNames()  ).to.deep.equal(['username', 'password']);

		expect(User.schema           ).to.be.an('object');
		expect(User.schema.name      ).to.deep.equal('user');

		expect(User.schema.properties).to.be.an('object');
		expect(User.schema.properties.username).to.deep.equal({});
		expect(User.schema.properties.password).to.deep.equal({ minLength : 6});

		expect(User.schema.required  ).to.be.an('array');
		expect(User.schema.required.length).to.deep.equal(2);
		expect(User.schema.required  ).to.include('id'      );
		expect(User.schema.required  ).to.include('username');

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);
	});

});

describe('Data Types', () => {
	// According to the JSON Schema spec the "type" field may be one of:
	// null, boolean, object, array, number, string
	// See: http://json-schema.org/latest/json-schema-core.html#rfc.section.4.2.1

	it('string', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'string'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('string');

		expect(ajv.validateSchema(Test.schema)).to.deep.equal(true);
	});

	it('number', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'number'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('number');

		expect(ajv.validateSchema(Test.schema)).to.deep.equal(true);
	});

	it('integer', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'integer'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('number');

		expect(ajv.validateSchema(Test.schema)).to.deep.equal(true);
	});

	it('datetime', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'datetime'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('string');

		expect(ajv.validateSchema(Test.schema)).to.deep.equal(true);
	});

	it('Invalid field type throws', () => {
		expect(() => {
			let Test = nano_orm.defineModel('test', [{name : 'thing', type: 'flabberdoodle'}]);
		}).to.throw();
	});
});

describe('To JSON', () => {
	it('Single String', () => {
		let User = nano_orm.defineModel('user', ['username']);

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);

		let user = new User();
		let json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: null });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);

		user = new User({username : 'hi'});
		json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: 'hi' });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);
	});

	it('Multiple fields', () => {
		let User = nano_orm.defineModel('user', ['username', 'email']);

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);

		let user = new User();
		let json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: null, email: null });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);

		user = new User({username : 'hi', email: 'hi@example.com'});
		json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: 'hi', email: 'hi@example.com' });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);
	});

	it('integer field', () => {
		let User = nano_orm.defineModel('user', ['username',
		                                         { name: 'age', type: 'integer' }
		                                        ]
		                               );

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);

		let user = new User();
		let json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: null, age: 0 });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);

		user = new User({username : 'hi', age: 32});
		json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: 'hi', age: 32 });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);
	});

	it('number field', () => {
		let User = nano_orm.defineModel('user', ['username',
		                                         { name: 'age', type: 'number' }
		                                        ]
		                               );

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);

		let user = new User();
		let json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: null, age: 0 });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);

		user = new User({username : 'hi', age: 32.5 });
		json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: 'hi', age: 32.5 });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);
	});

	it('boolean field', () => {
		let User = nano_orm.defineModel('user', ['username',
		                                         { name: 'validated', type: 'boolean' }
		                                        ]
		                               );

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);

		let user = new User();
		let json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: null, validated: false });
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);

		user = new User({username : 'hi', validated: true });
		json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, username: 'hi', validated: true});
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);
	});

	it('datetime field', () => {
		let User = nano_orm.defineModel('user', [{ name: 'last_login', type: 'datetime' }]);

		expect(ajv.validateSchema(User.schema)).to.deep.equal(true);

		let user = new User({ last_login: '2018-02-19 22:55:46' });
		let json = user.toJSON();
		expect(json.id        ).to.deep.equal(0);
		expect(json.last_login.substr(0, 19)).to.deep.equal('2018-02-19 22:55:46');
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);

		user = new User();
		json = user.toJSON();
		expect(json).to.deep.equal({ id: 0, last_login: null });
		// We say that last_login is required -> so this should fail
		expect(ajv.validate(User.schema, json)).to.deep.equal(false);
	});

	it('Non-required datetime field', () => {
		let User = nano_orm.defineModel('user', [{ name: 'last_login',
		                                           type: 'datetime',
		                                           required: false
		                                         }]);


		let user = new User();
		let json = user.toJSON();
		expect(json).to.deep.equal({ id: 0 });
		// Now required is false, so this should be fine
		expect(ajv.validate(User.schema, json)).to.deep.equal(true);
	});
});
