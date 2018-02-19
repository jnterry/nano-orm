* Mon Feb 19 2018 Jamie Terry <jamie-terry@outlook.com> 0.7.0
  - Add support for "datetime" fields - automatically parse database string into moment instance
  - Add jsdoc style documentation
* Thu Feb 08 2018 Jamie Terry <jamie-terry@outlook.com> 0.6.0
  - Add a .schema property which is automatically generated and conforms to the "JSON Schema" specification
  - Increase test coverage to 100%
* Sat Jan 27 2018 Jamie Terry <jamie-terry@outlook.com> 0.5.0
  - Make toJSON include the field values only
* Fri Jan 26 2018 Jamie Terry <jamie-terry@outlook.com> 0.4.0
  - Add createFromRows method
  - Make create() method also persist model to database
  - Add constructor which creates instance without persisting to database (to replace old functionality of create)
  - Ensure id field cannot be manually set - it is changed only when .save() is called on new instance
* Thu Jan 18 2018 Jamie Terry <jamie-terry@outlook.com> 0.3.0
  - Convert to using db-connection-promise, the successor of any-db-q
* Fri Aug 18 2017 Jamie Terry <jamie-terry@outlook.com> 0.2.2
  - Add .npmignore
* Fri Aug 18 2017 Jamie Terry <jamie-terry@outlook.com> 0.2.1
  - Fix package.json dependencies, peerDependencies and devDependencies
  - Fix pacakge.json's main field
* Wed Aug 02 2017 Jamie Terry <jamie-terry@outlook.com> 0.2.0
  - Add 'delete' method to Model to delete by ID without even loading the instance
  - Extend test suite
  - Fix numerous bugs handling models with non-default id field
* Tue Aug 01 2017 Jamie Terry <jamie-terry@outlook.com> 0.1.0
  - Initial release
  - Add core Model class
  - Add methods for loading/persisting/finding models in DB
