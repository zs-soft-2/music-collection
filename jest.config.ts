const { getJestProjects } = require('@nx/jest');

module.exports = async () => ({
	projects: await getJestProjectsAsync(),
});
