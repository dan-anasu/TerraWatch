# Contributing to TerraWatch

Thanks for helping improve TerraWatch. Contributions should keep the MVP focused, easy to run, and ready for future environmental data integrations.

## Development setup

1. Install Node.js 20 or newer.
2. Clone the repository and enter its directory.
3. Run `npm start` and open <http://localhost:4173>.
4. Run `npm test` before submitting changes.

No dependency installation is currently required. If a change adds a dependency, explain why it is needed and keep the dependency set small.

## Changes and pull requests

- Keep each change focused and avoid unrelated configuration changes.
- Describe the user-visible behavior and any limitations in your pull request.
- Add or update tests when changing geometry or persistence behavior.
- Check the interface at desktop and mobile widths for UI changes.
- Preserve WGS84 longitude/latitude GeoJSON coordinate ordering and valid polygon rings.
- Do not commit credentials, private environmental data, or local browser storage exports.

By submitting a contribution, you agree that it may be distributed under the project license.
