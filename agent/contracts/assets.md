# Asset contract

When a logo, portrait, product image, premises image, certification image, or other visual could improve the site, ask the learner to upload it on GitHub. Share the direct link built from the recorded repository, `https://github.com/<owner>/<repo>/upload/main`, rather than describing navigation — it opens GitHub's **Add file → Upload files** page directly, with nothing to find or select. Tell the learner to drag the files in and confirm with the commit button GitHub preselects.

Do not make the learner choose a folder, a path, or a branch. Tell them to upload and nothing more. Then fetch, move each file to where it belongs, commit it on the session branch, and confirm what you did. Placing assets is the agent's job; handing over the bytes is the only part the learner can do.

Do not ask the learner to attach or paste the image into the chat as the delivery mechanism. An agent can see an attached image but has no access to its bytes or its path, so the asset would never reach the repository. An attachment is still useful for discussing an image; it is not a way to add one.

`docs/media/` is not a destination for any of this. It holds the illustrations `README.md` renders and nothing else, and it ships with the template rather than belonging to the business, so no learner upload is ever moved there. `scripts/validate-design-reference.mjs` names only `public/` and `src/`, so a reference screenshot misfiled into `docs/media/` passes the gate silently and reaches the learner's repository anyway.

Record whether each asset is supplied, approved, temporary, missing, or intentionally unnecessary. Preserve the original where practical and create optimized derivatives for the website.

Never invent documentary photographs, customer work, credentials, awards, or evidence. If suitable imagery is unavailable, create a design that works honestly without it. Decorative generated artwork is allowed only when it cannot be mistaken for an unverified fact.

Before publication, replace Starter branding in the favicon and social preview with an approved client-specific asset. If the learner has no logo, propose an honest text or initial mark and obtain approval before treating it as the client's identity.

## Reference screenshots

Reference screenshots — pictures of other websites the learner likes, captured during design discovery to inform the direction — are the one upload class whose home is not the website. Every other asset in this contract is moved into `public/` because it is meant to appear on the site; these are moved into `project/design-reference/`, and must never be placed under `public/` or `src/`. They are third-party imagery gathered as reference rather than content this business owns, and nothing under `project/` is copied into the build, so keeping them there is what stops somebody else's website being deployed as part of this one.

Ask for eight to fifteen of them in a single request, and say that more are welcome if the learner has them. Asking once matters: every further round costs the learner another pass of finding, capturing, and uploading, and an interview that starts from a fuller set needs fewer rounds to reach a direction.

Delivery is the same as for any other asset. Share the direct upload link described above, leaving the learner no folder, path, or branch decision, then fetch the files and place them yourself. That upload commits to `main` exactly as any other does, so the `origin/main` merge duty in `agent/contracts/git-delivery.md` applies here unchanged; follow it there rather than working from a summary of it.

If the upload fails, reference screenshots — and only reference screenshots — may be pasted into the chat instead, because the interview can still proceed from an image you can see. Say plainly what that costs: a pasted image has no bytes and no path, so it informs the conversation but never reaches the repository, which means the design worker and the visual auditor will never see it. The exception holds only because a reference is discussed rather than published. It does not loosen the rule for any asset that belongs on the website, where an image that never reaches the repository is no delivery at all.

The screenshots are deleted at publication, as `agent/phases/publication.md` requires, but be honest about what that deletion does and does not achieve. The learner's upload commits straight to `main`, so the images enter the repository's permanent history the moment they arrive, and removing the directory later leaves that history untouched. Purging history is out of scope and must not be attempted. Making the repository private at the end of the course closes the window for new access; it does not undo access anybody has already had.
