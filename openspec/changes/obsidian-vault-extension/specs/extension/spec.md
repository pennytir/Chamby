# vault-scaffold

## ADDED Requirements

### Requirement: New projects get an Obsidian vault
The extension SHALL create `<repo>/obsidian/` with `.obsidian/app.json`, `.obsidian/community-plugins.json` (pinned set enabled), and vendored plugin files when the first session starts in a project directory that has none.

#### Scenario: First session in a new project
- **WHEN** a session starts in a project directory without `obsidian/.obsidian`
- **THEN** the vault skeleton exists with valid JSON configs before the first agent turn completes

#### Scenario: Existing vault untouched
- **WHEN** a session starts in a project directory that already has `obsidian/.obsidian`
- **THEN** no scaffold files are overwritten

### Requirement: Agent activity updates the vault
The service SHALL write or update a markdown note in the project vault on `turn-finished` events for sessions in registered projects.

#### Scenario: Finished turn records a note
- **WHEN** a `turn-finished` event arrives with content for a project session
- **THEN** a note reflecting the turn exists in that project's vault
