////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file find.js
/// \author Jamie Terry
/// \date 2018/01/25
/// \brief Tests for .find() method to fetch objects from database according
/// to some criteria
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common');

describe(`Default ID Field`, () => {
	let User = nano_orm.defineModel('user', ['username', 'password']);
	runTestsAgainstModel(User);
});

describe('Non-Default ID Field', () => {
	let User = nano_orm.defineModel('user', ['username', 'password'], {
		id_field: 'user_id',
	});
	runTestsAgainstModel(User);
});

function runTestsAgainstModel(User){
	let id_field_name = User.getIdFieldName();
	function initUserTable(){
		let dbh = getDbConnection();
		return dbh
			.query('DROP TABLE IF EXISTS user')
			.query(`CREATE TABLE user ( ` +
			           id_field_name + ` INTEGER      NOT NULL PRIMARY KEY,
				         username          varchar(255) NOT NULL,
				         password          varchar(255) NOT NULL
				      )`
			      )
			 .query(`INSERT INTO user ` +
			        `(` + id_field_name + `, username, password) VALUES
				                               (1,'admin','admin'),
                                       (2,'Bob',  'password'),
                                       (3,'Tim',  '1234')`
			      );
	}

	it('Find None', () => {
		let dbh = initUserTable();
		return dbh
			.then(() => {
				return User.find(dbh, 'username = ?', 'Hello World');
			}).then((users) => {
				expect(users.length     ).is.deep.equal(0);
			});
	});

	it('Find single', () => {
		let dbh = initUserTable();
		return dbh
			.then(() => {
				return User.find(dbh, 'username = ?', 'admin');
			}).then((users) => {
				expect(users.length     ).is.deep.equal(1);
				expect(users[0].id      ).is.deep.equal(1);
				expect(users[0].username).is.deep.equal('admin');
				expect(users[0].password).is.deep.equal('admin');
			});
	});

	it('Find multiple', () => {
		let dbh = initUserTable();
		return dbh
			.then(() => {
				return User.find(dbh, User.getIdFieldName() + ' >= 2 ORDER BY ' + User.getIdFieldName() + ' DESC');
			}).then((users) => {
				expect(users.length     ).is.deep.equal(2);

				expect(users[0].id      ).is.deep.equal(3);
				expect(users[0].username).is.deep.equal('Tim');
				expect(users[0].password).is.deep.equal('1234');

				expect(users[1].id      ).is.deep.equal(2);
				expect(users[1].username).is.deep.equal('Bob');
				expect(users[1].password).is.deep.equal('password');
			});
	});
}
