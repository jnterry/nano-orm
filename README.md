# Nano ORM

_Simple ORM built around any-db with Q for promises_

## Motivation

Many ORM libraries attempt to provide 'helpful' utilities to generate SQL queries, represent relationships between the models in the application, etc. This often makes it difficult or at least un-natural to write plain SQL code for interacting with the database.

Nano ORM instead aims to provide an extremely small wrapper around tables in the database to avoid the tedium of writing simple boilerplate code (such as loading models by ID, and saving changes to the database), with the expectation that the application's developer will extend the produced Model classes with their own functions and utilities built using plain SQL queries in order to do anything unique to the app.

## Example Usage

A new Model can be created and used as follows:

```javascript
let nano_orm = require('nano-orm');

// Setup database handle
let dbh = //...

// Define the model, wraps the 'user' table in the database, with columns 'email' and 'password'
let User = nano_orm.defineModel('user', ['email', 'password']);

// Load an existing user with ID 1 from the database
User.load(dbh, 1)
	.then((instance) => {
		// Modify the instance
		instance.email = 'test@example.com';

		// Persist the changes to the database
		return instance.save(dbh);
	});
```

## Model Methods

:TODO: document

## Instance Methods

:TODO: document
