////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file load-and-persist.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief Simple tests for loading and persisting a model to and from the
/// database
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
			      );
	}


	describe('load', () => {
		it('Works for existing rows', () => {
			let dbh = initUserTable();
			return dbh
				.query(`INSERT INTO user ` +
				       `(` + id_field_name + `, username, password)
					          VALUES (1, 'John', 'letmein')`
				      )
				.then(() => User.load(dbh, 1))
				.then((user) => {
					expect(user.id      ).is.deep.equal(1);
					expect(user.username).is.deep.equal('John'   );
					expect(user.password).is.deep.equal('letmein');
				});
		});

		it('Fails if row with specified ID doesn\'t exist', (done) => {
			let dbh = initUserTable();

			dbh
				.query(`INSERT INTO user ` +
				       `(` + id_field_name + `, username, password)
			         VALUES (1, 'John', 'letmein')`
				      )
				.then(() => { return expectPromiseFails(done, User.load(dbh, 10)); })
				.fail(() => {
					done(new Error("Promise failed, but in unexpected way"));
				});
		});
	});

	describe('save', () => {
		it('Persist new instance with save', () => {
			let dbh = initUserTable();

			return dbh
				.then(() => {
					let user = new User({ username: 'Sarah',
					                      password: 'cats'
					                    });
					expect(user.id      ).is.deep.equal(0);
					expect(user.username).is.deep.equal('Sarah');
					expect(user.password).is.deep.equal('cats');

					return dbh
						.query(`SELECT count(` + id_field_name + `) as count FROM user`)
						.then((results) => {
							// Check model isn't saved to DB yet
							expect(results.rows[0].count).is.deep.equal(0);

							// ...and then save it
							return user.save(dbh);
						})
						.then((user) => {
							// ID should now be filled in
							expect(user.id    ).is.deep.equal(1);
							expect(user._dirty).is.deep.equal(false);
						})
						.query(`SELECT * FROM user`)
						.then((results) => {
							expect(results.rowCount              ).is.deep.equal(1);
							expect(results.rows[0][id_field_name]).is.deep.equal(1);
							expect(results.rows[0].username      ).is.deep.equal('Sarah');
							expect(results.rows[0].password      ).is.deep.equal('cats');

							return user.save(dbh);
						}).then((user) => {
							// ID should not have changed
							expect(user.id    ).is.deep.equal(1);
							expect(user._dirty).is.deep.equal(false);
						})
						.query(`SELECT * FROM user`)
						.then((results) => {
							expect(results.rowCount              ).is.deep.equal(1);
							expect(results.rows[0][id_field_name]).is.deep.equal(1);
							expect(results.rows[0].username      ).is.deep.equal('Sarah');
							expect(results.rows[0].password      ).is.deep.equal('cats');
						});
				});
		});

		it('Persist new instance with create', () => {
			let dbh = initUserTable();

			return dbh
				.then(() => User.create(dbh, { username: 'Sarah',
				                               password: 'cats'
				                             }
				                       )
				     )
				.then((user) => {
					expect(user.id      ).is.not.deep.equal(0);
					expect(user.username).is.deep.equal('Sarah');
					expect(user.password).is.deep.equal('cats');
				})
				.query(`SELECT * FROM user`)
				.then((results) => {
					expect(results.rowCount              ).is.deep.equal(1);
					expect(results.rows[0][id_field_name]).is.deep.equal(1);
					expect(results.rows[0].username      ).is.deep.equal('Sarah');
					expect(results.rows[0].password      ).is.deep.equal('cats');
				});
		});

		it('Modify existing instance', () => {
			let dbh = initUserTable();

			return dbh
				.query(`INSERT INTO user ` +
				       `(` + id_field_name + `, username, password) VALUES
				                           (1,'admin','admin'),
                                           (2,'Bob',  'password'),
                                           (3,'Tim',  '1234')`)
				.then(() => {
					return User.load(dbh, 2);
				}).then((user) => {
					expect(user.id      ).is.deep.equal(2);
					expect(user.username).is.deep.equal('Bob');
					expect(user.password).is.deep.equal('password');
					user.username = 'Bobby';
					return user.save(dbh);
				}).then((user) => {
					expect(user.id      ).is.deep.equal(2);
					expect(user.username).is.deep.equal('Bobby');
					expect(user.password).is.deep.equal('password');

					return dbh.query(`SELECT * FROM user ORDER BY ` + id_field_name + ` ASC`);
				}).then((results) => {
					expect(results.rowCount        ).is.deep.equal(3);

					expect(results.rows[0][id_field_name]      ).is.deep.equal(1);
					expect(results.rows[0].username).is.deep.equal('admin');
					expect(results.rows[0].password).is.deep.equal('admin');

					expect(results.rows[1][id_field_name]      ).is.deep.equal(2);
					expect(results.rows[1].username).is.deep.equal('Bobby');
					expect(results.rows[1].password).is.deep.equal('password');

					expect(results.rows[2][id_field_name]      ).is.deep.equal(3);
					expect(results.rows[2].username).is.deep.equal('Tim');
					expect(results.rows[2].password).is.deep.equal('1234');
				});
		});
	});

	describe('delete', () => {
		it('Delete instance of model', () => {
			let dbh = initUserTable();

			return dbh
				.query(`INSERT INTO user ` +
				       `(` + id_field_name + `, username, password) VALUES
				                          (1,'admin','admin'),
                                  (2,'Bob',  'password'),
                                  (3,'Tim',  '1234')`
				      )
				.then(() => {
					return User.load(dbh, 1);
				}).then((user) => {
					expect(user.id      ).is.deep.equal(1);
					expect(user.username).is.deep.equal('admin');
					expect(user.password).is.deep.equal('admin');

					return user.delete(dbh);
				}).then((user) => {
					expect(user.id      ).is.deep.equal(0); // user is no longer saved

					return dbh.query(`SELECT * FROM user ORDER BY ` + id_field_name + ` ASC`);
				}).then((results) => {
					expect(results.rowCount        ).is.deep.equal(2);

					expect(results.rows[0][id_field_name]).is.deep.equal(2);
					expect(results.rows[0].username      ).is.deep.equal('Bob');
					expect(results.rows[0].password      ).is.deep.equal('password');

					expect(results.rows[1][id_field_name]).is.deep.equal(3);
					expect(results.rows[1].username      ).is.deep.equal('Tim');
					expect(results.rows[1].password      ).is.deep.equal('1234');
				});
		});

		it('Delete by id (static method)', () => {
			let dbh =  initUserTable();

			return dbh
				.query(`INSERT INTO user ` +
				       `(` + id_field_name + `, username, password) VALUES
				                         (1,'admin','admin'),
                                 (2,'Bob',  'password'),
                                 (3,'Tim',  '1234')`
				      )
				.then(() => {
					return User.delete(dbh, 3);
				})
				.query(`SELECT * FROM user ORDER BY ` + id_field_name + ` ASC`)
				.then((results) => {
					expect(results.rowCount        ).is.deep.equal(2);

					expect(results.rows[0][id_field_name]).is.deep.equal(1);
					expect(results.rows[0].username      ).is.deep.equal('admin');
					expect(results.rows[0].password      ).is.deep.equal('admin');

					expect(results.rows[1][id_field_name]).is.deep.equal(2);
					expect(results.rows[1].username      ).is.deep.equal('Bob');
					expect(results.rows[1].password      ).is.deep.equal('password');
				});
		});


		//:TODO: implement this - not sure how without doing second DB query
		//since any-db doesn't indicate number of rows affected by a query
		//(IE: the delete statement)
		/*
		it('Delete by id (static method) fails if non-existent ID is specified', (done) => {
			initUserTable().then((dbh) => {
				Q()
					.then(() => {
						return dbh.query(`INSERT INTO user (id,username,password) VALUES
		  				                      (1,'admin','admin'),
		  				                      (2,'Bob',  'password'),
		  				                      (3,'Tim',  '1234')
		  				                 `);
					}).then(() => {
						return expectPromiseFails(done, User.delete(dbh, 10));
					});
			});
		});
		*/


	});
}
