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
		expect(User.schema.required.length).to.deep.equal(2);
		expect(User.schema.required       ).to.include('username');
		expect(User.schema.required       ).to.include('password');
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
		expect(User.schema.required.length).to.deep.equal(2);
		expect(User.schema.required  ).to.include('username');
		expect(User.schema.required  ).to.include('password');
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
		expect(User.schema.required.length).to.deep.equal(1);
		expect(User.schema.required  ).to.include('username');
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
		expect(User.schema.required.length).to.deep.equal(1);
		expect(User.schema.required  ).to.include('username');
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
	});

	it('number', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'number'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('number');
	});

	it('integer', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'integer'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('number');
	});

	it('datetime', () => {
		let Test = nano_orm.defineModel('test', [{ name : 'thing', type: 'datetime'}]);
		expect(Test.schema.properties           ).to.be.an        ('object');
		expect(Test.schema.properties.thing     ).to.be.an        ('object');
		expect(Test.schema.properties.thing.type).to.be.deep.equal('string');
	});
});
