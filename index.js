

var fs                      = require('fs');
var mkdirp                  = require('mkdirp');
var path                    = require('path');
var resolveDependencyPath   = require('resolve-dependency-path');
var stream                  = require('./stream');

/**
 * Returns a list of unique items from the array
 *
 * If only we had es6 Set.
 *
 * @param  {String[]} list
 * @return {String[]}
 */
function removeDuplicates(list) {
    var cache = {};
    var unique = [];

    list.forEach(function(item) {
        if (!cache[item.source]) {
            unique.push(item);
            cache[item.source] = true;
        }
    });

    return unique;
}

/**
 * Returns the list of URLs used in the given CSS file.
 * @param  {String} CSS vinyl file object
 * @return {String[]}
 */
function getDependencies(file) {
    var dependencies = [];

    try {
        //console.log("Finding dependencies");
        //console.log(file.inspect());

        var content = String(file.contents);
        var re = /url\(([\s])?([\"|\'])?(.*?)([\"|\'])?([\s])?\)/g;

        var matches;
        while ((matches = re.exec(content)) !== null) {

            var rule = matches[0];
            rule = rule.replace(/\'?\"?\)+$/, "");
            rule = rule.replace(/^url\(\'?\"?/, "");
            rule = rule.replace(/\?.*$/, "");
            rule = rule.replace(/#.*$/, "");
            //console.log(rule);
            dependencies.push(rule);
        }
    } catch (e) {
        dependencies = [];
    }

    return dependencies;
}

/**
 * @param  {String} filename
 * @param  {String} root
 * @return {String[]}
 */
function traverse(file, destination, root) {
    var tree = [];

    //console.log('Traversing ' + file.path);
    var dependencies = getDependencies(file);

    if (dependencies.length) {
        var directory = path.dirname(destination);

        dependencies = dependencies.map(function(dep) {
            var dependency = {
                source: resolveDependencyPath(dep, file.path, root),
                destination: resolveDependencyPath(dep,  destination, directory)
            };
            //console.log(dependency);
            return dependency;
        })
        .filter(function(dependency) {
            var exists = fs.existsSync(dependency.source);
            //if (!exists) {
            //    console.log(dependency.source + ' does not exist');
            //}
            return exists;
        });
    }

    dependencies.forEach(function(d) {
        tree = tree.concat(d);
    });

    tree = removeDuplicates(tree);

    return tree;
}

function copyFile(source, destination) {

    console.log('Copy ' + source + ' to ' + destination);

    var directory = path.dirname(destination);
    try {
        mkdirp.sync(directory);
    } catch (error) {
        console.error("mkdirp failed: " + error);
    }

    try {
        fs.writeFileSync(destination, fs.readFileSync(source));
    } catch (error) {
        console.error("Copy failed: " + error);
    }
}


/**
 * Extract all URL properties from the given CSS file and return a list.
 *
 * @param {String} filename - Path of the CSS file to parse.
 * @param {String} root - The root directory, under which all resources may be
 *                        found.
 */
function processFile(file, root, destination, callback) {
    if (!file.path) {
        throw new Error('filename not given');
    }
    if (!root) {
        throw new Error('root not given');
    }
    console.log(file.path);

    var results = traverse(file, destination, root);

    var directory = path.dirname(destination);
    //console.log("destination directory: ");
    //console.log(root);
    //console.log(destination);
    //var absoluteDestination = resolveDependencyPath(directory, '.', root) + '/';
    //console.log(absoluteDestination);

    for (var index = 0; index < results.length; ++index) {


        //var fileDestination = resolveDependencyPath(results[index].relative,  destination, directory);
        //console.log(fileDestination);

        //copyFile(results[index].absolute, destination + results[index].relative, callback);
        copyFile(results[index].source, results[index].destination, callback);
    }

    return results;
}

module.exports = function (options) {
    var root = options.root;
    var destination = options.destination;

    if (root === undefined) {
        throw new Error('Root directory not specified.');
    }
    if (destination === undefined) {
        throw new Error('Destination not specified.');
    }
    //console.log(destination);

    return stream(function (file, callback) {
        try {
            processFile(file, root, destination, callback);
            return callback(null, file);
        } catch (error) {
            return callback(error);
        }
    });
};