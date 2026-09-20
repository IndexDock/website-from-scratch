import { stat } from "node:fs/promises";

// agent/contracts/assets.md tells the agent to fetch every learner upload and move it to
// where it belongs, and for every asset class in that contract except one — logos,
// portraits, product photographs, premises photographs, certification images — "where it
// belongs" is public/, because those files exist to appear on the website. Reference
// screenshots are the sole exception. They are pictures of other companies' websites,
// gathered during design discovery to inform the direction, and publishing them would
// deploy somebody else's site as part of this one. The habit the rest of the contract
// builds is therefore precisely the wrong habit here, which is why the prose rule is not
// enough on its own and this check exists: the failure mode is not an agent that never
// read the contract, it is an agent that read it, learned "uploads go to public/", and
// applied that to the one upload class it must not.
//
// Their home is project/design-reference/, and that location is not arbitrary: nothing
// under project/ is copied into the build, so a screenshot there informs the design
// worker and the visual auditor without ever reaching dist/. A screenshot under public/
// is copied verbatim into the deployed site, and one under src/ can be picked up by the
// asset pipeline and emitted with a hashed name, which is worse, because the offending
// file then no longer carries the name anybody would think to search for.
//
// This is deliberately two named stat calls rather than a walk of the tree. Passing is
// the normal case — the directory is absent in the template, absent before an interview,
// and deleted again at publication — and a check that runs on every validate:agent has to
// stay cheap enough that nobody is tempted to take it out of the chain. Only the two
// forbidden locations are named. project/design-reference/ is never inspected: it is
// legitimate whether it exists or not, and a check that fired on the correct location
// would teach the agent to move the files back to the wrong one.
const root = new URL("../", import.meta.url);
// Each forbidden location carries its own consequence, because the two are not the same
// and a reader who is told the wrong one will not believe the check. public/ is copied
// verbatim; src/ is compiled, which is the quieter of the two failures.
const forbiddenDirectories = [
  {
    path: "public/design-reference",
    consequence: "everything under public/ is copied verbatim into the deployed site",
  },
  {
    path: "src/design-reference",
    consequence:
      "images under src/ are emitted by the asset pipeline under hashed names, so the " +
      "published copies no longer carry a name anybody would think to search for",
  },
];
const correctDirectory = "project/design-reference";
const errors = [];

/**
 * Reports whether anything at all exists at a repository-relative path, so the check can
 * name the two forbidden locations outright instead of searching for them.
 *
 * How: one stat of that exact path. A missing path throws ENOENT, which is the expected
 * result on a clean tree and so is swallowed rather than reported; any other stat failure
 * is swallowed with it, on the grounds that a path this script cannot stat is a path it
 * cannot claim to have found. This deliberately does not gate on isDirectory(). A single
 * screenshot saved straight to public/design-reference, with no extension and so with no
 * directory ever created, publishes exactly the same third-party image as a directory full
 * of them, and gating on the shape would let that one pass in silence. Passing in silence
 * is the failure this check exists to remove, so anything at the path is reported and the
 * remedy is worded to fit either shape.
 *
 * O(1) time: a single stat syscall, with no directory listing and no recursion, whatever
 * the tree contains. O(1) space.
 *
 * @param {string} relativePath Path relative to the repository root, without a trailing slash.
 * @returns {Promise<boolean>} True when a file or directory exists there.
 */
async function pathExists(relativePath) {
  try {
    await stat(new URL(relativePath, root));
    return true;
  } catch {
    return false;
  }
}

for (const { path, consequence } of forbiddenDirectories) {
  if (await pathExists(path)) {
    errors.push(
      `${path} exists. Reference screenshots are pictures of other companies' websites, and ` +
        `${consequence}. Leaving them here publishes somebody else's site as part of this one. ` +
        `Move whatever is there to ${correctDirectory}/, which is the correct home because ` +
        `nothing under project/ is copied into the build, then delete ${path}.`,
    );
  }
}

if (errors.length) {
  console.error("Design reference validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    "\nThe rule this enforces, and the reasoning behind it, are in agent/contracts/assets.md " +
      "under \"Reference screenshots\".",
  );
  process.exit(1);
}

console.log(
  `No reference screenshots are staged for publication: neither ${forbiddenDirectories[0].path}/ ` +
    `nor ${forbiddenDirectories[1].path}/ exists, and ${correctDirectory}/ is the only place ` +
    "they belong.",
);
