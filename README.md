# Nano ORM

_Tiny wrapper layer for loading and persisting Models from SQL databases using a Q promise based interface_

## PRERELEASE

**WARNING: This package is currently in prerelease - the API may or may not change before final release**

The package number will be bumped to 1.0.0 for the initial release, todo before then:
- Release (any-db-q)[https://github.com/jnterry/any-db-q]
- Documentation
- Test usage of this in a real project
- Explore concept of extensions (mini-modules that add methods to the prototypes of models to offer enhanced functionality)
- Unit tests

## Motivation and Who is This For?

Many ORM libraries are heavyweight complex beasts that attempt to provide 'helpful' utilities to generate SQL queries, represent relationships between the models in the application, etc, typically in order to avoid having the programmer ever write plain SQL queries.

However, assuming the application's developers:
- Are competent with plain SQL
- Control the environment in which the application is deployed (IE: what database is in use)
- Don't plan on changing to a different database

The advantages touted by such libraries don't seem all that attractive. Indeed there is no need to have the code be compatible with every database under the sun, and learning the constructs specific to the ORM is simply an additional burden placed on the developer, who would be more comfortable writting the SQL  queries directly. This can also lead to more performant code without layers of abstraction hiding what is really going on.

Under these assumptions, the main benefit of a traditional ORM is avoiding tedious boilerplate for loading and persisting models from the database. It is this that Nano ORM attempts to avoid - with any intresting functionality unique to the app being provided by the application's developer extending the model's created by Nano ORM with their own functions and utilities built using plain SQL.

## Basic Usage

```javascript
let AnyDbQ   = require('any-db-q');
let nano_orm = require('nano-orm');

// Define the model, wraps the 'user' table in the database, with columns 'email' and 'password'
let User = nano_orm.defineModel('user', ['email', 'password']);

// Connect to the database
AnyDbQ({ adapter: 'sqlite3'})
    .then((dbh) => {
        // Load the row with id 1 from the database
        User.load(dbh, 1)
            .then((user) => {
                // Modify the instance
                user.email = 'test@example.com';

                // Persist the changes to the database
                return user.save(dbh);
            });
    });
```

More complete examples can be found in the /examples directory.

## Features

- Load/Persist model instances to/from database
- Load all instances in DB meeting some criteria, represented with standard SQL WHERE syntax
- Create instances from raw rows returned from the database by a custom SQL query

### Planned

- Auto-updated 'created\_at' and 'updated\_at' fields
- Soft delete, with a deleted_at field
- Load instances with IDs in some set

## Installation

:TODO: document (work out the peerDependency stuff with any-db-q)

## Model Methods

:TODO: document

## Instance Methods

:TODO: document
