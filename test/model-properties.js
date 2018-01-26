////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file model-properties.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief Tests that created model classes have particular properties
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common');

let User = nano_orm.defineModel('user', ['username', 'password']);

let Email = nano_orm.defineModel('email', ['from', 'subject', 'body'],
                                 { id_field: 'email_id' }
                                );

it('Table Name', () => {
	expect(typeof( User.getTableName)).is.equal('function');
	expect(typeof(Email.getTableName)).is.equal('function');

	expect( User.getTableName()).is.deep.equal('user' );
	expect(Email.getTableName()).is.deep.equal('email');
});

it('Field Names', () => {
	expect(typeof( User.getFieldNames)).is.equal('function');
	expect(typeof(Email.getFieldNames)).is.equal('function');

	expect( User.getFieldNames()).is.a('array').with.lengthOf(2);
	expect( User.getFieldNames()).does.include('username');
	expect( User.getFieldNames()).does.include('password');

	expect(Email.getFieldNames()).is.a('array').with.lengthOf(3);
	expect(Email.getFieldNames()).does.include('from');
	expect(Email.getFieldNames()).does.include('subject');
	expect(Email.getFieldNames()).does.include('body');
});

it('Id Field Name', () => {
	expect(typeof( User.getIdFieldName)).is.equal('function');
	expect(typeof(Email.getIdFieldName)).is.equal('function');

	expect( User.getIdFieldName()).is.deep.equal('id'      );
	expect(Email.getIdFieldName()).is.deep.equal('email_id');
});

it('Cant modify id field manually', () => {
	let user = new User();
	// id should be 0 before saved to db
	expect(user.id).is.deep.equal(0);

	// shouldn't be able to set id manually (its updated upon save)
	expect(() => { user.id = 1;}).to.throw();
});
