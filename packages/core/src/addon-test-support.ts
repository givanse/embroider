import Funnel from 'broccoli-funnel';
import mergeTrees from 'broccoli-merge-trees';
import Snitch from './snitch';
import packageName from './package-name';
import { Tree } from 'broccoli-plugin';

/*
  The traditional addon-test-support tree allows you to emit modules under any
  package you feel like. Which we are NOT COOL WITH.

  This transform re-captures anything you try to put into other people's
  packages, puts them back into your own, and tracks what renaming is required
  by your consumers so they can still find those things.

  Example:

  ember-qunit emits an addon-test-support tree like:

  ├── ember-qunit
  │   ├── adapter.js
  │   ├── index.js
  │   └── ...
  └── qunit
      └── index.js

  The part that is under "ember-qunit" gets handled normally, in that we can
  merge it directly into our own v2 package root so people can import the
  modules from their tests.

  But the (shim) under "qunit" gets moved *into* the ember-qunit package, and
  consumers of ember-qunit will get renaming from:

  import { test } from 'qunit';

  to

  import { test } from 'ember-qunit/qunit';
*/

export default function rewriteAddonTestSupport(tree, ownName): { tree: Tree, getMeta: () => any } {
  let renamed = {};
  let goodParts = new Snitch(tree, {
    allowedPaths: new RegExp(`^${ownName}/`),
    foundBadPaths: (badPaths) => {
      for (let badPath of badPaths) {
        let name = packageName(badPath);
        renamed[name] = `${ownName}/${name}`;
      }
    }
  }, {
    srcDir: ownName
  });
  let badParts = new Funnel(tree, {
    exclude: [`${ownName}/**`]
  });
  return {
    tree: mergeTrees([goodParts, badParts]),
    getMeta: () => ({ 'renamed-modules' : renamed })
  };
}