////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \brief Tests for fields of type datetime
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common');

function initEventTable(){
	let dbh = getDbConnection();
	return dbh
		.query('DROP TABLE IF EXISTS event')
		.query(`CREATE TABLE event (
			           id       INTEGER      NOT NULL PRIMARY KEY,
				         datetime datetime     NOT NULL,
				         what     varchar(255) NOT NULL
				      )`
		      )
		.query(`INSERT INTO event (id, datetime, what) VALUES
				          (1,'2010-12-25 10:00:00','Christmas'),
                  (2,'2015-01-01 00:00:00','Start of the Year');`
		      );
}

let EventNoMap = nano_orm.defineModel('event', [{ name: 'datetime', type : 'string'   }, 'what']);
let Event      = nano_orm.defineModel('event', [{ name: 'datetime', type : 'datetime' }, 'what']);

describe("Datetime field", () => {
	it('Load Datetime no map', () => {
		let dbh = initEventTable();

		return EventNoMap.load(dbh, 1)
			.then((event) => {
				expect(event         ).does.exist;
				expect(event.id      ).is.deep.equal(1);
				expect(event.what    ).is.deep.equal('Christmas');
				expect(event.datetime).is.deep.equal('2010-12-25 10:00:00');
			});
	});

	it('Load Datetime with map', () => {
		let dbh = initEventTable();

		return Event.load(dbh, 1)
			.then((event) => {
				expect(event     ).does.exist;
				expect(event.id  ).is.deep.equal(1);
				expect(event.what).is.deep.equal('Christmas');

				expect(event.datetime.year       ()).is.deep.equal(2010);
				expect(event.datetime.month      ()).is.deep.equal(  11);
				expect(event.datetime.date       ()).is.deep.equal(  25);
				expect(event.datetime.hour       ()).is.deep.equal(  10);
				expect(event.datetime.minute     ()).is.deep.equal(   0);
				expect(event.datetime.second     ()).is.deep.equal(   0);
				expect(event.datetime.millisecond()).is.deep.equal(   0);
			});
	});
});
