#!/usr/bin/env bash
#
# Generates documentation for nano-orm - do "npm install -g jsdoc" first

set -e

pushd $(dirname "${0}") > /dev/null
SCRIPTDIR=$(pwd -L)
popd > /dev/null

rm -rf ${SCRIPTDIR}/docs/

jsdoc ${SCRIPTDIR}/nano-orm.js -R ${SCRIPTDIR}/README.md -d ${SCRIPTDIR}/docs/
