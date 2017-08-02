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

let User = nano_orm.defineModel('User', ['username', 'password']);

function initUserTable(){
	return getDbConnection().then((dbh) => {
		return dbh.query('DROP TABLE IF EXISTS user')
			.then(() => {
				return dbh.query(`CREATE TABLE user (
				                       id       INTEGER      NOT NULL PRIMARY KEY,
				                       username varchar(255) NOT NULL,
				                       password varchar(255) NOT NULL
				                  )`);
			}).then(() => {
				return dbh;
			});
	});

}

it('Load Model', () => {
	return initUserTable().then((dbh) => {
		return Q()
			.then(() => dbh.query(`INSERT INTO user (id, username, password)
			                           VALUES (1, 'John', 'letmein')`
			                     )
			     )
			.then(() => User.load(dbh, 1))
			.then((user) => {
				expect(user.id      ).is.deep.equal(1);
				expect(user.username).is.deep.equal('John'   );
				expect(user.password).is.deep.equal('letmein');
			});
	});
});


it('Persist Model', () => {
	return initUserTable().then((dbh) => {
		return Q()
			.then(() => {
				let user = User.create({ username: 'Sarah',
				                         password: 'cats'
				                       });
				expect(user.id      ).is.deep.equal(0);
				expect(user.username).is.deep.equal('Sarah');
				expect(user.password).is.deep.equal('cats');

				return dbh.query(`SELECT count(id) as count FROM user`)
					.then((results) => {
						// Check model isn't saved to DB yet
						expect(results.rows[0].count).is.deep.equal(0);

						// ...and then save it
						return user.save(dbh);
					})
					.then((user) => {
						// ID should now be filled in
						expect(user.id).is.deep.equal(1);
					});
			})
			.then(() => dbh.query(`SELECT * FROM user`))
			.then((results) => {
				expect(results.rowCount        ).is.deep.equal(1);
				expect(results.rows[0].id      ).is.deep.equal(1);
				expect(results.rows[0].username).is.deep.equal('Sarah');
				expect(results.rows[0].password).is.deep.equal('cats');
			});
	});
});

it('Modify Model', () => {
	return initUserTable().then((dbh) => {
		return Q()
			.then(() => {
				return dbh.query(`INSERT INTO user (id,username,password) VALUES
				                      (1,'admin','admin'),
                                      (2,'Bob',  'password'),
                                      (3,'Tim',  '1234')
				                 `);
			}).then(() => {
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

				return dbh.query(`SELECT * FROM user ORDER BY id ASC`);
			}).then((results) => {
				expect(results.rowCount        ).is.deep.equal(3);
				expect(results.rows[0].id      ).is.deep.equal(1);
				expect(results.rows[0].username).is.deep.equal('admin');
				expect(results.rows[0].password).is.deep.equal('admin');

				expect(results.rows[1].id      ).is.deep.equal(2);
				expect(results.rows[1].username).is.deep.equal('Bobby');
				expect(results.rows[1].password).is.deep.equal('password');

				expect(results.rows[2].id      ).is.deep.equal(3);
				expect(results.rows[2].username).is.deep.equal('Tim');
				expect(results.rows[2].password).is.deep.equal('1234');
			});
	});
});
