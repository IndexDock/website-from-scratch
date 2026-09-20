# State contract

`project/project-state.json` is machine-readable workflow truth. `project/STATUS.md` is generated and cannot be maintained separately. `project/DECISIONS.md` is append-only, and `project/PROGRESS.md` records completed work.

After meaningful checkpoints, validate state, regenerate status, and confirm the generated file is clean. Record blockers and conflicts explicitly. Never store secrets.
