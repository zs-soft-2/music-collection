import { getJestProjects } from '@nx/jest';

export default async () => ({
  projects: await getJestProjectsAsync(),
});
