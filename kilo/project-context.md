# Project context

This workflow is installed into a host project; this file describes that
project to the agent. The workflow repository itself carries no project
context: everything project-specific lives here, in the host checkout, and
nowhere else in `.kilo/`.

When this file has not been filled in for the host project, treat the project
as unknown: derive context only from the host repository's own documentation
and code, and do not assume any domain, framework, or convention that the
repository does not itself evidence.

To fill this in for a project, describe:

- What the project is and does, in a paragraph.
- The languages, frameworks, and build/test commands that matter.
- Domain constraints an agent could not infer from the code alone.
- Anything the change-classification rules should weigh as high-risk here.
