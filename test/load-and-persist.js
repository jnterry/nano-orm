////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \file all.js
/// \author Jamie Terry
/// \date 2017/08/01
/// \brief File which imports and runs all other test scripts
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
