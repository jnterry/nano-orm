////////////////////////////////////////////////////////////////////////////
///                       Part of nano-orm                               ///
////////////////////////////////////////////////////////////////////////////
/// \brief Tests for fields of type datetime
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common');

let moment = require('moment');

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

	describe("Constructor", () => {
		it('No map', () => {
			let event = new EventNoMap({
				datetime : '2018-02-19 22:55:46',
				what     : 'Right now'
			});

			expect(event         ).does.exist;
			expect(event.id      ).is.deep.equal(0);
			expect(event.what    ).is.deep.equal('Right now');
			expect(event.datetime).is.deep.equal('2018-02-19 22:55:46');
		});

		it('With map from string', () => {
			let event = new Event({
				datetime : '2018-02-19 22:55:46',
				what     : 'Right now'
			});

			expect(event         ).does.exist;
			expect(event.id      ).is.deep.equal(0);
			expect(event.what    ).is.deep.equal('Right now');

			expect(event.datetime.year       ()).is.deep.equal(2018);
			expect(event.datetime.month      ()).is.deep.equal(   1);
			expect(event.datetime.date       ()).is.deep.equal(  19);
			expect(event.datetime.hour       ()).is.deep.equal(  22);
			expect(event.datetime.minute     ()).is.deep.equal(  55);
			expect(event.datetime.second     ()).is.deep.equal(  46);
			expect(event.datetime.millisecond()).is.deep.equal(   0);
		});

		it('With map from moment instance', () => {
			let event = new Event({
				datetime : moment(1476959025678).utc(),
				what     : 'A time'
			});

			expect(event         ).does.exist;
			expect(event.id      ).is.deep.equal(0);
			expect(event.what    ).is.deep.equal('A time');

			expect(event.datetime.year       ()).is.deep.equal(2016);
			expect(event.datetime.month      ()).is.deep.equal(   9);
			expect(event.datetime.date       ()).is.deep.equal(  20);
			expect(event.datetime.hour       ()).is.deep.equal(  10);
			expect(event.datetime.minute     ()).is.deep.equal(  23);
			expect(event.datetime.second     ()).is.deep.equal(  45);
			expect(event.datetime.millisecond()).is.deep.equal( 678);
		});
	});

	describe("Load from Database", () => {
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

	describe("Save to database", () => {
		it('Save datetime no map', () => {
			let dbh = initEventTable();

			let event = new EventNoMap({ datetime: '2000-05-10 12:34:45', what : 'thing'});
			return event
				.save(dbh)
				.then((event) => {
					expect(event.datetime).deep.equal('2000-05-10 12:34:45');
					return dbh.query('SELECT * FROM event WHERE id = ?', event.id);
				})
				.then((rows) => {
					expect(rows.rowCount).deep.equal(1);
					expect(rows.rows[0].datetime).deep.equal('2000-05-10 12:34:45');

					let event = EventNoMap.createFromRow(rows.rows[0]);

					expect(event.datetime).deep.equal('2000-05-10 12:34:45');
				});
		});

		it('Save datetime with map', () => {
			let dbh = initEventTable();

			let event = new Event({ datetime: '2000-05-10 12:34:45', what : 'thing'});
			return event
				.save(dbh)
				.then((event) => {
					expect(event.datetime.year()).deep.equal(2000);
					return dbh.query('SELECT * FROM event WHERE id = ?', event.id);
				})
				.then((rows) => {
					expect(rows.rowCount).deep.equal(1);
					expect(rows.rows[0].datetime).deep.equal('2000-05-10 12:34:45.000000');

					let event = Event.createFromRow(rows.rows[0]);

					expect(event.datetime.year()).deep.equal(2000);
				});
		});
	});
});
