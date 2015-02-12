#!/usr/bin/env node

'use strict';

var dependencyTreeCss = require('../');
var filename = process.argv[2];
var root = process.argv[3];

function main() {
    dependencyTreeCss(filename, root).forEach(
        function(node) {
            console.log(node);
        }
    );
}

main();
